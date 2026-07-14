import { appendEditableEstimateAuditEvent } from "./editableEstimateAuditTrail";
import { computeEditableEstimateSnapshotHash, withEditableEstimateSnapshotHash } from "./editableEstimateSnapshotHash";
import { resolveEditableEstimateInitialPricePolicy } from "./manualPricePolicy";
import { recalculateEditableEstimateRow, recalculateEditableEstimateTotals } from "./recalculateEditableEstimateTotals";
import type {
  EditableEstimateAuditEvent,
  EditableEstimateRow,
  EditableEstimateSnapshot,
} from "./editableEstimateTypes";

export function normalizeEditableEstimateRow(row: EditableEstimateRow): EditableEstimateRow {
  const pricePolicy = resolveEditableEstimateInitialPricePolicy({
    unitPrice: row.unitPrice,
    rowSource: row.rowSource,
    sourceId: row.sourceId,
    sourceLabel: row.sourceLabel,
    catalogItemId: row.catalogItemId,
    selectedCatalogItemId: row.selectedCatalogItemId,
    priceStatus: row.priceStatus,
    priceSource: row.priceSource,
    priceSourceId: row.priceSourceId,
    priceSourceLabel: row.priceSourceLabel,
  });
  return recalculateEditableEstimateRow({
    ...row,
    quantity: row.quantity == null ? null : Math.max(0, row.quantity),
    unitPrice: row.unitPrice == null ? null : Math.max(0, row.unitPrice),
    currency: row.currency || "KGS",
    quantitySource: row.quantitySource ?? "estimate",
    priceStatus: pricePolicy.priceStatus,
    priceSource: pricePolicy.priceSource,
    priceSourceId: pricePolicy.priceSourceId,
    priceSourceLabel: pricePolicy.priceSourceLabel,
    manualPrice: row.manualPrice ?? null,
  });
}

export function createEditableEstimateSnapshot(input: {
  snapshotId: string;
  requestDraftId: string;
  sourceEstimateId?: string | null;
  workKey?: string | null;
  currency?: string;
  rows: EditableEstimateRow[];
  createdAt?: string;
  auditTrail?: EditableEstimateAuditEvent[];
}): EditableEstimateSnapshot {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const rows = input.rows.map(normalizeEditableEstimateRow);
  const withoutHash = {
    version: "editable-estimate-v1" as const,
    snapshotId: input.snapshotId,
    requestDraftId: input.requestDraftId,
    sourceEstimateId: input.sourceEstimateId ?? null,
    workKey: input.workKey ?? null,
    currency: input.currency ?? rows.find((row) => row.currency)?.currency ?? "KGS",
    rows,
    totals: recalculateEditableEstimateTotals(rows, input.currency ?? rows.find((row) => row.currency)?.currency ?? "KGS"),
    auditTrail: input.auditTrail ?? [],
    createdAt,
    updatedAt: createdAt,
  };
  const snapshot = withEditableEstimateSnapshotHash(withoutHash);
  if (snapshot.auditTrail.length > 0) return snapshot;
  const withAudit = appendEditableEstimateAuditEvent(snapshot, {
    type: "snapshot_created",
    actorUserId: null,
    reason: "initial_snapshot",
    before: null,
    after: { rowCount: rows.length, hash: snapshot.hash },
    createdAt,
  });
  return {
    ...withAudit,
    hash: computeEditableEstimateSnapshotHash(withAudit),
  };
}

export function refreshEditableEstimateSnapshot(snapshot: EditableEstimateSnapshot): EditableEstimateSnapshot {
  const rows = snapshot.rows.map(normalizeEditableEstimateRow);
  const withoutHash = {
    ...snapshot,
    rows,
    totals: recalculateEditableEstimateTotals(rows, snapshot.currency),
    updatedAt: snapshot.updatedAt,
  };
  return withEditableEstimateSnapshotHash(withoutHash);
}

function rowSignature(row: EditableEstimateRow): string {
  return `${row.rowType}:${row.titleRu.trim().toLocaleLowerCase("ru-RU")}:${row.unit ?? ""}:${row.materialKey ?? ""}:${row.rateKey ?? ""}`;
}

export function mergeEditableEstimateSnapshotWithAiRecalculation(input: {
  aiSnapshot: EditableEstimateSnapshot;
  previousSnapshot: EditableEstimateSnapshot;
  at?: string;
}): EditableEstimateSnapshot {
  const byId = new Map(input.previousSnapshot.rows.map((row) => [row.rowId, row]));
  const bySignature = new Map(input.previousSnapshot.rows.map((row) => [rowSignature(row), row]));
  const rows = input.aiSnapshot.rows.map((row) => {
    const previous = byId.get(row.rowId) ?? bySignature.get(rowSignature(row));
    if (!previous) return row;
    return {
      ...row,
      quantity: previous.quantitySource === "user_override" ? previous.quantity : row.quantity,
      quantitySource: previous.quantitySource === "user_override" ? "user_override" : row.quantitySource,
      unitPrice: previous.manualPrice ? previous.unitPrice : row.unitPrice,
      totalPrice: previous.manualPrice ? previous.totalPrice : row.totalPrice,
      priceStatus: previous.manualPrice ? previous.priceStatus : row.priceStatus,
      priceSource: previous.manualPrice ? previous.priceSource : row.priceSource,
      priceSourceId: previous.manualPrice ? previous.priceSourceId ?? null : row.priceSourceId,
      priceSourceLabel: previous.manualPrice ? previous.priceSourceLabel ?? null : row.priceSourceLabel,
      manualPrice: previous.manualPrice ?? row.manualPrice,
    };
  });
  const next = createEditableEstimateSnapshot({
    ...input.aiSnapshot,
    rows,
    createdAt: input.aiSnapshot.createdAt,
    auditTrail: input.previousSnapshot.auditTrail,
  });
  const audited = appendEditableEstimateAuditEvent(next, {
    type: "ai_recalculated_user_overrides_preserved",
    actorUserId: null,
    reason: "preserve_user_overrides",
    before: { hash: input.previousSnapshot.hash },
    after: { hash: next.hash },
    createdAt: input.at ?? new Date().toISOString(),
  });
  return refreshEditableEstimateSnapshot(audited);
}
