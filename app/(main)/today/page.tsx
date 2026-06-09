import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"
import { TodayView } from "@/components/today-view"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Today — LC Tracker",
  description: "Your daily study command center",
}

export default async function TodayPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/login")

  const userId = session.user.id

  const [user, activeRoadmaps, dueReviews, recentSolved] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { leetcodeUsername: true, email: true },
    }),
    prisma.roadmap.findMany({
      where: { userId, status: "active" },
      include: {
        _count: { select: { items: true } },
        items: { where: { status: "completed" }, select: { id: true } },
        company: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    prisma.reviewItem.count({
      where: { userId, nextReviewAt: { lte: new Date() } },
    }),
    prisma.userQuestion.findMany({
      where: { userId, solved: true },
      orderBy: { solvedAt: "desc" },
      take: 20,
      include: {
        question: {
          select: { id: true, title: true, leetcodeUrl: true, difficulty: true },
        },
      },
    }),
  ])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <TodayView
        username={user?.leetcodeUsername ?? null}
        activeRoadmaps={activeRoadmaps.map((r) => ({
          id: r.id,
          name: r.name,
          companyName: r.company?.name ?? null,
          totalItems: r._count.items,
          completedItems: r.items.length,
          endDate: r.endDate,
        }))}
        dueReviews={dueReviews}
        recentSolved={recentSolved.map((uq) => ({
          id: uq.question.id,
          title: uq.question.title,
          leetcodeUrl: uq.question.leetcodeUrl,
          difficulty: uq.question.difficulty,
          solvedAt: uq.solvedAt,
        }))}
      />
    </div>
  )
}
