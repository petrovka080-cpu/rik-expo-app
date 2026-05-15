import { resolveAiScreenActions } from "../screenActions/aiScreenActionResolver";
import type {
  AiScreenActionDefinition,
  AiScreenActionEvidenceSource,
  AiScreenActionIntent,
  AiScreenActionMode,
  AiScreenActionRiskLevel,
} from "../screenActions/aiScreenActionTypes";
import { evidenceRefIds } from "./aiAssistantEvidencePlanner";
import { enforceAiAssistantSameScreenOutputPolicy } from "./aiAssistantSameScreenOutputPolicy";
import { resolveAiRoleScreenBoundary } from "./aiRoleScreenBoundary";
import { resolveAiScreenLocalAssistantContext } from "./aiScreenLocalContextResolver";
import type {
  AiScreenLocalAssistantActionPlanInput,
  AiScreenLocalAssistantActionPlanOutput,
  AiScreenLocalAssistantAskInput,
  AiScreenLocalAssistantAskOutput,
  AiScreenLocalAssistantDraftPreviewInput,
  AiScreenLocalAssistantDraftPreviewOutput,
  AiScreenLocalAssistantSubmitForApprovalInput,
  AiScreenLocalAssistantSubmitPreviewOutput,
} from "./aiScreenLocalAssistantTypes";

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeIntent(value: AiScreenActionIntent | string | null | undefined): string | null {
  return hasText(value) ? value.trim() : null;
}

function selectVisibleAction(params: {
  input: AiScreenLocalAssistantActionPlanInput;
}): AiScreenActionDefinition | null {
  if (!params.input.auth) return null;
  const map = resolveAiScreenActions({
    auth: params.input.auth,
    screenId: params.input.screenId,
  });
  if (map.status !== "ready") return null;
  if (hasText(params.input.actionId)) {
    return map.visibleActions.find((action) => action.actionId === params.input.actionId?.trim()) ?? null;
  }
  const intent = normalizeIntent(params.input.intent);
  if (!intent) return null;
  return map.visibleActions.find((action) => action.intent === intent) ?? null;
}

function fallbackPlanFromRuntimeIntent(intent: string | null): {
  mode: AiScreenActionMode;
  riskLevel: AiScreenActionRiskLevel;
  requiresApproval: boolean;
} | null {
  if (!intent) return null;
  if (intent === "submit_for_approval") {
    return { mode: "approval_required", riskLevel: "high", requiresApproval: true };
  }
  if (intent === "draft" || intent.startsWith("prepare_")) {
    return { mode: "draft_only", riskLevel: "medium", requiresApproval: false };
  }
  if (
    ["read", "search", "compare", "explain", "check_status", "find_risk", "navigate"].includes(intent)
  ) {
    return { mode: "safe_read", riskLevel: "low", requiresApproval: false };
  }
  return null;
}

function evidenceSourcesFor(action: AiScreenActionDefinition | null): AiScreenActionEvidenceSource[] {
  return action ? [...action.evidenceSources] : ["screen_state", "role_policy"];
}

function buildBlockedActionPlan(params: {
  input: AiScreenLocalAssistantActionPlanInput;
  reason: string;
  status?: "blocked" | "handoff_plan_only";
}): AiScreenLocalAssistantActionPlanOutput {
  const boundary = resolveAiRoleScreenBoundary({
    auth: params.input.auth,
    screenId: params.input.screenId,
    targetScreenId: params.input.targetScreenId,
  });
  const policy = enforceAiAssistantSameScreenOutputPolicy(boundary);
  const context = resolveAiScreenLocalAssistantContext({
    auth: params.input.auth,
    screenId: params.input.screenId,
    evidenceRefs: params.input.evidenceRefs,
  });

  return {
    status: params.status ?? (policy.status === "handoff_plan_only" ? "handoff_plan_only" : "blocked"),
    screenId: context.screenId,
    role: context.role,
    actionId: hasText(params.input.actionId) ? params.input.actionId.trim() : null,
    intent: normalizeIntent(params.input.intent),
    planMode: policy.status === "handoff_plan_only" ? "handoff_plan_only" : "forbidden",
    riskLevel: policy.status === "handoff_plan_only" ? "handoff" : "forbidden",
    aiTool: null,
    requiresApproval: true,
    evidenceRefs: evidenceRefIds(context.evidencePlan),
    evidenceSources: [],
    boundary,
    handoffPlan: policy.handoffPlan,
    executable: false,
    sameScreenOnly: true,
    roleScoped: true,
    evidenceBacked: true,
    readOnly: true,
    mutationCount: 0,
    dbWrites: 0,
    finalExecution: 0,
    directMutationAllowed: false,
    providerCalled: false,
    externalLiveFetch: false,
    reason: params.reason,
  };
}

