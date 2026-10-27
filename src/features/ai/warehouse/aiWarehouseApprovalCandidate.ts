import type { AiApprovalActionRouteEntry } from "../approvalRouter/aiApprovalActionRouterTypes";
import { routeAiApprovalRequiredAction } from "../approvalRouter/aiApprovalActionRouter";
import type { AiWarehouseCopilotAuthContext } from "./aiWarehouseCopilotTypes";
import type { AiWarehouseEvidenceResolverResult } from "./aiWarehouseEvidenceResolver";
import type { AiWarehouseDraftActionPlannerResult } from "./aiWarehouseDraftActionPlanner";
import type { AiWarehouseRiskClassifierResult } from "./aiWarehouseRiskClassifier";

export type AiWarehouseApprovalCandidateStatus = "ready" | "blocked";

export type AiWarehouseApprovalCandidateBlocker =
  | "BLOCKED_AI_WAREHOUSE_EVIDENCE_ROUTE_MISSING"
  | "BLOCKED_AI_WAREHOUSE_APPROVAL_ROUTE_MISSING";

export type AiWarehouseApprovalCandidate = {
  status: AiWarehouseApprovalCandidateStatus;
  blocker: AiWarehouseApprovalCandidateBlocker | null;
  screenId: string;
  actionId: string;
  route: AiApprovalActionRouteEntry | null;
  approvalSummary: string;
  redactedPayload: {
    screenId: string;
    riskLevel: string;
    planKinds: readonly string[];
    evidenceRefCount: number;
    stockMutationRequested: false;
    receiveRequested: false;
    issueRequested: false;
  };
  evidenceRefs: readonly string[];
  approvalRequired: true;
  executeOnlyAfterApprovedStatus: true;
  directExecuteAllowed: false;
  redactedPayloadOnly: true;
  stockMutationAllowed: false;
  finalIssueAllowed: false;
  finalReceiveAllowed: false;
  reservationCreated: false;
  movementCreated: false;
  providerCalled: false;
  dbWrites: 0;
  finalExecution: 0;
  mutationCount: 0;
};

export const AI_WAREHOUSE_APPROVAL_CANDIDATE_CONTRACT = Object.freeze({
  contractId: "ai_warehouse_approval_candidate_v1",
  approvalRequired: true,
  executeOnlyAfterApprovedStatus: true,
  directExecuteAllowed: false,
  redactedPayloadOnly: true,
  stockMutationAllowed: false,
  finalIssueAllowed: false,
  finalReceiveAllowed: false,
  reservationCreated: false,
  movementCreated: false,
  providerCalled: false,
  dbWrites: 0,
  finalExecution: 0,
  mutationCount: 0,
} as const);

const WAREHOUSE_SCREEN_APPROVAL_ACTION_IDS: Readonly<Record<string, string>> = Object.freeze({
  "warehouse.main": "warehouse.main.approval",
  "warehouse.incoming": "warehouse.incoming.approval",
  "warehouse.issue": "warehouse.issue.approval",
});

function approvalActionId(screenId: string): string {
  return WAREHOUSE_SCREEN_APPROVAL_ACTION_IDS[screenId] ?? "warehouse.main.approval";
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function evidenceIds(result: AiWarehouseEvidenceResolverResult): string[] {
  return result.evidenceRefs.map((ref) => `${ref.type}:${ref.ref}`);
}

function summary(params: {
  evidence: AiWarehouseEvidenceResolverResult;
  risk: AiWarehouseRiskClassifierResult;
  draft: AiWarehouseDraftActionPlannerResult;
}): string {
  const planCount = params.draft.planItems.length;
  return `Submit ${params.evidence.screenId} warehouse movement review with ${params.risk.riskLevel} risk and ${planCount} draft item(s) for approval.`;
}

export function buildAiWarehouseApprovalCandidate(params: {
  auth: AiWarehouseCopilotAuthContext | null;
  evidence: AiWarehouseEvidenceResolverResult;
  risk: AiWarehouseRiskClassifierResult;
  draft: AiWarehouseDraftActionPlannerResult;
}): AiWarehouseApprovalCandidate {
  const actionId = approvalActionId(params.evidence.screenId);
  const route = params.auth
    ? routeAiApprovalRequiredAction({
        screenId: params.evidence.screenId,
        actionId,
        role: params.auth.role,
      })
    : null;
  const evidenceRefs = unique([
    ...evidenceIds(params.evidence),
    ...params.risk.riskSignals.flatMap((signal) => signal.evidenceRefs),
    ...params.draft.planItems.flatMap((item) => item.evidenceRefs),
  ]);
  const blocker: AiWarehouseApprovalCandidateBlocker | null =
    evidenceRefs.length === 0
      ? "BLOCKED_AI_WAREHOUSE_EVIDENCE_ROUTE_MISSING"
      : route?.routeStatus === "ready"
        ? null
        : "BLOCKED_AI_WAREHOUSE_APPROVAL_ROUTE_MISSING";

  return {
    status: blocker ? "blocked" : "ready",
    blocker,
    screenId: params.evidence.screenId,
    actionId,
    route,
    approvalSummary: summary(params),
    redactedPayload: {
      screenId: params.evidence.screenId,
      riskLevel: params.risk.riskLevel,
      planKinds: params.draft.planItems.map((item) => item.kind),
      evidenceRefCount: evidenceRefs.length,
      stockMutationRequested: false,
      receiveRequested: false,
      issueRequested: false,
    },
    evidenceRefs,
    approvalRequired: true,
    executeOnlyAfterApprovedStatus: true,
    directExecuteAllowed: false,
    redactedPayloadOnly: true,
    stockMutationAllowed: false,
    finalIssueAllowed: false,
    finalReceiveAllowed: false,
    reservationCreated: false,
    movementCreated: false,
    providerCalled: false,
    dbWrites: 0,
    finalExecution: 0,
    mutationCount: 0,
  };
}
