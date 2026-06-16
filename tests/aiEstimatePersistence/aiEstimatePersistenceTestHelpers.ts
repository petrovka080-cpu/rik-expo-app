import {
  createEditableEstimateSnapshot,
  type EditableEstimateRow,
} from "../../src/lib/ai/editableEstimate";
import {
  createAiEstimatePersistenceRecordFromGeneration,
  getCurrentAiEstimateRevision,
  type AiEstimatePersistenceRecord,
} from "../../src/lib/ai/estimatePersistence";
import { getCurrentEstimateRevision } from "../../src/lib/ai/estimateRevisions";

export const PERSISTENCE_TIME = "2026-06-16T00:00:00.000Z";
export const PERSISTENCE_EDIT_TIME = "2026-06-16T00:05:00.000Z";

export function persistenceRow(overrides: Partial<EditableEstimateRow> = {}): EditableEstimateRow {
  return {
    rowId: overrides.rowId ?? "ai_row_1",
    requestItemId: overrides.requestItemId ?? overrides.rowId ?? "ai_row_1",
    rowType: overrides.rowType ?? "material",
    titleRu: overrides.titleRu ?? "\u0410\u0441\u0444\u0430\u043b\u044c\u0442\u043e\u0431\u0435\u0442\u043e\u043d",
    quantity: overrides.quantity ?? 200,
    unit: overrides.unit ?? "sq_m",
    unitLabel: overrides.unitLabel ?? "\u043c2",
    unitPrice: overrides.unitPrice ?? 1200,
    totalPrice: overrides.totalPrice ?? 240000,
    currency: overrides.currency ?? "KGS",
    rowSource: overrides.rowSource ?? "reference_price_book",
    catalogItemId: overrides.catalogItemId ?? null,
    selectedCatalogItemId: overrides.selectedCatalogItemId ?? null,
    materialKey: overrides.materialKey ?? "asphalt_concrete",
    rateKey: overrides.rateKey ?? "asphalt_paving",
    catalogBindingStatus: overrides.catalogBindingStatus ?? null,
    catalogCandidates: overrides.catalogCandidates ?? [],
    category: overrides.category ?? "material",
    sourceId: overrides.sourceId ?? "reference_price_book",
    sourceLabel: overrides.sourceLabel ?? "\u0421\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a \u0441\u0442\u0430\u0432\u043e\u043a",
    confidence: overrides.confidence ?? "high",
    addedBy: overrides.addedBy ?? "ai",
    editableByConsumer: overrides.editableByConsumer ?? true,
    quantitySource: overrides.quantitySource ?? "estimate",
    priceStatus: overrides.priceStatus ?? "REFERENCE_PRICE_ESTIMATE",
    priceSource: overrides.priceSource ?? "reference_price_book",
    priceSourceId: overrides.priceSourceId ?? "reference_price_book",
    priceSourceLabel: overrides.priceSourceLabel ?? "\u0421\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a \u0441\u0442\u0430\u0432\u043e\u043a",
    manualPrice: overrides.manualPrice ?? null,
    removed: overrides.removed,
  };
}

export function persistenceRecord(rows: EditableEstimateRow[] = [persistenceRow()]): AiEstimatePersistenceRecord {
  const snapshot = createEditableEstimateSnapshot({
    snapshotId: "ai_estimate_snapshot_1",
    requestDraftId: "ai_draft_1",
    sourceEstimateId: "ai_estimate_1",
    workKey: "asphalt_paving",
    currency: "KGS",
    rows,
    createdAt: PERSISTENCE_TIME,
  });
  return createAiEstimatePersistenceRecordFromGeneration({
    estimate_id: "ai_estimate_1",
    draft_id: "ai_draft_1",
    owner_user_id: "consumer_1",
    user_input_ru: "\u0430\u0441\u0444\u0430\u043b\u044c\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0442\u0435\u0440\u0440\u0438\u0442\u043e\u0440\u0438\u0438 200 \u043c2 \u0432 \u0411\u0438\u0448\u043a\u0435\u043a\u0435",
    selected_work_key: "asphalt_paving",
    selected_work_name_ru: "\u0410\u0441\u0444\u0430\u043b\u044c\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435",
    region: "KG_BISHKEK",
    currency: "KGS",
    smart_estimator_snapshot: { workKey: "asphalt_paving", rows: rows.length },
    editable_estimate_snapshot: snapshot,
    created_at: PERSISTENCE_TIME,
  });
}

export function currentRevision(record: AiEstimatePersistenceRecord) {
  return getCurrentEstimateRevision(record.revision_state);
}

export function currentAiRevision(record: AiEstimatePersistenceRecord) {
  return getCurrentAiEstimateRevision(record);
}

export function firstRowKey(record: AiEstimatePersistenceRecord): string {
  return currentRevision(record).editable_estimate_snapshot.rows[0]?.rowId ?? "ai_row_1";
}

export function visiblePersistenceText(record: AiEstimatePersistenceRecord): string {
  const history = record.history_items[0];
  const revision = currentAiRevision(record);
  return [
    history?.title_ru,
    history?.subtitle_ru,
    `\u0412\u0435\u0440\u0441\u0438\u044f ${revision.version_number}`,
    history?.total_amount == null ? "\u0438\u0442\u043e\u0433 \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c" : `${history.total_amount} ${history.currency}`,
  ].filter(Boolean).join("\n");
}
