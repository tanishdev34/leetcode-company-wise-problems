"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveNotes, saveCode, saveHints, analyzeCode } from "@/actions/questions";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const mdComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 text-foreground tracking-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold mt-4 mb-1.5 text-foreground border-b border-border pb-1 uppercase tracking-widest">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1 text-muted-foreground uppercase tracking-wider">{children}</h3>,
  p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) return <code className={className}>{children}</code>;
    return <code className="bg-muted px-1 py-0.5 rounded text-xs text-amber-400 font-mono">{children}</code>;
  },
  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  hr: () => <hr className="border-border my-4" />,
};

const HINT_STYLES = [
  {
    border: "border-l-blue-500",
    bg: "bg-blue-500/5 hover:bg-blue-500/10",
    label: "text-blue-400",
    chevron: "text-blue-400",
    badge: "bg-blue-500/20 text-blue-300",
  },
  {
    border: "border-l-amber-500",
    bg: "bg-amber-500/5 hover:bg-amber-500/10",
    label: "text-amber-400",
    chevron: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-300",
  },
  {
    border: "border-l-emerald-500",
    bg: "bg-emerald-500/5 hover:bg-emerald-500/10",
    label: "text-emerald-400",
    chevron: "text-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-300",
  },
];

function parseHints(text: string): string[] {
  if (!text.trim()) return [];

  // Try "### Hint N\ncontent" format first
  const headingMatches = [...text.matchAll(/###\s+Hint\s+\d+\n([\s\S]*?)(?=\n###\s+Hint\s+\d+|$)/gi)];
  if (headingMatches.length > 0) {
    return headingMatches.map((m) => m[1].trim()).filter(Boolean);
  }

  // Fallback: numbered list "1. content"
  const lines = text.split("\n");
  const hints: string[] = [];
  let current = "";
  for (const line of lines) {
    const match = line.match(/^(\d+)\.\s+(.*)/);
    if (match) {
      if (current.trim()) hints.push(current.trim());
      current = match[2];
    } else if (current) {
      current += "\n" + line;
    }
  }
  if (current.trim()) hints.push(current.trim());
  return hints;
}

function HintAccordion({ hints }: { hints: string[] }) {
  const [open, setOpen] = useState<boolean[]>(hints.map(() => false));

  useEffect(() => {
    setOpen(hints.map(() => false));
  }, [hints.length]);

  if (hints.length === 0) {
    return (
      <span className="text-muted-foreground text-sm">
        No hints yet. Click &ldquo;Edit&rdquo; to add hints, or use Generate in the Code tab.
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {hints.map((hint, i) => {
        const style = HINT_STYLES[i % HINT_STYLES.length];
        const isOpen = open[i];
        return (
          <div
            key={i}
            className={`rounded-md border border-l-4 ${style.border} transition-colors ${style.bg} overflow-hidden`}
          >
            <button
              className="w-full flex items-center justify-between px-4 py-2.5 text-left"
              onClick={() => setOpen((prev) => prev.map((v, idx) => (idx === i ? !v : v)))}
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${style.badge}`}>
                  Hint {i + 1}
                </span>
              </div>
              <svg
                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${style.chevron} ${isOpen ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {isOpen && (
              <div className="px-4 pb-3 pt-1 border-t border-border/30">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown components={mdComponents}>{hint}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface NoteEditorProps {
  questionId: string;
  initialNotes: string;
  initialHints?: string;
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

const LANGUAGE_MAP: Record<string, string> = {
  cpp: "cpp",
  python: "python",
  java: "java",
  javascript: "javascript",
  go: "go",
  rust: "rust",
  c: "c",
  csharp: "csharp",
  typescript: "typescript",
  swift: "swift",
  kotlin: "kotlin",
};

export function NoteEditor({
  questionId,
  initialNotes,
  initialHints = "",
  initialCode = "",
  initialLanguage = "cpp",
}: NoteEditorProps) {
  const [hints, setHints] = useState(initialHints);
  const [notes, setNotes] = useState(initialNotes);
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"hints" | "notes" | "code">("hints");
  const [hintsEditMode, setHintsEditMode] = useState(false);
  const [notesEditMode, setNotesEditMode] = useState(false);
  const [codeEditMode, setCodeEditMode] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [generating, setGenerating] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  const doSaveHints = useCallback(async (value: string) => {
    setStatus("saving");
    try {
      const result = await saveHints(questionId, value);
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

  const handleHintsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setHints(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSaveHints(value), 1000);
    },
    [doSaveHints]
  );

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

  const handleGenerate = useCallback(async () => {
    if (!code.trim()) return;
    setGenerating(true);
    setStatus("saving");
    try {
      const result = await analyzeCode(questionId, code, language);
      if (result.success) {
        // Server already saved to DB — just update local state
        setNotes(result.data.notes);
        setHints(result.data.hints);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
    setGenerating(false);
  }, [code, language, questionId]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Keep hints in sync when initialHints changes (e.g., after generate)
  useEffect(() => {
    setHints(initialHints);
  }, [initialHints]);

  // Keep notes in sync when initialNotes changes
  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  // Language mapping for syntax highlighter
  const highlightLanguage = LANGUAGE_MAP[language] || "cpp";

  const statusIndicator = (
    <div className="flex items-center gap-2">
      {generating && (
        <span className="text-xs text-muted-foreground animate-pulse">
          Generating...
        </span>
      )}
      {status === "saving" && (
        <span className="text-xs text-muted-foreground">Saving...</span>
      )}
      {status === "saved" && (
        <span className="text-xs text-green-500">Saved</span>
      )}
      {status === "error" && (
        <span
          className="text-xs text-destructive cursor-pointer"
          onClick={() => {
            if (activeTab === "hints") doSaveHints(hints);
            else if (activeTab === "notes") doSaveNotes(notes);
            else doSaveCode(code);
          }}
        >
          Failed — retry
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Top bar: Tabs + Preview toggle + Status */}
      <div className="flex items-center gap-1 flex-wrap">
        <Button
          variant={activeTab === "hints" && !isPreviewMode ? "default" : "ghost"}
          size="sm"
          onClick={() => { setActiveTab("hints"); setIsPreviewMode(false); }}
        >
          Hints
        </Button>
        <Button
          variant={activeTab === "notes" && !isPreviewMode ? "default" : "ghost"}
          size="sm"
          onClick={() => { setActiveTab("notes"); setIsPreviewMode(false); }}
        >
          Notes
        </Button>
        <Button
          variant={activeTab === "code" && !isPreviewMode ? "default" : "ghost"}
          size="sm"
          onClick={() => { setActiveTab("code"); setIsPreviewMode(false); }}
        >
          Code
        </Button>
        <div className="mx-2 h-5 w-px bg-border" />
        <Button
          variant={isPreviewMode ? "default" : "outline"}
          size="sm"
          onClick={() => setIsPreviewMode(!isPreviewMode)}
        >
          {isPreviewMode ? "Edit" : "Preview All"}
        </Button>
        <div className="flex-1" />
        {statusIndicator}
      </div>

      {/* PREVIEW MODE — Show all three sections rendered */}
      {isPreviewMode ? (
        <div className="flex flex-col gap-4">
          {/* Preview: Hints */}
          <div className="rounded-md border p-4">
            <h3 className="text-sm font-medium mb-3 text-muted-foreground">
              Hints
            </h3>
            <HintAccordion hints={parseHints(hints)} />
          </div>

          {/* Preview: Notes */}
          <div className="rounded-md border p-4">
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">
              Notes
            </h3>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {notes ? (
                <ReactMarkdown components={mdComponents}>{notes}</ReactMarkdown>
              ) : (
                <span className="text-muted-foreground text-sm">
                  No notes yet.
                </span>
              )}
            </div>
          </div>

          {/* Preview: Code with syntax highlighting */}
          <div className="rounded-md border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
              <h3 className="text-sm font-medium text-muted-foreground">
                Code
              </h3>
              <span className="text-xs bg-muted px-2 py-1 rounded">
                {LANGUAGES.find((l) => l.value === language)?.label || language}
              </span>
            </div>
            {code ? (
              <SyntaxHighlighter
                language={highlightLanguage}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  borderRadius: 0,
                  fontSize: "0.8125rem",
                  lineHeight: 1.6,
                }}
                showLineNumbers
              >
                {code}
              </SyntaxHighlighter>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                No code yet.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* EDIT MODE — Tabs with per-section editors */
        <>
          {/* Hints tab */}
          {activeTab === "hints" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {hintsEditMode ? "Editing hints" : "Previewing hints"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHintsEditMode(!hintsEditMode)}
                >
                  {hintsEditMode ? "Preview" : "Edit"}
                </Button>
              </div>
              {hintsEditMode ? (
                <Textarea
                  value={hints}
                  onChange={handleHintsChange}
                  onBlur={() => {
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    doSaveHints(hints);
                  }}
                  placeholder="Write your hints here (markdown supported)..."
                  rows={6}
                  maxLength={10000}
                />
              ) : (
                <div className="min-h-[120px]">
                  <HintAccordion hints={parseHints(hints)} />
                </div>
              )}
            </div>
          )}

          {/* Notes tab */}
          {activeTab === "notes" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {notesEditMode ? "Editing notes" : "Previewing notes"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNotesEditMode(!notesEditMode)}
                >
                  {notesEditMode ? "Preview" : "Edit"}
                </Button>
              </div>
              {notesEditMode ? (
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
              ) : (
                <div className="rounded-md border p-4 min-h-[120px]">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {notes ? (
                      <ReactMarkdown components={mdComponents}>{notes}</ReactMarkdown>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        No notes yet. Click "Edit" to add notes.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Code tab */}
          {activeTab === "code" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
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
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCodeEditMode(!codeEditMode)}
                >
                  {codeEditMode ? "Preview" : "Edit"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating || !code.trim()}
                >
                  {generating ? (
                    <>
                      <svg
                        className="mr-1.5 h-3.5 w-3.5 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg
                        className="mr-1.5 h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        <line x1="9" y1="10" x2="15" y2="10" />
                      </svg>
                      Generate
                    </>
                  )}
                </Button>
              </div>
              {codeEditMode ? (
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
              ) : (
                <div className="rounded-md border overflow-hidden">
                  {code ? (
                    <SyntaxHighlighter
                      language={highlightLanguage}
                      style={oneDark}
                      customStyle={{
                        margin: 0,
                        borderRadius: 0,
                        fontSize: "0.8125rem",
                        lineHeight: 1.6,
                      }}
                      showLineNumbers
                    >
                      {code}
                    </SyntaxHighlighter>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      No code yet. Click "Edit" to add code.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
