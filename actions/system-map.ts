"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildSystemMap } from "@/lib/system-map";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const ROOTS = ["app", "components", "actions", "lib", "prisma", "docs/wiki"];
const IGNORED = new Set(["node_modules", ".next", ".git", "generated", "mobile/android"]);

async function collectFiles(root: string, cwd = process.cwd()): Promise<string[]> {
  const absolute = join(cwd, root);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const child = join(absolute, entry.name);
    const projectPath = relative(cwd, child);
    if (Array.from(IGNORED).some((ignored) => projectPath.startsWith(ignored))) continue;

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(projectPath, cwd)));
    } else if (/\.(tsx?|md|prisma)$/.test(entry.name)) {
      files.push(projectPath);
    }
  }

  return files;
}

export async function getSystemMap(): Promise<ActionResult<ReturnType<typeof buildSystemMap>>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, error: "Not authenticated" };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (user?.role !== "admin") return { success: false, error: "Admin access required" };

    const files = (await Promise.all(ROOTS.map((root) => collectFiles(root)))).flat();
    return { success: true, data: buildSystemMap(files.sort()) };
  } catch {
    return { success: false, error: "Failed to build system map" };
  }
}
