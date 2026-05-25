"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node } from "@xyflow/react";
import { getSystemMap } from "@/actions/system-map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SystemMapResult } from "@/lib/system-map";
import { Network, RefreshCw } from "lucide-react";

const LANES: Record<string, number> = {
  layer: 40,
  page: 280,
  api: 500,
  component: 720,
  action: 940,
  data: 1160,
  doc: 1380,
};

function toFlowNodes(map: SystemMapResult): Node[] {
  const counters = new Map<string, number>();
  return map.nodes.map((node) => {
    const index = counters.get(node.type) ?? 0;
    counters.set(node.type, index + 1);
    return {
      id: node.id,
      position: {
        x: LANES[node.type] ?? 500,
        y: 40 + (index % 24) * 72,
      },
      data: {
        label: (
          <div className="max-w-[170px]">
            <div className="truncate text-xs font-medium">{node.label}</div>
            {node.path && <div className="truncate text-[10px] opacity-60">{node.path}</div>}
          </div>
        ),
      },
      style: {
        border: node.type === "layer" ? "1px solid var(--primary)" : "1px solid var(--border)",
        background:
          node.type === "layer"
            ? "color-mix(in oklch, var(--primary) 12%, var(--background))"
            : "var(--background)",
        color: "var(--foreground)",
        borderRadius: 4,
      },
    };
  });
}

function toFlowEdges(map: SystemMapResult): Edge[] {
  return map.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: edge.source.startsWith("layer:") && edge.target.startsWith("layer:"),
  }));
}

export function SystemMapView() {
  const [map, setMap] = useState<SystemMapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMap = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getSystemMap();
    if (result.success) {
      setMap(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMap();
  }, [fetchMap]);

  const nodes = useMemo(() => (map ? toFlowNodes(map) : []), [map]);
  const edges = useMemo(() => (map ? toFlowEdges(map) : []), [map]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[620px] w-full" />
      </div>
    );
  }

  if (error || !map) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Network className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error ?? "No system map available."}</p>
          <Button className="mt-4" variant="outline" onClick={fetchMap}>
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
          <h1 className="text-2xl font-bold">System Map</h1>
          <p className="text-sm text-muted-foreground">
            A living admin graph of routes, APIs, components, actions, schema, and docs.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMap}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Rescan
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {[
          ["Routes", map.summary.routes],
          ["APIs", map.summary.apiRoutes],
          ["Components", map.summary.components],
          ["Actions", map.summary.actions],
          ["Docs", map.summary.docs],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="h-[720px]">
        <CardContent className="h-full p-0">
          <ReactFlow nodes={nodes} edges={edges} fitView minZoom={0.15}>
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </CardContent>
      </Card>
    </div>
  );
}
