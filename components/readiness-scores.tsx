"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getReadinessScores } from "@/actions/readiness";
import { useSession } from "@/lib/auth-client";
import {
  RefreshCw,
  Target,
  ChevronRight,
  Info,
} from "lucide-react";

const SCORE_TEXT_COLORS = (score: number) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  if (score >= 20) return "text-orange-400";
  return "text-red-400";
};

const LABEL = (score: number) => {
  if (score >= 80) return "Ready";
  if (score >= 60) return "Almost Ready";
  if (score >= 40) return "Getting There";
  if (score >= 20) return "Needs Work";
  return "Just Started";
};

export function ReadinessScores() {
  const { data: session } = useSession();
  const [data, setData] = useState<{
    companies: {
      name: string;
      slug: string;
      score: number;
      solvedCount: number;
      totalCount: number;
      difficultyCoverage: number;
      totalDifficulties: number;
      recencyScore: number;
      reviewFreshness: number;
      breakdown: {
        solvedRatio: number;
        difficultyBonus: number;
        recencyBonus: number;
        reviewBonus: number;
      };
    }[];
    overallScore: number;
    totalSolved: number;
    totalQuestions: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getReadinessScores();
    if (result.success) setData(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!session?.user) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="py-12 text-center">
          <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Sign in to see your interview readiness scores.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!data || data.companies.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No data yet</h3>
          <p className="text-sm text-muted-foreground">
            Solve some questions to see your interview readiness by company.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Interview Readiness</h1>
          <p className="text-sm text-muted-foreground">
            Per-company readiness based on solved ratio, difficulty coverage, recency, and reviews
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Overall score */}
      <Card className="border-primary/20">
        <CardContent className="py-6 flex items-center gap-6">
          <div className="flex flex-col items-center">
            <div className={`text-4xl font-bold ${SCORE_TEXT_COLORS(data.overallScore)}`}>
              {data.overallScore}
            </div>
            <div className="text-xs text-muted-foreground">Overall</div>
          </div>
          <div className="flex-1 space-y-1">
            <Progress value={data.overallScore} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{LABEL(data.overallScore)}</span>
              <span>{data.totalSolved}/{data.totalQuestions} solved</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company scores */}
      <div className="space-y-3">
        {data.companies.map((company) => (
          <Link key={company.slug} href={`/companies/${company.slug}`}>
            <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  {/* Score circle */}
                  <div className="flex flex-col items-center min-w-[60px]">
                    <div className={`text-xl font-bold ${SCORE_TEXT_COLORS(company.score)}`}>
                      {company.score}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {LABEL(company.score)}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{company.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {company.solvedCount}/{company.totalCount} solved
                      </span>
                    </div>
                    <Progress
                      value={company.score}
                      className="h-1.5"
                    />
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1">
                            <span>Solved: {company.breakdown.solvedRatio}/40</span>
                            <Info className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Ratio of questions solved for this company</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span>Difficulty: {company.difficultyCoverage}/{company.totalDifficulties}</span>
                      <span>Recency: {company.recencyScore}%</span>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
