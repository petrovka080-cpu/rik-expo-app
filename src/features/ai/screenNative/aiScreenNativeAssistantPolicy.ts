import type { AiScreenNativeAssistantPack } from "./aiScreenNativeAssistantTypes";

export type AiScreenNativePolicyResult = {
  ok: boolean;
  reasons: string[];
};

export function validateAiScreenNativeAssistantPack(pack: AiScreenNativeAssistantPack): AiScreenNativePolicyResult {
  const reasons: string[] = [];
  if (pack.directMutationAllowed !== false) reasons.push("direct mutation must be disabled");
  if (pack.providerRequired !== false) reasons.push("provider must not be required");
  if (pack.dbWriteUsed !== false) reasons.push("db writes must not be used");
  if (pack.fakeDataUsed !== false) reasons.push("fake data must not be used");
  if (pack.nextActions.some((action) => action.canExecuteDirectly !== false)) {
    reasons.push("next actions must not execute directly");
  }
  if (pack.readyOptions.some((option) => option.canExecuteDirectly !== false)) {
    reasons.push("ready options must not execute directly");
  }
  if (pack.readyOptions.some((option) => option.actionKind === "approval_required" && option.requiresApproval !== true)) {
    reasons.push("approval-required options must require approval");
  }
  return { ok: reasons.length === 0, reasons };
}

export function enforceAiScreenNativeAssistantPolicy(pack: AiScreenNativeAssistantPack): AiScreenNativeAssistantPack {
  return {
    ...pack,
    readyOptions: pack.readyOptions.map((option) => ({
      ...option,
      requiresApproval: option.actionKind === "approval_required" ? true : option.requiresApproval,
      canExecuteDirectly: false,
    })),
    nextActions: pack.nextActions.map((action) => ({
      ...action,
      canExecuteDirectly: false,
    })),
    directMutationAllowed: false,
    providerRequired: false,
    dbWriteUsed: false,
    fakeDataUsed: false,
  };
}

export function isAiScreenNativeDangerousCopy(value: string): boolean {
  return /create order|create payment|warehouse mutation|auto-approve|service role green path|fake supplier|fake price|fake document/i.test(value);
}
