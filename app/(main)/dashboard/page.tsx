import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getDashboardStats } from "@/actions/stats";
import { StatsOverview } from "@/components/stats-overview";
import { CompanyProgress } from "@/components/company-progress";
import { LeetcodeUsernameForm } from "@/components/leetcode-username-form";
import { CodeforcesUsernameForm } from "@/components/codeforces-username-form";
import { EmailSubscriptionToggle } from "@/components/email-subscription-toggle";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const [user, result] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leetcodeUsername: true, codeforcesUsername: true },
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Dashboard</h1>
      <div className="flex flex-col gap-8">
        <StatsOverview totalSolved={stats.totalSolved} byDifficulty={stats.byDifficulty} />

        {/* Quick links to detailed stats pages */}
        <div className="flex flex-wrap gap-3">
          <Link href="/stats">
            <Button variant="outline" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              View LeetCode Stats
            </Button>
          </Link>
          <Link href="/codeforces">
            <Button variant="outline" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              View Codeforces Profile
            </Button>
          </Link>
        </div>

        {/* Username forms */}
        <section>
          <h2 className="mb-4 text-xl font-bold">Linked Accounts</h2>
          <div className="flex flex-col gap-4">
            <LeetcodeUsernameForm initialValue={user?.leetcodeUsername || ""} />
            <CodeforcesUsernameForm initialValue={user?.codeforcesUsername || ""} />
          </div>
          <div className="mt-4">
            <EmailSubscriptionToggle />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold">Company Progress</h2>
          <CompanyProgress companies={stats.byCompany} />
        </section>
      </div>
    </div>
  );
}
