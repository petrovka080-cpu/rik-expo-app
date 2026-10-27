import type { AiApprovalLedgerEntry, AiApprovalRequest } from "./aiApprovalTypes";
import { stableAiApprovalHash } from "./aiApprovalIdempotency";

export function createAiApprovalLedgerEntry(params: {
  request: AiApprovalRequest;
  event: AiApprovalLedgerEntry["event"];
  actorUserId?: string;
  actorRole?: string;
  decisionId?: string;
  previousLedgerEntry?: AiApprovalLedgerEntry;
  nowIso?: string;
}): AiApprovalLedgerEntry {
  const timestamp = params.nowIso ?? new Date().toISOString();
  const snapshotHash = stableAiApprovalHash({
    requestId: params.request.id,
    actionKind: params.request.actionKind,
    status: params.request.status,
    sourceRefIds: params.request.sourceRefIds,
    impactDiff: params.request.impactDiff,
    decisionId: params.decisionId,
    previousLedgerEntryId: params.previousLedgerEntry?.id,
  });
  return Object.freeze({
    id: `approval_ledger:${params.request.id}:${params.event}:${snapshotHash}`,
    approvalRequestId: params.request.id,
    decisionId: params.decisionId,
    event: params.event,
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    orgId: params.request.orgId,
    projectId: params.request.projectId,
    timestamp,
    sourceTraceId: params.request.sourceTraceId,
    sourceDraftId: params.request.sourceDraftId,
    snapshotHash,
    previousLedgerEntryId: params.previousLedgerEntry?.id,
    safeToShowToUser: true,
    immutable: true,
  } satisfies AiApprovalLedgerEntry);
}

export function appendAiApprovalLedgerEntry(
  ledger: readonly AiApprovalLedgerEntry[],
  entry: AiApprovalLedgerEntry,
): AiApprovalLedgerEntry[] {
  return [...ledger, entry];
}

export function hasAiApprovalLedgerEvent(
  ledger: readonly AiApprovalLedgerEntry[],
  event: AiApprovalLedgerEntry["event"],
): boolean {
  return ledger.some((entry) => entry.event === event && entry.immutable === true);
}

export function findApprovedAiApprovalLedgerEntry(
  ledger: readonly AiApprovalLedgerEntry[],
): AiApprovalLedgerEntry | undefined {
  return ledger.find((entry) => entry.event === "approval_approved");
}
