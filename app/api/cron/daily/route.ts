import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { sendEmail, dailyQuestionEmailHtml, contestReminderEmailHtml } from "@/lib/email";

const DAILY_API = "https://alfa-leetcode-api.onrender.com/daily";
const CONTESTS_API = "https://alfa-leetcode-api.onrender.com/contests/upcoming";
const NOTIFIED_PREFIX = "contest:notified:";

export async function GET(request: Request) {
  // Accept Vercel's internal cron trigger or manual test with ?secret=
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  if (
    !isVercelCron &&
    process.env.CRON_SECRET &&
    process.env.CRON_SECRET !== "development" &&
    secret !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: {
    dailyQuestion?: string;
    dailySent?: number;
    contests?: string[];
    contestSent?: number;
  } = {};

  // ── Part 1: Daily Question ──
  try {
    const res = await fetch(DAILY_API);
    const data = await res.json();

    if (data.questionTitle && data.questionLink) {
      const question = {
        questionTitle: data.questionTitle,
        questionLink: data.questionLink,
        difficulty: data.difficulty || "Unknown",
        topicTags: data.topicTags || [],
        date: data.date,
      };

      const subscribedUsers = await prisma.user.findMany({
        where: { emailSubscribed: true },
        select: { email: true },
      });

      if (subscribedUsers.length > 0) {
        const html = dailyQuestionEmailHtml(question);
        let sent = 0;
        for (const user of subscribedUsers) {
          if (!user.email) continue;
          await sendEmail({
            to: user.email,
            subject: `☀️ Daily LeetCode: ${question.questionTitle}`,
            html,
          });
          sent++;
        }
        results.dailyQuestion = question.questionTitle;
        results.dailySent = sent;
      } else {
        results.dailySent = 0;
      }
    }
  } catch (error) {
    console.error("Daily question cron failed:", error);
    results.dailyQuestion = "error";
  }

  // ── Part 2: Contest Reminders ──
  // Since we only run once daily, we send a heads-up for any contest
  // starting within the next 24 hours — either "starting soon" or "coming up".
  try {
    const res = await fetch(CONTESTS_API);
    const data = await res.json();

    if (data.contests && Array.isArray(data.contests)) {
      const now = Math.floor(Date.now() / 1000);
      const TWENTY_FOUR_HOURS = 86400;
      const ONE_HOUR = 3600;

      const upcomingContests = data.contests.filter(
        (contest: { startTime: number; titleSlug: string }) => {
          const t = contest.startTime - now;
          return t >= ONE_HOUR && t <= TWENTY_FOUR_HOURS;
        }
      );

      if (upcomingContests.length > 0) {
        const subscribedUsers = await prisma.user.findMany({
          where: { emailSubscribed: true },
          select: { email: true },
        });

        if (subscribedUsers.length > 0) {
          let totalSent = 0;
          const notified: string[] = [];

          for (const contest of upcomingContests) {
            const alreadyNotified = await redis.get(`${NOTIFIED_PREFIX}${contest.titleSlug}`);
            if (alreadyNotified) continue;

            const html = contestReminderEmailHtml(contest);
            for (const user of subscribedUsers) {
              if (!user.email) continue;
              await sendEmail({
                to: user.email,
                subject: `🏆 Reminder: ${contest.title} is coming up!`,
                html,
              });
              totalSent++;
            }
            notified.push(contest.title);
            await redis.setex(`${NOTIFIED_PREFIX}${contest.titleSlug}`, 86400, "1");
          }

          results.contests = notified;
          results.contestSent = totalSent;
        }
      }
    }
  } catch (error) {
    console.error("Contest reminder cron failed:", error);
  }

  return NextResponse.json(results);
}
