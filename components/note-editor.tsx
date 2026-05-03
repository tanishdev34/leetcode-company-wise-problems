"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveNotes, saveCode } from "@/actions/questions";
import ReactMarkdown from "react-markdown";

interface NoteEditorProps {
  questionId: string;
  initialNotes: string;
  initialCode?: string;
}

export function NoteEditor({ questionId, initialNotes, initialCode = "" }: NoteEditorProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [code, setCode] = useState(initialCode);
  const [previewNotes, setPreviewNotes] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "code">("notes");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  const doSaveNotes = useCallback(async (value: string) => {
    setStatus("saving");
    try {
      const result = await saveNotes(questionId, value);
      if (result.success) { setStatus("saved"); setTimeout(() => setStatus("idle"), 2000); }
      else setStatus("error");
    } catch { setStatus("error"); }
  }, [questionId]);

  const doSaveCode = useCallback(async (value: string) => {
    setStatus("saving");
    try {
      const result = await saveCode(questionId, value);
      if (result.success) { setStatus("saved"); setTimeout(() => setStatus("idle"), 2000); }
      else setStatus("error");
    } catch { setStatus("error"); }
  }, [questionId]);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSaveNotes(value), 1000);
  }, [doSaveNotes]);

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCode(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSaveCode(value), 1000);
  }, [doSaveCode]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Tab buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant={activeTab === "notes" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("notes")}
        >
          Notes
        </Button>
        <Button
          variant={activeTab === "code" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("code")}
        >
          Code
        </Button>
        {activeTab === "notes" && (
          <Button variant="ghost" size="sm" onClick={() => setPreviewNotes(!previewNotes)}>
            {previewNotes ? "Edit" : "Preview"}
          </Button>
        )}
        <div className="flex-1" />
        {status === "saving" && <span className="text-xs text-muted-foreground">Saving...</span>}
        {status === "saved" && <span className="text-xs text-green-500">Saved</span>}
        {status === "error" && (
          <button className="text-xs text-destructive" onClick={() => activeTab === "notes" ? doSaveNotes(notes) : doSaveCode(code)}>
            Failed — retry
          </button>
        )}
      </div>

      {/* Notes tab */}
      {activeTab === "notes" && (
        previewNotes ? (
          <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border p-4">
            <ReactMarkdown>{notes}</ReactMarkdown>
          </div>
        ) : (
          <Textarea
            value={notes}
            onChange={handleNotesChange}
            onBlur={() => { if (debounceRef.current) clearTimeout(debounceRef.current); doSaveNotes(notes); }}
            placeholder="Write your notes here (markdown supported)..."
            rows={8}
            maxLength={10000}
          />
        )
      )}

      {/* Code tab */}
      {activeTab === "code" && (
        <Textarea
          value={code}
          onChange={handleCodeChange}
          onBlur={() => { if (debounceRef.current) clearTimeout(debounceRef.current); doSaveCode(code); }}
          placeholder="Paste your solution code here..."
          rows={12}
          maxLength={50000}
          className="font-mono text-sm"
        />
      )}
    </div>
  );
}
