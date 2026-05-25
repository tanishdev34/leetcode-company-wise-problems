import { describe, expect, it } from "vitest";
import { generateStudyReport } from "@/lib/study-report";

describe("generateStudyReport", () => {
  it("summarizes weekly progress and recommends a next action", () => {
    const report = generateStudyReport({
      periodStart: new Date("2026-05-18T00:00:00.000Z"),
      periodEnd: new Date("2026-05-25T00:00:00.000Z"),
      solvedThisWeek: [
        { id: "q1", title: "Two Sum", difficulty: "EASY", topics: ["Array"] },
        { id: "q2", title: "Word Ladder", difficulty: "HARD", topics: ["Graph", "BFS"] },
      ],
      dueReviews: [{ id: "r1", questionTitle: "Two Sum", confidence: 2 }],
      completedReviews: 3,
      interviewSessions: [{ rating: 4, duration: 1800 }],
      readiness: [
        { name: "Google", score: 72 },
        { name: "Meta", score: 38 },
      ],
    });

    expect(report.metrics.solvedCount).toBe(2);
    expect(report.metrics.hardSolved).toBe(1);
    expect(report.highlights[0]).toContain("2 problems");
    expect(report.recommendations[0]).toContain("review");
    expect(report.companyFocus[0]).toEqual({ name: "Meta", score: 38 });
  });
});
