"use client";

import { useState } from "react";
import { runJavaScriptTestCases, type PlaygroundRunResult, type PlaygroundTestCase } from "@/lib/code-playground";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Play, RotateCcw } from "lucide-react";

const STARTER_CODE = `function solve(nums, target) {
  return nums.indexOf(target);
}`;

const STARTER_TESTS = `[
  { "input": [[1, 2, 3], 2], "expected": 1 },
  { "input": [[1, 2, 3], 9], "expected": -1 }
]`;

function parseTests(value: string): PlaygroundTestCase[] {
  const parsed = JSON.parse(value) as PlaygroundTestCase[];
  if (!Array.isArray(parsed)) throw new Error("Tests must be a JSON array.");
  return parsed.map((test, index) => {
    if (!Array.isArray(test.input)) throw new Error(`Test ${index + 1} needs an input array.`);
    return { input: test.input, expected: test.expected };
  });
}

export function CodePlaygroundView() {
  const [code, setCode] = useState(STARTER_CODE);
  const [tests, setTests] = useState(STARTER_TESTS);
  const [result, setResult] = useState<PlaygroundRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const testCases = parseTests(tests);
      setResult(await runJavaScriptTestCases({ code, testCases }));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Could not run tests.");
    }
    setRunning(false);
  }

  function reset() {
    setCode(STARTER_CODE);
    setTests(STARTER_TESTS);
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">JS Test Playground</h1>
          <p className="text-sm text-muted-foreground">
            Practice a solve(...) function against quick JSON test cases before saving a full solution.
          </p>
        </div>
        <div className="flex gap-2">
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
            <CardDescription>Define `solve(...)`. The runner calls it with each input array.</CardDescription>
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
              JSON array of objects with input arrays and expected values.
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

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>
              {result.passed}/{result.results.length} passed
            </CardTitle>
            <CardDescription>Each case is isolated so wrong answers do not stop the run.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.results.map((item) => (
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
    </div>
  );
}
