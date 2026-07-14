import {
  applyEditableEstimateOverride,
  mergeEditableEstimateSnapshotWithAiRecalculation,
  refreshEditableEstimateSnapshot,
  type EditableEstimateRow,
  type EditableEstimateSnapshot,
} from "../editableEstimate";
import { createEstimateRevisionEvent } from "./estimateRevisionEvents";
import { diffEstimateRevisions } from "./estimateRevisionDiff";
import {
  assertEstimateRevisionCanWrite,
  detectEstimateRevisionConflict,
  getCurrentEstimateRevision,
  getEstimateRevisionById,
} from "./estimateRevisionConcurrency";
import {
  assertEstimateRevisionStateIntegrity,
  attachEstimateRevisionHashes,
  normalizeEstimateRevisionCurrency,
} from "./estimateRevisionIntegrityGuard";
import type {
  CreateEstimateRevisionFromSnapshotInput,
  CreateEstimateRevisionStateInput,
  EstimateRevisionConflict,
  EstimateRevisionEventType,
  EstimateRevisionSnapshot,
  EstimateRevisionState,
} from "./estimateRevisionTypes";

function revisionId(estimateId: string, version: number): string {
  return `estimate_revision:${estimateId}:v${version}`;
}

function snapshotId(estimateId: string, version: number, editableSnapshot: EditableEstimateSnapshot): string {
  return `estimate_revision_snapshot:${estimateId}:v${version}:${editableSnapshot.hash}`;
}

function nextVersion(state: EstimateRevisionState): number {
  return Math.max(0, ...state.revisions.map((revision) => revision.version_number)) + 1;
}

function createRevisionSnapshot(input: CreateEstimateRevisionStateInput & {
  version_number: number;
  parent_revision_id: string | null;
}): EstimateRevisionSnapshot {
  const createdAt = input.created_at ?? new Date().toISOString();
  return attachEstimateRevisionHashes({
    revision_id: revisionId(input.estimate_id, input.version_number),
    snapshot_id: snapshotId(input.estimate_id, input.version_number, input.editable_estimate_snapshot),
    estimate_id: input.estimate_id,
    request_id: input.request_id,
    version_number: input.version_number,
    parent_revision_id: input.parent_revision_id,
    status: input.status ?? "DRAFT",
    source: input.source ?? "AI_GENERATED",
    selected_work_key: input.selected_work_key,
    region: input.region,
    currency: normalizeEstimateRevisionCurrency(input.currency),
    editable_estimate_snapshot: refreshEditableEstimateSnapshot(input.editable_estimate_snapshot),
    created_by: input.created_by ?? "ai",
    created_at: createdAt,
    immutable: true,
    fake_green_claimed: false,
  });
}

export function createEstimateRevisionState(input: CreateEstimateRevisionStateInput): EstimateRevisionState {
  const revision = createRevisionSnapshot({
    ...input,
    version_number: 1,
    parent_revision_id: null,
    source: input.source ?? "AI_GENERATED",
    status: input.status ?? "DRAFT",
    created_by: input.created_by ?? "ai",
  });
  const state: EstimateRevisionState = {
    estimate_id: input.estimate_id,
    request_id: input.request_id,
    current_revision_id: revision.revision_id,
    revisions: [revision],
    events: [
      createEstimateRevisionEvent({
        revision_id: revision.revision_id,
        estimate_id: revision.estimate_id,
        event_type: "AI_ESTIMATE_CREATED",
        event_index: 1,
        actor: input.created_by ?? "ai",
        after_value: { snapshot_id: revision.snapshot_id, rows_hash: revision.rows_hash },
        reason_ru: "\u041f\u0435\u0440\u0432\u0430\u044f \u0440\u0435\u0432\u0438\u0437\u0438\u044f \u0441\u043c\u0435\u0442\u044b.",
        created_at: revision.created_at,
      }),
    ],
    diffs: [],
    pdf_exports: [],
    request_bindings: [],
    history_bindings: [],
    approval_freezes: [],
    conflicts: [],
    fake_green_claimed: false,
  };
  assertEstimateRevisionStateIntegrity(state);
  return state;
}

