import type { AiRoleScreenAssistantPack } from "./aiRoleScreenAssistantTypes";
import { sanitizeAiRoleScreenAssistantCopy } from "./aiRoleScreenAssistantUserCopy";

export const AI_ROLE_SCREEN_ASSISTANT_POLICY = {
  providerCallAllowed: false,
  dbWriteAllowed: false,
  directMutationAllowed: false,
  directOrderAllowed: false,
  directPaymentAllowed: false,
  directWarehouseMutationAllowed: false,
  approvalBypassAllowed: false,
} as const;

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

export function enforceAiRoleScreenAssistantPolicy(pack: AiRoleScreenAssistantPack): AiRoleScreenAssistantPack {
  return {
    ...pack,
    title: sanitizeAiRoleScreenAssistantCopy(pack.title),
    summary: sanitizeAiRoleScreenAssistantCopy(pack.summary),
    readyItems: pack.readyItems.map((item) => ({
      ...item,
      title: sanitizeAiRoleScreenAssistantCopy(item.title),
      description: sanitizeAiRoleScreenAssistantCopy(item.description),
      evidence: uniqueStrings(item.evidence),
      actionKind: item.actionKind === "forbidden" ? "forbidden" : item.actionKind,
    })),
    risks: pack.risks.map((risk) => ({
      ...risk,
      title: sanitizeAiRoleScreenAssistantCopy(risk.title),
      reason: sanitizeAiRoleScreenAssistantCopy(risk.reason),
      evidence: uniqueStrings(risk.evidence),
    })),
    missingData: pack.missingData.map((item) => ({
      ...item,
      label: sanitizeAiRoleScreenAssistantCopy(item.label),
    })),
    nextActions: pack.nextActions.map((action) => ({
      ...action,
      label: sanitizeAiRoleScreenAssistantCopy(action.label),
      canExecuteDirectly: false,
    })),
    directMutationAllowed: false,
    providerRequired: false,
    dbWriteUsed: false,
  };
}

export function validateAiRoleScreenAssistantPack(pack: AiRoleScreenAssistantPack): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (pack.directMutationAllowed !== false) errors.push("direct mutation must be disabled");
  if (pack.providerRequired !== false) errors.push("provider must not be required");
  if (pack.dbWriteUsed !== false) errors.push("db write must not be used");
  if (pack.nextActions.some((action) => action.canExecuteDirectly !== false)) {
    errors.push("next actions must not execute directly");
  }
  if (pack.readyItems.some((item) => item.actionKind === "approval_required" && !item.primaryActionLabel)) {
    errors.push("approval-required ready items need user-facing labels");
  }
  return { ok: errors.length === 0, errors };
}
