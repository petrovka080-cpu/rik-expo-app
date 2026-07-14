import type { EditableEstimateRow } from "../editableEstimate";
import type { EstimateRevisionDiff, EstimateRevisionSnapshot } from "./estimateRevisionTypes";

function rowLabel(row: EditableEstimateRow | null): string {
  if (!row) return "\u043d\u0435\u0442 \u0441\u0442\u0440\u043e\u043a\u0438";
  return [
    row.titleRu,
    row.quantity == null ? "\u043a\u043e\u043b-\u0432\u043e ?" : String(row.quantity),
    row.unit ?? "",
    row.unitPrice == null ? "\u0446\u0435\u043d\u0430 ?" : String(row.unitPrice),
    row.totalPrice == null ? "\u0438\u0442\u043e\u0433 ?" : String(row.totalPrice),
    row.priceStatus,
    row.catalogItemId ?? row.selectedCatalogItemId ?? "",
    row.removed ? "\u0443\u0434\u0430\u043b\u0435\u043d\u0430" : "",
  ].filter(Boolean).join(" ");
}

function rowKey(row: EditableEstimateRow): string {
  return row.requestItemId ?? row.rowId;
}

export function diffEstimateRevisions(
  fromRevision: EstimateRevisionSnapshot,
  toRevision: EstimateRevisionSnapshot,
): EstimateRevisionDiff {
  const beforeById = new Map(fromRevision.editable_estimate_snapshot.rows.map((row) => [rowKey(row), row]));
  const afterById = new Map(toRevision.editable_estimate_snapshot.rows.map((row) => [rowKey(row), row]));
  const keys = Array.from(new Set([...beforeById.keys(), ...afterById.keys()])).sort();
  const changed_rows: EstimateRevisionDiff["changed_rows"] = [];

  for (const key of keys) {
    const before = beforeById.get(key) ?? null;
    const after = afterById.get(key) ?? null;
    if (!before && after) {
      changed_rows.push({ row_key: key, change_type: "ROW_ADDED", before_ru: rowLabel(null), after_ru: rowLabel(after) });
      continue;
    }
    if (before && !after) {
      changed_rows.push({ row_key: key, change_type: "ROW_REMOVED", before_ru: rowLabel(before), after_ru: rowLabel(null) });
      continue;
    }
    if (!before || !after) continue;
    if (before.removed !== after.removed) {
      changed_rows.push({
        row_key: key,
        change_type: after.removed ? "ROW_REMOVED" : "ROW_ADDED",
        before_ru: rowLabel(before),
        after_ru: rowLabel(after),
      });
    }
    if (before.quantity !== after.quantity) {
      changed_rows.push({ row_key: key, change_type: "QUANTITY_CHANGED", before_ru: rowLabel(before), after_ru: rowLabel(after) });
    }
    if (before.unitPrice !== after.unitPrice || before.priceStatus !== after.priceStatus) {
      changed_rows.push({ row_key: key, change_type: "PRICE_CHANGED", before_ru: rowLabel(before), after_ru: rowLabel(after) });
    }
    if ((before.catalogItemId ?? before.selectedCatalogItemId ?? null) !== (after.catalogItemId ?? after.selectedCatalogItemId ?? null)) {
      changed_rows.push({ row_key: key, change_type: "CATALOG_CHANGED", before_ru: rowLabel(before), after_ru: rowLabel(after) });
    }
  }

  const totalBefore = fromRevision.editable_estimate_snapshot.totals.grandTotal;
  const totalAfter = toRevision.editable_estimate_snapshot.totals.grandTotal;
  return {
    from_revision_id: fromRevision.revision_id,
    to_revision_id: toRevision.revision_id,
    changed_rows,
    total_before: Number.isFinite(totalBefore) ? totalBefore : null,
    total_after: Number.isFinite(totalAfter) ? totalAfter : null,
    total_delta: Number.isFinite(totalBefore) && Number.isFinite(totalAfter)
      ? Math.round((totalAfter - totalBefore) * 100) / 100
      : null,
    currency: toRevision.currency,
  };
}
