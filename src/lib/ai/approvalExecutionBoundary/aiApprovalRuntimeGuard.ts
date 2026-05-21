import type {
  AiApprovalDecision,
  AiApprovalLedgerEntry,
  AiApprovalPreconditionRecheck,
  AiApprovalRequest,
  AiApprovalRuntimeGuardResult,
  AiExecutionBoundaryResult,
} from "./aiApprovalTypes";
import { hasAiApprovalLedgerEvent } from "./aiApprovalLedger";

export function guardAiApprovalExecutionRuntime(params: {
  request: AiApprovalRequest;
  decision?: AiApprovalDecision;
  ledger: readonly AiApprovalLedgerEntry[];
  preconditionRecheck?: AiApprovalPreconditionRecheck;
  result?: AiExecutionBoundaryResult;
  idempotencyPassed: boolean;
}): AiApprovalRuntimeGuardResult {
  const ledgerEntryFound = hasAiApprovalLedgerEvent(params.ledger, "approval_requested");
  const approvalDecisionFound = params.decision?.decision === "approved" && hasAiApprovalLedgerEvent(params.ledger, "approval_approved");
  const requesterDidNotApproveOwnRequest =
    !params.decision || params.decision.decidedByUserId !== params.request.requestedByUserId;
  const preconditionRecheckPassed = params.preconditionRecheck?.executionAllowed === true;
  const usedExecutionBoundary = Boolean(params.result);
  const usedApprovedBusinessService = params.result?.safety.usedApprovedBusinessService === true;
  const directDbMutationFound = Boolean(
    params.result && (params.result.safety as { directDbMutation: boolean }).directDbMutation,
  );
  const passed =
    ledgerEntryFound &&
    approvalDecisionFound &&
    requesterDidNotApproveOwnRequest &&
    preconditionRecheckPassed &&
    params.idempotencyPassed &&
    usedExecutionBoundary &&
    usedApprovedBusinessService &&
    !directDbMutationFound &&
    params.result?.safety.approvalBypass === false &&
    params.result?.safety.autoApproval === false;

  let failureReason: AiApprovalRuntimeGuardResult["failureReason"];
  if (!ledgerEntryFound) failureReason = "missing_ledger_entry";
  else if (!approvalDecisionFound) failureReason = "missing_approval_decision";
  else if (!requesterDidNotApproveOwnRequest) failureReason = "requester_approved_own_request";
  else if (!preconditionRecheckPassed) failureReason = "precondition_recheck_failed";
  else if (!params.idempotencyPassed) failureReason = "idempotency_failed";
  else if (!usedExecutionBoundary) failureReason = "execution_boundary_bypassed";
  else if (directDbMutationFound) failureReason = "direct_db_mutation";
  else if (!usedApprovedBusinessService) failureReason = "unapproved_service_call";
  else if (params.result?.safety.approvalBypass) failureReason = "approval_bypass";
  else if (params.result?.safety.autoApproval) failureReason = "auto_approval";

  return {
    approvalRequestId: params.request.id,
    passed,
    ledgerEntryRequired: true,
    ledgerEntryFound,
    approvalDecisionRequired: true,
    approvalDecisionFound,
    requesterDidNotApproveOwnRequest,
    preconditionRecheckPassed,
    idempotencyPassed: params.idempotencyPassed,
    usedExecutionBoundary,
    usedApprovedBusinessService,
    directDbMutationFound,
    failureReason,
  };
}
