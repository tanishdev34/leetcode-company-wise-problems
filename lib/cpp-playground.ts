export interface CppTestCase {
  input: string;
  expected: string;
}

export interface CppHarnessInput {
  code: string;
  testCases: CppTestCase[];
}

export interface WandboxRawResult {
  status?: string;
  signal?: string;
  compiler_output?: string;
  compiler_error?: string;
  program_output?: string;
  program_error?: string;
  url?: string;
}

export interface CppRunResult {
  status: "success" | "compile_error" | "runtime_error";
  stdout: string;
  stderr: string;
  compilerOutput: string;
  permalink?: string;
}

function escapeCppString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

export function buildCppHarness({ code, testCases }: CppHarnessInput): string {
  const cases = testCases
    .map((testCase) => `    {"${escapeCppString(testCase.input)}", "${escapeCppString(testCase.expected)}"}`)
    .join(",\n");

  return `#include <bits/stdc++.h>
using namespace std;

${code}

static string trim_output(string value) {
  while (!value.empty() && (value.back() == '\\n' || value.back() == '\\r' || value.back() == ' ' || value.back() == '\\t')) {
    value.pop_back();
  }
  size_t start = 0;
  while (start < value.size() && (value[start] == '\\n' || value[start] == '\\r' || value[start] == ' ' || value[start] == '\\t')) {
    start++;
  }
  return value.substr(start);
}

int main() {
  vector<pair<string, string>> cases = {
${cases}
  };

  int passed = 0;
  for (size_t i = 0; i < cases.size(); ++i) {
    istringstream input(cases[i].first);
    ostringstream output;
    streambuf* original_cin = cin.rdbuf(input.rdbuf());
    streambuf* original_cout = cout.rdbuf(output.rdbuf());
    string error_message;

    try {
      solve();
    } catch (const exception& error) {
      error_message = error.what();
    } catch (...) {
      error_message = "Unknown runtime error";
    }

    cin.rdbuf(original_cin);
    cout.rdbuf(original_cout);

    const string actual = trim_output(output.str());
    const string expected = trim_output(cases[i].second);
    const bool ok = error_message.empty() && actual == expected;
    if (ok) passed++;

    cout << "CASE " << (i + 1) << " " << (ok ? "PASS" : "FAIL") << "\\n";
    if (!error_message.empty()) {
      cout << "  error: " << error_message << "\\n";
    }
    if (!ok) {
      cout << "  expected: " << expected << "\\n";
      cout << "  actual: " << actual << "\\n";
    }
  }

  cout << "SUMMARY " << passed << "/" << cases.size() << " passed\\n";
  return passed == static_cast<int>(cases.size()) ? 0 : 1;
}
`;
}

export function normalizeWandboxResult(raw: WandboxRawResult): CppRunResult {
  const compilerOutput = [raw.compiler_output, raw.compiler_error].filter(Boolean).join("\n").trim();
  const stdout = raw.program_output ?? "";
  const stderr = [raw.program_error, raw.signal ? `signal: ${raw.signal}` : ""].filter(Boolean).join("\n").trim();
  const exitStatus = Number(raw.status ?? 0);

  if (compilerOutput && !stdout) {
    return {
      status: "compile_error",
      stdout,
      stderr,
      compilerOutput,
      permalink: raw.url,
    };
  }

  if (stderr || exitStatus !== 0) {
    return {
      status: "runtime_error",
      stdout,
      stderr,
      compilerOutput,
      permalink: raw.url,
    };
  }

  return {
    status: "success",
    stdout,
    stderr,
    compilerOutput,
    permalink: raw.url,
  };
}
