"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveNotes } from "@/actions/questions";
import ReactMarkdown from "react-markdown";

interface NoteEditorProps {
  questionId: string;
  initialNotes: string;
}

export function NoteEditor({ questionId, initialNotes }: NoteEditorProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<NodeJS.Timeout>(undefined);
  const latestNotesRef = useRef(notes);

  useEffect(() => { latestNotesRef.current = notes; }, [notes]);

  const doSave = useCallback(async (value: string) => {
    setStatus("saving");
    try {
      const result = await saveNotes(questionId, value);
      if (result.success) { setStatus("saved"); setTimeout(() => setStatus("idle"), 2000); }
      else setStatus("error");
    } catch { setStatus("error"); }
  }, [questionId]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSave(value), 1000);
  }, [doSave]);

  const handleBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSave(latestNotesRef.current);
  }, [doSave]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setPreview(!preview)}>
          {preview ? "Edit" : "Preview"}
        </Button>
        {status === "saving" && <span className="text-xs text-muted-foreground">Saving...</span>}
        {status === "saved" && <span className="text-xs text-green-500">Saved</span>}
        {status === "error" && (
          <button className="text-xs text-destructive" onClick={() => doSave(notes)}>Failed — retry</button>
        )}
      </div>
      {preview ? (
        <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border p-4">
          <ReactMarkdown>{notes}</ReactMarkdown>
        </div>
      ) : (
        <Textarea value={notes} onChange={handleChange} onBlur={handleBlur}
          placeholder="Write your notes here (markdown supported)..." rows={6} maxLength={10000} />
      )}
    </div>
  );
}
