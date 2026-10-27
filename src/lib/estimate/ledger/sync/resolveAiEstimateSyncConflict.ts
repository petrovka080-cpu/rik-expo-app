import type { AiEstimateLedgerRecord } from "../AiEstimateLedgerTypes";

export type AiEstimateSyncConflictResolution =
  | { status: "no_conflict" }
  | {
    status: "conflict";
    reason: "base_revision_stale" | "record_missing";
    serverCurrentRevisionId: string | null;
  };

export function resolveAiEstimateSyncConflict(input: {
  serverRecord: AiEstimateLedgerRecord | null;
  baseRevisionId: string | null;
}): AiEstimateSyncConflictResolution {
  if (!input.serverRecord) {
    return { status: "conflict", reason: "record_missing", serverCurrentRevisionId: null };
  }
  if (input.baseRevisionId && input.serverRecord.currentRevisionId !== input.baseRevisionId) {
    return {
      status: "conflict",
      reason: "base_revision_stale",
      serverCurrentRevisionId: input.serverRecord.currentRevisionId,
    };
  }
  return { status: "no_conflict" };
}
