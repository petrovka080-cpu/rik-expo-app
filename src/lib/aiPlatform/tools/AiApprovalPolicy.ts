import type { AiApprovalRequest, AiRunInput } from "../kernel/AiRuntimeKernelContract";

export function buildAiApprovalRequest(input: AiRunInput, reason = "AI action requires explicit human approval"): AiApprovalRequest {
  return {
    approvalId: `ai-approval:${input.flowId}`,
    flowId: input.flowId,
    surface: input.surface,
    intent: input.intent,
    reason,
    requiredRole: "human_owner",
    sourceSha: input.sourceSha,
  };
}

export function aiApprovalRequired(mode: AiRunInput["mode"]): boolean {
  return mode === "approval_required";
}
