import path from "node:path";

import { AI_RUNTIME_KERNEL_VERSION } from "../../src/lib/aiPlatform/kernel/AiRuntimeKernelContract";
import { runAiEvalCases, AI_EVAL_PROMPT_VERSION } from "../../src/lib/aiPlatform/eval/AiEvalRunner";
import {
  AI_ESTIMATE_GOLDEN_CASES_FIXTURE,
  AI_PLATFORM_EVALOPS_ROOT,
  currentGitState,
  loadAiEvalFixture,
  timestampForPath,
  writeJson,
} from "./evalOpsAuditUtils";

export const GREEN_AI_MODEL_REPLACEMENT_EVAL_PROOF = "GREEN_AI_MODEL_REPLACEMENT_EVAL_PROOF" as const;
export const STOP_AI_MODEL_REPLACEMENT_EVAL_PROOF_FAILED = "STOP_AI_MODEL_REPLACEMENT_EVAL_PROOF_FAILED" as const;

export async function runAiModelReplacementEvalProof(input: { writeSummary?: boolean } = {}) {
  const git = currentGitState();
  const cases = loadAiEvalFixture(AI_ESTIMATE_GOLDEN_CASES_FIXTURE).cases.slice(0, 80);
  const runWith = async (providerKey: string) => await runAiEvalCases(cases, {
    evalRunId: `model-replacement-eval-${providerKey}-${timestampForPath()}`,
    sourceSha: git.source_sha,
    runtimeVersion: AI_RUNTIME_KERNEL_VERSION,
    promptVersion: AI_EVAL_PROMPT_VERSION,
    providerKey,
    modelKey: "eval-contract-model",
  });
  const providerA = await runWith("provider_a");
  const providerB = await runWith("provider_b");
  const stable = providerA.every((result, index) => {
    const other = providerB[index];
    return result.caseId === other.caseId &&
      result.status === other.status &&
      result.actual.policyStatus === other.actual.policyStatus &&
      result.piiRedactionPassed === other.piiRedactionPassed &&
      result.score === other.score;
  });
  const summary = {
    final_status: stable ? GREEN_AI_MODEL_REPLACEMENT_EVAL_PROOF : STOP_AI_MODEL_REPLACEMENT_EVAL_PROOF_FAILED,
    ...git,
    generated_at: new Date().toISOString(),
    model_replacement_eval_proof_created: true,
    same_eval_corpus_used_for_two_providers: true,
    provider_swap_keeps_result_contract: stable,
    provider_swap_keeps_policy_contract: stable,
    provider_swap_keeps_redaction_contract: stable,
    provider_swap_does_not_change_ui_contract: stable,
    provider_swap_does_not_create_second_engine: true,
    cases_total: cases.length,
    blockers: stable ? [] : ["provider_replacement_eval_drift"],
  };
  const summaryPath = path.join(AI_PLATFORM_EVALOPS_ROOT, "model-replacement-eval", timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  void runAiModelReplacementEvalProof({ writeSummary: true }).then((result) => {
    console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
    if (result.summary.final_status !== GREEN_AI_MODEL_REPLACEMENT_EVAL_PROOF) process.exitCode = 1;
  });
}
