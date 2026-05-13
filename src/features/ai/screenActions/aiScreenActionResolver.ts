import { hasDirectorFullAiAccess, type AiUserRole } from "../policy/aiRolePolicy";
import { AI_TOOL_NAMES } from "../tools/aiToolRegistry";
import type { AiToolName } from "../tools/aiToolTypes";
import {
  AI_SCREEN_ACTION_REGISTRY,
  AI_SCREEN_ACTION_REQUIRED_SCREEN_IDS,
  getAiScreenActionEntry,
} from "./aiScreenActionRegistry";
import type {
  AiScreenActionDefinition,
  AiScreenActionIntent,
  AiScreenActionIntentPreviewInput,
  AiScreenActionIntentPreviewOutput,
  AiScreenActionMapOutput,
  AiScreenActionPlanInput,
  AiScreenActionPlanOutput,
  AiScreenActionPreviewSummary,
  AiScreenActionRegistryEntry,
  AiScreenActionRegistryValidation,
  AiScreenActionResolverAuth,
} from "./aiScreenActionTypes";

const TOOL_NAME_SET = new Set<string>(AI_TOOL_NAMES);

function normalizeRole(role: AiUserRole | undefined): AiUserRole {
  return role ?? "unknown";
}

function uniqueTools(actions: readonly AiScreenActionDefinition[]): AiToolName[] {
  return [...new Set(actions.map((action) => action.aiTool).filter((tool): tool is AiToolName => Boolean(tool)))];
}

function uniqueIntents(actions: readonly AiScreenActionDefinition[]): AiScreenActionIntent[] {
  return [...new Set(actions.map((action) => action.intent))];
}

function actionVisibleForRole(action: AiScreenActionDefinition, role: AiUserRole): boolean {
  if (hasDirectorFullAiAccess(role)) return true;
  return action.roleScope.includes(role);
}

function entryVisibleForRole(entry: AiScreenActionRegistryEntry, role: AiUserRole): boolean {
  if (hasDirectorFullAiAccess(role)) return true;
  return entry.allowedRoles.includes(role);
}

function categorize(actions: readonly AiScreenActionDefinition[]) {
  return {
    safeReadActions: actions.filter((action) => action.mode === "safe_read"),
    draftActions: actions.filter((action) => action.mode === "draft_only"),
    approvalRequiredActions: actions.filter((action) => action.mode === "approval_required"),
    forbiddenActions: actions.filter((action) => action.mode === "forbidden"),
  };
}

function blockedOutput(params: {
  screenId: string;
  role: AiUserRole;
  blocker: string;
  entry?: AiScreenActionRegistryEntry | null;
}): AiScreenActionMapOutput {
  return {
    status: "blocked",
    screenId: params.screenId,
    role: params.role,
    domain: params.entry?.domain ?? "control",
    allowedRoles: params.entry?.allowedRoles ?? [],
    visibleActions: [],
    availableIntents: [],
    availableTools: [],
    safeReadActions: [],
    draftActions: [],
    approvalRequiredActions: [],
    forbiddenActions: [],
    evidenceSources: params.entry?.evidenceSources ?? [],
    developerControlFullAccess: hasDirectorFullAiAccess(params.role),
    roleIsolationE2eClaimed: false,
    roleIsolationContractProof: true,
    roleScoped: true,
    readOnly: true,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    finalExecution: 0,
    providerCalled: false,
    fakeAiAnswer: false,
    hardcodedAiResponse: false,
    roleLeakageObserved: false,
    blocker: params.blocker,
    source: "runtime:ai_screen_button_action_intelligence_map_v1",
  };
}

