"use client";

import { Card } from "@/components/ui/card";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Button } from "@/components/ui/button";

interface DailyProblem {
  questionLink: string;
  date: string;
  questionTitle: string;
  titleSlug: string;
  difficulty: string;
  isPaidOnly: boolean;
  topicTags: Array<{ name: string; slug: string }>;
  likes: number;
  dislikes: number;
  hints: string[];
}

interface DailyProblemCardProps {
  problem: DailyProblem;
}

export function DailyProblemCard({ problem }: DailyProblemCardProps) {
  const difficultyMap: Record<string, "EASY" | "MEDIUM" | "HARD"> = {
    Easy: "EASY",
    Medium: "MEDIUM",
    Hard: "HARD",
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">Daily Challenge</span>
        <span className="text-sm text-muted-foreground">{problem.date}</span>
      </div>
      
      <div className="flex items-center gap-3 mb-3">
        <a 
          href={problem.questionLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-lg font-semibold hover:text-primary transition-colors"
        >
          {problem.questionTitle}
        </a>
        {problem.isPaidOnly && (
          <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">Premium</span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <DifficultyBadge difficulty={difficultyMap[problem.difficulty] || "EASY"} />
        {problem.topicTags.slice(0, 3).map((tag) => (
          <span key={tag.slug} className="text-xs bg-muted px-2 py-0.5 rounded">
            {tag.name}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          👍 {problem.likes.toLocaleString()} 👎 {problem.dislikes.toLocaleString()}
        </span>
        
        <div className="flex items-center gap-2">
          {problem.hints.length > 0 && (
            <details className="group">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                {problem.hints.length} hint{problem.hints.length > 1 ? "s" : ""}
              </summary>
              <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                {problem.hints.map((hint, i) => (
                  <li key={i} className="list-disc list-inside">{hint}</li>
                ))}
              </ul>
            </details>
          )}
          <a href={problem.questionLink} target="_blank" rel="noopener noreferrer">
            <Button size="sm">
              Solve Now →
            </Button>
          </a>
        </div>
      </div>
    </Card>
  );
}