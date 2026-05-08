import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getDashboardStats } from "@/actions/stats";
import { StatsOverview } from "@/components/stats-overview";
import { CompanyProgress } from "@/components/company-progress";
import { LeetcodeUsernameForm } from "@/components/leetcode-username-form";
import { LeetcodeStats } from "@/components/leetcode-stats";
import { EmailSubscriptionToggle } from "@/components/email-subscription-toggle";

function slugFromUrl(url: string): string | null {
  const match = url.match(/leetcode\.com\/problems\/([^/?#]+)/);
  return match ? match[1] : null;
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const [user, result] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leetcodeUsername: true },
    }),
    getDashboardStats(),
  ]);

  if (!result.success) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-destructive">Failed to load dashboard stats.</p>
      </div>
    );
  }

  const stats = result.data;

  const userQuestions = user?.leetcodeUsername
    ? await prisma.question.findMany({
        where: {
          userQuestions: { some: { userId: session.user.id } },
        },
        select: { id: true, leetcodeUrl: true },
      })
    : [];
  const slugToQuestionId: Record<string, string> = {};
  for (const q of userQuestions) {
    const slug = slugFromUrl(q.leetcodeUrl);
    if (slug) slugToQuestionId[slug] = q.id;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Dashboard</h1>
      <div className="flex flex-col gap-8">
        <StatsOverview totalSolved={stats.totalSolved} byDifficulty={stats.byDifficulty} />
        
        <section>
          <h2 className="mb-4 text-xl font-bold">LeetCode Stats</h2>
          {!user?.leetcodeUsername ? (
            <LeetcodeUsernameForm />
          ) : (
            <>
              <LeetcodeStats
                username={user.leetcodeUsername}
                slugToQuestionId={slugToQuestionId}
              />
              <div className="mt-4 flex flex-wrap items-start gap-4">
                <LeetcodeUsernameForm initialValue={user.leetcodeUsername} />
                <EmailSubscriptionToggle />
              </div>
            </>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold">Company Progress</h2>
          <CompanyProgress companies={stats.byCompany} />
        </section>
      </div>
    </div>
  );
}