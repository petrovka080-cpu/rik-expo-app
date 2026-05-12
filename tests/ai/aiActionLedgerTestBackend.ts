import type {
  AiActionLedgerPersistentBackend,
} from "../../src/features/ai/actionLedger/aiActionLedgerRepository";
import type {
  AiActionLedgerAuditEvent,
  AiActionLedgerRecord,
  AiActionStatus,
} from "../../src/features/ai/actionLedger/aiActionLedgerTypes";

export function createContractTestActionLedgerBackend(): {
  backend: AiActionLedgerPersistentBackend;
  records: Map<string, AiActionLedgerRecord>;
  auditEvents: AiActionLedgerAuditEvent[];
} {
  const records = new Map<string, AiActionLedgerRecord>();
  const auditEvents: AiActionLedgerAuditEvent[] = [];

  const backend: AiActionLedgerPersistentBackend = {
    mounted: true,
    async listByOrganization(organizationIdHash, page) {
      const offset = page.cursor && /^\d+$/.test(page.cursor) ? Number(page.cursor) : 0;
      const limit = Math.max(1, Math.min(20, Math.trunc(page.limit)));
      const scoped = [...records.values()]
        .filter((record) => record.organizationIdHash === organizationIdHash)
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
      const pageRecords = scoped.slice(offset, offset + limit);
      const nextCursor = offset + limit < scoped.length ? String(offset + limit) : null;
      return { records: pageRecords, nextCursor };
    },
    async findByIdempotencyKey(organizationIdHash, idempotencyKey) {
      return (
        [...records.values()].find(
          (record) =>
            record.organizationIdHash === organizationIdHash &&
            record.idempotencyKey === idempotencyKey,
        ) ?? null
      );
    },
    async findByActionId(actionId) {
      return records.get(actionId) ?? null;
    },
    async insertPending(record, auditEvent) {
      records.set(record.actionId, record);
      auditEvents.push(auditEvent);
      return record;
    },
    async updateStatus(actionId, status: AiActionStatus, patch, auditEvent) {
      const current = records.get(actionId);
      if (!current) throw new Error(`missing action ${actionId}`);
      const updated: AiActionLedgerRecord = {
        ...current,
        ...patch,
        status,
      };
      records.set(actionId, updated);
      auditEvents.push(auditEvent);
      return updated;
    },
  };

  return { backend, records, auditEvents };
}
