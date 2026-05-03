"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { syncLeetcodeSubmissions } from "@/actions/sync";
import { SolvedProgress } from "./solved-progress";
import { ContestStats } from "./contest-stats";
import { SkillBars } from "./skill-bars";
import { SubmissionHeatmap } from "./submission-heatmap";
import { RecentSolvedList } from "./recent-solved-list";

interface LeetcodeStatsProps {
  username: string;
}

interface StatsData {
  solved: {
    solvedProblem: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
  };
  contest: {
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
  };
  skill: {
    fundamental: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>;
    intermediate: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>;
    advanced: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>;
  };
}

interface CalendarData {
  streak: number;
  totalActiveDays: number;
  submissionCalendar: Record<string, number>;
}

interface SubmissionsData {
  count: number;
  submissions: Array<{
    title: string;
    titleSlug: string;
    timestamp: string;
    statusDisplay: string;
    lang: string;
  }>;
}

type SyncStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; synced: number; matched: number }
  | { type: "error"; message: string };

export function LeetcodeStats({ username }: LeetcodeStatsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionsData | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ type: "idle" });

  async function handleSync() {
    setSyncStatus({ type: "loading" });
    const result = await syncLeetcodeSubmissions(username);
    if (result.success) {
      setSyncStatus({ type: "success", synced: result.synced, matched: result.matched });
      router.refresh();
    } else {
      setSyncStatus({ type: "error", message: result.error });
    }
  }

  async function fetchData() {
    setLoading(true);
    setError("");
    
    try {
      const [statsRes, calendarRes, submissionsRes] = await Promise.all([
        fetch(`/api/leetcode/stats?username=${username}`),
        fetch(`/api/leetcode/calendar?username=${username}`),
        fetch(`/api/leetcode/submissions?username=${username}`),
      ]);

      const [statsData, calendarData, submissionsData] = await Promise.all([
        statsRes.json(),
        calendarRes.json(),
        submissionsRes.json(),
      ]);

      if (statsData.error || calendarData.error || submissionsData.error) {
        setError(statsData.error || calendarData.error || submissionsData.error);
        setLoading(false);
        return;
      }

      setStats(statsData);
      setCalendar(calendarData);
      setSubmissions(submissionsData);
    } catch {
      setError("Failed to fetch stats");
    }
    
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [username]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={fetchData}>Retry</Button>
      </Card>
    );
  }

  if (!stats || !calendar || !submissions) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <span className="bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-sm">
            🔥 {calendar.streak} day streak
          </span>
          <span className="bg-muted px-3 py-1 rounded-full text-sm">
            📅 {calendar.totalActiveDays} active days
          </span>
        </div>

        <div className="flex items-center gap-2">
          {syncStatus.type === "success" && (
            <span className="flex items-center gap-1 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              {syncStatus.synced} question{syncStatus.synced !== 1 ? "s" : ""} marked solved
              <span className="text-muted-foreground">({syncStatus.matched} LeetCode problems matched)</span>
            </span>
          )}
          {syncStatus.type === "error" && (
            <span className="text-sm text-destructive">{syncStatus.message}</span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={syncStatus.type === "loading"}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncStatus.type === "loading" ? "animate-spin" : ""}`} />
            {syncStatus.type === "loading" ? "Syncing…" : "Sync Solved"}
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <SolvedProgress
          solvedProblem={stats.solved.solvedProblem}
          easySolved={stats.solved.easySolved}
          mediumSolved={stats.solved.mediumSolved}
          hardSolved={stats.solved.hardSolved}
          totalEasy={941}
          totalMedium={2050}
          totalHard={929}
        />
        <ContestStats
          contestAttend={stats.contest.contestAttend}
          contestRating={stats.contest.contestRating}
          contestGlobalRanking={stats.contest.contestGlobalRanking}
          totalParticipants={stats.contest.totalParticipants}
          contestTopPercentage={stats.contest.contestTopPercentage}
          contestParticipation={stats.contest.contestParticipation}
        />
      </div>
      
      <SubmissionHeatmap
        submissionCalendar={calendar.submissionCalendar}
        streak={calendar.streak}
        totalActiveDays={calendar.totalActiveDays}
      />
      
      <SkillBars
        fundamental={stats.skill.fundamental}
        intermediate={stats.skill.intermediate}
        advanced={stats.skill.advanced}
      />
      
      <RecentSolvedList
        submissions={submissions.submissions}
        count={submissions.count}
      />
    </div>
  );
}