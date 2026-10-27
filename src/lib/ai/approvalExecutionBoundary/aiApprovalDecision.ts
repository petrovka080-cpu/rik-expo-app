import { assertAiApprovalImpactDiffReviewed } from "./aiApprovalImpactDiff";
import { createAiApprovalLedgerEntry } from "./aiApprovalLedger";
import { stableAiApprovalHash } from "./aiApprovalIdempotency";
import type { AiApprovalDecision, AiApprovalLedgerEntry, AiApprovalRequest } from "./aiApprovalTypes";

export function canAiUserApproveRequest(params: {
  request: AiApprovalRequest;
  decidedByUserId: string;
  decidedByRole: string;
}): boolean {
  return (
    params.decidedByUserId !== params.request.requestedByUserId &&
    params.request.approvalPolicy.requiredApproverRoles.includes(params.decidedByRole)
  );
}

export function createAiApprovalDecision(params: {
  request: AiApprovalRequest;
  decidedByUserId: string;
  decidedByRole: string;
  decision: AiApprovalDecision["decision"];
  commentRu?: string;
  sourceRefIdsReviewed?: string[];
  impactDiffReviewed?: boolean;
  preconditionsReviewed?: boolean;
  previousLedgerEntry?: AiApprovalLedgerEntry;
  nowIso?: string;
}): { decision: AiApprovalDecision; ledgerEntry: AiApprovalLedgerEntry; request: AiApprovalRequest } {
  const impactDiffReviewed = params.impactDiffReviewed ?? true;
  const preconditionsReviewed = params.preconditionsReviewed ?? true;
  const reviewedRefs = params.sourceRefIdsReviewed ?? params.request.sourceRefIds;
  const allowed = canAiUserApproveRequest({
    request: params.request,
    decidedByUserId: params.decidedByUserId,
    decidedByRole: params.decidedByRole,
  });
  const decision = allowed ? params.decision : "needs_changes";
  const decisionId = `approval_decision:${params.request.id}:${stableAiApprovalHash([
    params.decidedByUserId,
    params.decidedByRole,
    decision,
  ])}`;
  const ledgerEntry = createAiApprovalLedgerEntry({
    request: params.request,
    event:
      decision === "approved"
        ? "approval_approved"
        : decision === "rejected"
          ? "approval_rejected"
          : "approval_needs_changes",
    actorUserId: params.decidedByUserId,
    actorRole: params.decidedByRole,
    decisionId,
    previousLedgerEntry: params.previousLedgerEntry,
    nowIso: params.nowIso,
  });
  const approvalDecision: AiApprovalDecision = {
    id: decisionId,
    approvalRequestId: params.request.id,
    decidedByUserId: params.decidedByUserId,
    decidedByRole: params.decidedByRole,
    decision,
    commentRu: allowed ? params.commentRu : "Requester cannot approve own request or role is not allowed.",
    decidedAt: params.nowIso ?? ledgerEntry.timestamp,
    sourceRefIdsReviewed: reviewedRefs,
    impactDiffReviewed: assertAiApprovalImpactDiffReviewed({
      impactDiff: params.request.impactDiff,
      reviewed: impactDiffReviewed,
    }),
    preconditionsReviewed,
    approvalPolicySnapshot: {
      requiredApproverRoles: [...params.request.approvalPolicy.requiredApproverRoles],
      requesterUserId: params.request.requestedByUserId,
      requesterCannotApproveOwnRequest: true,
      canBypass: false,
    },
    ledgerEntryId: ledgerEntry.id,
  };
  return {
    decision: approvalDecision,
    ledgerEntry,
    request: {
      ...params.request,
      status: decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "submitted_for_approval",
    },
  };
}
