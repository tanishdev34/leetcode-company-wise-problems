"use client"

import { useSession, signOut } from "@/lib/auth-client"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Home, Map, BookOpen, Brain, Settings, LogOut,
  Shield, Network, ChevronLeft, Loader2,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: Home, badge: null },
  { href: "/roadmaps", label: "Roadmaps", icon: Map, badge: null },
  { href: "/library", label: "Library", icon: BookOpen, badge: null },
  { href: "/coach", label: "Coach", icon: Brain, badge: null },
]

const SECONDARY_ITEMS = [
  { href: "/settings", label: "Settings", icon: Settings },
]

const ADMIN_ITEMS = [
  { href: "/admin/questions", label: "Questions", icon: Shield },
  { href: "/admin/system-map", label: "System Map", icon: Network },
]

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    router.push("/")
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === "/today") return pathname === "/today"
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen border-r bg-background/50 backdrop-blur-sm sticky top-0 transition-all duration-200",
        collapsed ? "w-16" : "w-52"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-14 border-b">
        {!collapsed && (
          <Link href="/today" className="font-heading font-bold tracking-tight text-sm">
            LC Tracker
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.badge && (
                <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1">
                  {item.badge}
                </Badge>
              )}
            </Link>
          )
        })}

        {/* Separator */}
        <div className="h-px bg-border my-3" />

        {/* Secondary */}
        {SECONDARY_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}

        {/* Admin */}
        {isAdmin && (
          <>
            <div className="h-px bg-border my-3" />
            {!collapsed && (
              <p className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Admin
              </p>
            )}
            {ADMIN_ITEMS.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t px-2 py-2">
        {session?.user && (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
              {(session.user.name || session.user.email)?.[0]?.toUpperCase() ?? "?"}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{session.user.name || session.user.email}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Sign out"
            >
              {signingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
