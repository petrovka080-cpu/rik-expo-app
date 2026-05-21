import { createAiApprovalLedgerEntry } from "./aiApprovalLedger";
import type { AiApprovalLedgerEntry, AiApprovalRequest, AiExecutionBoundaryResult } from "./aiApprovalTypes";

export function createAiApprovalAuditTrailForRequest(params: {
  request: AiApprovalRequest;
  nowIso?: string;
}): AiApprovalLedgerEntry[] {
  return [
    createAiApprovalLedgerEntry({
      request: params.request,
      event: "approval_requested",
      actorUserId: params.request.requestedByUserId,
      actorRole: params.request.requestedByRole,
      nowIso: params.nowIso,
    }),
  ];
}

export function createAiApprovalExecutionAuditTrail(params: {
  request: AiApprovalRequest;
  result: AiExecutionBoundaryResult;
  previousLedgerEntry?: AiApprovalLedgerEntry;
  actorUserId: string;
  actorRole: string;
  nowIso?: string;
}): AiApprovalLedgerEntry[] {
  const started = createAiApprovalLedgerEntry({
    request: params.request,
    event: "execution_started",
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    previousLedgerEntry: params.previousLedgerEntry,
    nowIso: params.nowIso,
  });
  const completed = createAiApprovalLedgerEntry({
    request: params.request,
    event: params.result.status === "executed" || params.result.status === "already_executed" ? "execution_completed" : "execution_failed",
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    previousLedgerEntry: started,
    nowIso: params.nowIso,
  });
  return [started, completed];
}
