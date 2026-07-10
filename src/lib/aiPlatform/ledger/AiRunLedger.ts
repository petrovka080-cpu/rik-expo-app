import type { AiRunInput, AiRunResult } from "../kernel/AiRuntimeKernelContract";
import type { AiModelCompleteResult } from "../providers/AiModelProviderPort";
import type { AiPlatformToolPlan } from "../tools/AiToolContract";
import type { AiRunLedgerRecord } from "./AiRunLedgerContract";
import type { AiRunLedgerStore } from "./AiRunLedgerStore";

export function recordAiRunLedger(params: {
  store: AiRunLedgerStore;
  input: AiRunInput;
  result: AiRunResult;
  providerResult?: AiModelCompleteResult | null;
  toolPlan?: AiPlatformToolPlan | null;
  redactionPassed: boolean;
  budgetUsed: { inputChars: number; maxInputChars: number; outputTokens?: number };
}): AiRunLedgerRecord {
  const status = params.result.status === "failed"
    ? "failed"
    : params.result.status === "forbidden"
      ? "blocked"
      : "completed";
  return params.store.append({
    flowId: params.input.flowId,
    sourceSha: params.input.sourceSha,
    runtimeVersion: params.input.runtimeVersion,
    role: params.input.role,
    surface: params.input.surface,
    intent: params.input.intent,
    mode: params.input.mode,
    providerKey: params.providerResult?.providerKey ?? "not_called",
    modelKey: params.providerResult?.modelKey ?? "not_called",
    toolPlanSummary: params.toolPlan
      ? {
          toolName: params.toolPlan.toolName,
          mode: params.toolPlan.mode,
          allowed: params.toolPlan.allowed,
          approvalRequired: params.toolPlan.approvalRequired,
        }
      : undefined,
    approvalRequired: params.result.status === "needs_approval" || params.toolPlan?.approvalRequired === true,
    approvalGranted: false,
    redactionPassed: params.redactionPassed,
    budgetUsed: params.budgetUsed,
    status,
  });
}
