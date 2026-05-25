export interface StudyReportQuestion {
  id: string;
  title: string;
  difficulty: string;
  topics: string[];
}

export interface StudyReportReview {
  id: string;
  questionTitle: string;
  confidence: number;
}

export interface StudyReportInterviewSession {
  rating: number | null;
  duration: number | null;
}

export interface StudyReportReadiness {
  name: string;
  score: number;
}

export interface StudyReportInput {
  periodStart: Date;
  periodEnd: Date;
  solvedThisWeek: StudyReportQuestion[];
  dueReviews: StudyReportReview[];
  completedReviews: number;
  interviewSessions: StudyReportInterviewSession[];
  readiness: StudyReportReadiness[];
}

export interface StudyReportResult {
  title: string;
  periodLabel: string;
  metrics: {
    solvedCount: number;
    hardSolved: number;
    dueReviewCount: number;
    completedReviews: number;
    interviewCount: number;
    averageInterviewRating: number | null;
  };
  highlights: string[];
  recommendations: string[];
  companyFocus: StudyReportReadiness[];
  topicFocus: { topic: string; count: number }[];
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

export function generateStudyReport(input: StudyReportInput): StudyReportResult {
  const hardSolved = input.solvedThisWeek.filter((question) => question.difficulty === "HARD").length;
  const topicCounts = new Map<string, number>();

  for (const question of input.solvedThisWeek) {
    for (const topic of question.topics) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }

  const topicFocus = Array.from(topicCounts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
    .slice(0, 5);

  const ratedSessions = input.interviewSessions.filter((session) => typeof session.rating === "number");
  const averageInterviewRating =
    ratedSessions.length === 0
      ? null
      : Math.round(
          (ratedSessions.reduce((sum, session) => sum + (session.rating ?? 0), 0) /
            ratedSessions.length) *
            10,
        ) / 10;

  const companyFocus = [...input.readiness].sort((a, b) => a.score - b.score).slice(0, 3);

  const highlights = [
    `Solved ${input.solvedThisWeek.length} problems this week${hardSolved > 0 ? `, including ${hardSolved} hard` : ""}.`,
    `Completed ${input.completedReviews} reviews and have ${input.dueReviews.length} still due.`,
  ];

  if (input.interviewSessions.length > 0) {
    highlights.push(
      `Ran ${input.interviewSessions.length} mock interview${input.interviewSessions.length === 1 ? "" : "s"}${
        averageInterviewRating ? ` with an average ${averageInterviewRating}/5 rating` : ""
      }.`,
    );
  }

  const recommendations: string[] = [];
  if (input.dueReviews.length > 0) {
    recommendations.push(`Start with review: ${input.dueReviews[0].questionTitle}.`);
  }
  if (companyFocus[0]) {
    recommendations.push(`Focus on ${companyFocus[0].name}; readiness is at ${companyFocus[0].score}.`);
  }
  if (topicFocus[0]) {
    recommendations.push(`Keep momentum on ${topicFocus[0].topic}; it appeared ${topicFocus[0].count} time${topicFocus[0].count === 1 ? "" : "s"} this week.`);
  }
  if (recommendations.length === 0) {
    recommendations.push("Add a study plan item or complete a review to make next week's report more useful.");
  }

  return {
    title: "Weekly Study Report",
    periodLabel: `${formatDate(input.periodStart)} - ${formatDate(input.periodEnd)}`,
    metrics: {
      solvedCount: input.solvedThisWeek.length,
      hardSolved,
      dueReviewCount: input.dueReviews.length,
      completedReviews: input.completedReviews,
      interviewCount: input.interviewSessions.length,
      averageInterviewRating,
    },
    highlights,
    recommendations,
    companyFocus,
    topicFocus,
  };
}
