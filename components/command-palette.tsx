"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";
import {
  LayoutDashboard,
  Building2,
  Search,
  BarChart3,
  Code,
  Shield,
  Home,
  ExternalLink,
  Calendar,
  Brain,
  Target,
  MessageSquare,
  Play,
  GitBranch,
  FileText,
  Network,
  ClipboardList,
  FlaskConical,
  PenLine,
} from "lucide-react";

interface CommandPaletteProps {
  isAdmin?: boolean;
  isAuthenticated?: boolean;
}

const PAGES = [
  { id: "home", label: "Home", href: "/", icon: Home, auth: false, admin: false },
  { id: "companies", label: "Companies", href: "/companies", icon: Building2, auth: false, admin: false },
  { id: "search", label: "Search", href: "/search", icon: Search, auth: false, admin: false },
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, auth: true, admin: false },
  { id: "planner", label: "Study Planner", href: "/planner", icon: Calendar, auth: true, admin: false },
  { id: "reviews", label: "Review Queue", href: "/reviews", icon: Brain, auth: true, admin: false },
  { id: "readiness", label: "Interview Readiness", href: "/readiness", icon: Target, auth: true, admin: false },
  { id: "learning", label: "Learning Graph", href: "/learning", icon: GitBranch, auth: true, admin: false },
  { id: "memory", label: "Mistake Memory", href: "/memory", icon: ClipboardList, auth: true, admin: false },
  { id: "reports", label: "Study Reports", href: "/reports", icon: FileText, auth: true, admin: false },
  { id: "playground", label: "Code Playground", href: "/playground", icon: FlaskConical, auth: true, admin: false },
  { id: "whiteboard", label: "Whiteboard", href: "/whiteboard", icon: PenLine, auth: true, admin: false },
  { id: "stats", label: "Stats", href: "/stats", icon: BarChart3, auth: true, admin: false },
  { id: "codeforces", label: "Codeforces", href: "/codeforces", icon: Code, auth: true, admin: false },
  { id: "coach", label: "AI Interview Coach", href: "/coach", icon: MessageSquare, auth: true, admin: false },
  { id: "interview", label: "Mock Interview Room", href: "/interview", icon: Play, auth: true, admin: false },
  { id: "admin", label: "Admin — Add Questions", href: "/admin/questions", icon: Shield, auth: true, admin: true },
  { id: "system-map", label: "Admin — System Map", href: "/admin/system-map", icon: Network, auth: true, admin: true },
];

export function CommandPalette({ isAdmin = false, isAuthenticated = false }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
  }, []);

  const visiblePages = PAGES.filter(
    (page) => {
      if (page.admin && !isAdmin) return false;
      if (page.auth && !isAuthenticated) return false;
      return true;
    },
  );

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput placeholder="Jump to a page..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {visiblePages.map((page) => {
            const Icon = page.icon;
            return (
              <CommandItem
                key={page.id}
                value={page.label}
                onSelect={() => handleSelect(page.href)}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{page.label}</span>
                {page.href.startsWith("http") && (
                  <ExternalLink className="ml-2 h-3 w-3 text-muted-foreground" />
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
