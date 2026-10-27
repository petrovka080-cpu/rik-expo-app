import { buildAiSafeActionDraft } from "../safeActions";
import { createAiApprovalAuditTrailForRequest } from "./aiApprovalAuditTrail";
import { createAiApprovalDecision } from "./aiApprovalDecision";
import { buildAiExecutionBoundaryRequest, executeAiApprovalBoundary } from "./aiExecutionBoundary";
import { createAiApprovalExecutionIdempotency } from "./aiApprovalIdempotency";
import { buildAiApprovalRequestFromDraft } from "./aiApprovalRequest";
import { recheckAiApprovalPreconditions } from "./aiApprovalPreconditionRecheck";
import { guardAiApprovalExecutionRuntime } from "./aiApprovalRuntimeGuard";
import type {
  AiApprovalDecision,
  AiApprovalExecutionIdempotency,
  AiApprovalLedgerEntry,
  AiApprovalRequest,
  AiApprovalRuntimeGuardResult,
  AiExecutionBoundaryResult,
} from "./aiApprovalTypes";

export type AiApprovalExecutionScenario = {
  request: AiApprovalRequest;
  ledger: AiApprovalLedgerEntry[];
  decision?: AiApprovalDecision;
  idempotency: AiApprovalExecutionIdempotency;
  blockedWithoutApproval: AiExecutionBoundaryResult;
  executionResult?: AiExecutionBoundaryResult;
  repeatedExecutionResult?: AiExecutionBoundaryResult;
  guard?: AiApprovalRuntimeGuardResult;
};

export function runGoldenPurchaseApprovalExecutionScenario(params: {
  nowIso?: string;
} = {}): AiApprovalExecutionScenario {
  const draft = buildAiSafeActionDraft({
    actionKind: "procurement_purchase_draft",
    sourceTraceId: "trace:gkl_purchase_60",
    nowIso: params.nowIso,
  });
  const request = buildAiApprovalRequestFromDraft({ draft, nowIso: params.nowIso });
  const ledger = createAiApprovalAuditTrailForRequest({ request, nowIso: params.nowIso });
  const idempotency = createAiApprovalExecutionIdempotency({ request });
  const blockedWithoutApproval = executeAiApprovalBoundary({
    request,
    ledger,
    idempotency,
  }).result;
  const decisionBundle = createAiApprovalDecision({
    request,
    decidedByUserId: "director_user_1",
    decidedByRole: "director",
    decision: "approved",
    previousLedgerEntry: ledger[ledger.length - 1],
    nowIso: params.nowIso,
  });
  const approvedLedger = [...ledger, decisionBundle.ledgerEntry];
  const recheck = recheckAiApprovalPreconditions({
    request: decisionBundle.request,
    resolvedHumanFields: ["supplier", "price"],
    nowIso: params.nowIso,
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
  const execution = executeAiApprovalBoundary({
    request: decisionBundle.request,
    decision: decisionBundle.decision,
    ledger: approvedLedger,
    idempotency,
    boundaryRequest,
    nowIso: params.nowIso,
  });
  const finalLedger = [...approvedLedger, ...execution.result.ledgerEntries];
  const repeated = executeAiApprovalBoundary({
    request: decisionBundle.request,
    decision: decisionBundle.decision,
    ledger: finalLedger,
    idempotency: execution.idempotency,
    boundaryRequest,
    nowIso: params.nowIso,
  });
  const guard = guardAiApprovalExecutionRuntime({
    request: decisionBundle.request,
    decision: decisionBundle.decision,
    ledger: finalLedger,
    preconditionRecheck: recheck,
    result: execution.result,
    idempotencyPassed: repeated.result.status === "already_executed",
  });
  return {
    request: decisionBundle.request,
    ledger: finalLedger,
    decision: decisionBundle.decision,
    idempotency: execution.idempotency,
    blockedWithoutApproval,
    executionResult: execution.result,
    repeatedExecutionResult: repeated.result,
    guard,
  };
}

export function runGoldenBlockedPaymentApprovalScenario(params: {
  nowIso?: string;
} = {}): AiApprovalExecutionScenario {
  const draft = buildAiSafeActionDraft({
    actionKind: "accountant_payment_checklist_draft",
    sourceTraceId: "trace:payment_77_docs",
    nowIso: params.nowIso,
  });
  const request = buildAiApprovalRequestFromDraft({ draft, nowIso: params.nowIso });
  const ledger = createAiApprovalAuditTrailForRequest({ request, nowIso: params.nowIso });
  const idempotency = createAiApprovalExecutionIdempotency({ request });
  const decisionBundle = createAiApprovalDecision({
    request,
    decidedByUserId: "accountant_reviewer_1",
    decidedByRole: "accountant",
    decision: "approved",
    previousLedgerEntry: ledger[0],
    nowIso: params.nowIso,
  });
  const approvedLedger = [...ledger, decisionBundle.ledgerEntry];
  const recheck = recheckAiApprovalPreconditions({
    request: decisionBundle.request,
    resolvedHumanFields: [],
    nowIso: params.nowIso,
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
  const execution = executeAiApprovalBoundary({
    request: decisionBundle.request,
    decision: decisionBundle.decision,
    ledger: approvedLedger,
    idempotency,
    boundaryRequest,
    nowIso: params.nowIso,
  });
  return {
    request: decisionBundle.request,
    ledger: approvedLedger,
    decision: decisionBundle.decision,
    idempotency,
    blockedWithoutApproval: execution.result,
    executionResult: execution.result,
  };
}
