import path from "node:path";

import { AI_PLATFORM_KERNEL_ROOT, currentGitState, runCommand, timestampForPath, writeJson } from "./aiPlatformKernelAuditUtils";

export const GREEN_AI_PLATFORM_KERNEL_TARGETED_TESTS = "GREEN_AI_PLATFORM_KERNEL_TARGETED_TESTS" as const;
export const STOP_AI_PLATFORM_KERNEL_TARGETED_TESTS_FAILED = "STOP_AI_PLATFORM_KERNEL_TARGETED_TESTS_FAILED" as const;

export const AI_PLATFORM_KERNEL_TARGETED_TESTS = [
  "tests/architecture/aiPlatformSurfaceInventory.contract.test.ts",
  "tests/architecture/aiModelProviderBoundary.contract.test.ts",
  "tests/architecture/aiContextPipeline.contract.test.ts",
  "tests/architecture/aiToolRegistryApprovalPolicy.contract.test.ts",
  "tests/architecture/aiRunLedger.contract.test.ts",
  "tests/architecture/aiEstimatePluginBoundary.contract.test.ts",
  "tests/architecture/aiPlatformNoBusinessLogicInHooks.contract.test.ts",
  "tests/architecture/aiLegacyEntrypointMigration.contract.test.ts",
  "tests/architecture/aiModelReplacementProof.contract.test.ts",
  "tests/architecture/aiPlatformKernelFitnessMatrix.contract.test.ts",
  "tests/requestEstimate/aiEstimateViaPlatformKernel.contract.test.tsx",
  "tests/consumerRepair/aiConsumerFlowViaPlatformKernel.contract.test.ts",
  "tests/foreman/aiForemanFlowViaPlatformKernel.contract.test.ts",
  "tests/officeEstimate/aiPdfBuyerViaPlatformKernel.contract.test.ts",
] as const;

export function runAiPlatformKernelTargetedTests(input: { writeSummary?: boolean } = {}) {
  const command = [
    "node_modules/jest/bin/jest.js",
    ...AI_PLATFORM_KERNEL_TARGETED_TESTS,
    "--runInBand",
  ];
  const result = runCommand("node", command);
  const summary = {
    final_status: result.passed ? GREEN_AI_PLATFORM_KERNEL_TARGETED_TESTS : STOP_AI_PLATFORM_KERNEL_TARGETED_TESTS_FAILED,
    ...currentGitState(),
    generated_at: new Date().toISOString(),
    targeted_ai_platform_kernel_tests_passed: result.passed,
    surface_inventory_tests_passed: result.passed,
    provider_boundary_tests_passed: result.passed,
    context_pipeline_tests_passed: result.passed,
    tool_registry_policy_tests_passed: result.passed,
    ledger_tests_passed: result.passed,
    estimate_plugin_boundary_tests_passed: result.passed,
    no_business_logic_in_hooks_tests_passed: result.passed,
    legacy_migration_tests_passed: result.passed,
    model_replacement_tests_passed: result.passed,
    fitness_matrix_tests_passed: result.passed,
    request_flow_tests_passed: result.passed,
    consumer_flow_tests_passed: result.passed,
    foreman_flow_tests_passed: result.passed,
    pdf_buyer_flow_tests_passed: result.passed,
    command: `node ${command.join(" ")}`,
    output_tail: result.output.slice(-4000),
    blockers: result.passed ? [] : ["targeted_tests_failed"],
  };
  const summaryPath = path.join(AI_PLATFORM_KERNEL_ROOT, "targeted-tests", timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiPlatformKernelTargetedTests({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_PLATFORM_KERNEL_TARGETED_TESTS) process.exitCode = 1;
}
