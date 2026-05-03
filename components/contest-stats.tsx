"use client";

import { Card } from "@/components/ui/card";

interface ContestStatsProps {
  contestAttend: number;
  contestRating: number;
  contestGlobalRanking: number;
  totalParticipants: number;
  contestTopPercentage: number;
  contestParticipation: Array<{
    attended: boolean;
    rating: number;
    ranking: number;
    trendDirection: "UP" | "DOWN";
    problemsSolved: number;
    totalProblems: number;
    finishTimeInSeconds: number;
    contest: { title: string; startTime: number };
  }>;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m ${secs}s`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}

export function ContestStats({
  contestAttend,
  contestRating,
  contestGlobalRanking,
  totalParticipants,
  contestTopPercentage,
  contestParticipation,
}: ContestStatsProps) {
  return (
    <Card className="p-4">
      <div className="text-center mb-4">
        <p className="text-4xl font-bold">{Math.round(contestRating)}</p>
        <p className="text-sm text-muted-foreground">Contest Rating</p>
      </div>
      
      <div className="flex justify-center gap-2 mb-4">
        <span className="text-sm bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">
          Top {contestTopPercentage.toFixed(2)}%
        </span>
        <span className="text-sm text-muted-foreground">
          #{contestGlobalRanking.toLocaleString()} global
        </span>
      </div>
      
      <p className="text-sm text-muted-foreground text-center mb-4">
        {contestAttend} contest{contestAttend !== 1 ? "s" : ""} attended
      </p>
      
      <div className="space-y-3">
        {contestParticipation.map((contest, i) => (
          <div key={i} className="border-b pb-2 last:border-0">
            <div className="flex justify-between items-center">
              <span className="font-medium">{contest.contest.title}</span>
              <span className="text-sm text-muted-foreground">
                {formatDate(contest.contest.startTime)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>
                {contest.problemsSolved} / {contest.totalProblems} solved
              </span>
              <span>#{contest.ranking.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className={contest.trendDirection === "UP" ? "text-green-500" : "text-red-500"}>
                {contest.trendDirection === "UP" ? "↑" : "↓"} {contest.rating.toFixed(1)}
              </span>
              <span className="text-muted-foreground">
                {formatTime(contest.finishTimeInSeconds)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}