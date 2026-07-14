import type {
  AiEstimateLedgerEvent,
  AiEstimateLedgerHistoryRecord,
  AiEstimateLedgerOperationResult,
  AiEstimateLedgerRecord,
  AiEstimateLedgerStatus,
} from "../AiEstimateLedgerTypes";
import {
  cloneAiEstimateLedgerValue,
  makeAiEstimateLedgerEventId,
  normalizeAiEstimateLedgerId,
  normalizeAiEstimateLedgerText,
  stableAiEstimateLedgerHash,
  type AiEstimateLedgerStore,
} from "../AiEstimateLedgerStore";

type IdempotencyEntry = {
  operationId: string;
  estimateId: string;
};

const APPROVED_HISTORY_STATUSES: AiEstimateLedgerStatus[] = ["approved", "sent_to_marketplace", "archived", "deleted"];

function defaultArtifacts(input?: Partial<AiEstimateLedgerRecord["artifacts"]>): AiEstimateLedgerRecord["artifacts"] {
  return {
    snapshotId: input?.snapshotId ?? null,
    pdfArtifactId: input?.pdfArtifactId ?? null,
    buyerHandoffId: input?.buyerHandoffId ?? null,
    artifactsValidForRevisionId: input?.artifactsValidForRevisionId ?? null,
  };
}

function createLedgerEvent(input: {
  estimateId: string;
  eventType: AiEstimateLedgerEvent["eventType"];
  idempotencyKey: string;
  actorUserId: string | null | undefined;
  sourceLayer: AiEstimateLedgerEvent["sourceLayer"];
  revisionId: string | null;
  createdAt: string;
}): AiEstimateLedgerEvent {
  return {
    eventId: makeAiEstimateLedgerEventId([
      input.estimateId,
      input.eventType,
      input.idempotencyKey,
      input.revisionId ?? "none",
      input.createdAt,
    ]),
    eventType: input.eventType,
    idempotencyKey: input.idempotencyKey,
    actorUserId: input.actorUserId ?? null,
    sourceLayer: input.sourceLayer,
    revisionId: input.revisionId,
    createdAt: input.createdAt,
    immutable: true,
  };
}

function toHistoryRecord(record: AiEstimateLedgerRecord): AiEstimateLedgerHistoryRecord {
  const status = record.status === "archived"
    ? "archived"
    : record.status === "deleted"
      ? "deleted"
      : "approved";
  return {
    approvedEstimateId: record.estimateId,
    sourceDraftId: record.sourceDraftId,
    sourceRevisionId: record.currentRevisionId,
    sourceSnapshotId: record.sourceSnapshotId,
    createdAt: record.approvedAt ?? record.createdAt,
    updatedAt: record.updatedAt,
    title: record.title,
    prompt: record.prompt,
    selectedTemplateId: record.selectedTemplateId,
    family: record.family,
    rowCount: record.rowCount,
    materialRowsCount: record.materialRowsCount,
    workRowsCount: record.workRowsCount,
    pdfArtifactId: record.artifacts.pdfArtifactId,
    buyerHandoffId: record.artifacts.buyerHandoffId,
    status,
  };
}

function operationId(kind: string, estimateId: string, idempotencyKey: string): string {
  return `ai_estimate_ledger_op:${kind}:${stableAiEstimateLedgerHash(`${estimateId}|${idempotencyKey}`)}`;
}

