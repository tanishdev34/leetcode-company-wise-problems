import nodemailer from "nodemailer";
import { render } from "react-email";
import DailyQuestionEmail from "@/emails/daily-question";
import ContestReminderEmail from "@/emails/contest-reminder";

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

export async function renderDailyQuestionEmail(question: {
  questionTitle: string;
  questionLink: string;
  difficulty: string;
  topicTags?: { name: string }[];
  date?: string;
}): Promise<string> {
  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

  return render(
    <DailyQuestionEmail
      questionTitle={question.questionTitle}
      questionLink={question.questionLink}
      difficulty={question.difficulty}
      topicTags={question.topicTags}
      date={question.date}
      baseUrl={baseUrl}
    />,
  );
}

export async function renderContestReminderEmail(contest: {
  title: string;
  titleSlug: string;
  startTime: number;
}): Promise<string> {
  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

  return render(
    <ContestReminderEmail
      title={contest.title}
      titleSlug={contest.titleSlug}
      startTime={contest.startTime}
      baseUrl={baseUrl}
    />,
  );
}
