import type { EstimateDraftRevision } from "../estimateDraftRevisionContract";
import { safeJsonParseValue } from "../../format";

export type AiEstimateApprovedHistoryRecord = {
  id: string;
  userId: string;
  revisionId: string;
  approvedAt: string;
  revision: EstimateDraftRevision;
};

export type AiEstimateHistoryStore = {
  approve(record: AiEstimateApprovedHistoryRecord): void;
  listApproved(userId: string, options?: { cursorApprovedAt?: string | null; limit?: number }): {
    records: AiEstimateApprovedHistoryRecord[];
    totalApprovedCount: number;
    nextCursorApprovedAt: string | null;
  };
  compact(): void;
};

function clone<T>(value: T): T {
  return safeJsonParseValue<T>(JSON.stringify(value), value);
}

export function createInMemoryAiEstimateHistoryStore(): AiEstimateHistoryStore {
  const records = new Map<string, AiEstimateApprovedHistoryRecord>();
  return {
    approve(record) {
      records.set(record.id, clone(record));
    },
    listApproved(userId, options = {}) {
      const pageSize = Math.max(1, Math.min(options.limit ?? 20, 100));
      const all = [...records.values()]
        .filter((record) => record.userId === userId)
        .sort((a, b) => b.approvedAt.localeCompare(a.approvedAt));
      const afterCursor = options.cursorApprovedAt
        ? all.filter((record) => record.approvedAt < String(options.cursorApprovedAt))
        : all;
      const page = afterCursor.slice(0, pageSize);
      return {
        records: clone(page),
        totalApprovedCount: all.length,
        nextCursorApprovedAt: afterCursor.length > pageSize ? page.at(-1)?.approvedAt ?? null : null,
      };
    },
    compact() {
      for (const [id, record] of records) {
        if (!record.revisionId || record.revision.revisionId !== record.revisionId) records.delete(id);
      }
    },
  };
}
