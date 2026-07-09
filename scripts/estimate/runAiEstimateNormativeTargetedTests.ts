import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_NORMATIVE_TARGETED_TESTS =
  "GREEN_AI_ESTIMATE_NORMATIVE_TARGETED_TESTS" as const;
export const STOP_AI_ESTIMATE_NORMATIVE_TARGETED_TESTS_FAILED =
  "STOP_AI_ESTIMATE_NORMATIVE_TARGETED_TESTS_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-normative-parameter-completeness", "targeted-tests");

type TestGroup =
  | "passport"
  | "missing_questions"
  | "quantity_trace"
  | "ui"
  | "missing_flow"
  | "pdf_buyer_trace"
  | "architecture";

const TESTS: { name: TestGroup; file: string }[] = [
  { name: "passport", file: "tests/estimateInfrastructure/aiEstimateNormativeParameterPassport.contract.test.ts" },
  { name: "missing_questions", file: "tests/estimateInfrastructure/aiEstimateMissingInputQuestions.contract.test.ts" },
  { name: "quantity_trace", file: "tests/estimateInfrastructure/aiEstimateQuantityTrace.contract.test.ts" },
  { name: "ui", file: "tests/requestEstimate/normativeParameterPassportUi.contract.test.tsx" },
  { name: "missing_flow", file: "tests/consumerRepair/normativeMissingInputFlow.contract.test.ts" },
  { name: "pdf_buyer_trace", file: "tests/officeEstimate/normativePdfBuyerTrace.contract.test.ts" },
  { name: "architecture", file: "tests/architecture/noGenericParameterFallback.contract.test.ts" },
];

export type AiEstimateNormativeTargetedTestsSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_NORMATIVE_TARGETED_TESTS
    | typeof STOP_AI_ESTIMATE_NORMATIVE_TARGETED_TESTS_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  passport_tests_passed: boolean;
  missing_questions_tests_passed: boolean;
  quantity_trace_tests_passed: boolean;
  ui_tests_passed: boolean;
  missing_flow_tests_passed: boolean;
  pdf_buyer_trace_tests_passed: boolean;
  architecture_tests_passed: boolean;
  tests: Record<TestGroup, {
    file: string;
    exit_code: number | null;
    stdout_log: string;
    stderr_log: string;
  }>;
  blockers: string[];
};

function runJest(file: string, outDir: string, name: TestGroup) {
  const stdoutLog = path.join(outDir, `${name}.stdout.log`);
  const stderrLog = path.join(outDir, `${name}.stderr.log`);
  const result = spawnSync(
    process.platform === "win32" ? "cmd.exe" : "npx",
    process.platform === "win32"
      ? ["/c", "npx", "jest", file, "--runInBand"]
      : ["jest", file, "--runInBand"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 64,
    },
  );
  writeFileSync(stdoutLog, result.stdout ?? "", "utf8");
  writeFileSync(stderrLog, result.stderr ?? "", "utf8");
  return {
    file,
    exit_code: result.status,
    stdout_log: stdoutLog,
    stderr_log: stderrLog,
  };
}

export function runAiEstimateNormativeTargetedTests(input: { writeSummary?: boolean } = {}) {
  const outDir = path.join(ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const results = Object.fromEntries(
    TESTS.map((test) => [test.name, runJest(test.file, outDir, test.name)]),
  ) as AiEstimateNormativeTargetedTestsSummary["tests"];
  const passed = (name: TestGroup) => results[name].exit_code === 0;
  const blockers = TESTS
    .filter((test) => !passed(test.name))
    .map((test) => `${test.name}_failed:${results[test.name].exit_code ?? "null"}`);
  const summary: AiEstimateNormativeTargetedTestsSummary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_NORMATIVE_TARGETED_TESTS
      : STOP_AI_ESTIMATE_NORMATIVE_TARGETED_TESTS_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    passport_tests_passed: passed("passport"),
    missing_questions_tests_passed: passed("missing_questions"),
    quantity_trace_tests_passed: passed("quantity_trace"),
    ui_tests_passed: passed("ui"),
    missing_flow_tests_passed: passed("missing_flow"),
    pdf_buyer_trace_tests_passed: passed("pdf_buyer_trace"),
    architecture_tests_passed: passed("architecture"),
    tests: results,
    blockers,
  };
  const summaryPath = path.join(outDir, "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateNormativeTargetedTests({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_NORMATIVE_TARGETED_TESTS) process.exitCode = 1;
}
