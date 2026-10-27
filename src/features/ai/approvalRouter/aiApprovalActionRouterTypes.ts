import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type { AiActionLedgerActionType, AiActionStatus } from "../actionLedger/aiActionLedgerTypes";
import type {
  AiScreenAuditPrimaryDomain,
  AiScreenMutationRisk,
} from "../screenAudit/aiScreenButtonRoleActionTypes";

export const AI_APPROVAL_ACTION_ROUTER_WAVE = "S_AI_APPROVAL_01_ACTION_ROUTER_FROM_AUDIT" as const;

export type AiApprovalActionRouterFinalStatus =
  | "GREEN_AI_APPROVAL_ACTION_ROUTER_READY"
  | "BLOCKED_AI_APPROVAL_ACTION_ROUTE_MISSING"
  | "BLOCKED_AI_APPROVAL_LEDGER_RPC_NOT_VISIBLE"
  | "BLOCKED_AI_APPROVAL_ACTION_EVIDENCE_MISSING";

export type AiApprovalActionLedgerRouteKind =
  | "submit_for_approval"
  | "ledger_decision";

export type AiApprovalActionRouteStatus = "ready" | "blocked";

export type AiApprovalActionPayloadSafety = {
  redacted: true;
  forbiddenKeys: readonly string[];
  rawPromptExposed: false;
  rawProviderPayloadExposed: false;
  rawDbRowsExposed: false;
  credentialsExposed: false;
};

export type AiApprovalActionEvidencePolicy = {
  ok: boolean;
  requiredEvidenceKinds: readonly ["audit_action", "domain_evidence", "approval_route"];
  missingEvidenceKinds: readonly string[];
  evidenceRefs: readonly string[];
  maxEvidenceRefs: number;
  evidenceBacked: boolean;
};

export type AiApprovalActionLedgerSubmitPayload = {
  endpoint: "POST /agent/action/submit-for-approval";
  actionType: AiActionLedgerActionType;
  screenId: string;
  domain: AiDomain;
  summary: string;
  redactedPayload: unknown;
  evidenceRefs: readonly string[];
  idempotencyKey: string;
  requiresApproval: true;
  auditTraceId: string;
  directExecuteAllowed: false;
  providerCalled: false;
  dbWriteInRouter: false;
};

export type AiApprovalActionLedgerRoute = {
  kind: AiApprovalActionLedgerRouteKind;
  submitEndpoint: "POST /agent/action/submit-for-approval";
  statusEndpoint: "GET /agent/action/:actionId/status";
  approveEndpoint: "POST /agent/action/:actionId/approve";
  rejectEndpoint: "POST /agent/action/:actionId/reject";
  executeApprovedEndpoint: "POST /agent/action/:actionId/execute-approved";
  rpcSubmitFunction: "ai_action_ledger_submit_for_approval_v1";
  rpcExecuteApprovedFunction: "ai_action_ledger_execute_approved_v1";
  ledgerBacked: true;
  roleResolvedServerSide: true;
  organizationScopeResolvedServerSide: true;
  directExecuteAllowed: false;
  submitPayloadRequired: boolean;
};

export type AiApprovalActionExecutionPolicy = {
  executeEndpoint: "POST /agent/action/:actionId/execute-approved";
  requiresApprovedStatus: true;
  allowedStatuses: readonly ["approved"];
  directExecuteAllowed: false;
  domainExecutorRequiredAfterApproval: true;
};

export type AiApprovalActionRouteEntry = {
  wave: typeof AI_APPROVAL_ACTION_ROUTER_WAVE;
  screenId: string;
  actionId: string;
  actionLabel: string;
  roleScope: readonly AiUserRole[];
  auditPrimaryDomain: AiScreenAuditPrimaryDomain;
  domain: AiDomain;
  mutationRisk: AiScreenMutationRisk;
  actionType: AiActionLedgerActionType;
  routeStatus: AiApprovalActionRouteStatus;
  routeKind: AiApprovalActionLedgerRouteKind;
  ledgerRoute: AiApprovalActionLedgerRoute;
  ledgerSubmitPayload: AiApprovalActionLedgerSubmitPayload | null;
  evidencePolicy: AiApprovalActionEvidencePolicy;
  payloadSafety: AiApprovalActionPayloadSafety;
  executionPolicy: AiApprovalActionExecutionPolicy;
  auditTraceId: string;
  noDirectExecutePath: true;
  finalExecutionInRouter: false;
  dbWritesInRouter: false;
  providerCallsInRouter: false;
  rationale: string;
};

export type AiApprovalActionExecutionGateDecision = {
  allowed: boolean;
  actionId: string;
  status: AiActionStatus | "not_found" | "blocked";
  exactReason: string;
  directExecuteAllowed: false;
  requiresApprovedStatus: true;
};

export type AiApprovalActionRouterSummary = {
  wave: typeof AI_APPROVAL_ACTION_ROUTER_WAVE;
  finalStatus: AiApprovalActionRouterFinalStatus;
  exactReason: string | null;
  auditedActions: number;
  approvalRequiredActions: number;
  routedActions: number;
  submitRoutes: number;
  ledgerDecisionRoutes: number;
  evidenceMissingActions: readonly string[];
  routeMissingActions: readonly string[];
  directExecuteFindings: readonly string[];
  ledgerRpcVisible: boolean;
  executeOnlyAfterApproved: boolean;
  redactionSafeActions: number;
  noSecrets: true;
  noRawRows: true;
  noRawPrompts: true;
  noRawProviderPayloads: true;
  noDbWrites: true;
  noProviderCalls: true;
  noUiChanges: true;
  noFakeGreen: true;
};
