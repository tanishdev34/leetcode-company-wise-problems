import { describe, expect, it } from "vitest";
import { buildMistakeMemory } from "@/lib/mistake-memory";

describe("buildMistakeMemory", () => {
  it("finds recurring mistake patterns from reviews, interviews, and due reviews", () => {
    const memory = buildMistakeMemory({
      solutionReviews: [
        {
          questionTitle: "Binary Search",
          correctness: "partially_correct",
          suggestions: "Check left/right boundary updates and off-by-one cases.",
          edgeCases: JSON.stringify(["empty array", "single element"]),
          createdAt: new Date("2026-05-24T00:00:00.000Z"),
        },
        {
          questionTitle: "Search Insert Position",
          correctness: "incorrect",
          suggestions: "Your binary search boundary condition skips the final candidate.",
          edgeCases: JSON.stringify(["target larger than all values"]),
          createdAt: new Date("2026-05-25T00:00:00.000Z"),
        },
      ],
      reviewItems: [
        { questionTitle: "Two Sum", confidence: 2, reviewCount: 3, nextReviewAt: new Date("2026-05-25T00:00:00.000Z") },
      ],
      interviewSessions: [
        { questionTitle: "Graph Valid Tree", rating: 2, reflection: "I struggled explaining DFS cycle detection clearly." },
      ],
    });

    expect(memory.patterns[0].label).toContain("Boundary");
    expect(memory.patterns[0].evidenceCount).toBeGreaterThanOrEqual(2);
    expect(memory.recommendations.some((item) => item.includes("review"))).toBe(true);
  });
});
