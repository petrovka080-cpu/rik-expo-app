import type { AiApprovalActionRouteEntry } from "../approvalRouter/aiApprovalActionRouterTypes";
import { routeAiApprovalRequiredAction } from "../approvalRouter/aiApprovalActionRouter";
import type {
  ProcurementAuthContext,
  ProcurementRequestContext,
} from "./procurementContextTypes";
import type { AiInternalSupplierRankedCandidate } from "./aiInternalSupplierRanker";
import { uniqueProcurementRefs } from "./procurementRedaction";

export type AiProcurementApprovalCandidateStatus = "ready" | "blocked";

export type AiProcurementApprovalCandidateBlocker =
  | "BLOCKED_AI_PROCUREMENT_APPROVAL_ROUTE_MISSING"
  | "BLOCKED_AI_PROCUREMENT_INTERNAL_EVIDENCE_MISSING";

export type AiProcurementApprovalCandidate = {
  status: AiProcurementApprovalCandidateStatus;
  blocker: AiProcurementApprovalCandidateBlocker | null;
  screenId: string;
  actionId: string;
  route: AiApprovalActionRouteEntry | null;
  recommendedSupplierLabel: string | null;
  approvalSummary: string;
  evidenceRefs: readonly string[];
  approvalRequired: true;
  executeOnlyAfterApprovedStatus: true;
  directExecuteAllowed: false;
  redactedPayloadOnly: true;
  supplierConfirmationAllowed: false;
  orderCreationAllowed: false;
  warehouseMutationAllowed: false;
  paymentCreationAllowed: false;
  finalExecution: 0;
  mutationCount: 0;
};

export const AI_PROCUREMENT_APPROVAL_CANDIDATE_CONTRACT = Object.freeze({
  contractId: "ai_procurement_approval_candidate_v1",
  approvalRequired: true,
  executeOnlyAfterApprovedStatus: true,
  directExecuteAllowed: false,
  redactedPayloadOnly: true,
  supplierConfirmationAllowed: false,
  orderCreationAllowed: false,
  warehouseMutationAllowed: false,
  paymentCreationAllowed: false,
  finalExecution: 0,
  mutationCount: 0,
} as const);

const PROCUREMENT_SCREEN_ACTION_IDS: Readonly<Record<string, string>> = Object.freeze({
  "buyer.main": "buyer.main.approval",
  "buyer.requests": "buyer.requests.approval",
  "buyer.request.detail": "buyer.request.detail.approval",
  "procurement.copilot": "procurement.copilot.approval",
});

function approvalActionIdForScreen(screenId: string): string {
  return PROCUREMENT_SCREEN_ACTION_IDS[screenId] ?? "buyer.requests.approval";
}

function approvalSummary(params: {
  context: ProcurementRequestContext;
  supplier: AiInternalSupplierRankedCandidate | null;
}): string {
  const itemCount = params.context.requestedItems.length;
  const supplierLabel = params.supplier?.supplierLabel ?? "internal supplier option pending";
  return `Submit procurement decision for ${itemCount} material item(s) with ${supplierLabel} for approval.`;
}

export function buildAiProcurementApprovalCandidate(params: {
  auth: ProcurementAuthContext | null;
  context: ProcurementRequestContext;
  recommendedSupplier: AiInternalSupplierRankedCandidate | null;
  evidenceRefs: readonly string[];
}): AiProcurementApprovalCandidate {
  const actionId = approvalActionIdForScreen(params.context.screenId);
  const route = params.auth
    ? routeAiApprovalRequiredAction({
        screenId: params.context.screenId,
        actionId,
        role: params.auth.role,
      })
    : null;
  const evidenceRefs = uniqueProcurementRefs([...params.evidenceRefs]);
  const hasEvidence = evidenceRefs.length > 0;
  const blocker: AiProcurementApprovalCandidateBlocker | null = !hasEvidence
    ? "BLOCKED_AI_PROCUREMENT_INTERNAL_EVIDENCE_MISSING"
    : route?.routeStatus === "ready"
      ? null
      : "BLOCKED_AI_PROCUREMENT_APPROVAL_ROUTE_MISSING";

  return {
    status: blocker ? "blocked" : "ready",
    blocker,
    screenId: params.context.screenId,
    actionId,
    route,
    recommendedSupplierLabel: params.recommendedSupplier?.supplierLabel ?? null,
    approvalSummary: approvalSummary({
      context: params.context,
      supplier: params.recommendedSupplier,
    }),
    evidenceRefs,
    approvalRequired: true,
    executeOnlyAfterApprovedStatus: true,
    directExecuteAllowed: false,
    redactedPayloadOnly: true,
    supplierConfirmationAllowed: false,
    orderCreationAllowed: false,
    warehouseMutationAllowed: false,
    paymentCreationAllowed: false,
    finalExecution: 0,
    mutationCount: 0,
  };
}
