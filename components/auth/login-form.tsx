"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { signInWithGoogle } from "@/lib/google-signin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function LoginForm({ redirectUrl = "/dashboard" }: { redirectUrl?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"idle" | "email" | "google">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading("email");
    const { error } = await signIn.email({ email, password });
    if (error) {
      setError(error.message || "Login failed");
      setLoading("idle");
      return;
    }
    router.push(redirectUrl);
    router.refresh();
  }

  async function handleGoogle() {
    setError("");
    setLoading("google");
    try {
      const { redirectTo, hardReload } = await signInWithGoogle(redirectUrl);
      if (hardReload) return; // window.location.href already triggered
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading("idle");
    }
  }

  const isLoading = loading !== "idle";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isLoading}>
        {loading === "email" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : "Sign In"}
      </Button>
      <Button type="button" variant="outline" onClick={handleGoogle} disabled={isLoading}>
        {loading === "google" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting...</> : "Continue with Google"}
      </Button>
    </form>
  );
}
