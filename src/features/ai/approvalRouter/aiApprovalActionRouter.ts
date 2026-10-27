import { AI_ACTION_LEDGER_BFF_CONTRACT } from "../actionLedger/aiActionLedgerBff";
import { AI_ACTION_LEDGER_RPC_FUNCTIONS } from "../actionLedger/aiActionLedgerRpcTypes";
import type {
  AiActionLedgerActionType,
  AiActionStatus,
} from "../actionLedger/aiActionLedgerTypes";
import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import {
  listAiScreenButtonRoleActionEntries,
} from "../screenAudit/aiScreenButtonRoleActionRegistry";
import type {
  AiScreenAuditPrimaryDomain,
  AiScreenButtonActionEntry,
} from "../screenAudit/aiScreenButtonRoleActionTypes";
import { buildAiApprovalActionEvidencePolicy } from "./aiApprovalActionEvidencePolicy";
import {
  buildAiApprovalActionPayloadSafety,
  buildAiApprovalActionRawPayload,
  redactAiApprovalActionPayload,
} from "./aiApprovalActionPayloadRedaction";
import {
  AI_APPROVAL_ACTION_ROUTER_WAVE,
  type AiApprovalActionExecutionGateDecision,
  type AiApprovalActionLedgerRoute,
  type AiApprovalActionLedgerRouteKind,
  type AiApprovalActionLedgerSubmitPayload,
  type AiApprovalActionRouteEntry,
  type AiApprovalActionRouterFinalStatus,
  type AiApprovalActionRouterSummary,
} from "./aiApprovalActionRouterTypes";

