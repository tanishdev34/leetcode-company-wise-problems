"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SearchResults } from "@/components/search-results";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) return;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}`)
      .then((res) => res.json())
      .then((data) => {
        setResults(data.questions || []);
        setTotalPages(data.totalPages || 0);
      })
      .catch(() => { setResults([]); setTotalPages(0); })
      .finally(() => setLoading(false));
  }, [query, page]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Search</h1>
      <SearchBar className="mb-6" />
      {query.length < 2 ? (
        <p className="text-center text-muted-foreground">Type at least 2 characters to search.</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">Results for &quot;{query}&quot;</p>
          <SearchResults results={results} query={query} loading={loading} />
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
