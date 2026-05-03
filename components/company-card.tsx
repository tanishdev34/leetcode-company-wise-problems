import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CompanyCardProps {
  name: string;
  slug: string;
  questionCount: number;
  solvedCount?: number;
}

export function CompanyCard({ name, slug, questionCount, solvedCount = 0 }: CompanyCardProps) {
  const progress = questionCount > 0 ? (solvedCount / questionCount) * 100 : 0;
  return (
    <Link href={`/companies/${slug}`}>
      <Card className="p-4 transition-colors hover:bg-accent">
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">{name}</h3>
          <p className="text-sm text-muted-foreground">{questionCount} questions</p>
          {solvedCount > 0 && (
            <div className="flex flex-col gap-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">{solvedCount}/{questionCount} solved</p>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
