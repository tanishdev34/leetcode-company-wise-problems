"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./search-bar";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, Command, Loader2, Menu, X } from "lucide-react";
import { CommandPalette } from "./command-palette";

const PRIMARY_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/planner", label: "Planner" },
  { href: "/reviews", label: "Reviews" },
  { href: "/playground", label: "Playground" },
];

const MORE_LINKS = [
  { href: "/stats", label: "Stats" },
  { href: "/readiness", label: "Readiness" },
  { href: "/learning", label: "Learning Graph" },
  { href: "/memory", label: "Mistake Memory" },
  { href: "/reports", label: "Study Reports" },
  { href: "/whiteboard", label: "Whiteboard" },
  { href: "/coach", label: "AI Coach" },
  { href: "/interview", label: "Mock Interview" },
  { href: "/codeforces", label: "Codeforces" },
];

export function Navbar({ isAdmin = false }: { isAdmin?: boolean }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
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
        <Link
          href="/"
          className="rounded-sm font-bold tracking-tight whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setOpen(false)}
        >
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
          className="hidden items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:inline-flex"
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
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1">
                {PRIMARY_LINKS.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant={pathname === link.href ? "secondary" : "ghost"}
                      size="sm"
                      className="px-2.5"
                    >
                      {link.label}
                    </Button>
                  </Link>
                ))}
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-2.5"
                    aria-expanded={moreOpen}
                    onClick={() => setMoreOpen((value) => !value)}
                  >
                    More
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                  {moreOpen && (
                    <div className="absolute left-0 top-10 z-50 w-56 rounded-md border bg-popover p-1.5 text-popover-foreground shadow-lg">
                      {MORE_LINKS.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="block rounded-sm px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          {link.label}
                        </Link>
                      ))}
                      {isAdmin && (
                        <Link
                          href="/admin/system-map"
                          className="block rounded-sm px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          System Map
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isAdmin && (
                  <Link href="/admin/questions">
                    <Button variant="outline" size="sm" className="border-primary/40 text-primary hover:bg-primary/10">
                      + Add Questions
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut} disabled={signingOut}>
                  {signingOut ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Signing out...</> : "Sign Out"}
                </Button>
              </div>
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
