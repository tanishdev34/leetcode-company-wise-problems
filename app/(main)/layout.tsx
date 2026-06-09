import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { LoadingBar } from "@/components/loading-bar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  let isAdmin = false;
  let isAuthenticated = false;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user?.id) {
      isAuthenticated = true;
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      isAdmin = user?.role === "admin";
    }
  } catch {}

  if (isAuthenticated) {
    return (
      <div className="flex min-h-svh">
        <LoadingBar />
        <Sidebar isAdmin={isAdmin} />
        <MobileNav isAdmin={isAdmin} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      <LoadingBar />
      <Navbar isAdmin={isAdmin} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
