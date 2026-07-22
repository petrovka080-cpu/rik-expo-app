import { appendEditableEstimateAuditEvent } from "./editableEstimateAuditTrail";
import { refreshEditableEstimateSnapshot } from "./editableEstimateSnapshot";
import { withEditableEstimateSnapshotHash } from "./editableEstimateSnapshotHash";
import {
  applyEditableEstimateManualPricePolicy,
  clearEditableEstimateManualPrice,
} from "./manualPricePolicy";
import { recalculateEditableEstimateRow } from "./recalculateEditableEstimateTotals";
import type {
  EditableEstimateOverrideInput,
  EditableEstimateRow,
  EditableEstimateSnapshot,
} from "./editableEstimateTypes";

function assertFiniteNonNegative(value: number, code: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(code);
}

function applyQuantity(row: EditableEstimateRow, quantity: number | null | undefined): EditableEstimateRow {
  if (quantity === undefined) return row;
  if (quantity == null) {
    return recalculateEditableEstimateRow({ ...row, quantity: null, quantitySource: "user_override" });
  }
  assertFiniteNonNegative(quantity, "EDITABLE_ESTIMATE_INVALID_QUANTITY");
  return recalculateEditableEstimateRow({ ...row, quantity, quantitySource: "user_override" });
}

function applyUnitPrice(row: EditableEstimateRow, input: EditableEstimateOverrideInput, at: string): EditableEstimateRow {
  if (input.unitPrice === undefined) return row;
  if (input.unitPrice == null) return clearEditableEstimateManualPrice(row);
  assertFiniteNonNegative(input.unitPrice, "EDITABLE_ESTIMATE_INVALID_UNIT_PRICE");
  return recalculateEditableEstimateRow(
    applyEditableEstimateManualPricePolicy({
      row,
      unitPrice: input.unitPrice,
      actorUserId: input.actorUserId,
      reason: input.reason,
      at,
    }),
  );
}

export function applyEditableEstimateOverride(
  snapshot: EditableEstimateSnapshot,
  input: EditableEstimateOverrideInput,
): EditableEstimateSnapshot {
  const at = input.at ?? new Date().toISOString();
  const rowIndex = snapshot.rows.findIndex((row) => row.rowId === input.rowId);
  if (rowIndex < 0) {
    throw new Error(`EDITABLE_ESTIMATE_ROW_NOT_FOUND:${input.rowId}`);
  }
  const beforeRow = snapshot.rows[rowIndex];
  const afterRow = applyUnitPrice(applyQuantity(beforeRow, input.quantity), input, at);
  const rows = snapshot.rows.map((row, index) => (index === rowIndex ? afterRow : row));
  const eventType = input.unitPrice === null
    ? "price_cleared"
    : input.unitPrice !== undefined
      ? "price_overridden"
      : "quantity_overridden";
  const refreshed = refreshEditableEstimateSnapshot({ ...snapshot, rows, updatedAt: at });
  const audited = appendEditableEstimateAuditEvent(refreshed, {
    type: eventType,
    rowId: input.rowId,
    actorUserId: input.actorUserId ?? null,
    reason: input.reason ?? null,
    before: {
      quantity: beforeRow.quantity,
      unitPrice: beforeRow.unitPrice,
      totalPrice: beforeRow.totalPrice,
      priceStatus: beforeRow.priceStatus,
      priceSourceId: beforeRow.priceSourceId ?? null,
    },
    after: {
      quantity: afterRow.quantity,
      unitPrice: afterRow.unitPrice,
      totalPrice: afterRow.totalPrice,
      priceStatus: afterRow.priceStatus,
      priceSourceId: afterRow.priceSourceId ?? null,
    },
    createdAt: at,
  });
  return withEditableEstimateSnapshotHash(audited);
}