export function askAiScreenLocalAssistant(
  input: AiScreenLocalAssistantAskInput,
): AiScreenLocalAssistantAskOutput {
  const boundary = resolveAiRoleScreenBoundary({
    auth: input.auth,
    screenId: input.screenId,
    targetScreenId: input.targetScreenId,
  });
  const policy = enforceAiAssistantSameScreenOutputPolicy(boundary);
  const context = resolveAiScreenLocalAssistantContext({
    auth: input.auth,
    screenId: input.screenId,
    evidenceRefs: input.evidenceRefs,
  });

  if (policy.status !== "allowed" || context.status !== "ready") {
    return {
      status: policy.status === "handoff_plan_only" ? "handoff_plan_only" : "blocked",
      screenId: context.screenId,
      role: context.role,
      answerMode: policy.status === "handoff_plan_only" ? "handoff_plan_only" : "blocked",
      localWorkKinds: context.localWorkKinds,
      suggestedIntents: [],
      safeNextActionIds: [],
      draftActionIds: [],
      approvalRequiredActionIds: [],
      forbiddenActionIds: context.forbiddenActionIds,
      evidenceRefs: evidenceRefIds(context.evidencePlan),
      boundary,
      handoffPlan: policy.handoffPlan,
      sameScreenOnly: true,
      roleScoped: true,
      evidenceBacked: true,
      readOnly: true,
      mutationCount: 0,
      dbWrites: 0,
      finalExecution: 0,
      directMutationAllowed: false,
      providerCalled: false,
      externalLiveFetch: false,
      rawContentReturned: false,
      rawDbRowsExposed: false,
      fakeAiAnswer: false,
      hardcodedAiResponse: false,
      reason: context.blockedReason ?? policy.reason,
    };
  }

  return {
    status: "answered",
    screenId: context.screenId,
    role: context.role,
    answerMode: "screen_local_context",
    localWorkKinds: context.localWorkKinds,
    suggestedIntents: context.availableIntents.slice(0, 8),
    safeNextActionIds: context.safeReadActionIds,
    draftActionIds: context.draftActionIds,
    approvalRequiredActionIds: context.approvalRequiredActionIds,
    forbiddenActionIds: context.forbiddenActionIds,
    evidenceRefs: evidenceRefIds(context.evidencePlan),
    boundary,
    handoffPlan: null,
    sameScreenOnly: true,
    roleScoped: true,
    evidenceBacked: true,
    readOnly: true,
    mutationCount: 0,
    dbWrites: 0,
    finalExecution: 0,
    directMutationAllowed: false,
    providerCalled: false,
    externalLiveFetch: false,
    rawContentReturned: false,
    rawDbRowsExposed: false,
    fakeAiAnswer: false,
    hardcodedAiResponse: false,
    reason: "Screen-local assistant returned a deterministic policy and evidence plan.",
  };
}

export function planAiScreenLocalAssistantAction(
  input: AiScreenLocalAssistantActionPlanInput,
): AiScreenLocalAssistantActionPlanOutput {
  const boundary = resolveAiRoleScreenBoundary({
    auth: input.auth,
    screenId: input.screenId,
    targetScreenId: input.targetScreenId,
  });
  const policy = enforceAiAssistantSameScreenOutputPolicy(boundary);
  if (policy.status !== "allowed") {
    return buildBlockedActionPlan({
      input,
      status: policy.status === "handoff_plan_only" ? "handoff_plan_only" : "blocked",
      reason: policy.reason,
    });
  }

  const context = resolveAiScreenLocalAssistantContext({
    auth: input.auth,
    screenId: input.screenId,
    evidenceRefs: input.evidenceRefs,
  });
  if (context.status !== "ready") {
    return buildBlockedActionPlan({
      input,
      reason: context.blockedReason ?? "Screen-local assistant context is blocked.",
    });
  }

  const action = selectVisibleAction({ input });
  const intent = normalizeIntent(input.intent) ?? action?.intent ?? null;
  const runtimeFallback = action ? null : fallbackPlanFromRuntimeIntent(intent);
  if (!action && !runtimeFallback) {
    return buildBlockedActionPlan({
      input,
      reason: "Action is not available for this screen-local assistant.",
    });
  }

  if (action?.mode === "forbidden") {
    return buildBlockedActionPlan({
      input,
      reason: action.forbiddenReason ?? "Action is forbidden by screen-local assistant policy.",
    });
  }

  return {
    status: "planned",
    screenId: context.screenId,
    role: context.role,
    actionId: action?.actionId ?? null,
    intent,
    planMode: action?.mode ?? runtimeFallback?.mode ?? "safe_read",
    riskLevel: action?.riskLevel ?? runtimeFallback?.riskLevel ?? "low",
    aiTool: action?.aiTool ?? null,
    requiresApproval: action?.requiresApproval ?? runtimeFallback?.requiresApproval ?? false,
    evidenceRefs: evidenceRefIds(context.evidencePlan),
    evidenceSources: evidenceSourcesFor(action),
    boundary,
    handoffPlan: null,
    executable: false,
    sameScreenOnly: true,
    roleScoped: true,
    evidenceBacked: true,
    readOnly: true,
    mutationCount: 0,
    dbWrites: 0,
    finalExecution: 0,
    directMutationAllowed: false,
    providerCalled: false,
    externalLiveFetch: false,
    reason: "Screen-local assistant action plan is preview-only.",
  };
}

