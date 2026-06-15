import {
  appendEditableEstimateAuditEvent,
  createEditableEstimateSnapshot,
  refreshEditableEstimateSnapshot,
  validateEditableEstimateSnapshot,
  type EditableEstimateRow,
  type EditableEstimateSnapshot,
} from "../ai/editableEstimate";
import {
  applyEstimateRevisionQuantityEdit,
  applyEstimateRevisionRowRemoval,
  applyEstimateRevisionUnitPriceEdit,
  approveEstimateRevisionState,
  bindEstimateRevisionToHistoryEntry,
  bindEstimateRevisionToPdfExport,
  bindEstimateRevisionToRequestPayload,
  createEstimateRevisionFromSnapshot,
  createEstimateRevisionState,
  getCurrentEstimateRevision,
  normalizeEstimateRevisionCurrency,
  restoreEstimateRevisionAsNewRevision,
  type EstimateRevisionEventType,
  type EstimateRevisionPdfBinding,
  type EstimateRevisionState,
} from "../ai/estimateRevisions";
import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestItem,
  ConsumerRepairRequestPdf,
} from "./consumerRequestTypes";

function snapshotId(requestDraftId: string): string {
  return `editable_estimate:${requestDraftId}`;
}

function rowTypeFromItem(item: ConsumerRepairRequestItem): EditableEstimateRow["rowType"] {
  if (item.itemType === "work") return "work";
  if (item.itemType === "material") return "material";
  if (item.itemType === "service") return "service";
  if (item.itemType === "document") return "document";
  return "other";
}

function itemFromRowSource(rowSource: string): ConsumerRepairRequestItem["source"] {
  if (rowSource === "catalog_item") return "catalog_item";
  if (rowSource === "reference_price_book") return "reference_price_book";
  if (rowSource === "marketplace") return "marketplace";
  if (rowSource === "custom") return "custom";
  if (rowSource === "user_added") return "user_added";
  return "ai_suggested";
}

export function consumerRepairItemToEditableEstimateRow(item: ConsumerRepairRequestItem): EditableEstimateRow {
  const userPrice =
    item.priceSource === "user" ||
    item.priceStatus === "USER_PRICE_OVERRIDE" ||
    item.priceStatus === "USER_ENTERED_PRICE";
  return {
    rowId: item.id,
    requestItemId: item.id,
    rowType: rowTypeFromItem(item),
    titleRu: item.titleRu,
    quantity: item.quantity ?? null,
    unit: item.unit ?? null,
    unitLabel: item.unitLabel ?? null,
    unitPrice: item.unitPrice ?? null,
    totalPrice: item.totalPrice ?? null,
    currency: item.currency,
    rowSource: item.source,
    catalogItemId: item.catalogItemId ?? null,
    selectedCatalogItemId: item.selectedCatalogItemId ?? null,
    materialKey: item.materialKey ?? null,
    rateKey: item.rateKey ?? null,
    catalogBindingStatus: item.catalogBindingStatus ?? null,
    catalogCandidates: item.catalogCandidates ?? [],
    category: item.category ?? null,
    sourceId: item.sourceId ?? null,
    sourceLabel: item.sourceLabel ?? null,
    confidence: item.confidence,
    addedBy: item.addedBy,
    editableByConsumer: item.editableByConsumer,
    quantitySource: item.quantityEditedByConsumer ? "user_override" : "estimate",
    priceStatus: item.priceStatus ?? "PRICE_MISSING",
    priceSource: item.priceSource ?? "missing",
    priceSourceId: userPrice ? item.priceSourceId ?? null : item.priceSourceId ?? item.sourceId ?? null,
    priceSourceLabel: userPrice ? item.priceSourceLabel ?? null : item.priceSourceLabel ?? item.sourceLabel ?? null,
    manualPrice: item.priceEditedByConsumer && item.unitPrice != null && item.priceStatus
      ? {
          unitPrice: item.unitPrice,
          currency: item.currency,
          status: item.priceStatus === "USER_PRICE_OVERRIDE" ? "USER_PRICE_OVERRIDE" : "USER_ENTERED_PRICE",
          actorUserId: null,
          reason: "consumer_request_item_legacy_manual_price",
          updatedAt: item.createdAt,
        }
      : null,
  };
}

