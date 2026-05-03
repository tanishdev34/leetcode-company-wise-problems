"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { DifficultyBadge } from "./difficulty-badge";
import { QuestionDetail } from "./question-detail";
import { toggleSolved } from "@/actions/questions";

interface QuestionRowProps {
  id: string;
  title: string;
  leetcodeUrl: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topics: string[];
  frequency: number;
  solved: boolean;
  isAuthenticated: boolean;
}

export function QuestionRow({
  id, title, leetcodeUrl, difficulty, topics, frequency,
  solved: initialSolved, isAuthenticated,
}: QuestionRowProps) {
  const [solved, setSolved] = useState(initialSolved);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const result = await toggleSolved(id);
      if (result.success) setSolved(result.data.solved);
    } catch {}
    setLoading(false);
  }

  return (
    <div className="border-b">
      <div
        className="flex cursor-pointer items-center gap-4 px-4 py-3 hover:bg-accent/50"
        onClick={() => setExpanded(!expanded)}
      >
        {isAuthenticated && (
          <Checkbox
            checked={solved}
            onCheckedChange={handleToggle}
            disabled={loading}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <a
            href={leetcodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {title}
          </a>
          <DifficultyBadge difficulty={difficulty} />
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {topics.slice(0, 3).map((topic) => (
            <span key={topic} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {topic}
            </span>
          ))}
          {topics.length > 3 && (
            <span className="text-xs text-muted-foreground">+{topics.length - 3}</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{frequency.toFixed(1)}%</span>
      </div>
      {expanded && <QuestionDetail questionId={id} isAuthenticated={isAuthenticated} />}
    </div>
  );
}
