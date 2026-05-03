"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { getQuestionDetail, toggleSolved } from "@/actions/questions";
import { NoteEditor } from "@/components/note-editor";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface QuestionData {
  id: string;
  title: string;
  leetcodeUrl: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topics: string[];
  frequency: number;
  acceptanceRate: number;
  companies: { name: string; slug: string }[];
  solved: boolean;
  solvedAt: Date | null;
  notes: string;
  code: string;
  language: string;
}

export default function QuestionDetailPage() {
  const params = useParams();
  const questionId = params.id as string;
  const { data: session } = useSession();

  const [data, setData] = useState<QuestionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [solved, setSolved] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    getQuestionDetail(questionId)
      .then((result) => {
        if (result.success) {
          setData(result.data);
          setSolved(result.data.solved);
        }
      })
      .finally(() => setLoading(false));
  }, [questionId]);

  async function handleToggle() {
    if (!session?.user) return;
    setToggleLoading(true);
    try {
      const result = await toggleSolved(questionId);
      if (result.success) {
        setSolved(result.data.solved);
        if (data) setData({ ...data, solved: result.data.solved, solvedAt: result.data.solvedAt });
      }
    } catch {}
    setToggleLoading(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="mb-4 h-10 w-96" />
        <Skeleton className="mb-2 h-6 w-48" />
        <Skeleton className="mb-8 h-6 w-64" />
        <Skeleton className="mb-4 h-8 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-destructive">Question not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-3 text-3xl font-bold">{data.title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <DifficultyBadge difficulty={data.difficulty} />
          <span className="text-sm text-muted-foreground">
            Acceptance: {(data.acceptanceRate * 100).toFixed(1)}%
          </span>
          <span className="text-sm text-muted-foreground">
            Frequency: {data.frequency.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Companies */}
      <div className="mb-6">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Asked at</h2>
        <div className="flex flex-wrap gap-2">
          {data.companies.map((c) => (
            <Link key={c.slug} href={`/companies/${c.slug}`}>
              <Badge variant="secondary" className="hover:bg-accent">{c.name}</Badge>
            </Link>
          ))}
        </div>
      </div>

      {/* Topics */}
      <div className="mb-6">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Topics</h2>
        <div className="flex flex-wrap gap-2">
          {data.topics.map((topic) => (
            <Badge key={topic} variant="outline">{topic}</Badge>
          ))}
        </div>
      </div>

      {/* Actions row */}
      <div className="mb-8 flex items-center gap-4">
        {session?.user && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={solved}
              onCheckedChange={handleToggle}
              disabled={toggleLoading}
            />
            <span className="text-sm">
              {solved ? "Solved" : "Mark as solved"}
            </span>
            {data.solvedAt && (
              <span className="text-xs text-muted-foreground">
                on {new Date(data.solvedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
        <div className="flex-1" />
        <a href={data.leetcodeUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            Open in LeetCode
            <svg className="ml-1.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </Button>
        </a>
      </div>

      {/* Notes & Code Editor */}
      {session?.user ? (
        <NoteEditor
          questionId={data.id}
          initialNotes={data.notes}
          initialCode={data.code}
          initialLanguage={data.language}
        />
      ) : (
        <div className="rounded-md border p-6 text-center text-muted-foreground">
          <p>Sign in to write notes and save your solution code.</p>
        </div>
      )}
    </div>
  );
}