export function editableEstimateRowToConsumerRepairItem(
  row: EditableEstimateRow,
  previous: ConsumerRepairRequestItem,
): ConsumerRepairRequestItem {
  return {
    ...previous,
    id: row.requestItemId ?? row.rowId,
    itemType: row.rowType,
    titleRu: row.titleRu,
    quantity: row.quantity,
    unit: row.unit,
    unitLabel: row.unitLabel,
    unitPrice: row.unitPrice,
    totalPrice: row.totalPrice,
    currency: row.currency,
    source: itemFromRowSource(row.rowSource),
    catalogItemId: row.catalogItemId ?? null,
    selectedCatalogItemId: row.selectedCatalogItemId ?? null,
    materialKey: row.materialKey ?? null,
    rateKey: row.rateKey ?? null,
    catalogBindingStatus: row.catalogBindingStatus as ConsumerRepairRequestItem["catalogBindingStatus"],
    catalogCandidates: (row.catalogCandidates ?? []) as ConsumerRepairRequestItem["catalogCandidates"],
    category: row.category ?? null,
    sourceId: row.sourceId ?? null,
    sourceLabel: row.sourceLabel ?? null,
    priceStatus: row.priceStatus,
    priceSource: row.priceSource,
    priceSourceId: row.priceSourceId ?? null,
    priceSourceLabel: row.priceSourceLabel ?? null,
    quantityEditedByConsumer: row.quantitySource === "user_override",
    priceEditedByConsumer: row.priceSource === "user",
    confidence: row.confidence,
    addedBy: row.addedBy,
    editableByConsumer: row.editableByConsumer,
  };
}

export function consumerRepairItemFromEditableEstimateRow(
  row: EditableEstimateRow,
  requestDraftId: string,
  createdAt: string,
): ConsumerRepairRequestItem {
  return editableEstimateRowToConsumerRepairItem(row, {
    id: row.requestItemId ?? row.rowId,
    requestDraftId,
    itemType: row.rowType,
    titleRu: row.titleRu,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unitPrice,
    totalPrice: row.totalPrice,
    currency: row.currency,
    source: itemFromRowSource(row.rowSource),
    catalogItemId: row.catalogItemId ?? null,
    selectedCatalogItemId: row.selectedCatalogItemId ?? null,
    materialKey: row.materialKey ?? null,
    rateKey: row.rateKey ?? null,
    catalogBindingStatus: row.catalogBindingStatus as ConsumerRepairRequestItem["catalogBindingStatus"],
    catalogCandidates: (row.catalogCandidates ?? []) as ConsumerRepairRequestItem["catalogCandidates"],
    category: row.category ?? null,
    unitLabel: row.unitLabel,
    sourceId: row.sourceId ?? null,
    sourceLabel: row.sourceLabel ?? null,
    priceStatus: row.priceStatus,
    priceSource: row.priceSource,
    priceSourceId: row.priceSourceId ?? null,
    priceSourceLabel: row.priceSourceLabel ?? null,
    quantityEditedByConsumer: row.quantitySource === "user_override",
    priceEditedByConsumer: row.priceSource === "user",
    confidence: row.confidence,
    addedBy: row.addedBy,
    editableByConsumer: row.editableByConsumer,
    createdAt,
  });
}

export function buildEditableEstimateSnapshotFromConsumerRepairBundle(
  bundle: ConsumerRepairDraftBundle,
): EditableEstimateSnapshot {
  return createEditableEstimateSnapshot({
    snapshotId: snapshotId(bundle.draft.id),
    requestDraftId: bundle.draft.id,
    sourceEstimateId: bundle.structuredEstimatePayload?.estimateId ?? bundle.draft.id,
    workKey: bundle.draft.selectedWorkKey ?? bundle.structuredEstimatePayload?.workKey ?? bundle.draft.repairType,
    currency: bundle.items.find((item) => item.currency)?.currency ?? "KGS",
    rows: bundle.items.map(consumerRepairItemToEditableEstimateRow),
    createdAt: bundle.editableEstimateSnapshot?.createdAt ?? bundle.draft.createdAt,
    auditTrail: bundle.editableEstimateSnapshot?.auditTrail,
  });
}

