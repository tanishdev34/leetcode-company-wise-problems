import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, dailyQuestionEmailHtml } from "@/lib/email";

const BASE = "https://alfa-leetcode-api.onrender.com";

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  if (
    process.env.CRON_SECRET &&
    process.env.CRON_SECRET !== "development" &&
    secret !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch the daily question
    const res = await fetch(`${BASE}/daily`);
    const data = await res.json();

    if (!data.questionTitle || !data.questionLink) {
      console.error("Daily question API returned unexpected data:", data);
      return NextResponse.json({ error: "Failed to fetch daily question" }, { status: 500 });
    }

    const question = {
      questionTitle: data.questionTitle,
      questionLink: data.questionLink,
      difficulty: data.difficulty || "Unknown",
      topicTags: data.topicTags || [],
      date: data.date,
    };

    // Get all subscribed users
    const subscribedUsers = await prisma.user.findMany({
      where: { emailSubscribed: true },
      select: { email: true, name: true },
    });

    if (subscribedUsers.length === 0) {
      return NextResponse.json({
        sent: 0,
        message: "No subscribed users",
      });
    }

    const html = dailyQuestionEmailHtml(question);
    let sent = 0;
    let failed = 0;

    for (const user of subscribedUsers) {
      if (!user.email) {
        failed++;
        continue;
      }

      await sendEmail({
        to: user.email,
        subject: `☀️ Daily LeetCode: ${question.questionTitle}`,
        html,
      });
      sent++;
    }

    return NextResponse.json({
      sent,
      failed,
      question: question.questionTitle,
      total: subscribedUsers.length,
    });
  } catch (error) {
    console.error("Daily question cron failed:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