export function createInMemoryAiEstimateLedgerStore(): AiEstimateLedgerStore {
  const records = new Map<string, AiEstimateLedgerRecord>();
  const idempotency = new Map<string, IdempotencyEntry>();

  function idempotencyKey(input: { ownerUserId?: string; estimateId: string; idempotencyKey: string }): string {
    return [
      input.ownerUserId ?? records.get(input.estimateId)?.ownerUserId ?? "unknown_owner",
      input.estimateId,
      input.idempotencyKey.trim(),
    ].join("|");
  }

  function resultFromExisting<T extends AiEstimateLedgerRecord>(entry: IdempotencyEntry): AiEstimateLedgerOperationResult<T> | null {
    const record = records.get(entry.estimateId);
    if (!record) return null;
    return {
      record: cloneAiEstimateLedgerValue(record) as T,
      operationId: entry.operationId,
      idempotencyReused: true,
    };
  }

  function persist(
    record: AiEstimateLedgerRecord,
    key: string,
    opId: string,
  ): AiEstimateLedgerOperationResult<AiEstimateLedgerRecord> {
    records.set(record.estimateId, cloneAiEstimateLedgerValue(record));
    idempotency.set(key, { operationId: opId, estimateId: record.estimateId });
    return {
      record: cloneAiEstimateLedgerValue(record),
      operationId: opId,
      idempotencyReused: false,
    };
  }

  return {
    adapterKind: "in_memory",

    upsertDraft(input) {
      const estimateId = normalizeAiEstimateLedgerId(input.estimateId, "estimate_id");
      const ownerUserId = normalizeAiEstimateLedgerId(input.ownerUserId, "owner_user_id");
      const key = idempotencyKey({ ownerUserId, estimateId, idempotencyKey: input.idempotencyKey });
      const reused = idempotency.get(key);
      if (reused) {
        const existing = resultFromExisting(reused);
        if (existing) return existing;
      }

      const existing = records.get(estimateId);
      const currentRevisionId = normalizeAiEstimateLedgerText(
        input.currentRevisionId ?? existing?.currentRevisionId,
        `revision:${estimateId}:initial`,
      );
      const sourceSnapshotId = normalizeAiEstimateLedgerText(
        input.sourceSnapshotId ?? existing?.sourceSnapshotId,
        `snapshot:${estimateId}:editable`,
      );
      const artifacts = defaultArtifacts({
        ...existing?.artifacts,
        ...input.artifacts,
        snapshotId: input.artifacts?.snapshotId ?? existing?.artifacts.snapshotId ?? sourceSnapshotId,
        artifactsValidForRevisionId: input.artifacts?.artifactsValidForRevisionId
          ?? existing?.artifacts.artifactsValidForRevisionId
          ?? currentRevisionId,
      });
      const revision = existing?.revisions.find((candidate) => candidate.revisionId === currentRevisionId) ?? {
        revisionId: currentRevisionId,
        previousRevisionId: null,
        source: input.sourceLayer,
        createdAt: input.createdAt,
        params: {},
        rowCount: input.rowCount,
        materialRowsCount: input.materialRowsCount,
        workRowsCount: input.workRowsCount,
        snapshotId: artifacts.snapshotId,
        pdfArtifactId: artifacts.pdfArtifactId,
        buyerHandoffId: artifacts.buyerHandoffId,
        artifactsValidForRevisionId: artifacts.artifactsValidForRevisionId,
        immutable: true,
      };
      const event = createLedgerEvent({
        estimateId,
        eventType: "draft_upserted",
        idempotencyKey: input.idempotencyKey,
        actorUserId: input.actorUserId,
        sourceLayer: input.sourceLayer,
        revisionId: currentRevisionId,
        createdAt: input.updatedAt,
      });
      const record: AiEstimateLedgerRecord = {
        schemaVersion: "ai-estimate-ledger-record-v1",
        estimateId,
        ownerUserId,
        orgId: input.orgId ?? existing?.orgId ?? null,
        kind: input.kind,
        sourceRoute: normalizeAiEstimateLedgerText(input.sourceRoute, existing?.sourceRoute ?? "/request"),
        title: normalizeAiEstimateLedgerText(input.title, existing?.title ?? "Смета"),
        prompt: normalizeAiEstimateLedgerText(input.prompt, existing?.prompt ?? ""),
        selectedTemplateId: normalizeAiEstimateLedgerText(input.selectedTemplateId, existing?.selectedTemplateId ?? "unknown_template"),
        family: normalizeAiEstimateLedgerText(input.family, existing?.family ?? "unknown_family"),
        status: input.status ?? existing?.status ?? "draft",
        createdAt: existing?.createdAt ?? input.createdAt,
        updatedAt: input.updatedAt,
        approvedAt: existing?.approvedAt ?? null,
        deletedAt: input.status === "deleted" ? input.updatedAt : existing?.deletedAt ?? null,
        currentRevisionId,
        sourceDraftId: normalizeAiEstimateLedgerText(input.sourceDraftId ?? existing?.sourceDraftId, estimateId),
        sourceSnapshotId,
        rowCount: input.rowCount,
        materialRowsCount: input.materialRowsCount,
        workRowsCount: input.workRowsCount,
        artifacts,
        revisions: existing?.revisions.some((candidate) => candidate.revisionId === currentRevisionId)
          ? existing.revisions
          : [...(existing?.revisions ?? []), revision],
        eventLog: [...(existing?.eventLog ?? []), event],
        idempotencyKeys: Array.from(new Set([...(existing?.idempotencyKeys ?? []), input.idempotencyKey])),
        version: (existing?.version ?? 0) + 1,
      };
      return persist(record, key, operationId("draft_upserted", estimateId, input.idempotencyKey));
    },

    appendRevision(input) {
      const estimateId = normalizeAiEstimateLedgerId(input.estimateId, "estimate_id");
      const existing = records.get(estimateId);
      if (!existing) throw new Error("AI_ESTIMATE_LEDGER_RECORD_NOT_FOUND");
      const key = idempotencyKey({ estimateId, idempotencyKey: input.idempotencyKey });
      const reused = idempotency.get(key);
      if (reused) {
        const result = resultFromExisting(reused);
        if (result) return result;
      }
      const revisionId = normalizeAiEstimateLedgerId(input.revision.revisionId, "revision_id");
      const previousRevisionId = input.revision.previousRevisionId ?? existing.currentRevisionId;
      if (existing.revisions.some((revision) => revision.revisionId === revisionId)) {
        const opId = operationId("revision_appended_existing", estimateId, input.idempotencyKey);
        idempotency.set(key, { operationId: opId, estimateId });
        return { record: cloneAiEstimateLedgerValue(existing), operationId: opId, idempotencyReused: true };
      }
      const revision = {
        ...input.revision,
        revisionId,
        previousRevisionId,
        immutable: true as const,
      };
      const event = createLedgerEvent({
        estimateId,
        eventType: "revision_appended",
        idempotencyKey: input.idempotencyKey,
        actorUserId: input.actorUserId,
        sourceLayer: input.sourceLayer,
        revisionId,
        createdAt: revision.createdAt,
      });
      const record: AiEstimateLedgerRecord = {
        ...existing,
        updatedAt: revision.createdAt,
        currentRevisionId: revisionId,
        sourceSnapshotId: revision.snapshotId ?? existing.sourceSnapshotId,
        rowCount: revision.rowCount,
        materialRowsCount: revision.materialRowsCount,
        workRowsCount: revision.workRowsCount,
        artifacts: {
          snapshotId: revision.snapshotId,
          pdfArtifactId: null,
          buyerHandoffId: null,
          artifactsValidForRevisionId: null,
        },
        revisions: [...existing.revisions, revision],
        eventLog: [...existing.eventLog, event],
        idempotencyKeys: Array.from(new Set([...existing.idempotencyKeys, input.idempotencyKey])),
        version: existing.version + 1,
      };
      return persist(record, key, operationId("revision_appended", estimateId, input.idempotencyKey));
    },

    bindArtifacts(input) {
      const estimateId = normalizeAiEstimateLedgerId(input.estimateId, "estimate_id");
      const existing = records.get(estimateId);
      if (!existing) throw new Error("AI_ESTIMATE_LEDGER_RECORD_NOT_FOUND");
      const key = idempotencyKey({ estimateId, idempotencyKey: input.idempotencyKey });
      const reused = idempotency.get(key);
      if (reused) {
        const result = resultFromExisting(reused);
        if (result) return result;
      }
      if (input.revisionId !== existing.currentRevisionId) {
        throw new Error("AI_ESTIMATE_LEDGER_ARTIFACT_BINDING_STALE_REVISION");
      }
      const artifacts = {
        snapshotId: input.snapshotId ?? existing.artifacts.snapshotId,
        pdfArtifactId: input.pdfArtifactId ?? existing.artifacts.pdfArtifactId,
        buyerHandoffId: input.buyerHandoffId ?? existing.artifacts.buyerHandoffId,
        artifactsValidForRevisionId: input.revisionId,
      };
      const event = createLedgerEvent({
        estimateId,
        eventType: "artifacts_bound",
        idempotencyKey: input.idempotencyKey,
        actorUserId: input.actorUserId,
        sourceLayer: input.sourceLayer,
        revisionId: input.revisionId,
        createdAt: input.boundAt,
      });
      const record: AiEstimateLedgerRecord = {
        ...existing,
        updatedAt: input.boundAt,
        sourceSnapshotId: artifacts.snapshotId ?? existing.sourceSnapshotId,
        artifacts,
        revisions: existing.revisions.map((revision) =>
          revision.revisionId === input.revisionId
            ? {
              ...revision,
              snapshotId: artifacts.snapshotId,
              pdfArtifactId: artifacts.pdfArtifactId,
              buyerHandoffId: artifacts.buyerHandoffId,
              artifactsValidForRevisionId: input.revisionId,
            }
            : revision,
        ),
        eventLog: [...existing.eventLog, event],
        idempotencyKeys: Array.from(new Set([...existing.idempotencyKeys, input.idempotencyKey])),
        version: existing.version + 1,
      };
      return persist(record, key, operationId("artifacts_bound", estimateId, input.idempotencyKey));
    },

    approveRevision(input) {
      const estimateId = normalizeAiEstimateLedgerId(input.estimateId, "estimate_id");
      const existing = records.get(estimateId);
      if (!existing) throw new Error("AI_ESTIMATE_LEDGER_RECORD_NOT_FOUND");
      const key = idempotencyKey({ estimateId, idempotencyKey: input.idempotencyKey });
      const reused = idempotency.get(key);
      if (reused) {
        const result = resultFromExisting(reused);
        if (result) return result;
      }
      if (input.revisionId !== existing.currentRevisionId) {
        throw new Error("AI_ESTIMATE_LEDGER_APPROVE_STALE_REVISION");
      }
      const event = createLedgerEvent({
        estimateId,
        eventType: "revision_approved",
        idempotencyKey: input.idempotencyKey,
        actorUserId: input.actorUserId,
        sourceLayer: input.sourceLayer,
        revisionId: input.revisionId,
        createdAt: input.approvedAt,
      });
      const record: AiEstimateLedgerRecord = {
        ...existing,
        status: "approved",
        approvedAt: existing.approvedAt ?? input.approvedAt,
        updatedAt: input.approvedAt,
        eventLog: [...existing.eventLog, event],
        idempotencyKeys: Array.from(new Set([...existing.idempotencyKeys, input.idempotencyKey])),
        version: existing.version + 1,
      };
      return persist(record, key, operationId("revision_approved", estimateId, input.idempotencyKey));
    },

    setStatus(input) {
      const estimateId = normalizeAiEstimateLedgerId(input.estimateId, "estimate_id");
      const existing = records.get(estimateId);
      if (!existing) throw new Error("AI_ESTIMATE_LEDGER_RECORD_NOT_FOUND");
      const key = idempotencyKey({ estimateId, idempotencyKey: input.idempotencyKey });
      const reused = idempotency.get(key);
      if (reused) {
        const result = resultFromExisting(reused);
        if (result) return result;
      }
      const event = createLedgerEvent({
        estimateId,
        eventType: "status_changed",
        idempotencyKey: input.idempotencyKey,
        actorUserId: input.actorUserId,
        sourceLayer: input.sourceLayer,
        revisionId: existing.currentRevisionId,
        createdAt: input.updatedAt,
      });
      const record: AiEstimateLedgerRecord = {
        ...existing,
        status: input.status,
        updatedAt: input.updatedAt,
        deletedAt: input.status === "deleted" ? input.deletedAt ?? input.updatedAt : existing.deletedAt,
        eventLog: [...existing.eventLog, event],
        idempotencyKeys: Array.from(new Set([...existing.idempotencyKeys, input.idempotencyKey])),
        version: existing.version + 1,
      };
      return persist(record, key, operationId("status_changed", estimateId, input.idempotencyKey));
    },

    getRecord(estimateId) {
      const record = records.get(estimateId);
      return record ? cloneAiEstimateLedgerValue(record) : null;
    },

    listApprovedHistory(query) {
      const limit = Math.min(Math.max(query.limit ?? 20, 1), 500);
      const statuses = query.statuses?.length ? query.statuses : APPROVED_HISTORY_STATUSES;
      const statusSet = new Set(statuses);
      const filtered = Array.from(records.values())
        .filter((record) => record.ownerUserId === query.ownerUserId)
        .filter((record) => statusSet.has(record.status))
        .filter((record) => record.status !== "draft")
        .map(toHistoryRecord)
        .filter((record) => !query.cursorCreatedAt || record.createdAt < query.cursorCreatedAt)
        .sort((left, right) => {
          const byCreatedAt = right.createdAt.localeCompare(left.createdAt);
          return byCreatedAt === 0 ? right.approvedEstimateId.localeCompare(left.approvedEstimateId) : byCreatedAt;
        });
      const page = filtered.slice(0, limit);
      return {
        records: cloneAiEstimateLedgerValue(page),
        nextCursorCreatedAt: page.length === limit ? page[page.length - 1]?.createdAt ?? null : null,
        totalCount: filtered.length,
      };
    },

    countApprovedHistory(query) {
      const statuses = query.statuses?.length ? query.statuses : APPROVED_HISTORY_STATUSES;
      const statusSet = new Set(statuses);
      return Array.from(records.values())
        .filter((record) => record.ownerUserId === query.ownerUserId)
        .filter((record) => statusSet.has(record.status))
        .filter((record) => record.status !== "draft")
        .length;
    },

    resetForTests() {
      records.clear();
      idempotency.clear();
    },
  };
}