function editableEstimateSnapshotMatchesConsumerRepairBundle(
  snapshot: EditableEstimateSnapshot,
  bundle: ConsumerRepairDraftBundle,
): boolean {
  const rows = snapshot.rows.filter((row) => !row.removed);
  if (rows.length !== bundle.items.length) return false;
  const byId = new Map(rows.map((row) => [row.requestItemId ?? row.rowId, row]));
  return bundle.items.every((item) => {
    const row = byId.get(item.id);
    if (!row) return false;
    return row.titleRu === item.titleRu
      && row.rowType === rowTypeFromItem(item)
      && row.quantity === (item.quantity ?? null)
      && row.unit === (item.unit ?? null)
      && row.unitPrice === (item.unitPrice ?? null)
      && row.totalPrice === (item.totalPrice ?? null)
      && row.currency === item.currency
      && row.catalogItemId === (item.catalogItemId ?? null)
      && row.selectedCatalogItemId === (item.selectedCatalogItemId ?? null)
      && row.priceStatus === (item.priceStatus ?? "PRICE_MISSING")
      && row.priceSource === (item.priceSource ?? "missing")
      && (row.priceSourceId ?? null) === (item.priceSourceId ?? null);
  });
}

export function applyEditableEstimateSnapshotToConsumerRepairBundle(
  bundle: ConsumerRepairDraftBundle,
  snapshot: EditableEstimateSnapshot,
): ConsumerRepairDraftBundle {
  const previousById = new Map(bundle.items.map((item) => [item.id, item]));
  const items = snapshot.rows
    .filter((row) => !row.removed)
    .map((row) => {
      const previous = previousById.get(row.requestItemId ?? row.rowId) ?? previousById.get(row.rowId);
      if (!previous) return consumerRepairItemFromEditableEstimateRow(row, bundle.draft.id, bundle.draft.createdAt);
      return editableEstimateRowToConsumerRepairItem(row, previous);
    });
  return {
    ...bundle,
    items,
    editableEstimateSnapshot: refreshEditableEstimateSnapshot(snapshot),
  };
}

export function ensureConsumerRepairBundleEditableEstimateSnapshot(
  bundle: ConsumerRepairDraftBundle,
): ConsumerRepairDraftBundle {
  if (
    bundle.editableEstimateSnapshot
    && editableEstimateSnapshotMatchesConsumerRepairBundle(bundle.editableEstimateSnapshot, bundle)
  ) {
    const validation = validateEditableEstimateSnapshot(bundle.editableEstimateSnapshot);
    if (!validation.valid) {
      throw new Error(`CONSUMER_REPAIR_EDITABLE_ESTIMATE_INVALID:${validation.issues.map((item) => item.code).join(",")}`);
    }
    return bundle;
  }
  const snapshot = buildEditableEstimateSnapshotFromConsumerRepairBundle(bundle);
  const validation = validateEditableEstimateSnapshot(snapshot);
  if (!validation.valid) {
    throw new Error(`CONSUMER_REPAIR_EDITABLE_ESTIMATE_INVALID:${validation.issues.map((item) => item.code).join(",")}`);
  }
  return {
    ...bundle,
    editableEstimateSnapshot: snapshot,
  };
}

export function withConsumerRepairEditableEstimateAudit(
  bundle: ConsumerRepairDraftBundle,
  input: Parameters<typeof appendEditableEstimateAuditEvent>[1],
): ConsumerRepairDraftBundle {
  const snapshot = bundle.editableEstimateSnapshot ?? buildEditableEstimateSnapshotFromConsumerRepairBundle(bundle);
  return {
    ...bundle,
    editableEstimateSnapshot: refreshEditableEstimateSnapshot(appendEditableEstimateAuditEvent(snapshot, input)),
  };
}

function estimateIdForBundle(bundle: ConsumerRepairDraftBundle): string {
  return bundle.structuredEstimatePayload?.estimateId ?? bundle.draft.id;
}

function selectedWorkKeyForBundle(bundle: ConsumerRepairDraftBundle): string {
  return bundle.draft.selectedWorkKey ?? bundle.structuredEstimatePayload?.workKey ?? bundle.draft.repairType;
}

function regionForBundle(bundle: ConsumerRepairDraftBundle): string {
  return bundle.draft.city ?? bundle.structuredEstimatePayload?.locale.city ?? "KG";
}

function currentRevisionState(bundle: ConsumerRepairDraftBundle): EstimateRevisionState {
  const normalized = ensureConsumerRepairBundleEstimateRevisionState(bundle);
  if (!normalized.estimateRevisionState) throw new Error("CONSUMER_REPAIR_ESTIMATE_REVISION_STATE_MISSING");
  return normalized.estimateRevisionState;
}

