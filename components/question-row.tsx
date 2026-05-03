"use client";

import { useState } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { DifficultyBadge } from "./difficulty-badge";
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
    <div className="flex items-center gap-4 border-b px-4 py-3 hover:bg-accent/50">
      {isAuthenticated && (
        <Checkbox
          checked={solved}
          onCheckedChange={handleToggle}
          disabled={loading}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href={`/questions/${id}`}
          className="truncate font-medium hover:underline"
        >
          {title}
        </Link>
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
      <a
        href={leetcodeUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Open in LeetCode"
        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>
    </div>
  );
}
