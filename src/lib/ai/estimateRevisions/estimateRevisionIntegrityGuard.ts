import { safeJsonStringify } from "../../format";
import type {
  EstimateRevisionSnapshot,
  EstimateRevisionState,
  EstimateRevisionCurrency,
} from "./estimateRevisionTypes";
import type { EditableEstimateSnapshot } from "../editableEstimate";

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = stableValue((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
}

export function stableEstimateRevisionHash(value: unknown): string {
  let hash = 2166136261;
  const text = safeJsonStringify(stableValue(value));
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function normalizeEstimateRevisionCurrency(currency: string | null | undefined): EstimateRevisionCurrency {
  if (currency === "KZT" || currency === "RUB" || currency === "UZS") return currency;
  return "KGS";
}

export function computeEstimateRevisionRowsHash(snapshot: EditableEstimateSnapshot): string {
  return stableEstimateRevisionHash(snapshot.rows.map((row) => ({
    row_id: row.rowId,
    title_ru: row.titleRu,
    quantity: row.quantity,
    unit: row.unit,
    unit_price: row.unitPrice,
    total_price: row.totalPrice,
    currency: row.currency,
    catalog_item_id: row.catalogItemId ?? null,
    selected_catalog_item_id: row.selectedCatalogItemId ?? null,
    price_status: row.priceStatus,
    price_source: row.priceSource,
    selected_product_binding: row.selectedProductBinding ?? null,
    manual_price: row.manualPrice ?? null,
    removed: row.removed === true,
  })));
}

export function computeEstimateRevisionTotalsHash(snapshot: EditableEstimateSnapshot): string {
  return stableEstimateRevisionHash(snapshot.totals);
}

export function computeEstimateRevisionFullSnapshotHash(input: {
  estimate_id: string;
  request_id?: string;
  selected_work_key: string;
  region: string;
  currency: string;
  editable_estimate_snapshot: EditableEstimateSnapshot;
}): string {
  return stableEstimateRevisionHash({
    estimate_id: input.estimate_id,
    request_id: input.request_id ?? null,
    selected_work_key: input.selected_work_key,
    region: input.region,
    currency: input.currency,
    editable_hash: input.editable_estimate_snapshot.hash,
    rows_hash: computeEstimateRevisionRowsHash(input.editable_estimate_snapshot),
    totals_hash: computeEstimateRevisionTotalsHash(input.editable_estimate_snapshot),
  });
}

export function attachEstimateRevisionHashes(
  snapshot: Omit<EstimateRevisionSnapshot, "rows_hash" | "totals_hash" | "full_snapshot_hash">,
): EstimateRevisionSnapshot {
  return {
    ...snapshot,
    rows_hash: computeEstimateRevisionRowsHash(snapshot.editable_estimate_snapshot),
    totals_hash: computeEstimateRevisionTotalsHash(snapshot.editable_estimate_snapshot),
    full_snapshot_hash: computeEstimateRevisionFullSnapshotHash({
      estimate_id: snapshot.estimate_id,
      request_id: snapshot.request_id,
      selected_work_key: snapshot.selected_work_key,
      region: snapshot.region,
      currency: snapshot.currency,
      editable_estimate_snapshot: snapshot.editable_estimate_snapshot,
    }),
  };
}

export function assertEstimateRevisionStateIntegrity(state: EstimateRevisionState): void {
  if (state.fake_green_claimed !== false) throw new Error("ESTIMATE_REVISION_FAKE_GREEN_CLAIMED");
  const ids = new Set<string>();
  for (const revision of state.revisions) {
    if (ids.has(revision.revision_id)) throw new Error(`ESTIMATE_REVISION_DUPLICATE_ID:${revision.revision_id}`);
    ids.add(revision.revision_id);
    if (!revision.immutable) throw new Error(`ESTIMATE_REVISION_MUTABLE_SNAPSHOT:${revision.revision_id}`);
    if (revision.fake_green_claimed !== false) throw new Error(`ESTIMATE_REVISION_FAKE_GREEN_CLAIMED:${revision.revision_id}`);
    const rowsHash = computeEstimateRevisionRowsHash(revision.editable_estimate_snapshot);
    const totalsHash = computeEstimateRevisionTotalsHash(revision.editable_estimate_snapshot);
    if (rowsHash !== revision.rows_hash) throw new Error(`ESTIMATE_REVISION_ROWS_HASH_STALE:${revision.revision_id}`);
    if (totalsHash !== revision.totals_hash) throw new Error(`ESTIMATE_REVISION_TOTALS_HASH_STALE:${revision.revision_id}`);
  }
}

export function countEstimateRevisionInternalKeysVisible(text: string): number {
  const matches = text.match(/\b(?:revision_id|snapshot_id|parent_revision_id|rows_hash|totals_hash|full_snapshot_hash|catalogItemId|sourceId)\b/g);
  return matches?.length ?? 0;
}

export function estimateRevisionMojibakeFound(text: string): boolean {
  return /[\uFFFD]|\u00D0|\u00D1|Р[\u0400-\u04FF]/.test(text);
}
