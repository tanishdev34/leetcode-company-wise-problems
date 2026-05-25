export interface SystemMapNode {
  id: string;
  label: string;
  type: "layer" | "page" | "api" | "component" | "action" | "data" | "doc";
  path?: string;
}

export interface SystemMapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface SystemMapResult {
  nodes: SystemMapNode[];
  edges: SystemMapEdge[];
  summary: {
    routes: number;
    apiRoutes: number;
    components: number;
    actions: number;
    docs: number;
  };
}

function fileName(path: string) {
  return path.split("/").at(-1) ?? path;
}

export function buildSystemMap(paths: string[]): SystemMapResult {
  const nodes = new Map<string, SystemMapNode>();
  const edges = new Map<string, SystemMapEdge>();

  const layers: SystemMapNode[] = [
    { id: "layer:pages", label: "Pages", type: "layer" },
    { id: "layer:api", label: "API Routes", type: "layer" },
    { id: "layer:components", label: "Components", type: "layer" },
    { id: "layer:actions", label: "Server Actions", type: "layer" },
    { id: "layer:data", label: "Data Model", type: "layer" },
    { id: "layer:docs", label: "Wiki + Docs", type: "layer" },
  ];

  for (const layer of layers) nodes.set(layer.id, layer);

  const summary = {
    routes: 0,
    apiRoutes: 0,
    components: 0,
    actions: 0,
    docs: 0,
  };

  for (const path of paths) {
    if (path.startsWith("app/") && path.endsWith("/page.tsx")) {
      const id = `page:${path}`;
      nodes.set(id, { id, label: path.replace("app/", ""), type: "page", path });
      edges.set(`layer:pages-${id}`, { id: `layer:pages-${id}`, source: "layer:pages", target: id });
      summary.routes += 1;
      continue;
    }

    if (path.startsWith("app/api/") && path.endsWith("route.ts")) {
      const id = `api:${path}`;
      nodes.set(id, { id, label: path.replace("app/api/", ""), type: "api", path });
      edges.set(`layer:api-${id}`, { id: `layer:api-${id}`, source: "layer:api", target: id });
      summary.apiRoutes += 1;
      continue;
    }

    if (path.startsWith("components/") && path.endsWith(".tsx")) {
      const id = `component:${path}`;
      nodes.set(id, { id, label: fileName(path), type: "component", path });
      edges.set(`layer:components-${id}`, {
        id: `layer:components-${id}`,
        source: "layer:components",
        target: id,
      });
      summary.components += 1;
      continue;
    }

    if (path.startsWith("actions/") && path.endsWith(".ts")) {
      const id = `action:${path}`;
      nodes.set(id, { id, label: fileName(path), type: "action", path });
      edges.set(`layer:actions-${id}`, { id: `layer:actions-${id}`, source: "layer:actions", target: id });
      summary.actions += 1;
      continue;
    }

    if (path === "prisma/schema.prisma") {
      const id = `data:${path}`;
      nodes.set(id, { id, label: "Prisma schema", type: "data", path });
      edges.set(`layer:data-${id}`, { id: `layer:data-${id}`, source: "layer:data", target: id });
      continue;
    }

    if (path.startsWith("docs/") && path.endsWith(".md")) {
      const id = `doc:${path}`;
      nodes.set(id, { id, label: fileName(path), type: "doc", path });
      edges.set(`layer:docs-${id}`, { id: `layer:docs-${id}`, source: "layer:docs", target: id });
      summary.docs += 1;
    }
  }

  edges.set("pages-components", {
    id: "pages-components",
    source: "layer:pages",
    target: "layer:components",
    label: "render",
  });
  edges.set("components-actions", {
    id: "components-actions",
    source: "layer:components",
    target: "layer:actions",
    label: "call",
  });
  edges.set("api-actions", {
    id: "api-actions",
    source: "layer:api",
    target: "layer:actions",
    label: "share patterns",
  });
  edges.set("actions-data", {
    id: "actions-data",
    source: "layer:actions",
    target: "layer:data",
    label: "query",
  });
  edges.set("docs-system", {
    id: "docs-system",
    source: "layer:docs",
    target: "layer:pages",
    label: "document",
  });

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
    summary,
  };
}
