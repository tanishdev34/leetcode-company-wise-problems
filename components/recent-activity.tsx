import { Card } from "@/components/ui/card";
import { DifficultyBadge } from "./difficulty-badge";

interface ActivityItem {
  id: string; title: string; leetcodeUrl: string;
  difficulty: "EASY" | "MEDIUM" | "HARD"; solvedAt: Date | null;
}

interface RecentActivityProps { activity: ActivityItem[]; }

export function RecentActivity({ activity }: RecentActivityProps) {
  if (activity.length === 0) {
    return <Card className="p-4"><p className="text-muted-foreground">No recent activity.</p></Card>;
  }
  return (
    <div className="flex flex-col gap-2">
      {activity.map((item) => (
        <a key={item.id} href={item.leetcodeUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-md border p-3 hover:bg-accent">
          <span className="flex-1 font-medium">{item.title}</span>
          <DifficultyBadge difficulty={item.difficulty} />
          {item.solvedAt && (
            <span className="text-xs text-muted-foreground">{new Date(item.solvedAt).toLocaleDateString()}</span>
          )}
        </a>
      ))}
    </div>
  );
}
