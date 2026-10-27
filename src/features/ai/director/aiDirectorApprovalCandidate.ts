import { routeAiApprovalRequiredAction } from "../approvalRouter/aiApprovalActionRouter";
import type { AiApprovalActionRouteEntry } from "../approvalRouter/aiApprovalActionRouterTypes";
import type { AiUserRole } from "../policy/aiRolePolicy";
import type {
  AiDirectorCrossDomainEvidenceResult,
  AiDirectorExecutiveDomain,
  AiDirectorExecutiveScreenId,
} from "./aiDirectorCrossDomainEvidence";
import type { AiDirectorDomainRiskPriorityScore } from "./aiDirectorRiskPriorityScoring";

export type AiDirectorApprovalCandidateStatus = "ready" | "blocked";

export type AiDirectorApprovalCandidateBlocker =
  | "BLOCKED_AI_DIRECTOR_EVIDENCE_ROUTE_MISSING"
  | "BLOCKED_AI_DIRECTOR_APPROVAL_ROUTE_MISSING";

export type AiDirectorApprovalCandidate = {
  status: AiDirectorApprovalCandidateStatus;
  blocker: AiDirectorApprovalCandidateBlocker | null;
  domain: AiDirectorExecutiveDomain;
  screenId: AiDirectorExecutiveScreenId;
  actionId: string;
  route: AiApprovalActionRouteEntry | null;
  approvalSummary: string;
  redactedPayload: {
    domain: AiDirectorExecutiveDomain;
    riskLevel: AiDirectorDomainRiskPriorityScore["riskLevel"];
    priorityScore: number;
    evidenceRefCount: number;
    procurementMutationRequested: false;
    warehouseMutationRequested: false;
    financeMutationRequested: false;
    foremanFinalSubmitRequested: false;
    directExecuteRequested: false;
  };
  evidenceRefs: readonly string[];
  approvalRequired: true;
  executeOnlyAfterApprovedStatus: true;
  directExecuteAllowed: false;
  redactedPayloadOnly: true;
  procurementMutationAllowed: false;
  warehouseMutationAllowed: false;
  financeMutationAllowed: false;
  fieldFinalSubmitAllowed: false;
  ledgerBypassAllowed: false;
  providerCalled: false;
  dbWrites: 0;
  finalExecution: 0;
  mutationCount: 0;
};

export const AI_DIRECTOR_APPROVAL_CANDIDATE_CONTRACT = Object.freeze({
  contractId: "ai_director_approval_candidate_v1",
  approvalRequired: true,
  executeOnlyAfterApprovedStatus: true,
  directExecuteAllowed: false,
  redactedPayloadOnly: true,
  procurementMutationAllowed: false,
  warehouseMutationAllowed: false,
  financeMutationAllowed: false,
  fieldFinalSubmitAllowed: false,
  ledgerBypassAllowed: false,
  providerCalled: false,
  dbWrites: 0,
  finalExecution: 0,
  mutationCount: 0,
} as const);

const DIRECTOR_APPROVAL_ROUTE_BY_DOMAIN: Readonly<
  Record<AiDirectorExecutiveDomain, { screenId: AiDirectorExecutiveScreenId; actionId: string }>
> = Object.freeze({
  procurement: {
    screenId: "ai.command_center",
    actionId: "ai.command_center.approval",
  },
  warehouse: {
    screenId: "ai.command_center",
    actionId: "ai.command_center.approval",
  },
  finance: {
    screenId: "director.finance",
    actionId: "director.finance.approval",
  },
  foreman: {
    screenId: "director.reports",
    actionId: "director.reports.approval",
  },
});

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function approvalSummary(params: {
  score: AiDirectorDomainRiskPriorityScore;
  routeScreenId: AiDirectorExecutiveScreenId;
}): string {
  return `Submit ${params.score.domain} executive next-action package through ${params.routeScreenId} with ${params.score.riskLevel} risk and ${params.score.evidenceRefs.length} evidence ref(s).`;
}

export function buildAiDirectorApprovalCandidate(params: {
  auth: { userId: string; role: AiUserRole } | null;
  evidence: AiDirectorCrossDomainEvidenceResult;
  score: AiDirectorDomainRiskPriorityScore;
}): AiDirectorApprovalCandidate {
  const routeTarget = DIRECTOR_APPROVAL_ROUTE_BY_DOMAIN[params.score.domain];
  const route = params.auth
    ? routeAiApprovalRequiredAction({
        screenId: routeTarget.screenId,
        actionId: routeTarget.actionId,
        role: params.auth.role,
      })
    : null;
  const evidenceRefs = unique([
    ...params.score.evidenceRefs,
    ...params.evidence.evidenceRefs.map((ref) => `${ref.type}:${ref.ref}`),
  ]);
  const blocker: AiDirectorApprovalCandidateBlocker | null =
    evidenceRefs.length === 0 || !params.evidence.evidenceBacked || !params.score.evidenceBacked
      ? "BLOCKED_AI_DIRECTOR_EVIDENCE_ROUTE_MISSING"
      : route?.routeStatus === "ready"
        ? null
        : "BLOCKED_AI_DIRECTOR_APPROVAL_ROUTE_MISSING";

  return {
    status: blocker ? "blocked" : "ready",
    blocker,
    domain: params.score.domain,
    screenId: routeTarget.screenId,
    actionId: routeTarget.actionId,
    route,
    approvalSummary: approvalSummary({ score: params.score, routeScreenId: routeTarget.screenId }),
    redactedPayload: {
      domain: params.score.domain,
      riskLevel: params.score.riskLevel,
      priorityScore: params.score.priorityScore,
      evidenceRefCount: evidenceRefs.length,
      procurementMutationRequested: false,
      warehouseMutationRequested: false,
      financeMutationRequested: false,
      foremanFinalSubmitRequested: false,
      directExecuteRequested: false,
    },
    evidenceRefs,
    approvalRequired: true,
    executeOnlyAfterApprovedStatus: true,
    directExecuteAllowed: false,
    redactedPayloadOnly: true,
    procurementMutationAllowed: false,
    warehouseMutationAllowed: false,
    financeMutationAllowed: false,
    fieldFinalSubmitAllowed: false,
    ledgerBypassAllowed: false,
    providerCalled: false,
    dbWrites: 0,
    finalExecution: 0,
    mutationCount: 0,
  };
}
