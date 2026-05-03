import { Navbar } from "@/components/navbar";
import { LoadingBar } from "@/components/loading-bar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <LoadingBar />
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
