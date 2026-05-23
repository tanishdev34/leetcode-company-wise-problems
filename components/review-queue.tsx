"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { getDueReviews, scheduleReview, getReviewStats } from "@/actions/review";
import { useSession } from "@/lib/auth-client";
import { cacheReviews, getCachedReviews, getLastSyncedTime } from "@/lib/offline";
import {
  RefreshCw,
  ExternalLink,
  Brain,
  CalendarClock,
  CheckCircle2,
  RotateCcw,
  CloudOff,
  Loader2,
} from "lucide-react";

const CONFIDENCE_LABELS: Record<number, string> = {
  1: "Forgot — review tomorrow",
  2: "Struggled — review in 2 days",
  3: "Moderate — review in 4 days",
  4: "Good — review in 7 days",
  5: "Mastered — review in 14 days",
};

const CONFIDENCE_COLORS: Record<number, string> = {
  1: "bg-red-500/20 text-red-400 hover:bg-red-500/30",
  2: "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30",
  3: "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30",
  4: "bg-green-500/20 text-green-400 hover:bg-green-500/30",
  5: "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "bg-green-500/20 text-green-400",
  MEDIUM: "bg-amber-500/20 text-amber-400",
  HARD: "bg-red-500/20 text-red-400",
};

export function ReviewQueue() {
  const { data: session } = useSession();
  const [items, setItems] = useState<{
    id: string;
    questionId: string;
    questionTitle: string;
    leetcodeUrl: string;
    difficulty: string;
    confidence: number;
    reviewCount: number;
    lastReviewedAt: Date | null;
    nextReviewAt: Date;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [offline, setOffline] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [stats, setStats] = useState<{ dueCount: number; totalCount: number; nextReview: string | null } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setOffline(false);
    const [itemsResult, statsResult] = await Promise.all([
      getDueReviews(),
      getReviewStats(),
    ]);
    if (itemsResult.success) {
      setItems(itemsResult.data.items);
      // Cache reviews for offline use
      cacheReviews(itemsResult.data.items.map((item: any) => ({
        ...item,
        lastReviewedAt: item.lastReviewedAt?.toISOString() ?? null,
        nextReviewAt: item.nextReviewAt.toISOString(),
      })));
    } else if (!navigator.onLine) {
      // Offline fallback — load from cache
      const cached = await getCachedReviews();
      setItems(cached.map((item) => ({
        ...item,
        lastReviewedAt: item.lastReviewedAt ? new Date(item.lastReviewedAt) : null,
        nextReviewAt: new Date(item.nextReviewAt),
      })));
      setOffline(true);
      const synced = await getLastSyncedTime();
      setLastSynced(synced);
    }
    if (statsResult.success) setStats(statsResult.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReview = useCallback(
    async (confidence: number) => {
      if (currentIndex >= items.length) return;
      const item = items[currentIndex];
      setSubmitting(true);
      const result = await scheduleReview(item.questionId, confidence);
      if (result.success) {
        // Move to next
        setCurrentIndex((prev) => prev + 1);
      }
      setSubmitting(false);
    },
    [currentIndex, items],
  );

  const handleRefresh = useCallback(() => {
    setCurrentIndex(0);
    fetchData();
  }, [fetchData]);

  if (!session?.user) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="py-12 text-center">
          <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Sign in to use spaced repetition reviews.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const remaining = items.length - currentIndex;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Queue</h1>
          <p className="text-sm text-muted-foreground">
            Spaced repetition reviews to reinforce what you&apos;ve learned
          </p>
          {offline && (
            <div className="flex items-center gap-2 mt-1">
              <CloudOff className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs text-amber-400">
                Offline — showing cached data
                {lastSynced && ` (last synced ${new Date(lastSynced).toLocaleString()})`}
              </span>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats overview */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <CalendarClock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.dueCount}</p>
                <p className="text-xs text-muted-foreground">Due for review</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <Brain className="h-8 w-8 text-amber-400" />
              <div>
                <p className="text-2xl font-bold">{stats.totalCount}</p>
                <p className="text-xs text-muted-foreground">Total tracked</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold">{stats.totalCount - stats.dueCount}</p>
                <p className="text-xs text-muted-foreground">Up to date</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-lg font-medium mb-1">All caught up!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No questions are due for review right now.
            </p>
            <p className="text-xs text-muted-foreground">
              Reviews are automatically scheduled when you mark a question as solved.
            </p>
          </CardContent>
        </Card>
      ) : currentIndex >= items.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-lg font-medium mb-1">Session complete!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You&apos;ve reviewed all {items.length} due question{items.length !== 1 ? "s" : ""}.
            </p>
            <Button onClick={handleRefresh}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Start fresh
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <Progress value={((items.length - remaining) / items.length) * 100} className="flex-1" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {items.length - remaining}/{items.length} reviewed
            </span>
          </div>

          {/* Current review card */}
          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{currentItem.questionTitle}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`text-[10px] ${DIFFICULTY_COLORS[currentItem.difficulty] || ""}`}>
                      {currentItem.difficulty}
                    </Badge>
                    <span className="text-xs">
                      Review #{currentItem.reviewCount + 1}
                    </span>
                  </CardDescription>
                </div>
                <a
                  href={currentItem.leetcodeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  How well did you remember this question?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      disabled={submitting}
                      onClick={() => handleReview(level)}
                      className={`rounded-md border px-3 py-2.5 text-xs font-medium transition-colors text-center ${
                        CONFIDENCE_COLORS[level] || ""
                      } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="text-base font-bold mb-0.5">{level}</div>
                      <div className="text-[10px] leading-tight opacity-80">
                        {CONFIDENCE_LABELS[level].split(" — ")[1]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
