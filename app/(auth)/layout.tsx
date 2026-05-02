import { Card } from "@/components/ui/card";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md p-6">{children}</Card>
    </div>
  );
}
