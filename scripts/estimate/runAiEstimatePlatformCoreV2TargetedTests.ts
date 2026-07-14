import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_TARGETED_TESTS =
  "GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_TARGETED_TESTS" as const;
export const STOP_AI_ESTIMATE_PLATFORM_CORE_V2_TARGETED_TESTS_FAILED =
  "STOP_AI_ESTIMATE_PLATFORM_CORE_V2_TARGETED_TESTS_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-v2-semantic-scale-refactor", "targeted-tests");

const TEST_FILES = [
  "tests/estimateInfrastructure/aiEstimateCatalogIndex11610.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateWorkClassifier.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateParameterGraph.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateFormulaDag.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateRevisionEngineV2.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateArtifactLifecycle.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateTelemetryBoundary.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimatePlatformCoreV2Matrix.contract.test.ts",
  "tests/estimateRuntime/aiEstimatePlatformCoreV2Performance.contract.test.ts",
  "tests/architecture/aiEstimatePlatformArchitectureInventory.contract.test.ts",
  "tests/architecture/aiEstimateStorageBoundary.contract.test.ts",
  "tests/architecture/aiEstimateE2eHarnessBoundary.contract.test.ts",
  "tests/architecture/aiEstimateCodeQualityBoundaries.contract.test.ts",
  "tests/requestEstimate/platformCoreV2RequestFlow.contract.test.tsx",
  "tests/consumerRepair/platformCoreV2ConsumerFlow.contract.test.ts",
  "tests/foreman/platformCoreV2ForemanFlow.contract.test.ts",
  "tests/officeEstimate/platformCoreV2PdfBuyerFlow.contract.test.ts",
];

export function runAiEstimatePlatformCoreV2TargetedTests(input: { writeSummary?: boolean } = {}) {
  const outDir = path.join(ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const result = spawnSync(
    process.platform === "win32" ? "cmd.exe" : "node",
    process.platform === "win32"
      ? ["/c", "node", "node_modules/jest/bin/jest.js", ...TEST_FILES, "--runInBand"]
      : ["node_modules/jest/bin/jest.js", ...TEST_FILES, "--runInBand"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 128,
      timeout: 1_800_000,
    },
  );
  const stdoutLog = path.join(outDir, "stdout.log");
  const stderrLog = path.join(outDir, "stderr.log");
  writeFileSync(stdoutLog, result.stdout ?? "", "utf8");
  writeFileSync(stderrLog, result.stderr ?? "", "utf8");
  const passed = result.status === 0;
  const summary = {
    final_status: passed
      ? GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_TARGETED_TESTS
      : STOP_AI_ESTIMATE_PLATFORM_CORE_V2_TARGETED_TESTS_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    targeted_platform_core_v2_tests_passed: passed,
    catalog_index_tests_passed: passed,
    work_classifier_tests_passed: passed,
    parameter_graph_tests_passed: passed,
    formula_dag_tests_passed: passed,
    revision_engine_tests_passed: passed,
    artifact_lifecycle_tests_passed: passed,
    telemetry_boundary_tests_passed: passed,
    platform_core_v2_matrix_tests_passed: passed,
    performance_tests_passed: passed,
    architecture_boundary_tests_passed: passed,
    storage_boundary_tests_passed: passed,
    e2e_harness_boundary_tests_passed: passed,
    code_quality_boundary_tests_passed: passed,
    request_flow_tests_passed: passed,
    consumer_flow_tests_passed: passed,
    foreman_flow_tests_passed: passed,
    pdf_buyer_flow_tests_passed: passed,
    exit_code: result.status,
    stdout_log: stdoutLog,
    stderr_log: stderrLog,
    blockers: passed ? [] : [`jest_failed:${result.status ?? "null"}`],
  };
  const summaryPath = path.join(outDir, "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimatePlatformCoreV2TargetedTests({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_TARGETED_TESTS) process.exitCode = 1;
}
