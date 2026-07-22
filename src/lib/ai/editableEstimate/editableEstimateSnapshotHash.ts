import { safeJsonStringify } from "../../format";
import type { EditableEstimateSnapshot } from "./editableEstimateTypes";

const HASH_DIAGNOSTIC_STRING_LIMIT = 240;
const HASH_DIAGNOSTIC_ARRAY_LIMIT = 32;
const HASH_DIAGNOSTIC_OBJECT_KEY_LIMIT = 64;

function stableHash(value: unknown): string {
  let hash = 2166136261;
  const text = safeJsonStringify(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function compactDiagnosticHashValue(value: unknown): unknown {
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value.length > HASH_DIAGNOSTIC_STRING_LIMIT
    ? value.slice(0, HASH_DIAGNOSTIC_STRING_LIMIT)
    : value;
  if (Array.isArray(value)) return value.slice(0, HASH_DIAGNOSTIC_ARRAY_LIMIT).map(compactDiagnosticHashValue);
  if (typeof value !== "object") return null;
  return Object.keys(value as Record<string, unknown>)
    .sort()
    .slice(0, HASH_DIAGNOSTIC_OBJECT_KEY_LIMIT)
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = compactDiagnosticHashValue((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
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
      formulaId: row.formulaId ?? null,
      quantityFormula: row.quantityFormula ?? null,
      calculationTrace: compactDiagnosticHashValue(row.calculationTrace ?? null),
      sourceParameters: compactDiagnosticHashValue(row.sourceParameters ?? null),
      templateId: row.templateId ?? null,
      templateVersion: row.templateVersion ?? null,
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
