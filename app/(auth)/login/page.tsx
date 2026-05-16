import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

function safeRedirect(value: string | undefined): string {
  if (!value) return "/dashboard";
  // Only allow relative paths — prevent open redirect attacks
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//")) return "/dashboard";
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  // Prefer "redirect" (from extension), fall back to "callbackUrl" (from middleware)
  const redirectUrl = safeRedirect(params.redirect ?? params.callbackUrl ?? "/dashboard");
  const safeRedirectParam = redirectUrl !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectUrl)}` : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="text-sm text-muted-foreground">Sign in to track your progress</p>
      </div>
      <LoginForm redirectUrl={redirectUrl} />
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href={`/register${safeRedirectParam}`} className="underline">
          Register
        </Link>
      </p>
    </div>
  );
}
