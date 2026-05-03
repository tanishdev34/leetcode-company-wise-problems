import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminQuestionsForm } from "@/components/admin-questions-form";
import { ShieldCheck } from "lucide-react";

export default async function AdminQuestionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "admin") redirect("/");

  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    select: { name: true, slug: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Add Questions</h1>
          <p className="text-sm text-muted-foreground">Admin — add a single question or import a CSV</p>
        </div>
      </div>

      <AdminQuestionsForm companies={companies} />
    </div>
  );
}
