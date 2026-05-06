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

// ── Shared styles matching the app's monospace, sharp, minimalist aesthetic ──

const STYLES = {
  body: `
    font-family: ui-monospace, 'SF Mono', 'Cascadia Code', 'JetBrains Mono', 'Fira Code', monospace;
    background: #0a0a0b;
    margin: 0;
    padding: 0;
    color: #e4e4e7;
  `,
  container: `
    max-width: 520px;
    margin: 48px auto;
    background: #18181b;
    border: 1px solid #27272a;
  `,
  header: `
    padding: 36px 32px 28px;
    border-bottom: 1px solid #27272a;
  `,
  headerTitle: `
    margin: 0;
    font-size: 15px;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #a1a1aa;
  `,
  headerSub: `
    margin: 4px 0 0;
    font-size: 11px;
    letter-spacing: 0.05em;
    color: #52525b;
    text-transform: uppercase;
  `,
  content: `
    padding: 32px;
  `,
  title: `
    margin: 0 0 16px;
    font-size: 20px;
    font-weight: 500;
    color: #f4f4f5;
    line-height: 1.4;
  `,
  badge: (color: string) => `
    display: inline-block;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${color};
    border: 1px solid ${color}33;
    background: ${color}11;
  `,
  tag: `
    display: inline-block;
    padding: 2px 8px;
    margin: 0 4px 4px 0;
    font-size: 11px;
    color: #a1a1aa;
    border: 1px solid #27272a;
  `,
  button: (bg: string) => `
    display: inline-block;
    padding: 10px 24px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #fafafa;
    background: ${bg};
    text-decoration: none;
    border: 1px solid ${bg};
  `,
  footer: `
    padding: 20px 32px;
    border-top: 1px solid #27272a;
    text-align: center;
    font-size: 11px;
    color: #52525b;
    letter-spacing: 0.03em;
  `,
  footerLink: `
    color: #6366f1;
    text-decoration: none;
    border-bottom: 1px solid #6366f133;
  `,
};

export function dailyQuestionEmailHtml(question: {
  questionTitle: string;
  questionLink: string;
  difficulty: string;
  topicTags?: { name: string }[];
  date?: string;
}): string {
  const tags =
    question.topicTags
      ?.map((t) => `<span style="${STYLES.tag}">${t.name}</span>`)
      .join("") || "";

  const difficultyColor =
    question.difficulty === "Easy"
      ? "#22c55e"
      : question.difficulty === "Medium"
        ? "#eab308"
        : "#ef4444";

  const dateStr =
    question.date ||
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
</head>
<body style="${STYLES.body}">
  <table width="100%" cellpadding="0" cellspacing="0" style="${STYLES.container}">
    <tr>
      <td style="${STYLES.header}">
        <p style="${STYLES.headerTitle}">Daily Problem</p>
        <p style="${STYLES.headerSub}">${dateStr}</p>
      </td>
    </tr>
    <tr>
      <td style="${STYLES.content}">
        <p style="${STYLES.title}">${question.questionTitle}</p>
        <span style="${STYLES.badge(difficultyColor)}">${question.difficulty}</span>
        ${tags ? `<div style="margin-top:16px">${tags}</div>` : ""}
        <div style="margin-top:24px">
          <a href="${question.questionLink}" target="_blank" style="${STYLES.button("#6366f1")}">
            Solve on LeetCode →
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="${STYLES.footer}">
        <p style="margin:0">LC Grind · daily practice</p>
        <p style="margin:4px 0 0">
          <a href="${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/dashboard" style="${STYLES.footerLink}">Unsubscribe</a>
        </p>
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

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
</head>
<body style="${STYLES.body}">
  <table width="100%" cellpadding="0" cellspacing="0" style="${STYLES.container}">
    <tr>
      <td style="${STYLES.header}">
        <p style="${STYLES.headerTitle}">Contest Reminder</p>
        <p style="${STYLES.headerSub}">Starting soon</p>
      </td>
    </tr>
    <tr>
      <td style="${STYLES.content}">
        <p style="${STYLES.title}">${contest.title}</p>
        <div style="margin-bottom:20px;font-size:13px;color:#a1a1aa;letter-spacing:0.02em">${formattedTime}</div>
        <a href="https://leetcode.com/contest/${contest.titleSlug}" target="_blank" style="${STYLES.button("#eab308")}">
          Join Contest →
        </a>
      </td>
    </tr>
    <tr>
      <td style="${STYLES.footer}">
        <p style="margin:0">LC Grind · contest alerts</p>
        <p style="margin:4px 0 0">
          <a href="${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/dashboard" style="${STYLES.footerLink}">Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
