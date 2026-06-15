import { safeJsonStringify } from "../../format";
import type { EditableEstimateSnapshot } from "./editableEstimateTypes";

function stableHash(value: unknown): string {
  let hash = 2166136261;
  const text = safeJsonStringify(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function editableEstimateSnapshotHashBasis(snapshot: Omit<EditableEstimateSnapshot, "hash">) {
  return {
    version: snapshot.version,
    requestDraftId: snapshot.requestDraftId,
    sourceEstimateId: snapshot.sourceEstimateId ?? null,
    workKey: snapshot.workKey ?? null,
    currency: snapshot.currency,
    rows: snapshot.rows.map((row) => ({
      rowId: row.rowId,
      rowType: row.rowType,
      titleRu: row.titleRu,
      quantity: row.quantity,
      unit: row.unit,
      unitPrice: row.unitPrice,
      totalPrice: row.totalPrice,
      currency: row.currency,
      catalogItemId: row.catalogItemId ?? null,
      selectedCatalogItemId: row.selectedCatalogItemId ?? null,
      priceStatus: row.priceStatus,
      priceSource: row.priceSource,
      priceSourceId: row.priceSourceId ?? null,
      manualPrice: row.manualPrice ?? null,
      removed: row.removed === true,
    })),
    totals: snapshot.totals,
  };
}

export function computeEditableEstimateSnapshotHash(snapshot: Omit<EditableEstimateSnapshot, "hash">): string {
  return stableHash(editableEstimateSnapshotHashBasis(snapshot));
}

export function withEditableEstimateSnapshotHash(snapshot: Omit<EditableEstimateSnapshot, "hash">): EditableEstimateSnapshot {
  return {
    ...snapshot,
    hash: computeEditableEstimateSnapshotHash(snapshot),
  };
}
