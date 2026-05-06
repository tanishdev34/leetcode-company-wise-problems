"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getEmailSubscription(): Promise<
  ActionResult<{ subscribed: boolean }>
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Not authenticated" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailSubscribed: true },
    });

    return {
      success: true,
      data: { subscribed: user?.emailSubscribed ?? false },
    };
  } catch {
    return { success: false, error: "Failed to get subscription status" };
  }
}

export async function toggleEmailSubscription(): Promise<
  ActionResult<{ subscribed: boolean }>
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Not authenticated" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailSubscribed: true, email: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const newValue = !user.emailSubscribed;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { emailSubscribed: newValue },
    });

    return {
      success: true,
      data: { subscribed: newValue },
    };
  } catch {
    return { success: false, error: "Failed to toggle subscription" };
  }
}
