import { parse } from "csv-parse/sync";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Difficulty, TimePeriod } from "../generated/prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const ROOT_DIR = join(__dirname, "..", "..");

const SKIP_DIRS = new Set([
  "frontend",
  "node_modules",
  ".git",
  "docs",
  ".github",
]);

const FILE_TO_TIME_PERIOD: Record<string, TimePeriod> = {
  "1. Thirty Days.csv": TimePeriod.THIRTY_DAYS,
  "2. Three Months.csv": TimePeriod.THREE_MONTHS,
  "3. Six Months.csv": TimePeriod.SIX_MONTHS,
  "4. More Than Six Months.csv": TimePeriod.MORE_THAN_SIX_MONTHS,
  "5. All.csv": TimePeriod.ALL,
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapDifficulty(raw: string): Difficulty {
  const upper = raw.trim().toUpperCase();
  if (upper === "EASY") return Difficulty.EASY;
  if (upper === "MEDIUM") return Difficulty.MEDIUM;
  if (upper === "HARD") return Difficulty.HARD;
  throw new Error(`Unknown difficulty: ${raw}`);
}

function parseTopics(raw: string): string[] {
  if (!raw || raw.trim() === "") return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

interface CsvRow {
  difficulty: string;
  title: string;
  frequency: string;
  acceptanceRate: string;
  link: string;
  topics: string;
}

function parseCsvFile(filePath: string): CsvRow[] {
  const content = readFileSync(filePath, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return records.map((r) => ({
    difficulty: r["Difficulty"] ?? "",
    title: r["Title"] ?? "",
    frequency: r["Frequency"] ?? "",
    acceptanceRate: r["Acceptance Rate"] ?? "",
    link: r["Link"] ?? "",
    topics: r["Topics"] ?? "",
  }));
}

async function seedCompany(companyName: string): Promise<number> {
  const slug = slugify(companyName);
  const companyDir = join(ROOT_DIR, companyName);

  const company = await prisma.company.upsert({
    where: { slug },
    update: { name: companyName },
    create: { name: companyName, slug },
  });

  let questionCount = 0;

  for (const [fileName, timePeriod] of Object.entries(FILE_TO_TIME_PERIOD)) {
    const filePath = join(companyDir, fileName);
    if (!existsSync(filePath)) continue;

    let rows: CsvRow[];
    try {
      rows = parseCsvFile(filePath);
    } catch (err) {
      console.warn(`  ⚠ Failed to parse ${companyName}/${fileName}: ${err}`);
      continue;
    }

    for (const row of rows) {
      if (!row.link || !row.title) {
        console.warn(
          `  ⚠ Skipping malformed row in ${companyName}/${fileName}: missing link or title`
        );
        continue;
      }

      try {
        const difficulty = mapDifficulty(row.difficulty);
        const frequency = parseFloat(row.frequency) || 0;
        const acceptanceRate = parseFloat(row.acceptanceRate) || 0;
        const topics = parseTopics(row.topics);

        const question = await prisma.question.upsert({
          where: { leetcodeUrl: row.link },
          update: { title: row.title, difficulty, acceptanceRate, topics },
          create: {
            title: row.title,
            leetcodeUrl: row.link,
            difficulty,
            acceptanceRate,
            topics,
          },
        });

        await prisma.companyQuestion.upsert({
          where: {
            questionId_companyId_timePeriod: {
              questionId: question.id,
              companyId: company.id,
              timePeriod,
            },
          },
          update: { frequency },
          create: {
            questionId: question.id,
            companyId: company.id,
            timePeriod,
            frequency,
          },
        });
        questionCount++;
      } catch (err) {
        console.warn(
          `  ⚠ Skipping row "${row.title}" in ${companyName}/${fileName}: ${err}`
        );
      }
    }
  }

  return questionCount;
}

async function main() {
  const entries = readdirSync(ROOT_DIR, { withFileTypes: true });
  const companyDirs = entries.filter(
    (e) =>
      e.isDirectory() &&
      !SKIP_DIRS.has(e.name) &&
      !e.name.startsWith(".")
  );

  console.log(`Found ${companyDirs.length} company folders`);

  let totalCompanies = 0;
  let totalQuestions = 0;

  for (const dir of companyDirs) {
    const count = await seedCompany(dir.name);
    totalCompanies++;
    totalQuestions += count;
    console.log(`  ✓ ${dir.name}: ${count} questions`);
  }

  console.log(`\nSeeded ${totalCompanies} companies with ${totalQuestions} total questions`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
