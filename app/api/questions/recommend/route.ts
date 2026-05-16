import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // 1. Get the user's solved questions with their topics
    const solvedUQs = await prisma.userQuestion.findMany({
      where: { userId: session.user.id, solved: true },
      select: { questionId: true },
    });

    const solvedIds = solvedUQs.map((uq) => uq.questionId);

    // 2. If user has solved questions, find most common topics
    let targetTopics: string[] = [];

    if (solvedIds.length > 0) {
      const solvedQuestions = await prisma.question.findMany({
        where: { id: { in: solvedIds } },
        select: { topics: true },
      });

      // Count topic frequency
      const topicCount = new Map<string, number>();
      for (const q of solvedQuestions) {
        for (const topic of q.topics) {
          topicCount.set(topic, (topicCount.get(topic) || 0) + 1);
        }
      }

      // Get top 5 topics
      targetTopics = [...topicCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic]) => topic);
    }

    // 3. Find an unsolved question matching those topics
    let recommended = null;

    if (targetTopics.length > 0) {
      // Try to find a question whose topics overlap with target topics
      const allQuestions = await prisma.question.findMany({
        where: {
          id: { notIn: solvedIds },
          topics: { hasSome: targetTopics },
        },
        select: {
          id: true,
          title: true,
          leetcodeUrl: true,
          difficulty: true,
          topics: true,
        },
        take: 20,
      });

      // Score by number of matching topics
      const scored = allQuestions
        .map((q) => ({
          ...q,
          matchScore: q.topics.filter((t) => targetTopics.includes(t)).length,
        }))
        .sort((a, b) => b.matchScore - a.matchScore);

      if (scored.length > 0) {
        // Pick a random one from the top matches
        const topScore = scored[0].matchScore;
        const topMatches = scored.filter((q) => q.matchScore === topScore);
        const pick = topMatches[Math.floor(Math.random() * topMatches.length)];
        recommended = {
          id: pick.id,
          title: pick.title,
          leetcodeUrl: pick.leetcodeUrl,
          difficulty: pick.difficulty,
          topics: pick.topics,
        };
      }
    }

    // 4. Fallback: suggest a random medium question the user hasn't solved
    if (!recommended) {
      const fallback = await prisma.question.findFirst({
        where: {
          id: { notIn: solvedIds },
          difficulty: "MEDIUM",
        },
        select: {
          id: true,
          title: true,
          leetcodeUrl: true,
          difficulty: true,
          topics: true,
        },
        orderBy: { createdAt: "desc" },
      });

      if (fallback) {
        recommended = fallback;
      }
    }

    if (!recommended) {
      return NextResponse.json({ question: null });
    }

    return NextResponse.json({ question: recommended });
  } catch {
    return NextResponse.json({ error: "Failed to fetch recommendation" }, { status: 500 });
  }
}