function withRevisionSnapshot(bundle: ConsumerRepairDraftBundle, state: EstimateRevisionState): ConsumerRepairDraftBundle {
  const revision = getCurrentEstimateRevision(state);
  return applyEditableEstimateSnapshotToConsumerRepairBundle(
    { ...bundle, estimateRevisionState: state },
    revision.editable_estimate_snapshot,
  );
}

export function ensureConsumerRepairBundleEstimateRevisionState(
  bundle: ConsumerRepairDraftBundle,
): ConsumerRepairDraftBundle {
  const editableEstimateSnapshot = bundle.editableEstimateSnapshot
    ?? buildEditableEstimateSnapshotFromConsumerRepairBundle(bundle);
  const existing = bundle.estimateRevisionState ?? null;
  if (!existing) {
    const state = createEstimateRevisionState({
      estimate_id: estimateIdForBundle(bundle),
      request_id: bundle.draft.id,
      selected_work_key: selectedWorkKeyForBundle(bundle),
      region: regionForBundle(bundle),
      currency: normalizeEstimateRevisionCurrency(editableEstimateSnapshot.currency),
      editable_estimate_snapshot: editableEstimateSnapshot,
      created_by: "ai",
      created_at: bundle.draft.createdAt,
      source: "AI_GENERATED",
      status: "DRAFT",
    });
    return { ...bundle, editableEstimateSnapshot, estimateRevisionState: state };
  }

  const current = getCurrentEstimateRevision(existing);
  if (current.editable_estimate_snapshot.hash !== editableEstimateSnapshot.hash) {
    throw new Error(
      `CONSUMER_REPAIR_ESTIMATE_REVISION_DESYNC:${current.editable_estimate_snapshot.hash}->${editableEstimateSnapshot.hash}`,
    );
  }
  return { ...bundle, editableEstimateSnapshot, estimateRevisionState: existing };
}

export function appendConsumerRepairEstimateRevisionFromSnapshot(input: {
  previousBundle: ConsumerRepairDraftBundle;
  nextBundle: ConsumerRepairDraftBundle;
  event_type: EstimateRevisionEventType;
  source: "USER_EDITED" | "CATALOG_SELECTED" | "AI_RECALCULATED";
  row_key?: string;
  before_value?: unknown;
  after_value?: unknown;
  actor_id?: string;
  reason_ru?: string;
  created_at?: string;
}): ConsumerRepairDraftBundle {
  const previous = ensureConsumerRepairBundleEstimateRevisionState(input.previousBundle);
  const editableEstimateSnapshot = input.nextBundle.editableEstimateSnapshot
    ?? buildEditableEstimateSnapshotFromConsumerRepairBundle(input.nextBundle);
  const state = createEstimateRevisionFromSnapshot(currentRevisionState(previous), {
    editable_estimate_snapshot: editableEstimateSnapshot,
    source: input.source,
    actor: "user",
    actor_id: input.actor_id,
    event_type: input.event_type,
    row_key: input.row_key,
    before_value: input.before_value,
    after_value: input.after_value,
    reason_ru: input.reason_ru,
    created_at: input.created_at,
  });
  return { ...input.nextBundle, editableEstimateSnapshot, estimateRevisionState: state };
}

export function applyConsumerRepairEstimateRevisionQuantityEdit(input: {
  bundle: ConsumerRepairDraftBundle;
  row_key: string;
  quantity: number;
  actor_id?: string;
  created_at?: string;
}): ConsumerRepairDraftBundle {
  const bundle = ensureConsumerRepairBundleEstimateRevisionState(input.bundle);
  const state = applyEstimateRevisionQuantityEdit(currentRevisionState(bundle), {
    row_key: input.row_key,
    quantity: input.quantity,
    actor_id: input.actor_id,
    created_at: input.created_at,
  });
  return withRevisionSnapshot(bundle, state);
}

export function applyConsumerRepairEstimateRevisionUnitPriceEdit(input: {
  bundle: ConsumerRepairDraftBundle;
  row_key: string;
  unit_price: number | null;
  actor_id?: string;
  created_at?: string;
}): ConsumerRepairDraftBundle {
  const bundle = ensureConsumerRepairBundleEstimateRevisionState(input.bundle);
  const state = applyEstimateRevisionUnitPriceEdit(currentRevisionState(bundle), {
    row_key: input.row_key,
    unit_price: input.unit_price,
    actor_id: input.actor_id,
    created_at: input.created_at,
  });
  return withRevisionSnapshot(bundle, state);
}

