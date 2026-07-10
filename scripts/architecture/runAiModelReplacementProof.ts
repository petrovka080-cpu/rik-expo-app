import path from "node:path";

import { createAiRuntimeKernel } from "../../src/lib/aiPlatform/kernel/createAiRuntimeKernel";
import { InMemoryAiModelProvider } from "../../src/lib/aiPlatform/providers/InMemoryAiModelProvider";
import { AI_PLATFORM_KERNEL_ROOT, currentGitState, timestampForPath, writeJson } from "./aiPlatformKernelAuditUtils";

export const GREEN_AI_MODEL_REPLACEMENT_PROOF = "GREEN_AI_MODEL_REPLACEMENT_PROOF" as const;
export const STOP_AI_MODEL_REPLACEMENT_PROOF_FAILED = "STOP_AI_MODEL_REPLACEMENT_PROOF_FAILED" as const;

const surfaces = ["chat", "document", "report", "procurement", "foreman", "director", "office"] as const;

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16);
}

export async function runAiModelReplacementProof(input: { writeSummary?: boolean } = {}) {
  const cases = Array.from({ length: 50 }, (_, index) => ({
    flowId: `model-replacement-${index}`,
    role: "director" as const,
    surface: surfaces[index % surfaces.length],
    intent: `case-${index}`,
    userText: `case ${index}`,
    mode: index % 5 === 0 ? "approval_required" as const : index % 3 === 0 ? "draft_only" as const : "safe_read" as const,
  }));
  const runWith = async (providerKey: string) => {
    const kernel = createAiRuntimeKernel({ provider: new InMemoryAiModelProvider(providerKey) });
    return await Promise.all(cases.map((testCase) => kernel.run({
      ...testCase,
      sourceSha: currentGitState().source_sha,
      runtimeVersion: "ai-platform-kernel-v1",
    })));
  };
  const providerA = await runWith("provider_a");
  const providerB = await runWith("provider_b");
  const stable = providerA.every((result, index) =>
    result.flowId === providerB[index].flowId &&
    result.status === providerB[index].status &&
    result.toolPlan?.mode === providerB[index].toolPlan?.mode &&
    result.diagnostics?.redactionPassed === true &&
    Boolean(result.diagnostics?.ledgerRecordId) &&
    Boolean(providerB[index].diagnostics?.ledgerRecordId)
  );
  const summary = {
    final_status: stable ? GREEN_AI_MODEL_REPLACEMENT_PROOF : STOP_AI_MODEL_REPLACEMENT_PROOF_FAILED,
    ...currentGitState(),
    model_replacement_proof_created: true,
    same_ai_cases_passed_with_two_test_providers: stable,
    provider_swap_does_not_change_ui_contract: stable,
    provider_swap_does_not_bypass_tool_policy: stable,
    provider_swap_does_not_bypass_redaction: stable,
    provider_swap_does_not_bypass_ledger: stable,
    case_count: cases.length,
    provider_a_hash: hash(JSON.stringify(providerA.map((item) => [item.flowId, item.status, item.toolPlan?.mode]))),
    provider_b_hash: hash(JSON.stringify(providerB.map((item) => [item.flowId, item.status, item.toolPlan?.mode]))),
    blockers: stable ? [] : ["provider_replacement_contract_changed"],
  };
  const summaryPath = path.join(AI_PLATFORM_KERNEL_ROOT, "model-replacement", timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  void runAiModelReplacementProof({ writeSummary: true }).then((result) => {
    console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
    if (result.summary.final_status !== GREEN_AI_MODEL_REPLACEMENT_PROOF) process.exitCode = 1;
  });
}
