"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function syncLeetcodeSubmissions(username: string): Promise<
  { success: true; synced: number; matched: number } | { success: false; error: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "Not authenticated" };

  const userId = session.user.id;

  const res = await fetch(
    `https://alfa-leetcode-api.onrender.com/${username}/acSubmission`
  );
  if (!res.ok) return { success: false, error: "Failed to fetch submissions from LeetCode" };

  const data = await res.json();
  if (data.errors) return { success: false, error: "LeetCode user not found" };

  const submissions: Array<{ titleSlug: string; timestamp: string }> = data.submission ?? [];

  // Build a map of titleSlug → solvedAt so we can do bulk lookups
  const slugMap = new Map<string, Date>();
  for (const s of submissions) {
    const url = `https://leetcode.com/problems/${s.titleSlug}/`;
    const solvedAt = new Date(parseInt(s.timestamp) * 1000);
    // Keep the most recent timestamp if the same slug appears twice
    const existing = slugMap.get(url);
    if (!existing || solvedAt > existing) slugMap.set(url, solvedAt);
  }

  if (slugMap.size === 0) return { success: true, synced: 0, matched: 0 };

  // Find all questions in our DB whose leetcodeUrl matches any of these slugs
  const questions = await prisma.question.findMany({
    where: { leetcodeUrl: { in: Array.from(slugMap.keys()) } },
    select: { id: true, leetcodeUrl: true },
  });

  if (questions.length === 0) return { success: true, synced: 0, matched: 0 };

  // Upsert UserQuestion for each matched question
  await Promise.all(
    questions.map((q) =>
      prisma.userQuestion.upsert({
        where: { userId_questionId: { userId, questionId: q.id } },
        update: {
          solved: true,
          solvedAt: slugMap.get(q.leetcodeUrl) ?? new Date(),
        },
        create: {
          userId,
          questionId: q.id,
          solved: true,
          solvedAt: slugMap.get(q.leetcodeUrl) ?? new Date(),
        },
      })
    )
  );

  return { success: true, synced: questions.length, matched: slugMap.size };
}
