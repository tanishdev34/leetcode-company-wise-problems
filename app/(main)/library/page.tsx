import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { LibraryView } from "@/components/library-view"

export const metadata = {
  title: "Library — LC Tracker",
  description: "All questions, companies, and topics in one place",
}

export default async function LibraryPage() {
  let userId: string | null = null
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    userId = session?.user?.id ?? null
  } catch {}

  const [companies, topics, solvedByCompany] = await Promise.all([
    prisma.company.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { companyQuestions: { where: { timePeriod: "ALL" } } } },
      },
    }),
    prisma.question.findMany({ select: { topics: true } }).then((qs) => {
      const set = new Set<string>()
      for (const q of qs) for (const t of q.topics) set.add(t)
      return Array.from(set).sort()
    }),
    userId
      ? prisma.$queryRaw<{ companyId: string; solvedCount: bigint }[]>`
          SELECT cq."companyId", COUNT(DISTINCT uq."questionId") as "solvedCount"
          FROM "CompanyQuestion" cq
          JOIN "UserQuestion" uq ON uq."questionId" = cq."questionId" AND uq."userId" = ${userId} AND uq."solved" = true
          WHERE cq."timePeriod" = 'ALL'
          GROUP BY cq."companyId"
        `
      : Promise.resolve([]),
  ])

  const solvedMap = new Map<string, number>(
    solvedByCompany.map((r) => [r.companyId, Number(r.solvedCount)])
  )

  const sorted = companies
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      count: c._count.companyQuestions,
      solved: solvedMap.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.solved - a.solved || a.name.localeCompare(b.name))

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <LibraryView companies={sorted} topics={topics} />
    </div>
  )
}
