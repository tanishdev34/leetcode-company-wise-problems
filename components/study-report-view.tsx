"use client";

import { useCallback, useEffect, useState } from "react";
import { getWeeklyStudyReport } from "@/actions/study-report";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { StudyReportResult } from "@/lib/study-report";
import { BarChart3, RefreshCw } from "lucide-react";

export function StudyReportView() {
  const [report, setReport] = useState<StudyReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getWeeklyStudyReport();
    if (result.success) {
      setReport(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error ?? "No report available."}</p>
          <Button className="mt-4" variant="outline" onClick={fetchReport}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{report.title}</h1>
          <p className="text-sm text-muted-foreground">{report.periodLabel}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReport}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Regenerate
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {[
          ["Solved", report.metrics.solvedCount],
          ["Hard", report.metrics.hardSolved],
          ["Due Reviews", report.metrics.dueReviewCount],
          ["Completed Reviews", report.metrics.completedReviews],
          ["Interviews", report.metrics.interviewCount],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Highlights</CardTitle>
            <CardDescription>The useful signal from this week.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.highlights.map((highlight) => (
              <div key={highlight} className="border-l-2 border-primary pl-3 text-sm">
                {highlight}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended Next Actions</CardTitle>
            <CardDescription>Small moves with high leverage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.recommendations.map((recommendation) => (
              <div key={recommendation} className="rounded-sm bg-muted/60 p-3 text-sm">
                {recommendation}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Company Focus</CardTitle>
            <CardDescription>Lowest readiness scores first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.companyFocus.length === 0 ? (
              <p className="text-muted-foreground">Solve company-linked questions to generate focus areas.</p>
            ) : (
              report.companyFocus.map((company) => (
                <div key={company.name} className="flex justify-between border-b pb-2 last:border-0">
                  <span>{company.name}</span>
                  <span className="text-muted-foreground">{company.score}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Topic Momentum</CardTitle>
            <CardDescription>Topics touched most this week.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.topicFocus.length === 0 ? (
              <p className="text-muted-foreground">Solve questions this week to see topic momentum.</p>
            ) : (
              report.topicFocus.map((topic) => (
                <div key={topic.topic} className="flex justify-between border-b pb-2 last:border-0">
                  <span>{topic.topic}</span>
                  <span className="text-muted-foreground">{topic.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
