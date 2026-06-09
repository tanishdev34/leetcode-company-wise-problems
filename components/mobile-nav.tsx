"use client"

import { useSession, signOut } from "@/lib/auth-client"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SearchBar } from "@/components/search-bar"
import {
  Home, Map, BookOpen, Brain, Menu, X,
  LogOut, Loader2,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: Home },
  { href: "/roadmaps", label: "Roadmaps", icon: Map },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/coach", label: "Coach", icon: Brain },
]

export function MobileNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])

  const isActive = (href: string) => {
    if (href === "/today") return pathname === "/today"
    return pathname.startsWith(href)
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <div className="md:hidden">
      {/* Top bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between h-12 px-3 border-b bg-background/80 backdrop-blur-md">
        <Link href="/today" className="font-heading font-bold tracking-tight text-sm">
          LC Tracker
        </Link>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-accent"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-around h-14">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", active && "text-primary")} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="fixed inset-0 top-12 z-50 bg-background overflow-y-auto">
          <div className="px-4 py-3 space-y-3">
            <SearchBar />
            <Link href="/reviews" className="block py-2 text-sm" onClick={() => setOpen(false)}>
              Reviews
            </Link>
            <Link href="/interview" className="block py-2 text-sm" onClick={() => setOpen(false)}>
              Mock Interview
            </Link>
            <Link href="/memory" className="block py-2 text-sm" onClick={() => setOpen(false)}>
              Mistake Memory
            </Link>
            <Link href="/settings" className="block py-2 text-sm" onClick={() => setOpen(false)}>
              Settings
            </Link>
            {isAdmin && (
              <Link href="/admin/questions" className="block py-2 text-sm text-primary" onClick={() => setOpen(false)}>
                + Add Questions
              </Link>
            )}
            <Button variant="ghost" size="sm" className="justify-start w-full" onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Signing out...</> : "Sign Out"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
