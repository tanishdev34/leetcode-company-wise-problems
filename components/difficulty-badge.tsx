import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const difficultyConfig = {
  EASY: { label: "Easy", className: "bg-green-500/10 text-green-500 hover:bg-green-500/20" },
  MEDIUM: { label: "Medium", className: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20" },
  HARD: { label: "Hard", className: "bg-red-500/10 text-red-500 hover:bg-red-500/20" },
};

interface DifficultyBadgeProps {
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const config = difficultyConfig[difficulty];
  return (
    <Badge variant="secondary" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
