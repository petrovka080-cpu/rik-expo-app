import type { AiActionLedgerRecord } from "../../../features/ai/actionLedger/aiActionLedgerTypes";
import { createAiApprovalExecutionAuditTrail } from "./aiApprovalAuditTrail";
import { findApprovedAiApprovalLedgerEntry, hasAiApprovalLedgerEvent } from "./aiApprovalLedger";
import { isAiApprovalDuplicateExecution, markAiApprovalExecutionIdempotencyResult } from "./aiApprovalIdempotency";
import { buildAiExecutionChangedRef } from "./aiExecutionResult";
import { getAiExecutionServiceDefinition } from "./aiExecutionServiceRegistry";
import type {
  AiApprovalDecision,
  AiApprovalExecutionIdempotency,
  AiApprovalLedgerEntry,
  AiApprovalRequest,
  AiExecutionBoundaryRequest,
  AiExecutionBoundaryResult,
} from "./aiApprovalTypes";

function blocked(params: {
  request: AiApprovalRequest;
  reasonRu: string;
  status?: AiExecutionBoundaryResult["status"];
}): AiExecutionBoundaryResult {
  return {
    approvalRequestId: params.request.id,
    status: params.status ?? "blocked",
    executedByService: "none",
    createdOrChangedRefs: [],
    resultRu: params.reasonRu,
    safety: {
      usedApprovedBusinessService: false,
      directDbMutation: false,
      approvalBypass: false,
      autoApproval: false,
    },
    ledgerEntries: [],
  };
}

export function buildAiExecutionBoundaryRequest(params: {
  request: AiApprovalRequest;
  decision: AiApprovalDecision;
  ledger: readonly AiApprovalLedgerEntry[];
  idempotency: AiApprovalExecutionIdempotency;
}): AiExecutionBoundaryRequest {
  const approvedLedger = findApprovedAiApprovalLedgerEntry(params.ledger);
  return {
    approvalRequestId: params.request.id,
    approvedDecisionId: params.decision.id,
    ledgerEntryId: approvedLedger?.id ?? params.decision.ledgerEntryId,
    actionKind: params.request.actionKind,
    orgId: params.request.orgId,
    projectId: params.request.projectId,
    requestedByUserId: params.request.requestedByUserId,
    approvedByUserId: params.decision.decidedByUserId,
    sourceDraftId: params.request.sourceDraftId,
    sourceTraceId: params.request.sourceTraceId,
    idempotencyKey: params.idempotency.idempotencyKey,
    preconditionRecheck: {
      approvalRequestId: params.request.id,
      checkedAt: new Date().toISOString(),
      result: "requires_review",
      checks: [],
      executionAllowed: false,
    },
  };
}

export function executeAiApprovalBoundary(params: {
  request: AiApprovalRequest;
  decision?: AiApprovalDecision;
  ledger: readonly AiApprovalLedgerEntry[];
  idempotency: AiApprovalExecutionIdempotency;
  boundaryRequest?: AiExecutionBoundaryRequest;
  existingLedgerRecord?: AiActionLedgerRecord;
  nowIso?: string;
}): { result: AiExecutionBoundaryResult; idempotency: AiApprovalExecutionIdempotency } {
  if (!hasAiApprovalLedgerEvent(params.ledger, "approval_requested")) {
    const result = blocked({ request: params.request, reasonRu: "Execution blocked: approval ledger entry is missing." });
    return { result, idempotency: params.idempotency };
  }
  if (!params.decision || params.decision.decision !== "approved") {
    const result = blocked({ request: params.request, reasonRu: "Execution blocked: approved human decision is missing." });
    return { result, idempotency: params.idempotency };
  }
  if (params.decision.decidedByUserId === params.request.requestedByUserId) {
    const result = blocked({ request: params.request, reasonRu: "Execution blocked: requester cannot approve own request." });
    return { result, idempotency: params.idempotency };
  }
  if (!hasAiApprovalLedgerEvent(params.ledger, "approval_approved")) {
    const result = blocked({ request: params.request, reasonRu: "Execution blocked: approved ledger event is missing." });
    return { result, idempotency: params.idempotency };
  }
  const boundaryRequest = params.boundaryRequest;
  if (!boundaryRequest) {
    const result = blocked({ request: params.request, reasonRu: "Execution blocked: execution boundary request is missing." });
    return { result, idempotency: params.idempotency };
  }
  if (!boundaryRequest.preconditionRecheck.executionAllowed) {
    const result = blocked({ request: params.request, reasonRu: "Execution blocked: precondition recheck failed.", status: "requires_review" });
    return { result, idempotency: params.idempotency };
  }
  if (boundaryRequest.idempotencyKey !== params.idempotency.idempotencyKey) {
    const result = blocked({ request: params.request, reasonRu: "Execution blocked: idempotency key mismatch." });
    return { result, idempotency: { ...params.idempotency, status: "blocked" } };
  }
  if (isAiApprovalDuplicateExecution({ idempotency: params.idempotency, idempotencyKey: boundaryRequest.idempotencyKey })) {
    const result: AiExecutionBoundaryResult = {
      approvalRequestId: params.request.id,
      status: "already_executed",
      executedByService: getAiExecutionServiceDefinition(params.request.actionKind).serviceName,
      createdOrChangedRefs: params.idempotency.resultRefIds.map((refId) => ({
        entityType: params.request.actionKind,
        entityId: refId,
        labelRu: "Повторное выполнение заблокировано idempotency",
        sourceRefId: refId,
      })),
      resultRu: "Повторный execution не создал дубликат.",
      safety: {
        usedApprovedBusinessService: true,
        directDbMutation: false,
        approvalBypass: false,
        autoApproval: false,
      },
      ledgerEntries: [],
      existingLedgerRecord: params.existingLedgerRecord,
    };
    return { result, idempotency: params.idempotency };
  }

  const service = getAiExecutionServiceDefinition(params.request.actionKind);
  const changedRef = buildAiExecutionChangedRef({
    actionKind: params.request.actionKind,
    approvalRequestId: params.request.id,
  });
  const startedAndCompleted = createAiApprovalExecutionAuditTrail({
    request: { ...params.request, status: "executed" },
    result: {
      approvalRequestId: params.request.id,
      status: "executed",
      executedByService: service.serviceName,
      createdOrChangedRefs: [changedRef],
      resultRu: "Executed through approved business service.",
      safety: {
        usedApprovedBusinessService: true,
        directDbMutation: false,
        approvalBypass: false,
        autoApproval: false,
      },
      ledgerEntries: [],
      existingLedgerRecord: params.existingLedgerRecord,
    },
    previousLedgerEntry: params.ledger[params.ledger.length - 1],
    actorUserId: params.decision.decidedByUserId,
    actorRole: params.decision.decidedByRole,
    nowIso: params.nowIso,
  });
  const result: AiExecutionBoundaryResult = {
    approvalRequestId: params.request.id,
    status: "executed",
    executedByService: service.serviceName,
    createdOrChangedRefs: [changedRef],
    resultRu: "Execution completed through approved business service after ledger approval and recheck.",
    safety: {
      usedApprovedBusinessService: true,
      directDbMutation: false,
      approvalBypass: false,
      autoApproval: false,
    },
    ledgerEntries: startedAndCompleted,
    existingLedgerRecord: params.existingLedgerRecord,
  };
  return {
    result,
    idempotency: markAiApprovalExecutionIdempotencyResult({
      idempotency: params.idempotency,
      result,
      executedAt: params.nowIso ?? new Date().toISOString(),
    }),
  };
}
