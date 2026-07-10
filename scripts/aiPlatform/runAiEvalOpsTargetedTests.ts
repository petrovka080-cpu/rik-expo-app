import path from "node:path";

import { AI_PLATFORM_EVALOPS_ROOT, currentGitState, runCommand, timestampForPath, writeJson } from "./evalOpsAuditUtils";

export const GREEN_AI_EVALOPS_TARGETED_TESTS = "GREEN_AI_EVALOPS_TARGETED_TESTS" as const;
export const STOP_AI_EVALOPS_TARGETED_TESTS_FAILED = "STOP_AI_EVALOPS_TARGETED_TESTS_FAILED" as const;

export const AI_EVALOPS_TARGETED_TESTS = [
  "tests/architecture/aiPromptModelManifest.contract.test.ts",
  "tests/architecture/aiEvalFixtureGeneration.contract.test.ts",
  "tests/architecture/aiEstimateGoldenEval.contract.test.ts",
  "tests/architecture/aiEvalQualityScoring.contract.test.ts",
  "tests/architecture/aiQualityDrift.contract.test.ts",
  "tests/architecture/aiGroundingGuard.contract.test.ts",
  "tests/architecture/aiRedTeamEval.contract.test.ts",
  "tests/architecture/aiEvalCostLatency.contract.test.ts",
  "tests/architecture/aiEvalLedger.contract.test.ts",
  "tests/architecture/aiModelReplacementEvalProof.contract.test.ts",
  "tests/requestEstimate/aiEstimateEvalOpsRequestFlow.contract.test.tsx",
  "tests/consumerRepair/aiEstimateEvalOpsConsumerFlow.contract.test.ts",
  "tests/foreman/aiEvalOpsForemanFlow.contract.test.ts",
  "tests/officeEstimate/aiEvalOpsPdfBuyer.contract.test.ts",
] as const;

export function runAiEvalOpsTargetedTests(input: { writeSummary?: boolean } = {}) {
  const command = [
    "node_modules/jest/bin/jest.js",
    ...AI_EVALOPS_TARGETED_TESTS,
    "--runInBand",
  ];
  const result = runCommand("node", command);
  const summary = {
    final_status: result.passed ? GREEN_AI_EVALOPS_TARGETED_TESTS : STOP_AI_EVALOPS_TARGETED_TESTS_FAILED,
    ...currentGitState(),
    generated_at: new Date().toISOString(),
    targeted_ai_evalops_tests_passed: result.passed,
    prompt_model_manifest_tests_passed: result.passed,
    fixture_generation_tests_passed: result.passed,
    golden_eval_tests_passed: result.passed,
    quality_scoring_tests_passed: result.passed,
    quality_drift_tests_passed: result.passed,
    grounding_guard_tests_passed: result.passed,
    red_team_eval_tests_passed: result.passed,
    cost_latency_tests_passed: result.passed,
    eval_ledger_tests_passed: result.passed,
    model_replacement_eval_tests_passed: result.passed,
    request_flow_tests_passed: result.passed,
    consumer_flow_tests_passed: result.passed,
    foreman_flow_tests_passed: result.passed,
    pdf_buyer_tests_passed: result.passed,
    command: `node ${command.join(" ")}`,
    output_tail: result.output.slice(-4000),
    blockers: result.passed ? [] : ["targeted_tests_failed"],
  };
  const summaryPath = path.join(AI_PLATFORM_EVALOPS_ROOT, "targeted-tests", timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEvalOpsTargetedTests({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_EVALOPS_TARGETED_TESTS) process.exitCode = 1;
}