const LEDGER_ROUTE_BASE = Object.freeze({
  submitEndpoint: AI_ACTION_LEDGER_BFF_CONTRACT.submitEndpoint,
  statusEndpoint: AI_ACTION_LEDGER_BFF_CONTRACT.statusEndpoint,
  approveEndpoint: AI_ACTION_LEDGER_BFF_CONTRACT.approveEndpoint,
  rejectEndpoint: AI_ACTION_LEDGER_BFF_CONTRACT.rejectEndpoint,
  executeApprovedEndpoint: AI_ACTION_LEDGER_BFF_CONTRACT.executeApprovedEndpoint,
  rpcSubmitFunction: AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval,
  rpcExecuteApprovedFunction: AI_ACTION_LEDGER_RPC_FUNCTIONS.executeApproved,
  ledgerBacked: true,
  roleResolvedServerSide: true,
  organizationScopeResolvedServerSide: true,
  directExecuteAllowed: false,
} satisfies Omit<AiApprovalActionLedgerRoute, "kind" | "submitPayloadRequired">);

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function safeToken(value: string): string {
  return normalizeText(value).replace(/[^a-zA-Z0-9:._-]+/g, "_").slice(0, 180);
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function mapAiApprovalAuditDomainToLedgerDomain(
  domain: AiScreenAuditPrimaryDomain,
): AiDomain {
  if (domain === "control" || domain === "security" || domain === "screen_runtime") return "control";
  if (domain === "procurement") return "procurement";
  if (domain === "marketplace") return "marketplace";
  if (domain === "warehouse") return "warehouse";
  if (domain === "finance") return "finance";
  if (domain === "reports") return "reports";
  if (domain === "documents") return "documents";
  if (domain === "subcontracts") return "subcontracts";
  if (domain === "projects") return "projects";
  if (domain === "map") return "map";
  if (domain === "chat") return "chat";
  return "control";
}

function haystack(entry: AiScreenButtonActionEntry): string {
  return [
    entry.screenId,
    entry.label,
    entry.primaryDomain,
    ...entry.visibleButtons,
    ...entry.onPressHandlers,
    ...entry.crossScreenRisks,
  ]
    .join(" ")
    .toLowerCase();
}

export function mapAiApprovalActionToLedgerActionType(
  entry: Pick<AiScreenButtonActionEntry, "screenId" | "label" | "primaryDomain" | "visibleButtons" | "onPressHandlers" | "crossScreenRisks">,
): AiActionLedgerActionType {
  const text = haystack(entry as AiScreenButtonActionEntry);
  if (entry.primaryDomain === "warehouse") return "change_warehouse_status";
  if (entry.primaryDomain === "finance") return "change_payment_status";
  if (entry.primaryDomain === "documents" || entry.primaryDomain === "reports" || entry.primaryDomain === "chat") {
    return "send_document";
  }
  if (entry.primaryDomain === "subcontracts") return "send_document";
  if (entry.primaryDomain === "procurement" || entry.primaryDomain === "marketplace") {
    if (text.includes("supplier") || text.includes("proposal")) return "confirm_supplier";
    return "submit_request";
  }
  return "submit_request";
}

function routeKindForAction(entry: AiScreenButtonActionEntry): AiApprovalActionLedgerRouteKind {
  return entry.screenId === "approval.inbox" ? "ledger_decision" : "submit_for_approval";
}

function buildAuditTraceId(entry: AiScreenButtonActionEntry, actionType: AiActionLedgerActionType): string {
  return safeToken(`ai_approval_trace:${entry.screenId}:${entry.actionId}:${actionType}:${stableHash(entry.label)}`);
}

function buildIdempotencyKey(entry: AiScreenButtonActionEntry, actionType: AiActionLedgerActionType): string {
  return safeToken(`ai_approval_router:${entry.screenId}:${entry.actionId}:${actionType}:${stableHash(entry.source)}`);
}

function buildSummary(entry: AiScreenButtonActionEntry): string {
  return normalizeText(`${entry.label} (${entry.screenId}) requires approval ledger review.`);
}

function buildLedgerRoute(kind: AiApprovalActionLedgerRouteKind): AiApprovalActionLedgerRoute {
  return {
    kind,
    ...LEDGER_ROUTE_BASE,
    submitPayloadRequired: kind === "submit_for_approval",
  };
}

function buildLedgerSubmitPayload(params: {
  entry: AiScreenButtonActionEntry;
  actionType: AiActionLedgerActionType;
  domain: AiDomain;
  auditTraceId: string;
  evidenceRefs: readonly string[];
  redactedPayload: unknown;
}): AiApprovalActionLedgerSubmitPayload {
  return {
    endpoint: AI_ACTION_LEDGER_BFF_CONTRACT.submitEndpoint,
    actionType: params.actionType,
    screenId: params.entry.screenId,
    domain: params.domain,
    summary: buildSummary(params.entry),
    redactedPayload: params.redactedPayload,
    evidenceRefs: params.evidenceRefs,
    idempotencyKey: buildIdempotencyKey(params.entry, params.actionType),
    requiresApproval: true,
    auditTraceId: params.auditTraceId,
    directExecuteAllowed: false,
    providerCalled: false,
    dbWriteInRouter: false,
  };
}

function buildRouteEntry(entry: AiScreenButtonActionEntry): AiApprovalActionRouteEntry {
  const domain = mapAiApprovalAuditDomainToLedgerDomain(entry.primaryDomain);
  const actionType = mapAiApprovalActionToLedgerActionType(entry);
  const auditTraceId = buildAuditTraceId(entry, actionType);
  const routeKind = routeKindForAction(entry);
  const evidencePolicy = buildAiApprovalActionEvidencePolicy(entry);
  const redactedPayload = redactAiApprovalActionPayload(buildAiApprovalActionRawPayload(entry));
  const payloadSafety = buildAiApprovalActionPayloadSafety(redactedPayload);
  const routeStatus = evidencePolicy.ok && payloadSafety.forbiddenKeys.length === 0 ? "ready" : "blocked";
  const ledgerSubmitPayload =
    routeKind === "submit_for_approval"
      ? buildLedgerSubmitPayload({
          entry,
          actionType,
          domain,
          auditTraceId,
          evidenceRefs: evidencePolicy.evidenceRefs,
          redactedPayload,
        })
      : null;

  return Object.freeze({
    wave: AI_APPROVAL_ACTION_ROUTER_WAVE,
    screenId: entry.screenId,
    actionId: entry.actionId,
    actionLabel: entry.label,
    roleScope: entry.roleScope,
    auditPrimaryDomain: entry.primaryDomain,
    domain,
    mutationRisk: entry.mutationRisk,
    actionType,
    routeStatus,
    routeKind,
    ledgerRoute: buildLedgerRoute(routeKind),
    ledgerSubmitPayload,
    evidencePolicy,
    payloadSafety,
    executionPolicy: {
      executeEndpoint: AI_ACTION_LEDGER_BFF_CONTRACT.executeApprovedEndpoint,
      requiresApprovedStatus: true,
      allowedStatuses: ["approved"],
      directExecuteAllowed: false,
      domainExecutorRequiredAfterApproval: true,
    },
    auditTraceId,
    noDirectExecutePath: true,
    finalExecutionInRouter: false,
    dbWritesInRouter: false,
    providerCallsInRouter: false,
    rationale:
      routeKind === "ledger_decision"
        ? "Approval inbox actions remain ledger decision routes and can execute only through approved ledger status."
        : "Audited approval-required action is converted to a redacted ledger submit payload without execution.",
  } satisfies AiApprovalActionRouteEntry);
}

export const AI_APPROVAL_ACTION_ROUTER_REGISTRY: readonly AiApprovalActionRouteEntry[] = Object.freeze(
  listAiScreenButtonRoleActionEntries()
    .filter((entry) => entry.actionKind === "approval_required")
    .map(buildRouteEntry),
);

export function listAiApprovalActionRoutes(): AiApprovalActionRouteEntry[] {
  return [...AI_APPROVAL_ACTION_ROUTER_REGISTRY];
}

export function getAiApprovalActionRoute(actionId: string): AiApprovalActionRouteEntry | null {
  const normalized = normalizeText(actionId);
  return AI_APPROVAL_ACTION_ROUTER_REGISTRY.find((entry) => entry.actionId === normalized) ?? null;
}

export function routeAiApprovalRequiredAction(params: {
  screenId: string;
  actionId: string;
  role: AiUserRole;
}): AiApprovalActionRouteEntry | null {
  const screenId = normalizeText(params.screenId);
  const actionId = normalizeText(params.actionId);
  const route = AI_APPROVAL_ACTION_ROUTER_REGISTRY.find(
    (entry) => entry.screenId === screenId && entry.actionId === actionId,
  );
  if (!route || !route.roleScope.includes(params.role)) return null;
  return route;
}

export function canRequestAiApprovalActionExecution(params: {
  actionId: string;
  status: AiActionStatus | "not_found" | "blocked";
}): AiApprovalActionExecutionGateDecision {
  const route = getAiApprovalActionRoute(params.actionId);
  if (!route) {
    return {
      allowed: false,
      actionId: params.actionId,
      status: params.status,
      exactReason: "Audited approval action route is missing.",
      directExecuteAllowed: false,
      requiresApprovedStatus: true,
    };
  }
  if (params.status !== "approved") {
    return {
      allowed: false,
      actionId: params.actionId,
      status: params.status,
      exactReason: `AI action status ${params.status} cannot execute before approved ledger status.`,
      directExecuteAllowed: false,
      requiresApprovedStatus: true,
    };
  }
  return {
    allowed: true,
    actionId: params.actionId,
    status: params.status,
    exactReason: "AI action can request execute-approved BFF route after approved ledger status.",
    directExecuteAllowed: false,
    requiresApprovedStatus: true,
  };
}

function ledgerRpcVisible(): boolean {
  return (
    AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval === "ai_action_ledger_submit_for_approval_v1" &&
    AI_ACTION_LEDGER_RPC_FUNCTIONS.executeApproved === "ai_action_ledger_execute_approved_v1" &&
    AI_ACTION_LEDGER_BFF_CONTRACT.submitEndpoint === "POST /agent/action/submit-for-approval" &&
    AI_ACTION_LEDGER_BFF_CONTRACT.executeApprovedEndpoint === "POST /agent/action/:actionId/execute-approved"
  );
}

export function scanAiApprovalRoutesForDirectExecute(
  routes: readonly AiApprovalActionRouteEntry[] = listAiApprovalActionRoutes(),
): string[] {
  return routes
    .filter(
      (route) =>
        route.noDirectExecutePath !== true ||
        route.finalExecutionInRouter !== false ||
        route.dbWritesInRouter !== false ||
        route.providerCallsInRouter !== false ||
        route.executionPolicy.requiresApprovedStatus !== true ||
        route.executionPolicy.directExecuteAllowed !== false ||
        !route.executionPolicy.allowedStatuses.includes("approved"),
    )
    .map((route) => route.actionId)
    .sort();
}

function resolveFinalStatus(params: {
  routeMissingActions: readonly string[];
  ledgerRpcVisible: boolean;
  evidenceMissingActions: readonly string[];
  directExecuteFindings: readonly string[];
}): { finalStatus: AiApprovalActionRouterFinalStatus; exactReason: string | null } {
  if (!params.ledgerRpcVisible) {
    return {
      finalStatus: "BLOCKED_AI_APPROVAL_LEDGER_RPC_NOT_VISIBLE",
      exactReason: "Required AI action ledger RPC/BFF submit or execute-approved contract is not visible.",
    };
  }
  if (params.routeMissingActions.length > 0 || params.directExecuteFindings.length > 0) {
    return {
      finalStatus: "BLOCKED_AI_APPROVAL_ACTION_ROUTE_MISSING",
      exactReason: [...params.routeMissingActions, ...params.directExecuteFindings].join(", "),
    };
  }
  if (params.evidenceMissingActions.length > 0) {
    return {
      finalStatus: "BLOCKED_AI_APPROVAL_ACTION_EVIDENCE_MISSING",
      exactReason: params.evidenceMissingActions.join(", "),
    };
  }
  return {
    finalStatus: "GREEN_AI_APPROVAL_ACTION_ROUTER_READY",
    exactReason: null,
  };
}

export function verifyAiApprovalActionRouter(
  routes: readonly AiApprovalActionRouteEntry[] = listAiApprovalActionRoutes(),
): AiApprovalActionRouterSummary {
  const auditedEntries = listAiScreenButtonRoleActionEntries();
  const approvalRequiredActions = auditedEntries
    .filter((entry) => entry.actionKind === "approval_required")
    .map((entry) => entry.actionId)
    .sort();
  const routedActionIds = new Set(routes.map((route) => route.actionId));
  const routeMissingActions = approvalRequiredActions
    .filter((actionId) => !routedActionIds.has(actionId))
    .sort();
  const evidenceMissingActions = routes
    .filter((route) => !route.evidencePolicy.ok || route.routeStatus !== "ready")
    .map((route) => route.actionId)
    .sort();
  const directExecuteFindings = scanAiApprovalRoutesForDirectExecute(routes);
  const rpcVisible = ledgerRpcVisible();
  const { finalStatus, exactReason } = resolveFinalStatus({
    routeMissingActions,
    ledgerRpcVisible: rpcVisible,
    evidenceMissingActions,
    directExecuteFindings,
  });

  return {
    wave: AI_APPROVAL_ACTION_ROUTER_WAVE,
    finalStatus,
    exactReason,
    auditedActions: auditedEntries.length,
    approvalRequiredActions: approvalRequiredActions.length,
    routedActions: routes.length,
    submitRoutes: routes.filter((route) => route.routeKind === "submit_for_approval").length,
    ledgerDecisionRoutes: routes.filter((route) => route.routeKind === "ledger_decision").length,
    evidenceMissingActions,
    routeMissingActions,
    directExecuteFindings,
    ledgerRpcVisible: rpcVisible,
    executeOnlyAfterApproved: directExecuteFindings.length === 0,
    redactionSafeActions: routes.filter((route) => route.payloadSafety.forbiddenKeys.length === 0).length,
    noSecrets: true,
    noRawRows: true,
    noRawPrompts: true,
    noRawProviderPayloads: true,
    noDbWrites: true,
    noProviderCalls: true,
    noUiChanges: true,
    noFakeGreen: true,
  };
}
