"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node } from "@xyflow/react";
import { getLearningGraph } from "@/actions/learning-graph";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { LearningGraphResult } from "@/lib/learning-graph";
import { GitBranch, RefreshCw } from "lucide-react";

const NODE_COLORS: Record<string, string> = {
  root: "var(--primary)",
  topic: "#38bdf8",
  question: "#a78bfa",
  company: "#34d399",
};

function positionFor(index: number, type: string) {
  const lanes: Record<string, number> = {
    root: 0,
    topic: 220,
    question: 500,
    company: 820,
  };
  return {
    x: lanes[type] ?? 500,
    y: type === "root" ? 80 : 40 + (index % 18) * 86,
  };
}

function toFlowNodes(graph: LearningGraphResult): Node[] {
  const counters = new Map<string, number>();
  return graph.nodes.map((node) => {
    const index = counters.get(node.type) ?? 0;
    counters.set(node.type, index + 1);

    return {
      id: node.id,
      position: positionFor(index, node.type),
      data: {
        label: (
          <div className="max-w-[180px]">
            <div className="truncate text-xs font-semibold">{node.label}</div>
            {node.detail && <div className="truncate text-[10px] opacity-70">{node.detail}</div>}
          </div>
        ),
      },
      style: {
        border: `1px solid ${NODE_COLORS[node.type] ?? "#64748b"}`,
        background: "var(--background)",
        color: "var(--foreground)",
        borderRadius: 4,
        boxShadow: "0 14px 40px color-mix(in oklch, var(--foreground) 8%, transparent)",
      },
    };
  });
}

function toFlowEdges(graph: LearningGraphResult): Edge[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: edge.source.startsWith("root"),
    style: { stroke: "var(--muted-foreground)", strokeWidth: 1.5 },
  }));
}

export function LearningGraphView() {
  const [graph, setGraph] = useState<LearningGraphResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getLearningGraph();
    if (result.success) {
      setGraph(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const nodes = useMemo(() => (graph ? toFlowNodes(graph) : []), [graph]);
  const edges = useMemo(() => (graph ? toFlowEdges(graph) : []), [graph]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[640px] w-full" />
      </div>
    );
  }

  if (error || !graph) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <GitBranch className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error ?? "No graph data available."}</p>
          <Button className="mt-4" variant="outline" onClick={fetchGraph}>
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
          <h1 className="text-2xl font-bold">Learning Graph</h1>
          <p className="text-sm text-muted-foreground">
            Topics, questions, companies, solved work, and due reviews as one explorable map.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchGraph}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Weak Topics</CardTitle>
            <CardDescription>Low solved coverage with enough signal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {graph.insights.weakTopics.length === 0 ? (
              <p className="text-muted-foreground">No weak topic cluster yet.</p>
            ) : (
              graph.insights.weakTopics.map((topic) => (
                <div key={topic.topic} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <span>{topic.topic}</span>
                  <span className="text-muted-foreground">
                    {topic.solvedCount}/{topic.totalCount}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Strong Topics</CardTitle>
            <CardDescription>Areas with high solved coverage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {graph.insights.strongTopics.length === 0 ? (
              <p className="text-muted-foreground">Solve more clustered topics to see strengths.</p>
            ) : (
              graph.insights.strongTopics.map((topic) => (
                <div key={topic.topic} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <span>{topic.topic}</span>
                  <span className="text-muted-foreground">
                    {Math.round(topic.solvedRatio * 100)}%
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Review Pressure</CardTitle>
            <CardDescription>Questions currently due for review.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{graph.insights.dueReviewCount}</div>
            <p className="text-muted-foreground">due review nodes influence the graph priority.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="h-[680px]">
        <CardContent className="h-full p-0">
          <ReactFlow nodes={nodes} edges={edges} fitView minZoom={0.2}>
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </CardContent>
      </Card>
    </div>
  );
}
