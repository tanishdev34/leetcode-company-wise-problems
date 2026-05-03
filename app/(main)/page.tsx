import Link from "next/link";
import { prisma } from "@/lib/db";
import { CompanyCard } from "@/components/company-card";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { SearchBar } from "@/components/search-bar";
import { Card } from "@/components/ui/card";
import BlurText from "@/components/BlurText";

export default async function HomePage() {
  const [companies, totalQuestions, totalCompanies, recentQuestions] =
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
    ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-12 flex flex-col items-center gap-4 text-center">
        <BlurText
          text="LeetCode Company Tracker"
          delay={150}
          animateBy="words"
          direction="top"
          className="text-4xl font-bold"
        />
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
            <a key={q.id} href={q.leetcodeUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-md border p-3 hover:bg-accent">
              <span className="flex-1 font-medium">{q.title}</span>
              <DifficultyBadge difficulty={q.difficulty} />
              <span className="text-sm text-muted-foreground">{q.company.name}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
