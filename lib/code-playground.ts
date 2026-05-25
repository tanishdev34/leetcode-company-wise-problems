export interface PlaygroundTestCase {
  input: unknown[];
  expected: unknown;
}

export interface PlaygroundRunInput {
  code: string;
  testCases: PlaygroundTestCase[];
}

export interface PlaygroundTestResult {
  index: number;
  status: "passed" | "failed" | "error";
  input: unknown[];
  expected: unknown;
  actual: unknown;
  error?: string;
}

export interface PlaygroundRunResult {
  passed: number;
  failed: number;
  results: PlaygroundTestResult[];
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, Object.keys((value as object) ?? {}).sort());
}

function isEqual(actual: unknown, expected: unknown): boolean {
  return stableStringify(actual) === stableStringify(expected);
}

export async function runJavaScriptTestCases(input: PlaygroundRunInput): Promise<PlaygroundRunResult> {
  const results: PlaygroundTestResult[] = [];

  let solve: (...args: unknown[]) => unknown;
  try {
    solve = new Function(`${input.code}; return solve;`)() as (...args: unknown[]) => unknown;
    if (typeof solve !== "function") throw new Error("Define a solve(...) function.");
  } catch (error) {
    return {
      passed: 0,
      failed: input.testCases.length,
      results: input.testCases.map((testCase, index) => ({
        index,
        status: "error",
        input: testCase.input,
        expected: testCase.expected,
        actual: null,
        error: error instanceof Error ? error.message : "Could not compile code",
      })),
    };
  }

  for (const [index, testCase] of input.testCases.entries()) {
    try {
      const actual = await solve(...testCase.input);
      const passed = isEqual(actual, testCase.expected);
      results.push({
        index,
        status: passed ? "passed" : "failed",
        input: testCase.input,
        expected: testCase.expected,
        actual,
      });
    } catch (error) {
      results.push({
        index,
        status: "error",
        input: testCase.input,
        expected: testCase.expected,
        actual: null,
        error: error instanceof Error ? error.message : "Runtime error",
      });
    }
  }

  const passed = results.filter((result) => result.status === "passed").length;
  return {
    passed,
    failed: results.length - passed,
    results,
  };
}
