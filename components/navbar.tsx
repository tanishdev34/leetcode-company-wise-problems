"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./search-bar";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Menu, X } from "lucide-react";

export function Navbar({ isAdmin = false }: { isAdmin?: boolean }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="font-bold whitespace-nowrap" onClick={() => setOpen(false)}>
          LC Tracker
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex flex-1 items-center gap-4">
          <Link href="/companies" className="text-sm text-muted-foreground hover:text-foreground">
            Companies
          </Link>
          <div className="flex-1">
            <SearchBar className="max-w-md" />
          </div>
          {session?.user ? (
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link href="/admin/questions">
                  <Button variant="outline" size="sm" className="border-primary/40 text-primary hover:bg-primary/10">
                    + Add Questions
                  </Button>
                </Link>
              )}
              <Link href="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Signing out...</> : "Sign Out"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
              <Link href="/register"><Button size="sm">Register</Button></Link>
            </div>
          )}
        </div>

        {/* Mobile: spacer + hamburger */}
        <div className="flex md:hidden flex-1 justify-end">
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t bg-background">
          <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-3">
            <SearchBar />
            <Link href="/companies" className="py-2 text-sm" onClick={() => setOpen(false)}>
              Companies
            </Link>
            {session?.user ? (
              <>
                <Link href="/dashboard" className="py-2 text-sm" onClick={() => setOpen(false)}>
                  Dashboard
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/questions"
                    className="py-2 text-sm text-primary"
                    onClick={() => setOpen(false)}
                  >
                    + Add Questions
                  </Link>
                )}
                <Button variant="ghost" size="sm" className="justify-start" onClick={handleSignOut} disabled={signingOut}>
                  {signingOut ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Signing out...</> : "Sign Out"}
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" className="flex-1" onClick={() => setOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">Sign In</Button>
                </Link>
                <Link href="/register" className="flex-1" onClick={() => setOpen(false)}>
                  <Button size="sm" className="w-full">Register</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
