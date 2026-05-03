import { QuestionRow } from "./question-row";
import { Skeleton } from "@/components/ui/skeleton";

interface Question {
  id: string; title: string; leetcodeUrl: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topics: string[]; frequency: number; solved: boolean;
}

interface QuestionTableProps {
  questions: Question[];
  isAuthenticated: boolean;
  loading?: boolean;
}

export function QuestionTable({ questions, isAuthenticated, loading }: QuestionTableProps) {
  if (loading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    );
  }
  if (questions.length === 0) {
    return <div className="px-4 py-8 text-center text-muted-foreground">No questions for this time period.</div>;
  }
  return (
    <div className="flex flex-col">
      {questions.map((q) => (
        <QuestionRow key={q.id} id={q.id} title={q.title} leetcodeUrl={q.leetcodeUrl}
          difficulty={q.difficulty} topics={q.topics} frequency={q.frequency}
          solved={q.solved} isAuthenticated={isAuthenticated} />
      ))}
    </div>
  );
}