export function applyConsumerRepairEstimateRevisionRowRemoval(input: {
  bundle: ConsumerRepairDraftBundle;
  row_key: string;
  actor_id?: string;
  created_at?: string;
}): ConsumerRepairDraftBundle {
  const bundle = ensureConsumerRepairBundleEstimateRevisionState(input.bundle);
  const state = applyEstimateRevisionRowRemoval(currentRevisionState(bundle), {
    row_key: input.row_key,
    actor_id: input.actor_id,
    created_at: input.created_at,
  });
  return withRevisionSnapshot(bundle, state);
}

export function restoreConsumerRepairEstimateRevision(input: {
  bundle: ConsumerRepairDraftBundle;
  source_revision_id: string;
  actor_id?: string;
  created_at?: string;
}): ConsumerRepairDraftBundle {
  const bundle = ensureConsumerRepairBundleEstimateRevisionState(input.bundle);
  const state = restoreEstimateRevisionAsNewRevision({
    state: currentRevisionState(bundle),
    source_revision_id: input.source_revision_id,
    actor_id: input.actor_id,
    created_at: input.created_at,
  });
  return withRevisionSnapshot(bundle, state);
}

export function freezeConsumerRepairEstimateRevision(input: {
  bundle: ConsumerRepairDraftBundle;
  actor_id?: string;
  created_at?: string;
}): ConsumerRepairDraftBundle {
  const bundle = ensureConsumerRepairBundleEstimateRevisionState(input.bundle);
  const state = approveEstimateRevisionState({
    state: currentRevisionState(bundle),
    actor_id: input.actor_id,
    created_at: input.created_at,
  });
  return { ...bundle, estimateRevisionState: state };
}

export function bindConsumerRepairEstimateRevisionPdf(input: {
  bundle: ConsumerRepairDraftBundle;
  pdf_id: string;
  actor_id?: string;
  created_at?: string;
}): { bundle: ConsumerRepairDraftBundle; binding: EstimateRevisionPdfBinding } {
  const bundle = ensureConsumerRepairBundleEstimateRevisionState(input.bundle);
  const { state, binding } = bindEstimateRevisionToPdfExport({
    state: currentRevisionState(bundle),
    pdf_id: input.pdf_id,
    actor_id: input.actor_id,
    created_at: input.created_at,
  });
  return { binding, bundle: { ...bundle, estimateRevisionState: state } };
}

export function bindConsumerRepairEstimateRevisionRequest(input: {
  bundle: ConsumerRepairDraftBundle;
  request_payload_id: string;
  actor_id?: string;
  created_at?: string;
}): ConsumerRepairDraftBundle {
  const bundle = ensureConsumerRepairBundleEstimateRevisionState(input.bundle);
  const { state } = bindEstimateRevisionToRequestPayload({
    state: currentRevisionState(bundle),
    request_payload_id: input.request_payload_id,
    actor_id: input.actor_id,
    created_at: input.created_at,
  });
  return { ...bundle, estimateRevisionState: state };
}

export function bindConsumerRepairEstimateRevisionHistory(input: {
  bundle: ConsumerRepairDraftBundle;
  history_entry_id: string;
  created_at?: string;
}): ConsumerRepairDraftBundle {
  const bundle = ensureConsumerRepairBundleEstimateRevisionState(input.bundle);
  const alreadyBound = bundle.estimateRevisionState?.history_bindings.some((binding) =>
    binding.history_entry_id === input.history_entry_id
  );
  if (alreadyBound) return bundle;
  const { state } = bindEstimateRevisionToHistoryEntry({
    state: currentRevisionState(bundle),
    history_entry_id: input.history_entry_id,
    created_at: input.created_at,
  });
  return { ...bundle, estimateRevisionState: state };
}

export function attachConsumerRepairPdfRevisionMetadata(
  pdf: ConsumerRepairRequestPdf,
  binding: EstimateRevisionPdfBinding,
): ConsumerRepairRequestPdf {
  return {
    ...pdf,
    revisionId: binding.pdf_export_revision_id,
    snapshotId: binding.pdf_snapshot_id,
    revisionRowsHash: binding.pdf_rows_hash,
    revisionTotalsHash: binding.pdf_totals_hash,
    revisionFullSnapshotHash: binding.pdf_full_snapshot_hash,
  };
}
