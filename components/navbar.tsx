"use client";

import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./search-bar";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="border-b">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="font-bold">LC Tracker</Link>
        <Link href="/companies" className="text-sm text-muted-foreground hover:text-foreground">Companies</Link>
        <div className="flex-1"><SearchBar className="max-w-md" /></div>
        {session?.user ? (
          <div className="flex items-center gap-3">
            <Link href="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign Out</Button>
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
