export interface MistakeSolutionReview {
  questionTitle: string;
  correctness: string | null;
  suggestions: string | null;
  edgeCases: string | null;
  createdAt: Date;
}

export interface MistakeReviewItem {
  questionTitle: string;
  confidence: number;
  reviewCount: number;
  nextReviewAt: Date;
}

export interface MistakeInterviewSession {
  questionTitle: string;
  rating: number | null;
  reflection: string | null;
}

export interface MistakeMemoryInput {
  solutionReviews: MistakeSolutionReview[];
  reviewItems: MistakeReviewItem[];
  interviewSessions: MistakeInterviewSession[];
}

export interface MistakePattern {
  label: string;
  evidenceCount: number;
  severity: "low" | "medium" | "high";
  evidence: string[];
}

export interface MistakeMemoryResult {
  patterns: MistakePattern[];
  recommendations: string[];
}

const PATTERNS: { label: string; terms: string[] }[] = [
  { label: "Boundary and off-by-one errors", terms: ["boundary", "off-by-one", "left", "right", "final candidate"] },
  { label: "Edge-case coverage gaps", terms: ["edge", "empty", "single", "larger than", "null"] },
  { label: "Graph traversal explanation gaps", terms: ["dfs", "bfs", "cycle", "graph"] },
  { label: "Complexity and optimization gaps", terms: ["complexity", "optimize", "runtime", "space"] },
  { label: "Communication clarity gaps", terms: ["explain", "explaining", "clearly", "communication"] },
];
const PRIORITY = new Map(PATTERNS.map((pattern, index) => [pattern.label, PATTERNS.length - index]));

function parseList(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [value];
  }
}

function severity(count: number): MistakePattern["severity"] {
  if (count >= 4) return "high";
  if (count >= 2) return "medium";
  return "low";
}

export function buildMistakeMemory(input: MistakeMemoryInput): MistakeMemoryResult {
  const evidenceByPattern = new Map<string, string[]>();
  const documents: string[] = [];

  for (const review of input.solutionReviews) {
    if (review.correctness && review.correctness !== "correct") {
      documents.push(`${review.questionTitle}: ${review.correctness} ${review.suggestions ?? ""}`);
    }
    for (const edgeCase of parseList(review.edgeCases)) {
      documents.push(`${review.questionTitle}: ${edgeCase}`);
    }
  }

  for (const item of input.reviewItems) {
    if (item.confidence <= 2 || item.reviewCount >= 3) {
      documents.push(`${item.questionTitle}: low confidence review due after ${item.reviewCount} reviews`);
    }
  }

  for (const session of input.interviewSessions) {
    if ((session.rating ?? 5) <= 3 || session.reflection) {
      documents.push(`${session.questionTitle}: ${session.reflection ?? "low interview rating"}`);
    }
  }

  for (const document of documents) {
    const normalized = document.toLowerCase();
    for (const pattern of PATTERNS) {
      if (pattern.terms.some((term) => normalized.includes(term))) {
        const evidence = evidenceByPattern.get(pattern.label) ?? [];
        evidence.push(document);
        evidenceByPattern.set(pattern.label, evidence);
      }
    }
  }

  const patterns = Array.from(evidenceByPattern.entries())
    .map(([label, evidence]) => ({
      label,
      evidenceCount: evidence.length,
      severity: severity(evidence.length),
      evidence: evidence.slice(0, 4),
    }))
    .sort(
      (a, b) =>
        b.evidenceCount + (PRIORITY.get(b.label) ?? 0) * 1.5 -
          (a.evidenceCount + (PRIORITY.get(a.label) ?? 0) * 1.5) ||
        a.label.localeCompare(b.label),
    );

  const recommendations = patterns.slice(0, 3).map((pattern) => {
    if (pattern.label.includes("Boundary")) return "Do one focused review set on boundary conditions and write the loop invariant before coding.";
    if (pattern.label.includes("Edge")) return "Before submitting, list empty, single-item, duplicate, and extreme-value cases.";
    if (pattern.label.includes("Graph")) return "Practice explaining traversal state, visited semantics, and cycle handling aloud.";
    if (pattern.label.includes("Communication")) return "Record a 2-minute explanation before opening the editor.";
    return `Create a targeted review block for ${pattern.label.toLowerCase()}.`;
  });

  if (recommendations.length === 0) {
    recommendations.push("Generate more reviews or complete mock interviews to build a useful mistake memory.");
  }

  return { patterns, recommendations };
}
