"use client";

import { useState } from "react";
import { runJavaScriptTestCases, type PlaygroundRunResult, type PlaygroundTestCase } from "@/lib/code-playground";
import type { CppRunResult, CppTestCase } from "@/lib/cpp-playground";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, RotateCcw } from "lucide-react";

type PlaygroundLanguage = "javascript" | "cpp";

const JS_STARTER_CODE = `function solve(nums, target) {
  return nums.indexOf(target);
}`;

const JS_STARTER_TESTS = `[
  { "input": [[1, 2, 3], 2], "expected": 1 },
  { "input": [[1, 2, 3], 9], "expected": -1 }
]`;

const CPP_STARTER_CODE = `void solve() {
  int n;
  cin >> n;
  cout << n * 2 << "\\n";
}`;

const CPP_STARTER_TESTS = `[
  { "input": "21", "expected": "42" },
  { "input": "7", "expected": "14" }
]`;

type RunResult =
  | { language: "javascript"; data: PlaygroundRunResult }
  | { language: "cpp"; data: CppRunResult };

function parseTests(value: string): PlaygroundTestCase[] {
  const parsed = JSON.parse(value) as PlaygroundTestCase[];
  if (!Array.isArray(parsed)) throw new Error("Tests must be a JSON array.");
  return parsed.map((test, index) => {
    if (!Array.isArray(test.input)) throw new Error(`Test ${index + 1} needs an input array.`);
    return { input: test.input, expected: test.expected };
  });
}

function parseCppTests(value: string): CppTestCase[] {
  const parsed = JSON.parse(value) as CppTestCase[];
  if (!Array.isArray(parsed)) throw new Error("Tests must be a JSON array.");
  return parsed.map((test, index) => {
    if (typeof test.input !== "string" || typeof test.expected !== "string") {
      throw new Error(`C++ test ${index + 1} needs string input and expected fields.`);
    }
    return { input: test.input, expected: test.expected };
  });
}

export function CodePlaygroundView() {
  const [language, setLanguage] = useState<PlaygroundLanguage>("javascript");
  const [code, setCode] = useState(JS_STARTER_CODE);
  const [tests, setTests] = useState(JS_STARTER_TESTS);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      if (language === "javascript") {
        const testCases = parseTests(tests);
        setResult({ language, data: await runJavaScriptTestCases({ code, testCases }) });
      } else {
        const testCases = parseCppTests(tests);
        const response = await fetch("/api/playground/cpp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, testCases }),
        });
        const payload = (await response.json()) as CppRunResult | { error?: string };
        if (!response.ok) throw new Error("error" in payload && payload.error ? payload.error : "Could not run C++ code.");
        setResult({ language, data: payload as CppRunResult });
      }
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Could not run tests.");
    }
    setRunning(false);
  }

  function reset() {
    setCode(language === "javascript" ? JS_STARTER_CODE : CPP_STARTER_CODE);
    setTests(language === "javascript" ? JS_STARTER_TESTS : CPP_STARTER_TESTS);
    setResult(null);
    setError(null);
  }

  function changeLanguage(nextLanguage: string) {
    const typedLanguage = nextLanguage as PlaygroundLanguage;
    setLanguage(typedLanguage);
    setCode(typedLanguage === "javascript" ? JS_STARTER_CODE : CPP_STARTER_CODE);
    setTests(typedLanguage === "javascript" ? JS_STARTER_TESTS : CPP_STARTER_TESTS);
    setResult(null);
    setError(null);
  }

  const isCpp = language === "cpp";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Code Playground</h1>
          <p className="text-sm text-muted-foreground">
            Practice quick JavaScript or C++ solve functions before saving a full solution.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={language} onValueChange={changeLanguage}>
            <TabsList>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="cpp">C++</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reset
          </Button>
          <Button size="sm" onClick={handleRun} disabled={running}>
            <Play className="mr-1.5 h-4 w-4" />
            {running ? "Running..." : "Run tests"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Code</CardTitle>
            <CardDescription>
              {isCpp
                ? "Define void solve(). The runner feeds each input string through cin and checks cout."
                : "Define solve(...). The runner calls it with each input array."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="min-h-[360px] font-mono"
              spellCheck={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tests</CardTitle>
            <CardDescription>
              {isCpp
                ? "JSON array of stdin strings and expected stdout strings."
                : "JSON array of objects with input arrays and expected values."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={tests}
              onChange={(event) => setTests(event.target.value)}
              className="min-h-[360px] font-mono"
              spellCheck={false}
            />
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {result?.language === "javascript" && (
        <Card>
          <CardHeader>
            <CardTitle>
              {result.data.passed}/{result.data.results.length} passed
            </CardTitle>
            <CardDescription>Each case is isolated so wrong answers do not stop the run.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.data.results.map((item) => (
              <div key={item.index} className="rounded-sm border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-medium">Case {item.index + 1}</span>
                  <Badge variant={item.status === "passed" ? "secondary" : "destructive"}>{item.status}</Badge>
                </div>
                <pre className="overflow-auto text-xs text-muted-foreground">
                  {JSON.stringify(
                    {
                      input: item.input,
                      expected: item.expected,
                      actual: item.actual,
                      error: item.error,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {result?.language === "cpp" && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>C++ runner output</CardTitle>
              <Badge variant={result.data.status === "success" ? "secondary" : "destructive"}>
                {result.data.status.replace("_", " ")}
              </Badge>
            </div>
            <CardDescription>Compiled with GCC through Wandbox. Non-passing cases return runtime output for inspection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.data.compilerOutput && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Compiler</p>
                <pre className="max-h-48 overflow-auto rounded-sm border bg-muted/30 p-3 text-xs">
                  {result.data.compilerOutput}
                </pre>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Stdout</p>
              <pre className="max-h-72 overflow-auto rounded-sm border bg-muted/30 p-3 text-xs">
                {result.data.stdout || "No stdout"}
              </pre>
            </div>
            {result.data.stderr && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Stderr</p>
                <pre className="max-h-48 overflow-auto rounded-sm border bg-muted/30 p-3 text-xs">
                  {result.data.stderr}
                </pre>
              </div>
            )}
            {result.data.permalink && (
              <a
                className="text-sm font-medium text-primary hover:underline"
                href={result.data.permalink}
                target="_blank"
                rel="noreferrer"
              >
                Open Wandbox run
              </a>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
