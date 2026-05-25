import { describe, expect, it } from "vitest";
import { runJavaScriptTestCases } from "@/lib/code-playground";

describe("runJavaScriptTestCases", () => {
  it("runs JavaScript test cases and reports pass/fail results", async () => {
    const result = await runJavaScriptTestCases({
      code: "function solve(nums, target) { return nums.indexOf(target); }",
      testCases: [
        { input: [[1, 2, 3], 2], expected: 1 },
        { input: [[1, 2, 3], 9], expected: -1 },
      ],
    });

    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.results[0]).toMatchObject({ status: "passed", actual: 1 });
  });

  it("captures wrong answers without throwing the whole run", async () => {
    const result = await runJavaScriptTestCases({
      code: "function solve() { return 42; }",
      testCases: [{ input: [], expected: 7 }],
    });

    expect(result.passed).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.results[0].status).toBe("failed");
  });
});
