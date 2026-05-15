import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import { getAiScreenActionEntry } from "../screenActions/aiScreenActionRegistry";
import { resolveAiScreenActions } from "../screenActions/aiScreenActionResolver";
import type {
  AiScreenActionDefinition,
  AiScreenActionEvidenceSource,
} from "../screenActions/aiScreenActionTypes";
import { getAiScreenRuntimeEntry } from "../screenRuntime/aiScreenRuntimeRegistry";
import { resolveAiScreenRuntime } from "../screenRuntime/aiScreenRuntimeResolver";
import { buildAiAssistantEvidencePlan } from "./aiAssistantEvidencePlanner";
import {
  normalizeAiScreenLocalAssistantRuntimeScreenId,
  normalizeAiScreenLocalAssistantScreenId,
  resolveAiRoleScreenBoundary,
} from "./aiRoleScreenBoundary";
import type {
  AiScreenLocalAssistantAuth,
  AiScreenLocalAssistantBlockerCode,
  AiScreenLocalAssistantContext,
  AiScreenLocalAssistantScreenProfile,
} from "./aiScreenLocalAssistantTypes";

const CONTROL_ROLES: readonly AiUserRole[] = ["director", "control"];
const OPERATIONS_ROLES: readonly AiUserRole[] = [
  "director",
  "control",
  "foreman",
  "buyer",
  "accountant",
  "warehouse",
  "contractor",
  "office",
  "admin",
];
const PROCUREMENT_ROLES: readonly AiUserRole[] = ["director", "control", "buyer"];
const MARKET_ROLES: readonly AiUserRole[] = ["director", "control", "buyer", "foreman"];
const FINANCE_ROLES: readonly AiUserRole[] = ["director", "control", "accountant"];
const FOREMAN_ROLES: readonly AiUserRole[] = ["director", "control", "foreman"];
const WAREHOUSE_ROLES: readonly AiUserRole[] = ["director", "control", "warehouse"];
const CONTRACTOR_ROLES: readonly AiUserRole[] = ["director", "control", "contractor"];
const OFFICE_ROLES: readonly AiUserRole[] = ["director", "control", "office", "admin"];

export const AI_SCREEN_LOCAL_ASSISTANT_REQUIRED_SCREEN_IDS = [
  "director.dashboard",
  "ai.command_center",
  "buyer.main",
  "buyer.requests",
  "procurement.copilot",
  "market.home",
  "warehouse.main",
  "accountant.main",
  "foreman.main",
  "foreman.ai.quick_modal",
  "foreman.subcontract",
  "contractor.main",
  "reports.modal",
  "documents.main",
  "approval.inbox",
  "chat.main",
  "map.main",
  "office.hub",
  "screen.runtime",
] as const;

function profile(params: Omit<AiScreenLocalAssistantScreenProfile, "source">): AiScreenLocalAssistantScreenProfile {
  return {
    ...params,
    source: "ai_screen_local_assistant_profile_v1",
  };
}

