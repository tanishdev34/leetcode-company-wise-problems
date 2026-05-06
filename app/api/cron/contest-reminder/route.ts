import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { sendEmail, contestReminderEmailHtml } from "@/lib/email";

const CONTESTS_API = "https://alfa-leetcode-api.onrender.com/contests/upcoming";
const NOTIFIED_PREFIX = "contest:notified:";

export async function GET() {
  // Verify cron secret
  if (
    process.env.CRON_SECRET &&
    process.env.CRON_SECRET !== "development"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch upcoming contests
    const res = await fetch(CONTESTS_API);
    const data = await res.json();

    if (!data.contests || !Array.isArray(data.contests)) {
      return NextResponse.json({
        checked: true,
        message: "No contests data available",
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const SIX_HOURS = 21600;
    const THIRTY_MIN = 1800;
    const TWO_HOURS = 7200;

    // Contests are at fixed times (weekly Sun 8am, biweekly Sat 8pm IST),
    // so checking every 6 hours is enough. We look for contests starting
    // within the next 6 hours and send reminders for those 30 min to 2 hours away.
    const upcomingContests = data.contests.filter((contest: { startTime: number; titleSlug: string }) => {
      const timeUntilStart = contest.startTime - now;
      return timeUntilStart >= THIRTY_MIN && timeUntilStart <= TWO_HOURS;
    });

    if (upcomingContests.length === 0) {
      return NextResponse.json({
        checked: true,
        message: "No contests starting within the reminder window",
      });
    }

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

    let totalSent = 0;

    for (const contest of upcomingContests) {
      // Check if we already notified for this contest
      const alreadyNotified = await redis.get(`${NOTIFIED_PREFIX}${contest.titleSlug}`);
      if (alreadyNotified) {
        continue;
      }

      const html = contestReminderEmailHtml(contest);

      for (const user of subscribedUsers) {
        if (!user.email) continue;
        await sendEmail({
          to: user.email,
          subject: `🏆 Reminder: ${contest.title} starts in 1 hour!`,
          html,
        });
        totalSent++;
      }

      // Mark as notified (expire after 24 hours)
      await redis.setex(`${NOTIFIED_PREFIX}${contest.titleSlug}`, 86400, "1");
    }

    return NextResponse.json({
      sent: totalSent,
      contestsNotified: upcomingContests.map((c: { title: string }) => c.title),
    });
  } catch (error) {
    console.error("Contest reminder cron failed:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
