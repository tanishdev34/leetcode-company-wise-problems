"use client";

import { useState, useEffect } from "react";
import { NoteEditor } from "./note-editor";
import { getNotes } from "@/actions/questions";

interface QuestionDetailProps {
  questionId: string;
  isAuthenticated: boolean;
}

export function QuestionDetail({ questionId, isAuthenticated }: QuestionDetailProps) {
  const [notes, setNotes] = useState<string | null>(null);
  const [hints, setHints] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>("cpp");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    getNotes(questionId)
      .then((result) => {
        if (result.success) {
          setNotes(result.data.notes);
          setHints(result.data.hints);
          setCode(result.data.code);
          setLanguage(result.data.language);
        } else {
          setNotes("");
          setHints("");
          setCode("");
        }
      })
      .catch(() => { setNotes(""); setHints(""); setCode(""); })
      .finally(() => setLoading(false));
  }, [questionId, isAuthenticated]);

  if (!isAuthenticated) {
    return <div className="px-4 py-3 text-sm text-muted-foreground">Sign in to write notes and track progress.</div>;
  }
  if (loading) {
    return <div className="px-4 py-3 text-sm text-muted-foreground">Loading...</div>;
  }
  return (
    <div className="px-4 py-3">
      <NoteEditor
        questionId={questionId}
        initialNotes={notes || ""}
        initialHints={hints || ""}
        initialCode={code || ""}
        initialLanguage={language}
      />
    </div>
  );
}
