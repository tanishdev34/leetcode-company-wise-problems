"use client";

import { Card } from "@/components/ui/card";

interface RecentSolvedListProps {
  submissions: Array<{
    title: string;
    titleSlug: string;
    timestamp: string;
    statusDisplay: string;
    lang: string;
  }>;
  count: number;
}

const LANG_DISPLAY: Record<string, string> = {
  cpp: "C++",
  python3: "Python",
  java: "Java",
  javascript: "JS",
  typescript: "TS",
  rust: "Rust",
  go: "Go",
  kotlin: "Kotlin",
  swift: "Swift",
  c: "C",
  csharp: "C#",
};

function timeAgo(timestamp: string): string {
  const seconds = Math.floor(Date.now() / 1000 - parseInt(timestamp));
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

export function RecentSolvedList({ submissions, count }: RecentSolvedListProps) {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Recently Solved</h3>
      
      <div className="space-y-2">
        {submissions.map((sub, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-green-500 text-xs">✓</span>
              <a
                href={`https://leetcode.com/problems/${sub.titleSlug}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary truncate"
              >
                {sub.title}
              </a>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {LANG_DISPLAY[sub.lang] || sub.lang}
              </span>
              <span className="text-xs text-muted-foreground">
                {timeAgo(sub.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}