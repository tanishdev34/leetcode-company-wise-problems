import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildCppHarness, normalizeWandboxResult, type CppTestCase, type WandboxRawResult } from "@/lib/cpp-playground";

const WANDBOX_COMPILE_URL = "https://wandbox.org/api/compile.json";
const MAX_CODE_LENGTH = 30_000;
const MAX_TEST_CASES = 10;

function isCppTestCase(value: unknown): value is CppTestCase {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CppTestCase).input === "string" &&
    typeof (value as CppTestCase).expected === "string"
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json()) as { code?: unknown; testCases?: unknown };
    if (typeof body.code !== "string" || body.code.trim().length === 0) {
      return NextResponse.json({ error: "Missing C++ code" }, { status: 400 });
    }
    if (body.code.length > MAX_CODE_LENGTH) {
      return NextResponse.json({ error: "C++ code is too large" }, { status: 400 });
    }
    if (!Array.isArray(body.testCases) || body.testCases.length === 0) {
      return NextResponse.json({ error: "Add at least one test case" }, { status: 400 });
    }
    if (body.testCases.length > MAX_TEST_CASES || !body.testCases.every(isCppTestCase)) {
      return NextResponse.json(
        { error: "Tests must be an array of up to 10 objects with string input and expected fields" },
        { status: 400 },
      );
    }

    const code = buildCppHarness({
      code: body.code,
      testCases: body.testCases,
    });

    const response = await fetch(WANDBOX_COMPILE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        compiler: "gcc-head",
        options: "warning,gnu++20",
        stdin: "",
        save: false,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "C++ runner is unavailable right now" }, { status: 502 });
    }

    const raw = (await response.json()) as WandboxRawResult;
    return NextResponse.json(normalizeWandboxResult(raw));
  } catch (err) {
    console.error("POST /api/playground/cpp error:", err);
    return NextResponse.json({ error: "Failed to run C++ code" }, { status: 500 });
  }
}