function inferDraftKind(
  input: AiScreenLocalAssistantDraftPreviewInput,
  plan: AiScreenLocalAssistantActionPlanOutput,
): AiScreenLocalAssistantDraftPreviewOutput["draftKind"] {
  if (input.draftKind) return input.draftKind;
  if (plan.intent === "draft_act" || plan.intent === "prepare_act") return "act";
  if (plan.intent === "draft_report" || plan.intent === "prepare_report") return "report";
  if (plan.intent === "draft" || plan.intent === "prepare_request") return "request";
  return "screen_note";
}

export function previewAiScreenLocalAssistantDraft(
  input: AiScreenLocalAssistantDraftPreviewInput,
): AiScreenLocalAssistantDraftPreviewOutput {
  const plan = planAiScreenLocalAssistantAction(input);
  const draftKind = inferDraftKind(input, plan);
  if (plan.status !== "planned" || plan.planMode !== "draft_only") {
    return {
      status: plan.status === "handoff_plan_only" ? "handoff_plan_only" : "blocked",
      screenId: plan.screenId,
      role: plan.role,
      draftKind,
      actionId: plan.actionId,
      previewAvailable: false,
      persisted: false,
      submitted: false,
      approvalRequired: plan.requiresApproval,
      evidenceRefs: plan.evidenceRefs,
      boundary: plan.boundary,
      handoffPlan: plan.handoffPlan,
      sameScreenOnly: true,
      roleScoped: true,
      evidenceBacked: true,
      readOnly: true,
      mutationCount: 0,
      dbWrites: 0,
      finalExecution: 0,
      providerCalled: false,
      externalLiveFetch: false,
      fakeAiAnswer: false,
      hardcodedAiResponse: false,
      reason: "Draft preview requires a screen-local draft action.",
    };
  }

  return {
    status: "draft_preview",
    screenId: plan.screenId,
    role: plan.role,
    draftKind,
    actionId: plan.actionId,
    previewAvailable: true,
    persisted: false,
    submitted: false,
    approvalRequired: false,
    evidenceRefs: plan.evidenceRefs,
    boundary: plan.boundary,
    handoffPlan: null,
    sameScreenOnly: true,
    roleScoped: true,
    evidenceBacked: true,
    readOnly: true,
    mutationCount: 0,
    dbWrites: 0,
    finalExecution: 0,
    providerCalled: false,
    externalLiveFetch: false,
    fakeAiAnswer: false,
    hardcodedAiResponse: false,
    reason: "Draft preview is local and not persisted.",
  };
}

export function previewAiScreenLocalAssistantSubmitForApproval(
  input: AiScreenLocalAssistantSubmitForApprovalInput,
): AiScreenLocalAssistantSubmitPreviewOutput {
  const plan = planAiScreenLocalAssistantAction({
    ...input,
    intent: input.intent ?? "submit_for_approval",
  });

  if (plan.status !== "planned" || plan.planMode !== "approval_required") {
    return {
      status: plan.status === "handoff_plan_only" ? "handoff_plan_only" : "blocked",
      screenId: plan.screenId,
      role: plan.role,
      actionId: plan.actionId,
      approvalRequired: true,
      idempotencyRequired: true,
      auditRequired: true,
      redactedPayloadOnly: true,
      persisted: false,
      submitted: false,
      executed: false,
      evidenceRefs: plan.evidenceRefs,
      boundary: plan.boundary,
      handoffPlan: plan.handoffPlan,
      sameScreenOnly: true,
      roleScoped: true,
      evidenceBacked: true,
      readOnly: true,
      mutationCount: 0,
      dbWrites: 0,
      finalExecution: 0,
      providerCalled: false,
      externalLiveFetch: false,
      reason: "Submit-for-approval preview requires a screen-local approval action.",
    };
  }

  return {
    status: "submit_for_approval_preview",
    screenId: plan.screenId,
    role: plan.role,
    actionId: plan.actionId,
    approvalRequired: true,
    idempotencyRequired: true,
    auditRequired: true,
    redactedPayloadOnly: true,
    persisted: false,
    submitted: false,
    executed: false,
    evidenceRefs: plan.evidenceRefs,
    boundary: plan.boundary,
    handoffPlan: null,
    sameScreenOnly: true,
    roleScoped: true,
    evidenceBacked: true,
    readOnly: true,
    mutationCount: 0,
    dbWrites: 0,
    finalExecution: 0,
    providerCalled: false,
    externalLiveFetch: false,
    reason: "Submit-for-approval is preview-only; approved execution stays behind the central gateway.",
  };
}
