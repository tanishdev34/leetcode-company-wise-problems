"use client";

import { useCallback, useEffect, useState } from "react";
import { getMistakeMemory } from "@/actions/mistake-memory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { MistakeMemoryResult } from "@/lib/mistake-memory";
import { Brain, RefreshCw } from "lucide-react";

function severityVariant(severity: string) {
  if (severity === "high") return "destructive" as const;
  if (severity === "medium") return "secondary" as const;
  return "outline" as const;
}

export function MistakeMemoryView() {
  const [memory, setMemory] = useState<MistakeMemoryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMemory = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getMistakeMemory();
    if (result.success) setMemory(result.data);
    else setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !memory) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Brain className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error ?? "No memory available."}</p>
          <Button className="mt-4" variant="outline" onClick={fetchMemory}>
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
          <h1 className="text-2xl font-bold">Mistake Memory</h1>
          <p className="text-sm text-muted-foreground">
            Recurring patterns mined from AI reviews, review confidence, and interview reflections.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMemory}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Patterns</CardTitle>
            <CardDescription>The habits your practice data keeps mentioning.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {memory.patterns.length === 0 ? (
              <p className="text-muted-foreground">
                Complete more solution reviews or interviews to build useful memory.
              </p>
            ) : (
              memory.patterns.map((pattern) => (
                <div key={pattern.label} className="border-b pb-4 last:border-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{pattern.label}</h3>
                    <Badge variant={severityVariant(pattern.severity)}>{pattern.severity}</Badge>
                    <span className="text-xs text-muted-foreground">{pattern.evidenceCount} signals</span>
                  </div>
                  <div className="space-y-1">
                    {pattern.evidence.map((item) => (
                      <p key={item} className="text-xs text-muted-foreground">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Moves</CardTitle>
            <CardDescription>Specific ways to respond to the memory.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {memory.recommendations.map((recommendation) => (
              <div key={recommendation} className="rounded-sm bg-muted/60 p-3 text-sm">
                {recommendation}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