export function validateAiScreenActionRegistry(): AiScreenActionRegistryValidation {
  const actions = AI_SCREEN_ACTION_REGISTRY.flatMap((entry) => entry.visibleActions);
  const blockers = new Set<AiScreenActionRegistryValidation["blockers"][number]>();
  const unknownToolReferences = actions
    .map((action) => action.aiTool)
    .filter((tool): tool is AiToolName => Boolean(tool))
    .filter((tool) => !TOOL_NAME_SET.has(tool));

  if (unknownToolReferences.length > 0) blockers.add("BLOCKED_UNKNOWN_AI_TOOL_REFERENCE");

  const requiredScreensRegistered = AI_SCREEN_ACTION_REQUIRED_SCREEN_IDS.every((screenId) =>
    AI_SCREEN_ACTION_REGISTRY.some((entry) => entry.screenId === screenId),
  );
  if (!requiredScreensRegistered) blockers.add("BLOCKED_REQUIRED_SCREEN_NOT_REGISTERED");

  const allActionsHaveRoleScope = actions.every((action) => action.roleScope.length > 0);
  if (!allActionsHaveRoleScope) blockers.add("BLOCKED_ACTION_WITHOUT_ROLE_SCOPE");

  const allActionsHaveRiskPolicy = actions.every((action) =>
    ["low", "medium", "high", "forbidden"].includes(action.riskLevel),
  );
  const allActionsHaveEvidenceSource = actions.every(
    (action) => action.evidenceRequired === true && action.evidenceSources.length > 0,
  );
  if (!allActionsHaveEvidenceSource) blockers.add("BLOCKED_ACTION_WITHOUT_EVIDENCE_SOURCE");

  const allHighRiskActionsRequireApproval = actions.every(
    (action) =>
      action.riskLevel !== "high" ||
      (action.mode === "approval_required" && action.requiresApproval === true),
  );
  if (!allHighRiskActionsRequireApproval) blockers.add("BLOCKED_HIGH_RISK_ACTION_WITHOUT_APPROVAL");

  const forbiddenActionsExecutable = actions.some(
    (action) => action.riskLevel === "forbidden" && action.mode !== "forbidden",
  );
  if (forbiddenActionsExecutable) blockers.add("BLOCKED_FORBIDDEN_ACTION_EXECUTABLE");

  return {
    ok:
      blockers.size === 0 &&
      allActionsHaveRiskPolicy &&
      allActionsHaveRoleScope &&
      allActionsHaveEvidenceSource &&
      allHighRiskActionsRequireApproval &&
      !forbiddenActionsExecutable,
    blockers: [...blockers],
    screensRegistered: AI_SCREEN_ACTION_REGISTRY.length,
    buttonsOrActionsRegistered: actions.length,
    requiredScreensRegistered,
    allActionsHaveRoleScope,
    allActionsHaveRiskPolicy,
    allActionsHaveEvidenceSource,
    allHighRiskActionsRequireApproval,
    forbiddenActionsExecutable: false,
    unknownToolReferences,
  };
}

export function resolveAiScreenActions(params: {
  auth: AiScreenActionResolverAuth | null;
  screenId: string;
}): AiScreenActionMapOutput {
  const role = normalizeRole(params.auth?.role);
  const screenId = String(params.screenId || "").trim();
  const entry = getAiScreenActionEntry(screenId);

  if (!params.auth || !params.auth.userId.trim() || role === "unknown") {
    return blockedOutput({
      screenId,
      role,
      entry,
      blocker: "AI screen action map requires authenticated role context.",
    });
  }

  if (!entry) {
    return blockedOutput({
      screenId,
      role,
      blocker: "AI screen action map screenId is not registered.",
    });
  }

  if (!entryVisibleForRole(entry, role)) {
    return blockedOutput({
      screenId,
      role,
      entry,
      blocker: "AI role cannot access this screen action map.",
    });
  }

  const visibleActions = entry.visibleActions.filter((action) => actionVisibleForRole(action, role));
  const grouped = categorize(visibleActions);

  return {
    status: "ready",
    screenId: entry.screenId,
    role,
    domain: entry.domain,
    allowedRoles: entry.allowedRoles,
    visibleActions,
    availableIntents: uniqueIntents(visibleActions),
    availableTools: uniqueTools(visibleActions),
    safeReadActions: grouped.safeReadActions,
    draftActions: grouped.draftActions,
    approvalRequiredActions: grouped.approvalRequiredActions,
    forbiddenActions: grouped.forbiddenActions,
    evidenceSources: entry.evidenceSources,
    developerControlFullAccess: hasDirectorFullAiAccess(role),
    roleIsolationE2eClaimed: false,
    roleIsolationContractProof: true,
    roleScoped: true,
    readOnly: true,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    finalExecution: 0,
    providerCalled: false,
    fakeAiAnswer: false,
    hardcodedAiResponse: false,
    roleLeakageObserved: false,
    blocker: null,
    source: "runtime:ai_screen_button_action_intelligence_map_v1",
  };
}

