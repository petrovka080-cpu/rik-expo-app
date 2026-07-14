import {
  createEditableEstimateSnapshot,
  type EditableEstimateRow,
} from "../../src/lib/ai/editableEstimate";

export function editableRow(overrides: Partial<EditableEstimateRow> = {}): EditableEstimateRow {
  const has = <K extends keyof EditableEstimateRow>(key: K) => Object.prototype.hasOwnProperty.call(overrides, key);
  return {
    rowId: overrides.rowId ?? "row_1",
    requestItemId: overrides.requestItemId ?? overrides.rowId ?? "row_1",
    rowType: overrides.rowType ?? "material",
    titleRu: overrides.titleRu ?? "Laminate",
    quantity: has("quantity") ? overrides.quantity! : 10,
    unit: has("unit") ? overrides.unit! : "sq_m",
    unitLabel: has("unitLabel") ? overrides.unitLabel! : "m2",
    unitPrice: has("unitPrice") ? overrides.unitPrice! : 500,
    totalPrice: has("totalPrice") ? overrides.totalPrice! : 5000,
    currency: overrides.currency ?? "KGS",
    rowSource: overrides.rowSource ?? "reference_price_book",
    catalogItemId: overrides.catalogItemId ?? null,
    selectedCatalogItemId: overrides.selectedCatalogItemId ?? null,
    materialKey: overrides.materialKey ?? "laminate",
    rateKey: overrides.rateKey ?? null,
    catalogBindingStatus: overrides.catalogBindingStatus ?? null,
    catalogCandidates: overrides.catalogCandidates ?? [],
    category: overrides.category ?? null,
    sourceId: has("sourceId") ? overrides.sourceId! : "reference_price_book",
    sourceLabel: has("sourceLabel") ? overrides.sourceLabel! : "Reference price book",
    confidence: overrides.confidence ?? "high",
    addedBy: overrides.addedBy ?? "ai",
    editableByConsumer: overrides.editableByConsumer ?? true,
    quantitySource: overrides.quantitySource ?? "estimate",
    priceStatus: overrides.priceStatus ?? "REFERENCE_PRICE_ESTIMATE",
    priceSource: overrides.priceSource ?? "reference_price_book",
    priceSourceId: has("priceSourceId") ? overrides.priceSourceId! : "reference_price_book",
    priceSourceLabel: has("priceSourceLabel") ? overrides.priceSourceLabel! : "Reference price book",
    manualPrice: overrides.manualPrice ?? null,
    removed: overrides.removed,
  };
}

export function editableSnapshot(rows = [editableRow()]) {
  return createEditableEstimateSnapshot({
    snapshotId: "snapshot_1",
    requestDraftId: "draft_1",
    sourceEstimateId: "estimate_1",
    workKey: "laminate_installation",
    currency: "KGS",
    rows,
    createdAt: "2026-06-15T00:00:00.000Z",
  });
}
