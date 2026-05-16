import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = params.redirect ?? "/dashboard";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="text-sm text-muted-foreground">Sign in to track your progress</p>
      </div>
      <LoginForm redirectUrl={redirectUrl} />
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account? <Link href="/register" className="underline">Register</Link>
      </p>
    </div>
  );
}
