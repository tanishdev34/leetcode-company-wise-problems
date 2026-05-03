import { DifficultyBadge } from "./difficulty-badge";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchResult {
  id: string; title: string; leetcodeUrl: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  companyName: string; companySlug: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  loading?: boolean;
}

export function SearchResults({ results, query, loading }: SearchResultsProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-md border p-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    );
  }
  if (results.length === 0) {
    return <div className="px-4 py-8 text-center text-muted-foreground">No results found for &quot;{query}&quot;</div>;
  }
  return (
    <div className="flex flex-col gap-2">
      {results.map((r) => (
        <a key={r.id} href={r.leetcodeUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-md border p-4 hover:bg-accent">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="truncate font-medium">{r.title}</span>
            <DifficultyBadge difficulty={r.difficulty} />
          </div>
          <span className="text-sm text-muted-foreground">{r.companyName}</span>
        </a>
      ))}
    </div>
  );
}
