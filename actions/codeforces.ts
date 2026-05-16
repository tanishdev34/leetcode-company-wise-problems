"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function saveCodeforcesUsername(username: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "Not authenticated" };

  const trimmed = username.trim();
  if (!trimmed) return { success: false, error: "Username cannot be empty" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { codeforcesUsername: trimmed },
  });

  return { success: true };
}
