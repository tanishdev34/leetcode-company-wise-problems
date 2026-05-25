import { describe, expect, it } from "vitest";
import { buildLearningGraph } from "@/lib/learning-graph";

describe("buildLearningGraph", () => {
  it("builds topic, question, and company nodes with weak-topic insights", () => {
    const graph = buildLearningGraph({
      questions: [
        {
          id: "q1",
          title: "Two Sum",
          difficulty: "EASY",
          topics: ["Array", "Hash Table"],
          companies: [{ name: "Google", slug: "google" }],
        },
        {
          id: "q2",
          title: "Binary Tree Paths",
          difficulty: "EASY",
          topics: ["Tree", "DFS"],
          companies: [{ name: "Meta", slug: "meta" }],
        },
        {
          id: "q3",
          title: "Serialize Tree",
          difficulty: "HARD",
          topics: ["Tree", "DFS"],
          companies: [{ name: "Google", slug: "google" }],
        },
      ],
      solvedQuestionIds: ["q1"],
      dueReviewQuestionIds: ["q1"],
    });

    expect(graph.nodes.some((node) => node.id === "topic:Tree")).toBe(true);
    expect(graph.nodes.some((node) => node.id === "company:google")).toBe(true);
    expect(graph.edges.some((edge) => edge.source === "topic:Tree" && edge.target === "question:q2")).toBe(true);
    expect(graph.insights.weakTopics[0]).toMatchObject({
      topic: "Tree",
      solvedCount: 0,
      totalCount: 2,
    });
    expect(graph.insights.dueReviewCount).toBe(1);
  });
});
