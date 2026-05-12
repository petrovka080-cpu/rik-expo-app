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
