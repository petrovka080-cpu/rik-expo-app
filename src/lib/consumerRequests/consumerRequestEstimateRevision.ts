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
import {
  applyEditableEstimateSnapshotToConsumerRepairBundle,
  buildEditableEstimateSnapshotFromConsumerRepairBundle,
} from "./consumerRequestEditableEstimateSnapshot";
import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestPdf,
} from "./consumerRequestTypes";

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
