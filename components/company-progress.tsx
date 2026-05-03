import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CompanyProgressProps {
  companies: { name: string; slug: string; solved: number; total: number }[];
}

export function CompanyProgress({ companies }: CompanyProgressProps) {
  const withProgress = companies.filter((c) => c.solved > 0 || c.total > 0);
  if (withProgress.length === 0) {
    return <Card className="p-4"><p className="text-muted-foreground">Solve some problems to track your progress.</p></Card>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {withProgress.map((c) => {
        const progress = c.total > 0 ? (c.solved / c.total) * 100 : 0;
        return (
          <Link key={c.slug} href={`/companies/${c.slug}`}>
            <Card className="p-4 transition-colors hover:bg-accent">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{c.name}</h3>
                  <span className="text-sm text-muted-foreground">{c.solved}/{c.total}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
