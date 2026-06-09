import { parse } from "csv-parse/sync";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Difficulty, TimePeriod } from "../generated/prisma/client";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const ROOT_DIR = join(__dirname, "..", "questions");
const SKIP_DIRS = new Set(["frontend", "node_modules", ".git", "docs", ".github"]);

const FILE_TO_TIME_PERIOD: Record<string, TimePeriod> = {
  "1. Thirty Days.csv": TimePeriod.THIRTY_DAYS,
  "2. Three Months.csv": TimePeriod.THREE_MONTHS,
  "3. Six Months.csv": TimePeriod.SIX_MONTHS,
  "4. More Than Six Months.csv": TimePeriod.MORE_THAN_SIX_MONTHS,
  "5. All.csv": TimePeriod.ALL,
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function mapDifficulty(raw: string): Difficulty {
  const upper = raw.trim().toUpperCase();
  if (upper === "EASY") return Difficulty.EASY;
  if (upper === "MEDIUM") return Difficulty.MEDIUM;
  if (upper === "HARD") return Difficulty.HARD;
  throw new Error(`Unknown difficulty: ${raw}`);
}

function normalizeLeetcodeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function parseTopics(raw: string): string[] {
  if (!raw || raw.trim() === "") return [];
  return raw.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
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
  const records = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  return records.map((r) => ({
    difficulty: r["Difficulty"] ?? "",
    title: r["Title"] ?? "",
    frequency: r["Frequency"] ?? "",
    acceptanceRate: r["Acceptance Rate"] ?? "",
    link: r["Link"] ?? "",
    topics: r["Topics"] ?? "",
  }));
}

interface QuestionRow {
  title: string;
  titleSlug: string | null;
  leetcodeUrl: string;
  difficulty: Difficulty;
  acceptanceRate: number;
  topics: string[];
}

interface CqRow {
  questionUrl: string;
  companySlug: string;
  timePeriod: TimePeriod;
  frequency: number;
}

async function main() {
  const entries = readdirSync(ROOT_DIR, { withFileTypes: true });
  const companyDirs = entries.filter(
    (e) => e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith(".")
  );

  console.log(`Found ${companyDirs.length} company folders. Reading CSVs...`);

  // Phase 1: Read all CSVs into memory
  const companies = new Map<string, string>(); // slug -> name
  const questions = new Map<string, QuestionRow>(); // url -> row
  const cqRows: CqRow[] = [];

  for (const dir of companyDirs) {
    const companyName = dir.name;
    const slug = slugify(companyName);
    companies.set(slug, companyName);

    const companyDir = join(ROOT_DIR, companyName);

    for (const [fileName, timePeriod] of Object.entries(FILE_TO_TIME_PERIOD)) {
      const filePath = join(companyDir, fileName);
      if (!existsSync(filePath)) continue;

      let rows: CsvRow[];
      try {
        rows = parseCsvFile(filePath);
      } catch {
        continue;
      }

      for (const row of rows) {
        if (!row.link || !row.title) continue;

        const normalizedUrl = normalizeLeetcodeUrl(row.link);
        const titleSlugMatch = normalizedUrl.match(/problems\/([^/]+)/);
        const titleSlug = titleSlugMatch ? titleSlugMatch[1] : null;

        if (!questions.has(normalizedUrl)) {
          questions.set(normalizedUrl, {
            title: row.title,
            titleSlug,
            leetcodeUrl: normalizedUrl,
            difficulty: mapDifficulty(row.difficulty),
            acceptanceRate: parseFloat(row.acceptanceRate) || 0,
            topics: parseTopics(row.topics),
          });
        }

        cqRows.push({
          questionUrl: normalizedUrl,
          companySlug: slug,
          timePeriod,
          frequency: parseFloat(row.frequency) || 0,
        });
      }
    }
  }

  console.log(`Collected: ${companies.size} companies, ${questions.size} questions, ${cqRows.length} links`);

  // Phase 2: Upsert companies using createMany
  console.log("Inserting companies...");
  const companyData = Array.from(companies.entries()).map(([slug, name]) => ({
    id: randomUUID(),
    name,
    slug,
  }));

  await prisma.company.createMany({
    data: companyData,
    skipDuplicates: true,
  });
  console.log(`  ✓ ${companyData.length} companies`);

  // Phase 3: Upsert questions using createMany
  console.log("Inserting questions...");
  const questionData = Array.from(questions.values()).map((q) => ({
    id: randomUUID(),
    title: q.title,
    titleSlug: q.titleSlug,
    leetcodeUrl: q.leetcodeUrl,
    difficulty: q.difficulty,
    acceptanceRate: q.acceptanceRate,
    topics: q.topics,
  }));

  // Batch in chunks of 500
  for (let i = 0; i < questionData.length; i += 500) {
    const chunk = questionData.slice(i, i + 500);
    await prisma.question.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    console.log(`  Questions: ${Math.min(i + 500, questionData.length)}/${questionData.length}`);
  }

  // Phase 4: Fetch ID maps
  console.log("Building ID maps...");
  const dbCompanies = await prisma.company.findMany({ select: { id: true, slug: true } });
  const slugToId = new Map(dbCompanies.map((c) => [c.slug, c.id]));

  const dbQuestions = await prisma.question.findMany({ select: { id: true, leetcodeUrl: true } });
  const urlToId = new Map(dbQuestions.map((q) => [q.leetcodeUrl, q.id]));

  // Phase 5: Insert company questions using raw SQL (for the compound unique constraint)
  console.log("Inserting company questions...");
  const cqData: { id: string; questionId: string; companyId: string; timePeriod: TimePeriod; frequency: number }[] = [];

  for (const cq of cqRows) {
    const questionId = urlToId.get(cq.questionUrl);
    const companyId = slugToId.get(cq.companySlug);
    if (!questionId || !companyId) continue;

    cqData.push({
      id: randomUUID(),
      questionId,
      companyId,
      timePeriod: cq.timePeriod,
      frequency: cq.frequency,
    });
  }

  // Use raw SQL for bulk upsert with ON CONFLICT
  for (let i = 0; i < cqData.length; i += 500) {
    const chunk = cqData.slice(i, i + 500);
    const values: string[] = [];
    const params: unknown[] = [];
    let pi = 1;

    for (const cq of chunk) {
      values.push(`($${pi++}, $${pi++}, $${pi++}, $${pi++}, $${pi++})`);
      params.push(cq.id, cq.questionId, cq.companyId, cq.timePeriod, cq.frequency);
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO "CompanyQuestion" ("id", "questionId", "companyId", "timePeriod", "frequency")
      VALUES ${values.join(", ")}
      ON CONFLICT ("questionId", "companyId", "timePeriod") DO UPDATE SET "frequency" = EXCLUDED."frequency"
    `, ...params);

    console.log(`  CompanyQuestions: ${Math.min(i + 500, cqData.length)}/${cqData.length}`);
  }

  console.log(`\nDone! Seeded ${companies.size} companies, ${questions.size} questions, ${cqData.length} company-question links`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
