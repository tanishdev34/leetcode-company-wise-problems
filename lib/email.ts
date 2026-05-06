import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_ADDRESS = process.env.SMTP_FROM || "noreply@leetcode-tracker.com";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP not configured — skipping email send");
    return;
  }

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

export function dailyQuestionEmailHtml(question: {
  questionTitle: string;
  questionLink: string;
  difficulty: string;
  topicTags?: { name: string }[];
  date?: string;
}): string {
  const tags = question.topicTags
    ?.map((t) => `<span style="background:#e2e8f0;padding:2px 8px;border-radius:4px;font-size:12px;margin:0 4px 4px 0;display:inline-block">${t.name}</span>`)
    .join("") || "";

  const difficultyColor =
    question.difficulty === "Easy"
      ? "#22c55e"
      : question.difficulty === "Medium"
        ? "#eab308"
        : "#ef4444";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <tr>
      <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center">
        <h1 style="color:white;margin:0;font-size:24px">☀️ Daily LeetCode Problem</h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">${question.date || new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px">
        <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b">${question.questionTitle}</h2>
        <span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600;color:white;background:${difficultyColor};margin-bottom:16px">${question.difficulty}</span>
        ${tags ? `<div style="margin-bottom:16px">${tags}</div>` : ""}
        <a href="${question.questionLink}" target="_blank" style="display:inline-block;padding:12px 24px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;margin-top:8px">🔗 Solve on LeetCode</a>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px;background:#f8fafc;text-align:center;font-size:12px;color:#94a3b8">
        <p style="margin:0">You're receiving this because you subscribed to daily LeetCode reminders.</p>
        <p style="margin:4px 0 0">To unsubscribe, visit your <a href="${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/dashboard" style="color:#6366f1">dashboard</a>.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function contestReminderEmailHtml(contest: {
  title: string;
  titleSlug: string;
  startTime: number;
}): string {
  const startDate = new Date(contest.startTime * 1000);
  const formattedTime = startDate.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <tr>
      <td style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:32px;text-align:center">
        <h1 style="color:white;margin:0;font-size:24px">🏆 Contest Reminder</h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">Starts in about 1 hour!</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px">
        <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b">${contest.title}</h2>
        <p style="color:#64748b;font-size:14px;margin:0 0 16px">⏰ ${formattedTime}</p>
        <a href="https://leetcode.com/contest/${contest.titleSlug}" target="_blank" style="display:inline-block;padding:12px 24px;background:#f59e0b;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">🚀 Join Contest</a>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px;background:#f8fafc;text-align:center;font-size:12px;color:#94a3b8">
        <p style="margin:0">You're receiving this because you subscribed to contest reminders.</p>
        <p style="margin:4px 0 0">To unsubscribe, visit your <a href="${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/dashboard" style="color:#6366f1">dashboard</a>.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