export function createEstimateRevisionFromSnapshot(
  state: EstimateRevisionState,
  input: CreateEstimateRevisionFromSnapshotInput,
): EstimateRevisionState {
  assertEstimateRevisionCanWrite(state, input.base_revision_id);
  const parent = input.base_revision_id
    ? getEstimateRevisionById(state, input.base_revision_id)
    : getCurrentEstimateRevision(state);
  const version = nextVersion(state);
  const revision = createRevisionSnapshot({
    estimate_id: state.estimate_id,
    request_id: state.request_id,
    selected_work_key: parent.selected_work_key,
    region: parent.region,
    currency: parent.currency,
    editable_estimate_snapshot: input.editable_estimate_snapshot,
    version_number: version,
    parent_revision_id: parent.revision_id,
    status: input.status ?? "DRAFT",
    source: input.source,
    created_by: input.actor,
    created_at: input.created_at,
  });
  const diff = diffEstimateRevisions(parent, revision);
  const next: EstimateRevisionState = {
    ...state,
    current_revision_id: revision.revision_id,
    revisions: [...state.revisions, revision],
    diffs: [...state.diffs, diff],
    events: [
      ...state.events,
      createEstimateRevisionEvent({
        revision_id: revision.revision_id,
        estimate_id: revision.estimate_id,
        event_type: input.event_type,
        event_index: state.events.length + 1,
        row_key: input.row_key,
        before_value: input.before_value,
        after_value: input.after_value,
        actor: input.actor,
        actor_id: input.actor_id,
        reason_ru: input.reason_ru,
        created_at: revision.created_at,
      }),
    ],
  };
  assertEstimateRevisionStateIntegrity(next);
  return next;
}

function rowById(snapshot: EditableEstimateSnapshot, rowId: string): EditableEstimateRow {
  const row = snapshot.rows.find((candidate) => candidate.rowId === rowId || candidate.requestItemId === rowId);
  if (!row) throw new Error(`ESTIMATE_REVISION_ROW_NOT_FOUND:${rowId}`);
  return row;
}

export function applyEstimateRevisionQuantityEdit(state: EstimateRevisionState, input: {
  base_revision_id?: string | null;
  row_key: string;
  quantity: number;
  actor_id?: string;
  reason_ru?: string;
  created_at?: string;
}): EstimateRevisionState {
  const base = input.base_revision_id ? getEstimateRevisionById(state, input.base_revision_id) : getCurrentEstimateRevision(state);
  const before = rowById(base.editable_estimate_snapshot, input.row_key);
  const edited = applyEditableEstimateOverride(base.editable_estimate_snapshot, {
    rowId: before.rowId,
    quantity: input.quantity,
    actorUserId: input.actor_id,
    reason: "estimate_revision_quantity_edit",
    at: input.created_at,
  });
  return createEstimateRevisionFromSnapshot(state, {
    base_revision_id: input.base_revision_id,
    editable_estimate_snapshot: edited,
    source: "USER_EDITED",
    actor: "user",
    actor_id: input.actor_id,
    event_type: "QUANTITY_CHANGED",
    row_key: input.row_key,
    before_value: before.quantity,
    after_value: input.quantity,
    reason_ru: input.reason_ru ?? "\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u043e \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e.",
    created_at: input.created_at,
  });
}

export function applyEstimateRevisionUnitPriceEdit(state: EstimateRevisionState, input: {
  base_revision_id?: string | null;
  row_key: string;
  unit_price: number | null;
  actor_id?: string;
  reason_ru?: string;
  created_at?: string;
}): EstimateRevisionState {
  const base = input.base_revision_id ? getEstimateRevisionById(state, input.base_revision_id) : getCurrentEstimateRevision(state);
  const before = rowById(base.editable_estimate_snapshot, input.row_key);
  const edited = applyEditableEstimateOverride(base.editable_estimate_snapshot, {
    rowId: before.rowId,
    unitPrice: input.unit_price,
    actorUserId: input.actor_id,
    reason: "estimate_revision_unit_price_edit",
    at: input.created_at,
  });
  return createEstimateRevisionFromSnapshot(state, {
    base_revision_id: input.base_revision_id,
    editable_estimate_snapshot: edited,
    source: "USER_EDITED",
    actor: "user",
    actor_id: input.actor_id,
    event_type: "UNIT_PRICE_CHANGED",
    row_key: input.row_key,
    before_value: before.unitPrice,
    after_value: input.unit_price,
    reason_ru: input.reason_ru ?? "\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0430 \u0446\u0435\u043d\u0430.",
    created_at: input.created_at,
  });
}

