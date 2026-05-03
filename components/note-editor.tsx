"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveNotes, saveCode } from "@/actions/questions";
import ReactMarkdown from "react-markdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NoteEditorProps {
  questionId: string;
  initialNotes: string;
  initialCode?: string;
  initialLanguage?: string;
}

const LANGUAGES = [
  { value: "cpp", label: "C++" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "javascript", label: "JavaScript" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "c", label: "C" },
  { value: "csharp", label: "C#" },
  { value: "typescript", label: "TypeScript" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
];

export function NoteEditor({
  questionId,
  initialNotes,
  initialCode = "",
  initialLanguage = "cpp",
}: NoteEditorProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [activeTab, setActiveTab] = useState<"notes" | "code">("notes");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  const doSaveNotes = useCallback(async (value: string) => {
    setStatus("saving");
    try {
      const result = await saveNotes(questionId, value);
      if (result.success) {
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }, [questionId]);

  const doSaveCode = useCallback(async (value: string) => {
    setStatus("saving");
    try {
      const result = await saveCode(questionId, value, language);
      if (result.success) {
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }, [questionId, language]);

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setNotes(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSaveNotes(value), 1000);
    },
    [doSaveNotes]
  );

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setCode(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSaveCode(value), 1000);
    },
    [doSaveCode]
  );

  const handleLanguageChange = useCallback(
    (newLanguage: string) => {
      setLanguage(newLanguage);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSaveCode(code), 1000);
    },
    [code, doSaveCode]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
        <Button
          variant={isPreviewMode ? "default" : "ghost"}
          size="sm"
          onClick={() => setIsPreviewMode(!isPreviewMode)}
        >
          {isPreviewMode ? "Edit" : "Preview"}
        </Button>
        <div className="flex-1" />
        {status === "saving" && (
          <span className="text-xs text-muted-foreground">Saving...</span>
        )}
        {status === "saved" && (
          <span className="text-xs text-green-500">Saved</span>
        )}
        {status === "error" && (
          <button
            className="text-xs text-destructive"
            onClick={() =>
              activeTab === "notes" ? doSaveNotes(notes) : doSaveCode(code)
            }
          >
            Failed — retry
          </button>
        )}
      </div>

      {/* Content based on mode */}
      {isPreviewMode ? (
        <div className="flex flex-col gap-4">
          {/* Preview: Notes */}
          <div className="rounded-md border p-4">
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">
              Notes
            </h3>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {notes ? (
                <ReactMarkdown>{notes}</ReactMarkdown>
              ) : (
                <span className="text-muted-foreground text-sm">
                  No notes yet. Click "Edit" to add notes.
                </span>
              )}
            </div>
          </div>

          {/* Preview: Code */}
          <div className="rounded-md border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Code
              </h3>
              <span className="text-xs bg-muted px-2 py-1 rounded">
                {LANGUAGES.find((l) => l.value === language)?.label || language}
              </span>
            </div>
            {code ? (
              <pre className="text-sm font-mono bg-muted/50 p-3 rounded overflow-x-auto">
                <code>{code}</code>
              </pre>
            ) : (
              <span className="text-muted-foreground text-sm">
                No code yet. Click "Edit" to add code.
              </span>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Notes tab */}
          {activeTab === "notes" && (
            <Textarea
              value={notes}
              onChange={handleNotesChange}
              onBlur={() => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                doSaveNotes(notes);
              }}
              placeholder="Write your notes here (markdown supported)..."
              rows={8}
              maxLength={10000}
            />
          )}

          {/* Code tab */}
          {activeTab === "code" && (
            <div className="flex flex-col gap-2">
              <div className="w-40">
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={code}
                onChange={handleCodeChange}
                onBlur={() => {
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  doSaveCode(code);
                }}
                placeholder="Paste your solution code here..."
                rows={12}
                maxLength={50000}
                className="font-mono text-sm"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}