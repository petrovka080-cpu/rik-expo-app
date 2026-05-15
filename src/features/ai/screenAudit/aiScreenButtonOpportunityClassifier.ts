import type {
  AiScreenAiOpportunity,
  AiScreenButtonActionEntry,
  AiScreenButtonActionKind,
  AiScreenMutationRisk,
} from "./aiScreenButtonRoleActionTypes";

export type AiScreenOpportunityClassification = {
  actionKind: AiScreenButtonActionKind;
  aiOpportunity: AiScreenAiOpportunity;
  mutationRisk: AiScreenMutationRisk;
  canExecuteDirectly: false;
  requiresEvidence: boolean;
  requiresApprovalLedger: boolean;
  exactReason: string;
};

export function classifyAiScreenButtonOpportunity(
  entry: Pick<
    AiScreenButtonActionEntry,
    "actionKind" | "aiOpportunity" | "mutationRisk" | "evidenceSources" | "existingBffRoutes" | "forbiddenReason"
  >,
): AiScreenOpportunityClassification {
  if (entry.actionKind === "safe_read") {
    return {
      actionKind: entry.actionKind,
      aiOpportunity: entry.aiOpportunity,
      mutationRisk: entry.mutationRisk,
      canExecuteDirectly: false,
      requiresEvidence: entry.evidenceSources.length > 0,
      requiresApprovalLedger: false,
      exactReason: "Safe-read AI can explain, summarize, compare, or show evidence without mutating state.",
    };
  }

  if (entry.actionKind === "draft_only") {
    return {
      actionKind: entry.actionKind,
      aiOpportunity: entry.aiOpportunity,
      mutationRisk: entry.mutationRisk,
      canExecuteDirectly: false,
      requiresEvidence: entry.evidenceSources.length > 0,
      requiresApprovalLedger: false,
      exactReason: "Draft-only AI may prepare text or rationale, but cannot final-submit or mutate records.",
    };
  }

  if (entry.actionKind === "approval_required") {
    return {
      actionKind: entry.actionKind,
      aiOpportunity: entry.aiOpportunity,
      mutationRisk: entry.mutationRisk,
      canExecuteDirectly: false,
      requiresEvidence: entry.evidenceSources.length > 0,
      requiresApprovalLedger: entry.existingBffRoutes.some((route) => /approval|approve|reject|execute/i.test(route)),
      exactReason: "Approval-required AI must route through BFF and approval ledger before execution.",
    };
  }

  if (entry.actionKind === "forbidden") {
    return {
      actionKind: entry.actionKind,
      aiOpportunity: "none",
      mutationRisk: "forbidden_direct_mutation",
      canExecuteDirectly: false,
      requiresEvidence: entry.evidenceSources.length > 0,
      requiresApprovalLedger: true,
      exactReason: entry.forbiddenReason ?? "Forbidden action has no direct AI execution path.",
    };
  }

  return {
    actionKind: "unknown_needs_audit",
    aiOpportunity: "none",
    mutationRisk: entry.mutationRisk,
    canExecuteDirectly: false,
    requiresEvidence: entry.evidenceSources.length > 0,
    requiresApprovalLedger: false,
    exactReason: "Action kind must be audited before AI can assist.",
  };
}

export function isDraftOnlyFinalSubmitBlocked(entry: AiScreenButtonActionEntry): boolean {
  const classification = classifyAiScreenButtonOpportunity(entry);
  return classification.actionKind !== "draft_only" || classification.canExecuteDirectly === false;
}

export function isApprovalRequiredDirectExecutionBlocked(entry: AiScreenButtonActionEntry): boolean {
  const classification = classifyAiScreenButtonOpportunity(entry);
  return classification.actionKind !== "approval_required" || classification.canExecuteDirectly === false;
}