function updateRow(
  snapshot: EditableEstimateSnapshot,
  rowId: string,
  createdAt: string | undefined,
  update: (row: EditableEstimateRow) => EditableEstimateRow,
): EditableEstimateSnapshot {
  const rows = snapshot.rows.map((row) => row.rowId === rowId || row.requestItemId === rowId ? update(row) : row);
  return refreshEditableEstimateSnapshot({ ...snapshot, rows, updatedAt: createdAt ?? new Date().toISOString() });
}

export function applyEstimateRevisionRowRemoval(state: EstimateRevisionState, input: {
  base_revision_id?: string | null;
  row_key: string;
  actor_id?: string;
  created_at?: string;
}): EstimateRevisionState {
  const base = input.base_revision_id ? getEstimateRevisionById(state, input.base_revision_id) : getCurrentEstimateRevision(state);
  const before = rowById(base.editable_estimate_snapshot, input.row_key);
  const edited = updateRow(base.editable_estimate_snapshot, before.rowId, input.created_at, (row) => ({ ...row, removed: true }));
  return createEstimateRevisionFromSnapshot(state, {
    base_revision_id: input.base_revision_id,
    editable_estimate_snapshot: edited,
    source: "USER_EDITED",
    actor: "user",
    actor_id: input.actor_id,
    event_type: "ROW_REMOVED",
    row_key: input.row_key,
    before_value: { removed: before.removed === true },
    after_value: { removed: true },
    reason_ru: "\u0421\u0442\u0440\u043e\u043a\u0430 \u0443\u0434\u0430\u043b\u0435\u043d\u0430.",
    created_at: input.created_at,
  });
}

export function applyEstimateRevisionRowRestore(state: EstimateRevisionState, input: {
  base_revision_id?: string | null;
  row_key: string;
  actor_id?: string;
  created_at?: string;
}): EstimateRevisionState {
  const base = input.base_revision_id ? getEstimateRevisionById(state, input.base_revision_id) : getCurrentEstimateRevision(state);
  const before = rowById(base.editable_estimate_snapshot, input.row_key);
  const edited = updateRow(base.editable_estimate_snapshot, before.rowId, input.created_at, (row) => ({ ...row, removed: false }));
  return createEstimateRevisionFromSnapshot(state, {
    base_revision_id: input.base_revision_id,
    editable_estimate_snapshot: edited,
    source: "USER_EDITED",
    actor: "user",
    actor_id: input.actor_id,
    event_type: "ROW_RESTORED",
    row_key: input.row_key,
    before_value: { removed: before.removed === true },
    after_value: { removed: false },
    reason_ru: "\u0421\u0442\u0440\u043e\u043a\u0430 \u0432\u0435\u0440\u043d\u0443\u0442\u0430.",
    created_at: input.created_at,
  });
}

