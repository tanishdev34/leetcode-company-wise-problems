import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="text-sm text-muted-foreground">Create an account to start tracking</p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account? <Link href="/login" className="underline">Sign In</Link>
      </p>
    </div>
  );
}
