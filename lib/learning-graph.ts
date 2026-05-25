export interface LearningGraphCompany {
  name: string;
  slug: string;
}

export interface LearningGraphQuestion {
  id: string;
  title: string;
  difficulty: string;
  topics: string[];
  companies: LearningGraphCompany[];
}

export interface LearningGraphNode {
  id: string;
  label: string;
  type: "root" | "topic" | "question" | "company";
  score?: number;
  detail?: string;
}

export interface LearningGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface LearningGraphInput {
  questions: LearningGraphQuestion[];
  solvedQuestionIds: string[];
  dueReviewQuestionIds: string[];
}

export interface LearningGraphInsight {
  topic: string;
  solvedCount: number;
  totalCount: number;
  solvedRatio: number;
}

export interface LearningGraphResult {
  nodes: LearningGraphNode[];
  edges: LearningGraphEdge[];
  insights: {
    weakTopics: LearningGraphInsight[];
    strongTopics: LearningGraphInsight[];
    dueReviewCount: number;
  };
}

function topicId(topic: string) {
  return `topic:${topic}`;
}

function questionId(id: string) {
  return `question:${id}`;
}

function companyId(slug: string) {
  return `company:${slug}`;
}

export function buildLearningGraph(input: LearningGraphInput): LearningGraphResult {
  const solved = new Set(input.solvedQuestionIds);
  const dueReviews = new Set(input.dueReviewQuestionIds);
  const nodes = new Map<string, LearningGraphNode>();
  const edges = new Map<string, LearningGraphEdge>();
  const topicStats = new Map<string, { solvedCount: number; totalCount: number }>();

  nodes.set("root:learning", {
    id: "root:learning",
    label: "Learning Map",
    type: "root",
    detail: `${input.solvedQuestionIds.length} solved`,
  });

  for (const question of input.questions) {
    const qid = questionId(question.id);
    nodes.set(qid, {
      id: qid,
      label: question.title,
      type: "question",
      score: solved.has(question.id) ? 100 : dueReviews.has(question.id) ? 45 : 20,
      detail: question.difficulty,
    });

    for (const topic of question.topics) {
      const tid = topicId(topic);
      const stats = topicStats.get(topic) ?? { solvedCount: 0, totalCount: 0 };
      stats.totalCount += 1;
      if (solved.has(question.id)) stats.solvedCount += 1;
      topicStats.set(topic, stats);

      if (!nodes.has(tid)) {
        nodes.set(tid, { id: tid, label: topic, type: "topic" });
        edges.set(`root-topic-${topic}`, {
          id: `root-topic-${topic}`,
          source: "root:learning",
          target: tid,
        });
      }
      edges.set(`${tid}-${qid}`, {
        id: `${tid}-${qid}`,
        source: tid,
        target: qid,
      });
    }

    for (const company of question.companies) {
      const cid = companyId(company.slug);
      if (!nodes.has(cid)) {
        nodes.set(cid, {
          id: cid,
          label: company.name,
          type: "company",
        });
      }
      edges.set(`${qid}-${cid}`, {
        id: `${qid}-${cid}`,
        source: qid,
        target: cid,
      });
    }
  }

  const topicInsights = Array.from(topicStats.entries()).map(([topic, stats]) => ({
    topic,
    solvedCount: stats.solvedCount,
    totalCount: stats.totalCount,
    solvedRatio: stats.totalCount === 0 ? 0 : stats.solvedCount / stats.totalCount,
  }));

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
    insights: {
      weakTopics: topicInsights
        .filter((topic) => topic.totalCount >= 2 && topic.solvedRatio < 0.5)
        .sort((a, b) => a.solvedRatio - b.solvedRatio || b.totalCount - a.totalCount)
        .slice(0, 6),
      strongTopics: topicInsights
        .filter((topic) => topic.solvedRatio >= 0.75)
        .sort((a, b) => b.solvedRatio - a.solvedRatio || b.totalCount - a.totalCount)
        .slice(0, 6),
      dueReviewCount: dueReviews.size,
    },
  };
}
