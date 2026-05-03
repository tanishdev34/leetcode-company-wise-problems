"use client";

import { useState, useRef } from "react";
import { addQuestion, addQuestionsFromCSV, type CsvRow } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Upload, PlusCircle, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const TIME_PERIODS = [
  { value: "THIRTY_DAYS", label: "30 Days" },
  { value: "THREE_MONTHS", label: "3 Months" },
  { value: "SIX_MONTHS", label: "6 Months" },
  { value: "MORE_THAN_SIX_MONTHS", label: "6+ Months" },
  { value: "ALL", label: "All Time" },
];

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

const CSV_COLUMNS = ["Title", "Difficulty", "Link", "Topics", "Frequency", "Acceptance Rate"];

type Tab = "single" | "csv";

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | { type: "partial"; added: number; skipped: number; errors: string[] };

function parseCSV(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = {
    title: headers.findIndex((h) => h === "title"),
    difficulty: headers.findIndex((h) => h === "difficulty"),
    link: headers.findIndex((h) => h === "link"),
    topics: headers.findIndex((h) => h === "topics"),
    frequency: headers.findIndex((h) => h === "frequency"),
    acceptanceRate: headers.findIndex((h) => h.includes("acceptance")),
  };

  return lines.slice(1).map((line) => {
    // handle quoted fields with commas
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { fields.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    fields.push(current.trim());

    return {
      title: idx.title >= 0 ? fields[idx.title] ?? "" : "",
      difficulty: idx.difficulty >= 0 ? fields[idx.difficulty] ?? "" : "",
      leetcodeUrl: idx.link >= 0 ? fields[idx.link] ?? "" : "",
      topics: idx.topics >= 0 ? fields[idx.topics] ?? "" : "",
      frequency: idx.frequency >= 0 ? fields[idx.frequency] ?? "" : "0",
      acceptanceRate: idx.acceptanceRate >= 0 ? fields[idx.acceptanceRate] ?? "" : "0",
    };
  }).filter((r) => r.title);
}

function StatusBanner({ status }: { status: Status }) {
  if (status.type === "idle") return null;
  if (status.type === "loading") return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-4 py-3 text-sm">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      Processing…
    </div>
  );
  if (status.type === "success") return (
    <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
      <CheckCircle className="h-4 w-4 shrink-0" /> {status.message}
    </div>
  );
  if (status.type === "error") return (
    <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
      <XCircle className="h-4 w-4 shrink-0" /> {status.message}
    </div>
  );
  if (status.type === "partial") return (
    <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
      <div className="flex items-center gap-2 mb-1">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Done — {status.added} added, {status.skipped} skipped</span>
      </div>
      {status.errors.length > 0 && (
        <ul className="mt-2 list-disc pl-6 space-y-0.5 text-xs opacity-80">
          {status.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
          {status.errors.length > 10 && <li>…and {status.errors.length - 10} more</li>}
        </ul>
      )}
    </div>
  );
}

export function AdminQuestionsForm({ companies }: { companies: { name: string; slug: string }[] }) {
  const [tab, setTab] = useState<Tab>("single");
  const [status, setStatus] = useState<Status>({ type: "idle" });

  // Single form state
  const [single, setSingle] = useState({
    title: "",
    leetcodeUrl: "",
    difficulty: "MEDIUM",
    topics: "",
    frequency: "0",
    acceptanceRate: "0",
    companyName: companies[0]?.name ?? "",
    timePeriod: "ALL",
  });

  // CSV form state
  const [csvCompany, setCsvCompany] = useState(companies[0]?.name ?? "");
  const [csvTimePeriod, setCsvTimePeriod] = useState("ALL");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ type: "loading" });
    const res = await addQuestion({
      ...single,
      frequency: parseFloat(single.frequency) || 0,
      acceptanceRate: parseFloat(single.acceptanceRate) || 0,
    });
    if (res.success) {
      setStatus({ type: "success", message: `"${single.title}" added successfully.` });
      setSingle((s) => ({ ...s, title: "", leetcodeUrl: "", topics: "", frequency: "0", acceptanceRate: "0" }));
    } else {
      setStatus({ type: "error", message: res.error ?? "Unknown error" });
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvPreview(parseCSV(text));
    };
    reader.readAsText(file);
  }

  async function handleCsvSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!csvFile || csvPreview.length === 0) {
      setStatus({ type: "error", message: "No valid rows found in the CSV." });
      return;
    }
    setStatus({ type: "loading" });
    const res = await addQuestionsFromCSV(csvPreview, csvCompany, csvTimePeriod);
    if (!res.success) {
      setStatus({ type: "error", message: res.error ?? "Unknown error" });
      return;
    }
    if (res.skipped && res.skipped > 0) {
      setStatus({ type: "partial", added: res.added!, skipped: res.skipped, errors: res.errors! });
    } else {
      setStatus({ type: "success", message: `${res.added} question(s) added for ${csvCompany}.` });
    }
    setCsvFile(null);
    setCsvPreview([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted p-1 w-fit">
        {(["single", "csv"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setStatus({ type: "idle" }); }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "single" ? "Single Question" : "Bulk CSV"}
          </button>
        ))}
      </div>

      <StatusBanner status={status} />

      {tab === "single" && (
        <Card className="p-6">
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Title</Label>
                <Input
                  required
                  value={single.title}
                  onChange={(e) => setSingle((s) => ({ ...s, title: e.target.value }))}
                  placeholder="Two Sum"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>LeetCode URL</Label>
                <Input
                  required
                  type="url"
                  value={single.leetcodeUrl}
                  onChange={(e) => setSingle((s) => ({ ...s, leetcodeUrl: e.target.value }))}
                  placeholder="https://leetcode.com/problems/two-sum/"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <select
                  value={single.difficulty}
                  onChange={(e) => setSingle((s) => ({ ...s, difficulty: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Topics <span className="text-muted-foreground">(comma-separated)</span></Label>
                <Input
                  value={single.topics}
                  onChange={(e) => setSingle((s) => ({ ...s, topics: e.target.value }))}
                  placeholder="Array, Hash Table"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={single.frequency}
                  onChange={(e) => setSingle((s) => ({ ...s, frequency: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Acceptance Rate (%)</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={single.acceptanceRate}
                  onChange={(e) => setSingle((s) => ({ ...s, acceptanceRate: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input
                  required
                  list="company-list"
                  value={single.companyName}
                  onChange={(e) => setSingle((s) => ({ ...s, companyName: e.target.value }))}
                  placeholder="Google"
                />
                <datalist id="company-list">
                  {companies.map((c) => <option key={c.slug} value={c.name} />)}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label>Time Period</Label>
                <select
                  value={single.timePeriod}
                  onChange={(e) => setSingle((s) => ({ ...s, timePeriod: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {TIME_PERIODS.map((tp) => (
                    <option key={tp.value} value={tp.value}>{tp.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button type="submit" disabled={status.type === "loading"} className="gap-2">
              <PlusCircle className="h-4 w-4" /> Add Question
            </Button>
          </form>
        </Card>
      )}

      {tab === "csv" && (
        <Card className="p-6">
          <div className="mb-4 rounded-md border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Expected CSV columns:</p>
            <code className="text-xs">{CSV_COLUMNS.join(", ")}</code>
          </div>

          <form onSubmit={handleCsvSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input
                  required
                  list="company-list-csv"
                  value={csvCompany}
                  onChange={(e) => setCsvCompany(e.target.value)}
                  placeholder="Google"
                />
                <datalist id="company-list-csv">
                  {companies.map((c) => <option key={c.slug} value={c.name} />)}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label>Time Period</Label>
                <select
                  value={csvTimePeriod}
                  onChange={(e) => setCsvTimePeriod(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {TIME_PERIODS.map((tp) => (
                    <option key={tp.value} value={tp.value}>{tp.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>CSV File</Label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-6 py-8 text-center hover:bg-muted/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {csvFile ? csvFile.name : "Click to upload or drag & drop a .csv file"}
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {csvPreview.length > 0 && (
              <div className="rounded-md border border-border overflow-hidden">
                <div className="bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
                  Preview — {csvPreview.length} row(s) detected
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">Title</th>
                        <th className="px-3 py-2 text-left font-medium">Difficulty</th>
                        <th className="px-3 py-2 text-left font-medium">Topics</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.slice(0, 8).map((row, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="px-3 py-2 max-w-[200px] truncate">{row.title}</td>
                          <td className="px-3 py-2">{row.difficulty}</td>
                          <td className="px-3 py-2 max-w-[160px] truncate text-muted-foreground">{row.topics}</td>
                        </tr>
                      ))}
                      {csvPreview.length > 8 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-center text-muted-foreground">
                            …and {csvPreview.length - 8} more rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={status.type === "loading" || csvPreview.length === 0}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import {csvPreview.length > 0 ? `${csvPreview.length} Questions` : "CSV"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
