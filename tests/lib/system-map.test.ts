import { describe, expect, it } from "vitest";
import { buildSystemMap } from "@/lib/system-map";

describe("buildSystemMap", () => {
  it("classifies app files and creates useful architecture edges", () => {
    const map = buildSystemMap([
      "app/(main)/planner/page.tsx",
      "app/api/sync/route.ts",
      "components/study-planner.tsx",
      "actions/study-planner.ts",
      "prisma/schema.prisma",
      "docs/wiki/pages.md",
    ]);

    expect(map.summary.routes).toBe(1);
    expect(map.summary.apiRoutes).toBe(1);
    expect(map.summary.components).toBe(1);
    expect(map.nodes.some((node) => node.id === "page:app/(main)/planner/page.tsx")).toBe(true);
    expect(map.edges.some((edge) => edge.source === "layer:pages" && edge.target === "layer:components")).toBe(true);
    expect(map.edges.some((edge) => edge.source === "layer:actions" && edge.target === "layer:data")).toBe(true);
  });
});
