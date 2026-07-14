import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_PARAMETER_HARDENING_TARGETED_TESTS =
  "GREEN_AI_ESTIMATE_PARAMETER_HARDENING_TARGETED_TESTS" as const;
export const STOP_AI_ESTIMATE_PARAMETER_HARDENING_TARGETED_TESTS_FAILED =
  "STOP_AI_ESTIMATE_PARAMETER_HARDENING_TARGETED_TESTS_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-parameter-cards-durable-history-runtime-hardening", "targeted-tests");

const TARGETED_TESTS = [
  "tests/estimateInfrastructure/consumerRepairDurableSaveFallback.contract.test.ts",
  "tests/consumerRepair/approvedHistoryGrowthAfterParameterCards.contract.test.ts",
  "tests/consumerRepair/aiEstimateParameterExtractionPriority.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateParameterRuntimeMatrix.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateVisibleRussianOnly.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateRussianLocalization.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateParameterSchema.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateParameterRecalculation.contract.test.ts",
  "tests/requestEstimate/editableParameterCards.contract.test.ts",
  "tests/requestEstimate/editableParamChips.contract.test.tsx",
  "tests/officeEstimate/editableParameterPdfBuyerInvalidation.contract.test.ts",
  "tests/architecture/noSecondEstimateEngineForParameters.contract.test.ts",
];

export type AiEstimateParameterHardeningTargetedTestsSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_PARAMETER_HARDENING_TARGETED_TESTS
    | typeof STOP_AI_ESTIMATE_PARAMETER_HARDENING_TARGETED_TESTS_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  targeted_parameter_runtime_hardening_tests_passed: boolean;
  durable_save_fallback_tests_passed: boolean;
  history_growth_tests_passed: boolean;
  parameter_extraction_priority_tests_passed: boolean;
  parameter_runtime_matrix_tests_passed: boolean;
  visible_russian_only_tests_passed: boolean;
  parameter_schema_tests_passed: boolean;
  parameter_recalculation_tests_passed: boolean;
  editable_parameter_cards_tests_passed: boolean;
  editable_param_chips_tests_passed: boolean;
  pdf_buyer_invalidation_tests_passed: boolean;
  no_second_engine_tests_passed: boolean;
  exit_code: number | null;
  stdout_log: string;
  stderr_log: string;
  blockers: string[];
};

function nodeCommand(): string {
  return process.execPath;
}

export function runAiEstimateParameterHardeningTargetedTests(input: { writeSummary?: boolean } = {}) {
  const outDir = path.join(ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const stdoutLog = path.join(outDir, "stdout.log");
  const stderrLog = path.join(outDir, "stderr.log");
  const summaryPath = path.join(outDir, "summary.json");
  const result = spawnSync(nodeCommand(), [
    "node_modules/jest/bin/jest.js",
    ...TARGETED_TESTS,
    "--runInBand",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 64,
  });
  writeFileSync(stdoutLog, result.stdout ?? "", "utf8");
  writeFileSync(stderrLog, result.stderr ?? "", "utf8");
  const passed = result.status === 0;
  const blockers = passed ? [] : [`targeted_jest_exit_code:${result.status ?? "null"}`];
  const summary: AiEstimateParameterHardeningTargetedTestsSummary = {
    final_status: passed
      ? GREEN_AI_ESTIMATE_PARAMETER_HARDENING_TARGETED_TESTS
      : STOP_AI_ESTIMATE_PARAMETER_HARDENING_TARGETED_TESTS_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    targeted_parameter_runtime_hardening_tests_passed: passed,
    durable_save_fallback_tests_passed: passed,
    history_growth_tests_passed: passed,
    parameter_extraction_priority_tests_passed: passed,
    parameter_runtime_matrix_tests_passed: passed,
    visible_russian_only_tests_passed: passed,
    parameter_schema_tests_passed: passed,
    parameter_recalculation_tests_passed: passed,
    editable_parameter_cards_tests_passed: passed,
    editable_param_chips_tests_passed: passed,
    pdf_buyer_invalidation_tests_passed: passed,
    no_second_engine_tests_passed: passed,
    exit_code: result.status,
    stdout_log: stdoutLog,
    stderr_log: stderrLog,
    blockers,
  };
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateParameterHardeningTargetedTests({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PARAMETER_HARDENING_TARGETED_TESTS) process.exitCode = 1;
}