export const AI_SCREEN_LOCAL_ASSISTANT_PROFILES: readonly AiScreenLocalAssistantScreenProfile[] = [
  profile({
    screenId: "director.dashboard",
    domain: "control",
    defaultRoleScope: CONTROL_ROLES,
    localWorkKinds: ["overview", "risk", "approval", "finance", "warehouse"],
    sameScreenTools: ["get_finance_summary", "get_warehouse_status", "get_action_status", "draft_report"],
  }),
  profile({
    screenId: "ai.command_center",
    domain: "control",
    defaultRoleScope: OPERATIONS_ROLES,
    localWorkKinds: ["task_stream", "evidence", "draft", "approval_status"],
    sameScreenTools: ["get_action_status", "draft_request", "draft_report", "submit_for_approval"],
  }),
  profile({
    screenId: "buyer.main",
    domain: "procurement",
    defaultRoleScope: PROCUREMENT_ROLES,
    localWorkKinds: ["request", "material", "supplier", "catalog"],
    sameScreenTools: ["search_catalog", "compare_suppliers", "draft_request", "submit_for_approval"],
  }),
  profile({
    screenId: "buyer.requests",
    domain: "procurement",
    defaultRoleScope: PROCUREMENT_ROLES,
    localWorkKinds: ["request_inbox", "material", "supplier_quotes", "approval_pack"],
    sameScreenTools: ["search_catalog", "compare_suppliers", "draft_request", "submit_for_approval"],
  }),
  profile({
    screenId: "procurement.copilot",
    domain: "procurement",
    defaultRoleScope: PROCUREMENT_ROLES,
    localWorkKinds: ["request_understanding", "supplier_rank", "risk_preview", "draft_request"],
    sameScreenTools: ["search_catalog", "compare_suppliers", "draft_request", "submit_for_approval"],
  }),
  profile({
    screenId: "market.home",
    domain: "marketplace",
    defaultRoleScope: MARKET_ROLES,
    localWorkKinds: ["catalog", "internal_supplier", "marketplace_preview"],
    sameScreenTools: ["search_catalog", "compare_suppliers", "draft_request"],
  }),
  profile({
    screenId: "warehouse.main",
    domain: "warehouse",
    defaultRoleScope: WAREHOUSE_ROLES,
    localWorkKinds: ["stock", "movement", "deficit", "restock_draft"],
    sameScreenTools: ["get_warehouse_status", "draft_request", "submit_for_approval"],
  }),
  profile({
    screenId: "accountant.main",
    domain: "finance",
    defaultRoleScope: FINANCE_ROLES,
    localWorkKinds: ["debt", "act", "finance_risk", "summary"],
    sameScreenTools: ["get_finance_summary", "get_action_status", "draft_act", "submit_for_approval"],
  }),
  profile({
    screenId: "foreman.main",
    domain: "projects",
    defaultRoleScope: FOREMAN_ROLES,
    localWorkKinds: ["object", "daily_report", "act", "materials", "subcontractor"],
    sameScreenTools: ["get_warehouse_status", "search_catalog", "draft_request", "draft_report"],
  }),
  profile({
    screenId: "foreman.ai.quick_modal",
    domain: "procurement",
    defaultRoleScope: FOREMAN_ROLES,
    localWorkKinds: ["quick_request", "material", "supplier_preview", "approval_pack"],
    sameScreenTools: ["search_catalog", "compare_suppliers", "draft_request", "submit_for_approval"],
  }),
  profile({
    screenId: "foreman.subcontract",
    domain: "subcontracts",
    defaultRoleScope: FOREMAN_ROLES,
    localWorkKinds: ["subcontract", "contractor", "act", "report", "document"],
    sameScreenTools: ["draft_act", "draft_report", "get_action_status", "submit_for_approval"],
  }),
  profile({
    screenId: "contractor.main",
    domain: "subcontracts",
    defaultRoleScope: CONTRACTOR_ROLES,
    localWorkKinds: ["own_task", "own_act", "own_document", "own_report"],
    sameScreenTools: ["get_action_status", "draft_act", "draft_report", "submit_for_approval"],
  }),
  profile({
    screenId: "reports.modal",
    domain: "reports",
    defaultRoleScope: OPERATIONS_ROLES,
    localWorkKinds: ["report", "pdf", "act", "project_status"],
    sameScreenTools: ["get_action_status", "draft_report", "draft_act"],
  }),
  profile({
    screenId: "documents.main",
    domain: "documents",
    defaultRoleScope: OPERATIONS_ROLES,
    localWorkKinds: ["document", "pdf", "act", "attachment"],
    sameScreenTools: ["get_action_status", "draft_report", "draft_act", "submit_for_approval"],
  }),
  profile({
    screenId: "approval.inbox",
    domain: "documents",
    defaultRoleScope: CONTROL_ROLES,
    localWorkKinds: ["approval_status", "evidence", "revision", "approved_gateway_plan"],
    sameScreenTools: ["get_action_status", "draft_report", "submit_for_approval"],
  }),
  profile({
    screenId: "chat.main",
    domain: "chat",
    defaultRoleScope: OPERATIONS_ROLES,
    localWorkKinds: ["thread", "participant", "document", "next_action"],
    sameScreenTools: ["get_action_status", "draft_report", "submit_for_approval"],
  }),
  profile({
    screenId: "map.main",
    domain: "map",
    defaultRoleScope: MARKET_ROLES,
    localWorkKinds: ["object", "location", "linked_request", "site_risk"],
    sameScreenTools: ["get_action_status", "search_catalog", "draft_report"],
  }),
  profile({
    screenId: "office.hub",
    domain: "control",
    defaultRoleScope: OFFICE_ROLES,
    localWorkKinds: ["member", "invite", "access", "document"],
    sameScreenTools: ["get_action_status", "draft_report", "submit_for_approval"],
  }),
  profile({
    screenId: "screen.runtime",
    domain: "control",
    defaultRoleScope: OPERATIONS_ROLES,
    localWorkKinds: ["screen_context", "runtime_policy", "approval_boundary"],
    sameScreenTools: ["get_action_status", "draft_request", "submit_for_approval"],
  }),
] as const;

