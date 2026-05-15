import type { AiApprovalActionRouteEntry } from "../approvalRouter/aiApprovalActionRouterTypes";
import { routeAiApprovalRequiredAction } from "../approvalRouter/aiApprovalActionRouter";
import type { AiFinanceCopilotAuthContext } from "./aiFinanceCopilotTypes";
import type { AiFinanceEvidenceResolverResult } from "./aiFinanceEvidenceResolver";
import type { AiPaymentDraftRationaleResult } from "./aiPaymentDraftRationale";
import type { AiPaymentRiskClassifierResult } from "./aiPaymentRiskClassifier";

export type AiFinanceApprovalCandidateStatus = "ready" | "blocked";

export type AiFinanceApprovalCandidateBlocker =
  | "BLOCKED_AI_FINANCE_EVIDENCE_ROUTE_MISSING"
  | "BLOCKED_AI_FINANCE_APPROVAL_ROUTE_MISSING";

export type AiFinanceApprovalCandidate = {
  status: AiFinanceApprovalCandidateStatus;
  blocker: AiFinanceApprovalCandidateBlocker | null;
  screenId: string;
  actionId: string;
  route: AiApprovalActionRouteEntry | null;
  approvalSummary: string;
  redactedPayload: {
    screenId: string;
    riskLevel: string;
    rationaleKinds: readonly string[];
    evidenceRefCount: number;
    paymentRequested: false;
    financePostingRequested: false;
    invoiceMutationRequested: false;
  };
  evidenceRefs: readonly string[];
  approvalRequired: true;
  executeOnlyAfterApprovedStatus: true;
  directExecuteAllowed: false;
  redactedPayloadOnly: true;
  paymentExecutionAllowed: false;
  financePostingAllowed: false;
  ledgerBypassAllowed: false;
  paymentCreated: false;
  postingCreated: false;
  invoiceMutated: false;
  providerCalled: false;
  dbWrites: 0;
  finalExecution: 0;
  mutationCount: 0;
};

export const AI_FINANCE_APPROVAL_CANDIDATE_CONTRACT = Object.freeze({
  contractId: "ai_finance_approval_candidate_v1",
  approvalRequired: true,
  executeOnlyAfterApprovedStatus: true,
  directExecuteAllowed: false,
  redactedPayloadOnly: true,
  paymentExecutionAllowed: false,
  financePostingAllowed: false,
  ledgerBypassAllowed: false,
  paymentCreated: false,
  postingCreated: false,
  invoiceMutated: false,
  providerCalled: false,
  dbWrites: 0,
  finalExecution: 0,
  mutationCount: 0,
} as const);

const FINANCE_SCREEN_APPROVAL_ACTION_IDS: Readonly<Record<string, string>> = Object.freeze({
  "accountant.main": "accountant.main.approval",
  "accountant.payment": "accountant.payment.approval",
  "accountant.history": "accountant.history.approval",
  "director.finance": "director.finance.approval",
});

function approvalActionId(screenId: string): string {
  return FINANCE_SCREEN_APPROVAL_ACTION_IDS[screenId] ?? "accountant.main.approval";
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function evidenceIds(result: AiFinanceEvidenceResolverResult): string[] {
  return result.evidenceRefs.map((ref) => `${ref.type}:${ref.ref}`);
}

function summary(params: {
  evidence: AiFinanceEvidenceResolverResult;
  risk: AiPaymentRiskClassifierResult;
  draft: AiPaymentDraftRationaleResult;
}): string {
  const rationaleCount = params.draft.rationaleItems.length;
  return `Submit ${params.evidence.screenId} finance review with ${params.risk.riskLevel} risk and ${rationaleCount} draft rationale item(s) for approval.`;
}

export function buildAiFinanceApprovalCandidate(params: {
  auth: AiFinanceCopilotAuthContext | null;
  evidence: AiFinanceEvidenceResolverResult;
  risk: AiPaymentRiskClassifierResult;
  draft: AiPaymentDraftRationaleResult;
}): AiFinanceApprovalCandidate {
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
    ...params.draft.rationaleItems.flatMap((item) => item.evidenceRefs),
  ]);
  const blocker: AiFinanceApprovalCandidateBlocker | null =
    evidenceRefs.length === 0
      ? "BLOCKED_AI_FINANCE_EVIDENCE_ROUTE_MISSING"
      : route?.routeStatus === "ready"
        ? null
        : "BLOCKED_AI_FINANCE_APPROVAL_ROUTE_MISSING";

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
      rationaleKinds: params.draft.rationaleItems.map((item) => item.kind),
      evidenceRefCount: evidenceRefs.length,
      paymentRequested: false,
      financePostingRequested: false,
      invoiceMutationRequested: false,
    },
    evidenceRefs,
    approvalRequired: true,
    executeOnlyAfterApprovedStatus: true,
    directExecuteAllowed: false,
    redactedPayloadOnly: true,
    paymentExecutionAllowed: false,
    financePostingAllowed: false,
    ledgerBypassAllowed: false,
    paymentCreated: false,
    postingCreated: false,
    invoiceMutated: false,
    providerCalled: false,
    dbWrites: 0,
    finalExecution: 0,
    mutationCount: 0,
  };
}
