import { prisma } from "@/lib/db";
import { CompaniesFilter } from "./companies-filter";

export default async function CompaniesPage() {
  const companies = await prisma.company.findMany({
    include: { _count: { select: { questions: true } } },
    orderBy: { name: "asc" },
  });

  const filtered = companies.filter((c) => c._count.questions > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">All Companies</h1>
      <CompaniesFilter
        companies={filtered.map((c) => ({
          name: c.name,
          slug: c.slug,
          questionCount: c._count.questions,
        }))}
      />
    </div>
  );
}
