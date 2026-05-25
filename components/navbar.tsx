"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./search-bar";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Menu, X, Command } from "lucide-react";
import { CommandPalette } from "./command-palette";

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

        {/* Command palette trigger */}
        <button
          type="button"
          onClick={() => {
            // Dispatch keyboard event to trigger CommandPalette
            const event = new KeyboardEvent("keydown", {
              key: "k",
              metaKey: true,
              bubbles: true,
            });
            document.dispatchEvent(event);
          }}
          className="hidden md:inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Open command palette"
        >
          <Command className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Cmd+K</span>
        </button>

        {/* Desktop nav */}
        <div className="hidden min-w-0 flex-1 items-center gap-4 md:flex">
          <Link href="/companies" className="text-sm text-muted-foreground hover:text-foreground">
            Companies
          </Link>
          {session?.user ? (
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {isAdmin && (
                <Link href="/admin/questions">
                  <Button variant="outline" size="sm" className="border-primary/40 text-primary hover:bg-primary/10 shrink-0">
                    + Add Questions
                  </Button>
                </Link>
              )}
              <Link href="/dashboard"><Button variant="ghost" size="sm" className="shrink-0">Dashboard</Button></Link>
              <Link href="/stats"><Button variant="ghost" size="sm" className="shrink-0">Stats</Button></Link>
              <Link href="/planner"><Button variant="ghost" size="sm" className="shrink-0">Planner</Button></Link>
              <Link href="/reviews"><Button variant="ghost" size="sm" className="shrink-0">Reviews</Button></Link>
              <Link href="/readiness"><Button variant="ghost" size="sm" className="shrink-0">Readiness</Button></Link>
              <Link href="/learning"><Button variant="ghost" size="sm" className="shrink-0">Graph</Button></Link>
              <Link href="/memory"><Button variant="ghost" size="sm" className="shrink-0">Memory</Button></Link>
              <Link href="/reports"><Button variant="ghost" size="sm" className="shrink-0">Reports</Button></Link>
              <Link href="/playground"><Button variant="ghost" size="sm" className="shrink-0">Playground</Button></Link>
              <Link href="/whiteboard"><Button variant="ghost" size="sm" className="shrink-0">Board</Button></Link>
              <Link href="/coach"><Button variant="ghost" size="sm" className="shrink-0">Coach</Button></Link>
              <Link href="/interview"><Button variant="ghost" size="sm" className="shrink-0">Interview</Button></Link>
              <Link href="/codeforces"><Button variant="ghost" size="sm" className="shrink-0">Codeforces</Button></Link>
              <Button variant="ghost" size="sm" className="shrink-0" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Signing out...</> : "Sign Out"}
              </Button>
            </div>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <SearchBar className="max-w-md" />
              </div>
              <div className="flex items-center gap-2">
                <Link href="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
                <Link href="/register"><Button size="sm">Register</Button></Link>
              </div>
            </>
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

      <CommandPalette isAdmin={isAdmin} isAuthenticated={!!session?.user} />

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
                <Link href="/stats" className="py-2 text-sm" onClick={() => setOpen(false)}>
                  Stats
                </Link>
                <Link href="/planner" className="py-2 text-sm" onClick={() => setOpen(false)}>
                  Planner
                </Link>
                <Link href="/reviews" className="py-2 text-sm" onClick={() => setOpen(false)}>
                  Reviews
                </Link>
                <Link href="/readiness" className="py-2 text-sm" onClick={() => setOpen(false)}>
                  Readiness
                </Link>
                <Link href="/learning" className="py-2 text-sm" onClick={() => setOpen(false)}>
                  Learning Graph
                </Link>
                <Link href="/memory" className="py-2 text-sm" onClick={() => setOpen(false)}>
                  Mistake Memory
                </Link>
                <Link href="/reports" className="py-2 text-sm" onClick={() => setOpen(false)}>
                  Reports
                </Link>
                <Link href="/playground" className="py-2 text-sm" onClick={() => setOpen(false)}>
                  Playground
                </Link>
                <Link href="/whiteboard" className="py-2 text-sm" onClick={() => setOpen(false)}>
                  Whiteboard
                </Link>
                <Link href="/coach" className="py-2 text-sm" onClick={() => setOpen(false)}>
                  Coach
                </Link>
                <Link href="/interview" className="py-2 text-sm" onClick={() => setOpen(false)}>
                  Interview
                </Link>
                <Link href="/codeforces" className="py-2 text-sm" onClick={() => setOpen(false)}>
                  Codeforces
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