export function previewAiScreenActionIntent(params: {
  auth: AiScreenActionResolverAuth | null;
  input: AiScreenActionIntentPreviewInput;
}): AiScreenActionIntentPreviewOutput {
  const map = resolveAiScreenActions({
    auth: params.auth,
    screenId: params.input.screenId,
  });
  const intent = String(params.input.intent ?? "").trim();
  const matchingActions = intent
    ? map.visibleActions.filter((action) => action.intent === intent)
    : map.visibleActions;
  const allowedModes = [...new Set(matchingActions.map((action) => action.mode))];

  if (map.status !== "ready" || matchingActions.length === 0) {
    return {
      status: "blocked",
      screenId: params.input.screenId,
      role: map.role,
      intent,
      allowedModes: [],
      safeReadActions: 0,
      draftActions: 0,
      approvalRequiredActions: 0,
      forbiddenActions: 0,
      deterministic: true,
      readOnly: true,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      finalExecution: 0,
      reason: map.blocker ?? "Intent is not available for this screen action map.",
    };
  }

  const grouped = categorize(matchingActions);
  return {
    status: "preview",
    screenId: map.screenId,
    role: map.role,
    intent,
    allowedModes,
    safeReadActions: grouped.safeReadActions.length,
    draftActions: grouped.draftActions.length,
    approvalRequiredActions: grouped.approvalRequiredActions.length,
    forbiddenActions: grouped.forbiddenActions.length,
    deterministic: true,
    readOnly: true,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    finalExecution: 0,
    reason: "Intent preview is deterministic and read-only.",
  };
}

export function planAiScreenAction(params: {
  auth: AiScreenActionResolverAuth | null;
  input: AiScreenActionPlanInput;
}): AiScreenActionPlanOutput {
  const map = resolveAiScreenActions({
    auth: params.auth,
    screenId: params.input.screenId,
  });
  const action =
    params.input.actionId
      ? map.visibleActions.find((candidate) => candidate.actionId === params.input.actionId)
      : map.visibleActions.find((candidate) => candidate.intent === params.input.intent);
  const actionId = String(params.input.actionId ?? action?.actionId ?? "").trim();

  if (map.status !== "ready" || !action) {
    return {
      status: "blocked",
      screenId: params.input.screenId,
      role: map.role,
      actionId,
      planMode: "forbidden",
      riskLevel: "forbidden",
      aiTool: null,
      requiresApproval: true,
      evidenceSources: [],
      executable: false,
      deterministic: true,
      readOnly: true,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      finalExecution: 0,
      reason: map.blocker ?? "Screen action is not registered or not visible for this role.",
    };
  }

  if (action.mode === "forbidden") {
    return {
      status: "blocked",
      screenId: map.screenId,
      role: map.role,
      actionId: action.actionId,
      planMode: action.mode,
      riskLevel: action.riskLevel,
      aiTool: action.aiTool ?? null,
      requiresApproval: true,
      evidenceSources: action.evidenceSources,
      executable: false,
      deterministic: true,
      readOnly: true,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      finalExecution: 0,
      reason: action.forbiddenReason ?? "Action is forbidden by screen action policy.",
    };
  }

  return {
    status: "planned",
    screenId: map.screenId,
    role: map.role,
    actionId: action.actionId,
    planMode: action.mode,
    riskLevel: action.riskLevel,
    aiTool: action.aiTool ?? null,
    requiresApproval: action.requiresApproval,
    evidenceSources: action.evidenceSources,
    executable: false,
    deterministic: true,
    readOnly: true,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    finalExecution: 0,
    reason: "Screen action plan is preview-only; execution remains behind the approved gateway.",
  };
}

export function buildAiScreenActionPreviewSummary(params: {
  auth: AiScreenActionResolverAuth | null;
  screenId: string;
}): AiScreenActionPreviewSummary {
  const map = resolveAiScreenActions(params);
  return {
    screenId: map.screenId,
    role: map.role,
    safeReadCount: map.safeReadActions.length,
    draftCount: map.draftActions.length,
    approvalRequiredCount: map.approvalRequiredActions.length,
    forbiddenCount: map.forbiddenActions.length,
    safeReadLabels: map.safeReadActions.map((action) => action.label),
    draftLabels: map.draftActions.map((action) => action.label),
    approvalRequiredLabels: map.approvalRequiredActions.map((action) => action.label),
    mutationCount: 0,
  };
}
