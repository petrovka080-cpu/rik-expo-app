import { appendEditableEstimateAuditEvent } from "./editableEstimateAuditTrail";
import { refreshEditableEstimateSnapshot } from "./editableEstimateSnapshot";
import { withEditableEstimateSnapshotHash } from "./editableEstimateSnapshotHash";
import {
  applyEditableEstimateManualPricePolicy,
  clearEditableEstimateManualPrice,
} from "./manualPricePolicy";
import { recalculateEditableEstimateRow } from "./recalculateEditableEstimateTotals";
import type { EditableEstimateRow, EditableEstimateSnapshot } from "./editableEstimateTypes";

export type EditableEstimateUnitPriceBatchEdit = {
  rowId: string;
  unitPrice: number | null;
};

function applyUnitPrice(input: {
  row: EditableEstimateRow;
  unitPrice: number | null;
  actorUserId?: string | null;
  reason?: string | null;
  at: string;
}): EditableEstimateRow {
  if (input.unitPrice == null) return clearEditableEstimateManualPrice(input.row);
  if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) {
    throw new Error("EDITABLE_ESTIMATE_INVALID_UNIT_PRICE");
  }
  return recalculateEditableEstimateRow(applyEditableEstimateManualPricePolicy({
    row: input.row,
    unitPrice: input.unitPrice,
    actorUserId: input.actorUserId,
    reason: input.reason,
    at: input.at,
  }));
}

export function applyEditableEstimateUnitPriceBatchOverride(
  snapshot: EditableEstimateSnapshot,
  input: {
    edits: readonly EditableEstimateUnitPriceBatchEdit[];
    actorUserId?: string | null;
    reason?: string | null;
    at?: string;
  },
): EditableEstimateSnapshot {
  if (input.edits.length === 0) return snapshot;
  const at = input.at ?? new Date().toISOString();
  const rowsByRequestedId = new Map<string, EditableEstimateRow>();
  for (const row of snapshot.rows) {
    rowsByRequestedId.set(row.rowId, row);
    if (row.requestItemId) rowsByRequestedId.set(row.requestItemId, row);
  }
  const editsByCanonicalRowId = new Map<string, EditableEstimateUnitPriceBatchEdit>();
  for (const edit of input.edits) {
    const row = rowsByRequestedId.get(edit.rowId);
    if (!row) throw new Error(`EDITABLE_ESTIMATE_ROW_NOT_FOUND:${edit.rowId}`);
    if (editsByCanonicalRowId.has(row.rowId)) {
      throw new Error(`EDITABLE_ESTIMATE_DUPLICATE_BATCH_ROW:${edit.rowId}`);
    }
    editsByCanonicalRowId.set(row.rowId, edit);
  }

  const rows = snapshot.rows.map((row) => {
    const edit = editsByCanonicalRowId.get(row.rowId);
    return edit
      ? applyUnitPrice({
          row,
          unitPrice: edit.unitPrice,
          actorUserId: input.actorUserId,
          reason: input.reason,
          at,
        })
      : row;
  });
  const refreshed = refreshEditableEstimateSnapshot({ ...snapshot, rows, updatedAt: at });
  const audited = appendEditableEstimateAuditEvent(refreshed, {
    type: input.edits.every((edit) => edit.unitPrice == null) ? "price_cleared" : "price_overridden",
    actorUserId: input.actorUserId ?? null,
    reason: input.reason ?? "estimate_revision_unit_price_batch_edit",
    before: { editedRowCount: input.edits.length },
    after: { editedRowCount: input.edits.length },
    createdAt: at,
  });
  return withEditableEstimateSnapshotHash(audited);
}
