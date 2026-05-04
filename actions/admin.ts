"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Difficulty, TimePeriod } from "../generated/prisma/client";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Not authenticated");
  if (session.user.role !== "admin") throw new Error("Forbidden");
  return session.user;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type CsvRow = {
  title: string;
  difficulty: string;
  leetcodeUrl: string;
  topics: string;
  frequency: string;
  acceptanceRate: string;
};

export async function addQuestion(data: {
  title: string;
  leetcodeUrl: string;
  difficulty: string;
  topics: string;
  frequency: number;
  acceptanceRate: number;
  companyName: string;
  timePeriod: string;
}) {
  try {
    await requireAdmin();

    const slug = slugify(data.companyName);
    const company = await prisma.company.upsert({
      where: { slug },
      update: { name: data.companyName },
      create: { name: data.companyName, slug },
    });

    const question = await prisma.question.upsert({
      where: { leetcodeUrl: data.leetcodeUrl },
      update: {
        title: data.title,
        difficulty: data.difficulty as Difficulty,
        topics: data.topics.split(",").map((t) => t.trim()).filter(Boolean),
        acceptanceRate: data.acceptanceRate,
      },
      create: {
        title: data.title,
        leetcodeUrl: data.leetcodeUrl,
        difficulty: data.difficulty as Difficulty,
        topics: data.topics.split(",").map((t) => t.trim()).filter(Boolean),
        acceptanceRate: data.acceptanceRate,
      },
    });

    await prisma.companyQuestion.upsert({
      where: {
        questionId_companyId_timePeriod: {
          questionId: question.id,
          companyId: company.id,
          timePeriod: data.timePeriod as TimePeriod,
        },
      },
      update: { frequency: data.frequency },
      create: {
        questionId: question.id,
        companyId: company.id,
        timePeriod: data.timePeriod as TimePeriod,
        frequency: data.frequency,
      },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add question";
    return { success: false, error: msg };
  }
}

export async function addQuestionsFromCSV(
  rows: CsvRow[],
  companyName: string,
  timePeriod: string
) {
  try {
    await requireAdmin();

    const slug = slugify(companyName);
    const company = await prisma.company.upsert({
      where: { slug },
      update: { name: companyName },
      create: { name: companyName, slug },
    });

    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      if (!row.title || !row.leetcodeUrl) {
        skipped++;
        continue;
      }
      try {
        const diffRaw = row.difficulty.trim().toUpperCase();
        if (!["EASY", "MEDIUM", "HARD"].includes(diffRaw)) {
          errors.push(`"${row.title}": unknown difficulty "${row.difficulty}"`);
          skipped++;
          continue;
        }

        const question = await prisma.question.upsert({
          where: { leetcodeUrl: row.leetcodeUrl },
          update: {
            title: row.title,
            difficulty: diffRaw as Difficulty,
            topics: row.topics.split(",").map((t) => t.trim()).filter(Boolean),
            acceptanceRate: parseFloat(row.acceptanceRate) || 0,
          },
          create: {
            title: row.title,
            leetcodeUrl: row.leetcodeUrl,
            difficulty: diffRaw as Difficulty,
            topics: row.topics.split(",").map((t) => t.trim()).filter(Boolean),
            acceptanceRate: parseFloat(row.acceptanceRate) || 0,
          },
        });

        await prisma.companyQuestion.upsert({
          where: {
            questionId_companyId_timePeriod: {
              questionId: question.id,
              companyId: company.id,
              timePeriod: timePeriod as TimePeriod,
            },
          },
          update: { frequency: parseFloat(row.frequency) || 0 },
          create: {
            questionId: question.id,
            companyId: company.id,
            timePeriod: timePeriod as TimePeriod,
            frequency: parseFloat(row.frequency) || 0,
          },
        });

        added++;
      } catch {
        errors.push(`"${row.title}": failed to upsert`);
        skipped++;
      }
    }

    return { success: true, added, skipped, errors };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to process CSV";
    return { success: false, error: msg };
  }
}
