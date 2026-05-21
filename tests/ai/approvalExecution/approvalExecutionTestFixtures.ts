import {
  buildAiApprovalRequestFromDraft,
  buildAiExecutionBoundaryRequest,
  createAiApprovalAuditTrailForRequest,
  createAiApprovalDecision,
  createAiApprovalExecutionIdempotency,
  executeAiApprovalBoundary,
  recheckAiApprovalPreconditions,
  runGoldenBlockedPaymentApprovalScenario,
  runGoldenPurchaseApprovalExecutionScenario,
} from "../../../src/lib/ai/approvalExecutionBoundary";
import { buildAiSafeActionDraft } from "../../../src/lib/ai/safeActions";

export function createPurchaseApprovalScenario() {
  return runGoldenPurchaseApprovalExecutionScenario({ nowIso: "2026-05-21T12:00:00.000Z" });
}

export function createPaymentApprovalScenario() {
  return runGoldenBlockedPaymentApprovalScenario({ nowIso: "2026-05-21T12:05:00.000Z" });
}

export function createSelfApprovalAttempt() {
  const draft = buildAiSafeActionDraft({
    actionKind: "procurement_purchase_draft",
    userId: "buyer_user_1",
    nowIso: "2026-05-21T12:10:00.000Z",
  });
  const request = buildAiApprovalRequestFromDraft({ draft, nowIso: "2026-05-21T12:10:00.000Z" });
  const ledger = createAiApprovalAuditTrailForRequest({ request, nowIso: "2026-05-21T12:10:00.000Z" });
  return createAiApprovalDecision({
    request,
    decidedByUserId: request.requestedByUserId,
    decidedByRole: "director",
    decision: "approved",
    previousLedgerEntry: ledger[0],
    nowIso: "2026-05-21T12:11:00.000Z",
  });
}

export function executePurchaseWithResolvedPreconditions() {
  const draft = buildAiSafeActionDraft({
    actionKind: "procurement_purchase_draft",
    nowIso: "2026-05-21T12:15:00.000Z",
  });
  const request = buildAiApprovalRequestFromDraft({ draft, nowIso: "2026-05-21T12:15:00.000Z" });
  const ledger = createAiApprovalAuditTrailForRequest({ request, nowIso: "2026-05-21T12:15:00.000Z" });
  const idempotency = createAiApprovalExecutionIdempotency({ request });
  const decisionBundle = createAiApprovalDecision({
    request,
    decidedByUserId: "director_user_2",
    decidedByRole: "director",
    decision: "approved",
    previousLedgerEntry: ledger[0],
    nowIso: "2026-05-21T12:16:00.000Z",
  });
  const approvedLedger = [...ledger, decisionBundle.ledgerEntry];
  const recheck = recheckAiApprovalPreconditions({
    request: decisionBundle.request,
    resolvedHumanFields: ["supplier", "price"],
    nowIso: "2026-05-21T12:17:00.000Z",
  });
  const boundaryRequest = {
    ...buildAiExecutionBoundaryRequest({
      request: decisionBundle.request,
      decision: decisionBundle.decision,
      ledger: approvedLedger,
      idempotency,
    }),
    preconditionRecheck: recheck,
  };
  return executeAiApprovalBoundary({
    request: decisionBundle.request,
    decision: decisionBundle.decision,
    ledger: approvedLedger,
    idempotency,
    boundaryRequest,
    nowIso: "2026-05-21T12:18:00.000Z",
  });
}
