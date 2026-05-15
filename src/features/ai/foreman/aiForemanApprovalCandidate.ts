import { routeAiApprovalRequiredAction } from "../approvalRouter/aiApprovalActionRouter";
import type { AiApprovalActionRouteEntry } from "../approvalRouter/aiApprovalActionRouterTypes";
import type { AiFieldWorkAuthContext } from "../field/aiFieldWorkCopilotTypes";
import type {
  AiFieldCloseoutDraftEngineResult,
} from "./aiFieldCloseoutDraftEngine";
import type {
  AiForemanCloseoutScreenId,
  AiForemanEvidenceResolverResult,
} from "./aiForemanEvidenceResolver";
import type {
  AiForemanMissingEvidenceChecklist,
} from "./aiForemanMissingEvidenceChecklist";

export type AiForemanApprovalCandidateStatus = "ready" | "blocked";

export type AiForemanApprovalCandidateBlocker =
  | "BLOCKED_AI_FOREMAN_EVIDENCE_ROUTE_MISSING"
  | "BLOCKED_AI_FOREMAN_RUNTIME_TARGETABILITY";

export type AiForemanApprovalCandidate = {
  status: AiForemanApprovalCandidateStatus;
  blocker: AiForemanApprovalCandidateBlocker | null;
  screenId: AiForemanCloseoutScreenId;
  actionId: string;
  route: AiApprovalActionRouteEntry | null;
  approvalSummary: string;
  redactedPayload: {
    screenId: AiForemanCloseoutScreenId;
    draftKinds: readonly string[];
    evidenceRefCount: number;
    missingRequiredEvidenceCount: number;
    finalSubmitRequested: false;
    signingRequested: false;
    subcontractMutationRequested: false;
  };
  evidenceRefs: readonly string[];
  approvalRequired: true;
  executeOnlyAfterApprovedStatus: true;
  directExecuteAllowed: false;
  redactedPayloadOnly: true;
  finalSubmitAllowed: false;
  signingAllowed: false;
  directSubcontractMutationAllowed: false;
  reportPublished: false;
  actSigned: false;
  messageSent: false;
  subcontractMutated: false;
  providerCalled: false;
  dbWrites: 0;
  finalExecution: 0;
  mutationCount: 0;
};

export const AI_FOREMAN_APPROVAL_CANDIDATE_CONTRACT = Object.freeze({
  contractId: "ai_foreman_approval_candidate_v1",
  approvalRequired: true,
  executeOnlyAfterApprovedStatus: true,
  directExecuteAllowed: false,
  redactedPayloadOnly: true,
  finalSubmitAllowed: false,
  signingAllowed: false,
  directSubcontractMutationAllowed: false,
  reportPublished: false,
  actSigned: false,
  messageSent: false,
  subcontractMutated: false,
  providerCalled: false,
  dbWrites: 0,
  finalExecution: 0,
  mutationCount: 0,
} as const);

const FOREMAN_SCREEN_APPROVAL_ACTION_IDS: Readonly<Record<AiForemanCloseoutScreenId, string>> = Object.freeze({
  "foreman.main": "foreman.main.approval",
  "foreman.ai.quick_modal": "foreman.ai.quick_modal.approval",
  "foreman.subcontract": "foreman.subcontract.approval",
});

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function evidenceIds(result: AiForemanEvidenceResolverResult): string[] {
  return result.evidenceRefs.map((ref) => `${ref.type}:${ref.ref}`);
}

function summary(params: {
  evidence: AiForemanEvidenceResolverResult;
  draft: AiFieldCloseoutDraftEngineResult;
  checklist: AiForemanMissingEvidenceChecklist;
}): string {
  return `Submit ${params.evidence.screenId} closeout review with ${params.draft.draftItems.length} draft item(s) and ${params.checklist.evidenceRefCount} evidence ref(s) for approval.`;
}

export function buildAiForemanApprovalCandidate(params: {
  auth: AiFieldWorkAuthContext | null;
  evidence: AiForemanEvidenceResolverResult;
  checklist: AiForemanMissingEvidenceChecklist;
  draft: AiFieldCloseoutDraftEngineResult;
}): AiForemanApprovalCandidate {
  const actionId = FOREMAN_SCREEN_APPROVAL_ACTION_IDS[params.evidence.screenId];
  const route = params.auth
    ? routeAiApprovalRequiredAction({
        screenId: params.evidence.screenId,
        actionId,
        role: params.auth.role,
      })
    : null;
  const evidenceRefs = unique([
    ...evidenceIds(params.evidence),
    ...params.draft.draftItems.flatMap((item) => item.evidenceRefs),
  ]);
  const blocker: AiForemanApprovalCandidateBlocker | null =
    evidenceRefs.length === 0 || params.checklist.status !== "complete" || params.draft.status !== "drafted"
      ? "BLOCKED_AI_FOREMAN_EVIDENCE_ROUTE_MISSING"
      : route?.routeStatus === "ready"
        ? null
        : "BLOCKED_AI_FOREMAN_RUNTIME_TARGETABILITY";

  return {
    status: blocker ? "blocked" : "ready",
    blocker,
    screenId: params.evidence.screenId,
    actionId,
    route,
    approvalSummary: summary(params),
    redactedPayload: {
      screenId: params.evidence.screenId,
      draftKinds: params.draft.draftItems.map((item) => item.kind),
      evidenceRefCount: evidenceRefs.length,
      missingRequiredEvidenceCount: params.checklist.requiredMissingKinds.length,
      finalSubmitRequested: false,
      signingRequested: false,
      subcontractMutationRequested: false,
    },
    evidenceRefs,
    approvalRequired: true,
    executeOnlyAfterApprovedStatus: true,
    directExecuteAllowed: false,
    redactedPayloadOnly: true,
    finalSubmitAllowed: false,
    signingAllowed: false,
    directSubcontractMutationAllowed: false,
    reportPublished: false,
    actSigned: false,
    messageSent: false,
    subcontractMutated: false,
    providerCalled: false,
    dbWrites: 0,
    finalExecution: 0,
    mutationCount: 0,
  };
}