function getProfile(screenId: string): AiScreenLocalAssistantScreenProfile | null {
  const normalized = normalizeAiScreenLocalAssistantScreenId(screenId);
  return AI_SCREEN_LOCAL_ASSISTANT_PROFILES.find((entry) => entry.screenId === normalized) ?? null;
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

function actionsByMode(
  actions: readonly AiScreenActionDefinition[],
  mode: AiScreenActionDefinition["mode"],
): string[] {
  return actions.filter((action) => action.mode === mode).map((action) => action.actionId);
}

function blockedContext(params: {
  auth: AiScreenLocalAssistantAuth | null;
  screenId: string;
  code: AiScreenLocalAssistantBlockerCode;
  reason: string;
}): AiScreenLocalAssistantContext {
  const normalizedScreenId = normalizeAiScreenLocalAssistantScreenId(params.screenId);
  const profileEntry = getProfile(normalizedScreenId);
  const boundary = resolveAiRoleScreenBoundary({
    auth: params.auth,
    screenId: normalizedScreenId,
  });
  const role = params.auth?.role ?? "unknown";
  const evidencePlan = buildAiAssistantEvidencePlan({
    screenId: normalizedScreenId,
    role,
    evidenceSources: ["role_policy"],
    runtimeKnown: false,
    actionMapKnown: false,
  });

  return {
    status: "blocked",
    blockerCode: params.code,
    blockedReason: params.reason,
    screenId: normalizedScreenId,
    role,
    domain: profileEntry?.domain ?? "control",
    roleScope: profileEntry?.defaultRoleScope ?? [],
    localWorkKinds: profileEntry?.localWorkKinds ?? [],
    availableIntents: [],
    toolCandidates: [],
    visibleActionIds: [],
    safeReadActionIds: [],
    draftActionIds: [],
    approvalRequiredActionIds: [],
    forbiddenActionIds: [],
    evidencePlan,
    boundary,
    runtimeScreenKnown: false,
    actionMapKnown: false,
    sameScreenOnly: true,
    roleScoped: true,
    evidenceBacked: true,
    internalFirst: true,
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
    source: "runtime:ai_screen_local_role_assistant_orchestrator_v1",
  };
}

export function resolveAiScreenLocalAssistantContext(params: {
  auth: AiScreenLocalAssistantAuth | null;
  screenId: string;
  evidenceRefs?: readonly string[];
}): AiScreenLocalAssistantContext {
  const normalizedScreenId = normalizeAiScreenLocalAssistantScreenId(params.screenId);
  if (!normalizedScreenId) {
    return blockedContext({
      auth: params.auth,
      screenId: normalizedScreenId,
      code: "AI_SCREEN_ASSISTANT_INVALID_INPUT",
      reason: "screenId is required.",
    });
  }

  const boundary = resolveAiRoleScreenBoundary({
    auth: params.auth,
    screenId: normalizedScreenId,
  });
  if (boundary.status === "blocked") {
    const blockerCode: AiScreenLocalAssistantBlockerCode =
      boundary.decision === "AUTH_REQUIRED"
        ? "AI_SCREEN_ASSISTANT_AUTH_REQUIRED"
        : boundary.decision === "SCREEN_NOT_REGISTERED"
          ? "AI_SCREEN_ASSISTANT_SCREEN_NOT_REGISTERED"
          : "AI_SCREEN_ASSISTANT_ROLE_SCREEN_FORBIDDEN";
    return blockedContext({
      auth: params.auth,
      screenId: normalizedScreenId,
      code: blockerCode,
      reason: boundary.reason,
    });
  }

  const auth = params.auth;
  if (!auth) {
    return blockedContext({
      auth,
      screenId: normalizedScreenId,
      code: "AI_SCREEN_ASSISTANT_AUTH_REQUIRED",
      reason: "Screen-local assistant requires authenticated role context.",
    });
  }

  const actionMap = resolveAiScreenActions({
    auth,
    screenId: normalizedScreenId,
  });
  const actionEntry = getAiScreenActionEntry(normalizedScreenId);
  const runtimeScreenId = normalizeAiScreenLocalAssistantRuntimeScreenId(normalizedScreenId);
  const runtimeEntry = getAiScreenRuntimeEntry(runtimeScreenId);
  const runtime =
    runtimeEntry && runtimeEntry.mounted === "mounted"
      ? resolveAiScreenRuntime({
          auth,
          request: { screenId: runtimeScreenId, limit: 20 },
        })
      : null;
  const profileEntry = getProfile(normalizedScreenId);
  const actionMapKnown = actionMap.status === "ready";
  const visibleActions = actionMapKnown ? actionMap.visibleActions : [];
  const evidenceSources: readonly AiScreenActionEvidenceSource[] =
    actionMapKnown && actionMap.evidenceSources.length > 0
      ? actionMap.evidenceSources
      : ["screen_state", "role_policy"];
  const evidencePlan = buildAiAssistantEvidencePlan({
    screenId: normalizedScreenId,
    role: auth.role,
    evidenceSources,
    runtimeKnown: Boolean(runtimeEntry),
    actionMapKnown,
    inputEvidenceRefs: params.evidenceRefs,
  });
  const domain: AiDomain =
    actionMapKnown ? actionMap.domain : runtimeEntry?.domain ?? profileEntry?.domain ?? "control";
  const toolCandidates = unique([
    ...(actionMapKnown ? actionMap.availableTools : []),
    ...(profileEntry?.sameScreenTools ?? []),
  ]);
  const availableIntents = unique([
    ...(actionMapKnown ? actionMap.availableIntents : []),
    ...(runtime?.availableIntents ?? []),
  ].map((intent) => String(intent)));

  return {
    status: "ready",
    blockerCode: null,
    blockedReason: null,
    screenId: normalizedScreenId,
    role: auth.role,
    domain,
    roleScope: actionEntry?.allowedRoles ?? runtimeEntry?.allowedRoles ?? profileEntry?.defaultRoleScope ?? [],
    localWorkKinds: profileEntry?.localWorkKinds ?? runtimeEntry?.entityTypes ?? [],
    availableIntents,
    toolCandidates,
    visibleActionIds: visibleActions.map((action) => action.actionId),
    safeReadActionIds: actionsByMode(visibleActions, "safe_read"),
    draftActionIds: actionsByMode(visibleActions, "draft_only"),
    approvalRequiredActionIds: actionsByMode(visibleActions, "approval_required"),
    forbiddenActionIds: actionsByMode(visibleActions, "forbidden"),
    evidencePlan,
    boundary,
    runtimeScreenKnown: Boolean(runtimeEntry),
    actionMapKnown,
    sameScreenOnly: true,
    roleScoped: true,
    evidenceBacked: true,
    internalFirst: true,
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
    source: "runtime:ai_screen_local_role_assistant_orchestrator_v1",
  };
}

export function listAiScreenLocalAssistantProfiles(): AiScreenLocalAssistantScreenProfile[] {
  return [...AI_SCREEN_LOCAL_ASSISTANT_PROFILES];
}
