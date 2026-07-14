import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_TARGETED_TESTS =
  "GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_TARGETED_TESTS" as const;
export const STOP_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_TARGETED_TESTS_FAILED =
  "STOP_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_TARGETED_TESTS_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-production-durable-ledger-sync-history-scale", "targeted-tests");

export const AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_TARGETED_TESTS = [
  "tests/architecture/aiEstimateStorageArchitectureInventory.contract.test.ts",
  "tests/architecture/aiEstimateSourceOfTruthPolicy.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateLegacyLocalStorageMigration.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateLedgerIdempotency.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateOfflineSync.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateLedgerRevisionArtifactLifecycle.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateDurableLedgerChaos.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateLedgerTelemetry.contract.test.ts",
  "tests/estimateRuntime/aiEstimateDurableLedgerHistoryScale50000.contract.test.ts",
  "tests/requestEstimate/durableLedgerRequestFlow.contract.test.tsx",
  "tests/consumerRepair/durableLedgerApprovedHistory.contract.test.ts",
  "tests/officeEstimate/durableLedgerPdfBuyer.contract.test.ts",
] as const;

export function runAiEstimateProductionDurableLedgerTargetedTests(input: { writeSummary?: boolean } = {}) {
  const outDir = path.join(ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const result = spawnSync(
    process.platform === "win32" ? "cmd.exe" : "npx",
    process.platform === "win32"
      ? ["/c", "npx", "jest", ...AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_TARGETED_TESTS, "--runInBand"]
      : ["jest", ...AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_TARGETED_TESTS, "--runInBand"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 128,
      timeout: 900_000,
    },
  );
  const stdoutLog = path.join(outDir, "jest.stdout.log");
  const stderrLog = path.join(outDir, "jest.stderr.log");
  writeFileSync(stdoutLog, result.stdout ?? "", "utf8");
  writeFileSync(stderrLog, result.stderr ?? "", "utf8");
  const passed = result.status === 0;
  const summary = {
    final_status: passed
      ? GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_TARGETED_TESTS
      : STOP_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_TARGETED_TESTS_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    targeted_tests_count: AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_TARGETED_TESTS.length,
    targeted_tests: AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_TARGETED_TESTS,
    targeted_durable_ledger_tests_passed: passed,
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
  const result = runAiEstimateProductionDurableLedgerTargetedTests({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_TARGETED_TESTS) process.exitCode = 1;
}
