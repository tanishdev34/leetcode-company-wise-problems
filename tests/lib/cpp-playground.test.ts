import { describe, expect, it } from "vitest";
import { buildCppHarness, normalizeWandboxResult } from "@/lib/cpp-playground";

describe("buildCppHarness", () => {
  it("wraps a solve function with JSON-like test cases", () => {
    const code = "int solve(vector<int> nums, int target) { return 2; }";
    const harness = buildCppHarness({
      code,
      testCases: [{ input: "[1,2,3]\n3", expected: "2" }],
    });

    expect(harness).toContain(code);
    expect(harness).toContain("CASE ");
    expect(harness).toContain("PASS");
    expect(harness).toContain("[1,2,3]\\n3");
  });
});

describe("normalizeWandboxResult", () => {
  it("extracts compiler and runtime output from Wandbox response", () => {
    const result = normalizeWandboxResult({
      status: "0",
      program_output: "CASE 1 PASS\n",
      compiler_output: "",
      compiler_error: "",
      program_error: "",
      signal: "",
      url: "https://wandbox.org/permlink/test",
    });

    expect(result.status).toBe("success");
    expect(result.stdout).toContain("PASS");
    expect(result.permalink).toContain("wandbox");
  });
});