export function applyEstimateRevisionCatalogSelection(state: EstimateRevisionState, input: {
  base_revision_id?: string | null;
  row_key: string;
  catalog_item_id: string;
  source_id?: string | null;
  source_label?: string | null;
  unit_price?: number | null;
  actor_id?: string;
  created_at?: string;
}): EstimateRevisionState {
  const base = input.base_revision_id ? getEstimateRevisionById(state, input.base_revision_id) : getCurrentEstimateRevision(state);
  const before = rowById(base.editable_estimate_snapshot, input.row_key);
  const edited = updateRow(base.editable_estimate_snapshot, before.rowId, input.created_at, (row) => {
    const unitPrice = input.unit_price === undefined ? row.unitPrice : input.unit_price;
    const totalPrice = row.quantity != null && unitPrice != null ? Math.round(row.quantity * unitPrice * 100) / 100 : null;
    return {
      ...row,
      catalogItemId: input.catalog_item_id,
      selectedCatalogItemId: input.catalog_item_id,
      unitPrice,
      totalPrice,
      priceStatus: unitPrice == null ? row.priceStatus : "CATALOG_PRICE_VERIFIED",
      priceSource: unitPrice == null ? row.priceSource : "catalog_item",
      priceSourceId: input.source_id ?? input.catalog_item_id,
      priceSourceLabel: input.source_label ?? "\u043a\u0430\u0442\u0430\u043b\u043e\u0433",
      sourceId: input.source_id ?? row.sourceId,
      sourceLabel: input.source_label ?? row.sourceLabel,
      manualPrice: null,
    };
  });
  return createEstimateRevisionFromSnapshot(state, {
    base_revision_id: input.base_revision_id,
    editable_estimate_snapshot: edited,
    source: "CATALOG_SELECTED",
    actor: "user",
    actor_id: input.actor_id,
    event_type: "CATALOG_ITEM_SELECTED",
    row_key: input.row_key,
    before_value: before.catalogItemId ?? before.selectedCatalogItemId ?? null,
    after_value: input.catalog_item_id,
    reason_ru: "\u0412\u044b\u0431\u0440\u0430\u043d \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430.",
    created_at: input.created_at,
  });
}

export function applyEstimateRevisionAiRecalculation(state: EstimateRevisionState, input: {
  base_revision_id?: string | null;
  ai_snapshot: EditableEstimateSnapshot;
  created_at?: string;
}): EstimateRevisionState {
  const base = input.base_revision_id ? getEstimateRevisionById(state, input.base_revision_id) : getCurrentEstimateRevision(state);
  const merged = mergeEditableEstimateSnapshotWithAiRecalculation({
    previousSnapshot: base.editable_estimate_snapshot,
    aiSnapshot: input.ai_snapshot,
    at: input.created_at,
  });
  return createEstimateRevisionFromSnapshot(state, {
    base_revision_id: input.base_revision_id,
    editable_estimate_snapshot: merged,
    source: "AI_RECALCULATED",
    actor: "ai",
    event_type: "AI_RECALCULATED",
    before_value: { rows_hash: base.rows_hash },
    after_value: { hash: merged.hash },
    reason_ru: "AI \u043f\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u043b, \u0440\u0443\u0447\u043d\u044b\u0435 \u043f\u0440\u0430\u0432\u043a\u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u044b.",
    created_at: input.created_at,
  });
}

export function recordEstimateRevisionConflict(
  state: EstimateRevisionState,
  baseRevisionId: string,
): { state: EstimateRevisionState; conflict: EstimateRevisionConflict | null } {
  const conflict = detectEstimateRevisionConflict(state, baseRevisionId);
  if (!conflict) return { state, conflict: null };
  const current = getCurrentEstimateRevision(state);
  return {
    conflict,
    state: {
      ...state,
      conflicts: [...state.conflicts, conflict],
      events: [
        ...state.events,
        createEstimateRevisionEvent({
          revision_id: current.revision_id,
          estimate_id: current.estimate_id,
          event_type: "REVISION_CONFLICT_DETECTED",
          event_index: state.events.length + 1,
          actor: "system",
          before_value: { stale_base_revision_id: baseRevisionId },
          after_value: conflict,
          reason_ru: "\u0417\u0430\u043f\u0438\u0441\u044c \u0441\u0442\u0430\u0440\u043e\u0439 \u0440\u0435\u0432\u0438\u0437\u0438\u0438 \u0437\u0430\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u043d\u0430.",
        }),
      ],
    },
  };
}

export function latestEstimateRevisionEventType(state: EstimateRevisionState): EstimateRevisionEventType | null {
  return state.events[state.events.length - 1]?.event_type ?? null;
}
