"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./search-bar";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function Navbar({ isAdmin = false }: { isAdmin?: boolean }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="font-bold">LC Tracker</Link>
        <Link href="/companies" className="text-sm text-muted-foreground hover:text-foreground">Companies</Link>
        <div className="flex-1"><SearchBar className="max-w-md" /></div>
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
    </nav>
  );
}