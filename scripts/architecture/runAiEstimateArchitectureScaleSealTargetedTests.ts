import { execSync } from "node:child_process";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_TARGETED_TESTS =
  "GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_TARGETED_TESTS" as const;
export const STOP_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_TARGETED_TESTS_FAILED =
  "STOP_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_TARGETED_TESTS_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-evolutionary-architecture-scale-seal", "targeted-tests");

const TARGETED_TEST_COMMAND = [
  "node node_modules/jest/bin/jest.js",
  "tests/architecture/aiEstimateLayeredArchitecture.contract.test.ts",
  "tests/architecture/aiEstimateNoBusinessLogicInUiHooks.contract.test.ts",
  "tests/architecture/aiEstimateDependencyDirection.contract.test.ts",
  "tests/architecture/aiEstimateNoDuplicateEngines.contract.test.ts",
  "tests/architecture/aiEstimateExtensionBoundary.contract.test.ts",
  "tests/architecture/aiEstimateArchitectureFitnessMatrix.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateVersionedContracts.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateMigrationCompatibility.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateExactDependencyMatching.contract.test.ts",
  "tests/requestEstimate/aiEstimateRuntimeBoundaryRequestFlow.contract.test.tsx",
  "tests/consumerRepair/aiEstimateRuntimeBoundaryConsumerFlow.contract.test.ts",
  "tests/foreman/aiEstimateRuntimeBoundaryForemanFlow.contract.test.ts",
  "tests/officeEstimate/aiEstimateRuntimeBoundaryPdfBuyerFlow.contract.test.ts",
  "--runInBand",
].join(" ");

function runCommand(command: string) {
  try {
    const output = execSync(command, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 600_000,
    });
    return { passed: true, output: output.slice(-8000) };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return {
      passed: false,
      output: `${err.stdout ?? ""}\n${err.stderr ?? ""}\n${err.message ?? ""}`.slice(-8000),
    };
  }
}

export function runAiEstimateArchitectureScaleSealTargetedTests(input: { writeSummary?: boolean } = {}) {
  const result = runCommand(TARGETED_TEST_COMMAND);
  const summary = {
    final_status: result.passed
      ? GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_TARGETED_TESTS
      : STOP_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_TARGETED_TESTS_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    targeted_architecture_tests_passed: result.passed,
    command: TARGETED_TEST_COMMAND,
    output_tail: result.output,
    blockers: result.passed ? [] : ["targeted_tests_failed"],
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateArchitectureScaleSealTargetedTests({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_TARGETED_TESTS) process.exitCode = 1;
}
