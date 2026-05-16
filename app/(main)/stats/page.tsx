import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { LeetcodeUsernameForm } from "@/components/leetcode-username-form";
import { LeetcodeStats } from "@/components/leetcode-stats";

function slugFromUrl(url: string): string | null {
  const match = url.match(/leetcode\.com\/problems\/([^/?#]+)/);
  return match ? match[1] : null;
}

export default async function StatsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { leetcodeUsername: true },
  });

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
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">LeetCode Stats</h1>

      {!user?.leetcodeUsername ? (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Link your LeetCode account to see your stats, heatmap, skills, and more.
          </p>
          <LeetcodeUsernameForm />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-4">
            <LeetcodeUsernameForm initialValue={user.leetcodeUsername} />
          </div>
          <LeetcodeStats
            username={user.leetcodeUsername}
            slugToQuestionId={slugToQuestionId}
          />
        </>
      )}
    </div>
  );
}
