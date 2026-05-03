import Link from "next/link";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { CompanyCard } from "@/components/company-card";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { SearchBar } from "@/components/search-bar";
import { Card } from "@/components/ui/card";
import { DailyProblemCard } from "@/components/daily-problem-card";

async function fetchDailyProblem() {
  const CACHE_KEY = "leetcode:daily";
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return cached;
  } catch {}

  try {
    const res = await fetch("https://alfa-leetcode-api.onrender.com/daily");
    const data = await res.json();
    if (data.errors) return null;

    const result = {
      questionLink: data.questionLink,
      date: data.date,
      questionTitle: data.questionTitle,
      titleSlug: data.titleSlug,
      difficulty: data.difficulty,
      isPaidOnly: data.isPaidOnly,
      topicTags: data.topicTags,
      likes: data.likes,
      dislikes: data.dislikes,
      hints: data.hints,
    };

    // Cache until midnight UTC
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    const ttl = Math.floor((midnight.getTime() - now.getTime()) / 1000);
    try { await redis.setex(CACHE_KEY, ttl, result); } catch {}

    return result;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [companies, totalQuestions, totalCompanies, recentQuestions, daily] =
    await Promise.all([
      prisma.company.findMany({
        include: { _count: { select: { questions: true } } },
        orderBy: { questions: { _count: "desc" } },
        take: 12,
      }),
      prisma.question.count(),
      prisma.company.count(),
      prisma.question.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { company: { select: { name: true, slug: true } } },
      }),
      fetchDailyProblem(),
    ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-12 flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold">LeetCode Company Tracker</h1>
        <p className="text-lg text-muted-foreground">
          Track {totalQuestions.toLocaleString()} questions across {totalCompanies} companies
        </p>
        <SearchBar className="w-full max-w-lg" />
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold">{totalCompanies}</p>
          <p className="text-sm text-muted-foreground">Companies</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold">{totalQuestions.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Questions</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold">5</p>
          <p className="text-sm text-muted-foreground">Time Periods</p>
        </Card>
      </section>

      {daily && <DailyProblemCard problem={daily} />}

      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Top Companies</h2>
          <Link href="/companies" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {companies.map((c) => (
            <CompanyCard key={c.id} name={c.name} slug={c.slug} questionCount={c._count.questions} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">Recently Added</h2>
        <div className="flex flex-col gap-2">
          {recentQuestions.map((q) => (
            <Link 
              key={q.id}
              href={`/questions/${q.id}`}
              className="flex items-center gap-4 rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <span className="flex-1 font-medium">{q.title}</span>
              <DifficultyBadge difficulty={q.difficulty} />
              <span className="text-sm text-muted-foreground">{q.company.name}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}