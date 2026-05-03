import { Card } from "@/components/ui/card";

interface StatsOverviewProps {
  totalSolved: number;
  byDifficulty: { EASY: number; MEDIUM: number; HARD: number };
}

export function StatsOverview({ totalSolved, byDifficulty }: StatsOverviewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">Total Solved</p>
        <p className="text-3xl font-bold">{totalSolved}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-green-500">Easy</p>
        <p className="text-3xl font-bold">{byDifficulty.EASY}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-yellow-500">Medium</p>
        <p className="text-3xl font-bold">{byDifficulty.MEDIUM}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-red-500">Hard</p>
        <p className="text-3xl font-bold">{byDifficulty.HARD}</p>
      </Card>
    </div>
  );
}
