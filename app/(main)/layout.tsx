import { Navbar } from "@/components/navbar";
import { LoadingBar } from "@/components/loading-bar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  let isAdmin = false;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      isAdmin = user?.role === "admin";
    }
  } catch {}

  return (
    <div className="flex min-h-svh flex-col">
      <LoadingBar />
      <Navbar isAdmin={isAdmin} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
