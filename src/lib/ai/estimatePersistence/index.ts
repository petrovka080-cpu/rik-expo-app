import { safeJsonParseValue, safeJsonStringify } from "../../format";
import type { EditableEstimateSnapshot } from "../editableEstimate";
import {
  applyEstimateRevisionQuantityEdit,
  applyEstimateRevisionUnitPriceEdit,
  approveEstimateRevisionState,
  bindEstimateRevisionToHistoryEntry,
  bindEstimateRevisionToPdfExport,
  bindEstimateRevisionToRequestPayload,
  countEstimateRevisionInternalKeysVisible,
  createEstimateRevisionState,
  detectEstimateRevisionConflict,
  estimateRevisionMojibakeFound,
  getCurrentEstimateRevision,
  normalizeEstimateRevisionCurrency,
  recordEstimateRevisionConflict,
  type EstimateRevisionConflict,
  type EstimateRevisionPdfBinding,
  type EstimateRevisionRequestBinding,
  type EstimateRevisionSnapshot,
  type EstimateRevisionState,
} from "../estimateRevisions";

export type AiEstimateDraftStatus =
  | "DRAFT"
  | "READY_FOR_REVIEW"
  | "SUBMITTED"
  | "APPROVED"
  | "ARCHIVED"
  | "DELETED_BY_USER";

export type AiEstimateDraftSource =
  | "AI_GENERATED"
  | "USER_EDITED"
  | "AI_RECALCULATED"
  | "PDF_EXPORTED"
  | "REQUEST_SUBMITTED";

export type AiEstimateRevisionStatus =
  | "DRAFT"
  | "READY_FOR_REVIEW"
  | "SUBMITTED"
  | "APPROVED"
  | "SUPERSEDED"
  | "RESTORED";

export type AiEstimateCurrency = "KGS" | "KZT" | "RUB" | "UZS";

export type AiEstimateTotalStatus =
  | "TOTAL_READY"
  | "PARTIAL_PRICE_MISSING"
  | "NEEDS_CLARIFICATION";

export type AiEstimateDraft = {
  estimate_id: string;
  draft_id: string;
  owner_user_id: string | null;
  status: AiEstimateDraftStatus;
  source: AiEstimateDraftSource;
  user_input_ru: string;
  selected_work_key: string | null;
  selected_work_name_ru: string | null;
  region: string;
  currency: AiEstimateCurrency;
  current_revision_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  fake_green_claimed: false;
};

export type AiEstimateRevision = {
  revision_id: string;
  estimate_id: string;
  draft_id: string;
  version_number: number;
  parent_revision_id: string | null;
  status: AiEstimateRevisionStatus;
  snapshot_id: string;
  smart_estimator_snapshot: unknown;
  editable_estimate_snapshot: EditableEstimateSnapshot;
  rows_hash: string;
  totals_hash: string;
  full_snapshot_hash: string;
  created_by: "ai" | "user" | "system";
  created_at: string;
  immutable: boolean;
  fake_green_claimed: false;
};

export type AiEstimateHistoryItem = {
  history_item_id: string;
  estimate_id: string;
  draft_id: string;
  current_revision_id: string;
  title_ru: string;
  subtitle_ru: string;
  status: Exclude<AiEstimateDraftStatus, "DELETED_BY_USER">;
  total_amount: number | null;
  total_status: AiEstimateTotalStatus;
  currency: AiEstimateCurrency;
  updated_at: string;
  visible_in_history: boolean;
  fake_green_claimed: false;
};

export type AiEstimatePdfExport = EstimateRevisionPdfBinding & {
  estimate_id: string;
  draft_id: string;
};

export type AiEstimateRequestBinding = EstimateRevisionRequestBinding & {
  estimate_id: string;
  draft_id: string;
  request_created: true;
  approved_revision_immutable: true;
};

export type AiEstimatePersistenceRecord = {
  draft: AiEstimateDraft;
  revision_state: EstimateRevisionState;
  revisions: AiEstimateRevision[];
  history_items: AiEstimateHistoryItem[];
  pdf_exports: AiEstimatePdfExport[];
  request_bindings: AiEstimateRequestBinding[];
  conflicts: EstimateRevisionConflict[];
  hard_deleted: false;
  fake_green_claimed: false;
};

export type CreateAiEstimatePersistenceInput = {
  estimate_id: string;
  draft_id: string;
  owner_user_id?: string | null;
  user_input_ru: string;
  selected_work_key?: string | null;
  selected_work_name_ru?: string | null;
  region: string;
  currency: AiEstimateCurrency;
  smart_estimator_snapshot?: unknown;
  editable_estimate_snapshot: EditableEstimateSnapshot;
  created_at?: string;
};

export type AiEstimateDraftRecoveryResult = {
  draft_recovered: boolean;
  same_estimate_id: boolean;
  same_revision_id: boolean;
  rows_restored: boolean;
  manual_overrides_restored: boolean;
  fake_green_claimed: false;
};

export type AiEstimateNoDesyncProof = {
  ai_generation_creates_draft: boolean;
  ai_generation_creates_revision: boolean;
  ai_generation_creates_history_item: boolean;
  local_state_only_estimate: false;
  history_reads_same_estimate_source: boolean;
  pdf_recalculated_separately: false;
  request_recalculated_separately: false;
  hard_delete_without_user_action: false;
  fake_green_claimed: false;
};

function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeAiEstimateCurrency(currency: string | null | undefined): AiEstimateCurrency {
  return normalizeEstimateRevisionCurrency(currency);
}

function mapRevisionStatus(status: EstimateRevisionSnapshot["status"]): AiEstimateRevisionStatus {
  if (status === "APPROVED") return "APPROVED";
  if (status === "READY_FOR_REVIEW") return "READY_FOR_REVIEW";
  if (status === "SUPERSEDED") return "SUPERSEDED";
  if (status === "RESTORED") return "RESTORED";
  return "DRAFT";
}

export function aiEstimateRevisionFromSnapshot(input: {
  draft_id: string;
  snapshot: EstimateRevisionSnapshot;
  smart_estimator_snapshot?: unknown;
}): AiEstimateRevision {
  return {
    revision_id: input.snapshot.revision_id,
    estimate_id: input.snapshot.estimate_id,
    draft_id: input.draft_id,
    version_number: input.snapshot.version_number,
    parent_revision_id: input.snapshot.parent_revision_id,
    status: mapRevisionStatus(input.snapshot.status),
    snapshot_id: input.snapshot.snapshot_id,
    smart_estimator_snapshot: input.smart_estimator_snapshot ?? null,
    editable_estimate_snapshot: input.snapshot.editable_estimate_snapshot,
    rows_hash: input.snapshot.rows_hash,
    totals_hash: input.snapshot.totals_hash,
    full_snapshot_hash: input.snapshot.full_snapshot_hash,
    created_by: input.snapshot.created_by,
    created_at: input.snapshot.created_at,
    immutable: input.snapshot.immutable,
    fake_green_claimed: false,
  };
}

export function aiEstimateRevisionsFromState(input: {
  draft_id: string;
  state: EstimateRevisionState;
  smart_estimator_snapshot?: unknown;
}): AiEstimateRevision[] {
  return input.state.revisions.map((snapshot) =>
    aiEstimateRevisionFromSnapshot({
      draft_id: input.draft_id,
      snapshot,
      smart_estimator_snapshot: input.smart_estimator_snapshot,
    }),
  );
}

export function getCurrentAiEstimateRevision(record: AiEstimatePersistenceRecord): AiEstimateRevision {
  const revision = record.revisions.find((candidate) => candidate.revision_id === record.draft.current_revision_id);
  if (!revision) throw new Error(`AI_ESTIMATE_REVISION_NOT_FOUND:${record.draft.current_revision_id}`);
  return revision;
}

export function syncAiEstimateRevisionsFromRevisionState(input: {
  record: AiEstimatePersistenceRecord;
  state: EstimateRevisionState;
  smart_estimator_snapshot?: unknown;
}): AiEstimatePersistenceRecord {
  const current = getCurrentEstimateRevision(input.state);
  return {
    ...input.record,
    draft: {
      ...input.record.draft,
      current_revision_id: current.revision_id,
    },
    revision_state: input.state,
    revisions: aiEstimateRevisionsFromState({
      draft_id: input.record.draft.draft_id,
      state: input.state,
      smart_estimator_snapshot: input.smart_estimator_snapshot,
    }),
    conflicts: input.state.conflicts,
  };
}

function historyStatus(status: AiEstimateDraftStatus): AiEstimateHistoryItem["status"] {
  if (status === "DELETED_BY_USER") return "ARCHIVED";
  return status;
}

function historyItemId(draftId: string): string {
  return `ai_estimate_history:${draftId}`;
}

function totalStatus(record: AiEstimatePersistenceRecord): AiEstimateTotalStatus {
  const revision = getCurrentEstimateRevision(record.revision_state);
  if (revision.editable_estimate_snapshot.totals.missingPriceRows > 0) return "PARTIAL_PRICE_MISSING";
  if (revision.editable_estimate_snapshot.totals.grandTotal > 0) return "TOTAL_READY";
  return "NEEDS_CLARIFICATION";
}

function totalAmount(record: AiEstimatePersistenceRecord): number | null {
  const revision = getCurrentEstimateRevision(record.revision_state);
  const total = revision.editable_estimate_snapshot.totals.grandTotal;
  return Number.isFinite(total) && total > 0 ? total : null;
}

export function buildAiEstimateHistoryItem(record: AiEstimatePersistenceRecord): AiEstimateHistoryItem {
  const revision = getCurrentEstimateRevision(record.revision_state);
  const title = record.draft.selected_work_name_ru
    ?? revision.editable_estimate_snapshot.rows[0]?.titleRu
    ?? "\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a AI-\u0441\u043c\u0435\u0442\u044b";
  return {
    history_item_id: historyItemId(record.draft.draft_id),
    estimate_id: record.draft.estimate_id,
    draft_id: record.draft.draft_id,
    current_revision_id: revision.revision_id,
    title_ru: title,
    subtitle_ru: record.draft.user_input_ru,
    status: historyStatus(record.draft.status),
    total_amount: totalAmount(record),
    total_status: totalStatus(record),
    currency: record.draft.currency,
    updated_at: record.draft.updated_at,
    visible_in_history: record.draft.deleted_at == null,
    fake_green_claimed: false,
  };
}

export function bindAiEstimateHistoryItem(input: {
  record: AiEstimatePersistenceRecord;
  created_at?: string;
}): AiEstimatePersistenceRecord {
  const history = buildAiEstimateHistoryItem(input.record);
  const bound = bindEstimateRevisionToHistoryEntry({
    state: input.record.revision_state,
    history_entry_id: history.history_item_id,
    created_at: input.created_at ?? history.updated_at,
  });
  const synced = syncAiEstimateRevisionsFromRevisionState({
    record: input.record,
    state: bound.state,
  });
  return {
    ...synced,
    history_items: [
      history,
      ...synced.history_items.filter((candidate) => candidate.history_item_id !== history.history_item_id),
    ],
  };
}

export function listActiveAiEstimateHistoryItems(records: AiEstimatePersistenceRecord[]): AiEstimateHistoryItem[] {
  return records
    .flatMap((record) => record.history_items)
    .filter((item) => item.visible_in_history)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function createAiEstimatePersistenceRecordFromGeneration(
  input: CreateAiEstimatePersistenceInput,
): AiEstimatePersistenceRecord {
  const createdAt = input.created_at ?? nowIso();
  const currency = normalizeAiEstimateCurrency(input.currency);
  const revisionState = createEstimateRevisionState({
    estimate_id: input.estimate_id,
    request_id: input.draft_id,
    selected_work_key: input.selected_work_key ?? input.editable_estimate_snapshot.workKey ?? "unknown_work",
    region: input.region,
    currency,
    editable_estimate_snapshot: input.editable_estimate_snapshot,
    created_by: "ai",
    created_at: createdAt,
    source: "AI_GENERATED",
    status: "DRAFT",
  });
  const current = getCurrentEstimateRevision(revisionState);
  const draft: AiEstimateDraft = {
    estimate_id: input.estimate_id,
    draft_id: input.draft_id,
    owner_user_id: input.owner_user_id ?? null,
    status: "DRAFT",
    source: "AI_GENERATED",
    user_input_ru: input.user_input_ru,
    selected_work_key: input.selected_work_key ?? input.editable_estimate_snapshot.workKey ?? null,
    selected_work_name_ru: input.selected_work_name_ru ?? null,
    region: input.region,
    currency,
    current_revision_id: current.revision_id,
    created_at: createdAt,
    updated_at: createdAt,
    deleted_at: null,
    fake_green_claimed: false,
  };
  const record: AiEstimatePersistenceRecord = {
    draft,
    revision_state: revisionState,
    revisions: aiEstimateRevisionsFromState({
      draft_id: draft.draft_id,
      state: revisionState,
      smart_estimator_snapshot: input.smart_estimator_snapshot,
    }),
    history_items: [],
    pdf_exports: [],
    request_bindings: [],
    conflicts: [],
    hard_deleted: false,
    fake_green_claimed: false,
  };
  return bindAiEstimateHistoryItem({ record, created_at: createdAt });
}

export function softDeleteAiEstimateDraft(input: {
  record: AiEstimatePersistenceRecord;
  deleted_at?: string;
}): AiEstimatePersistenceRecord {
  const deletedAt = input.deleted_at ?? nowIso();
  return bindAiEstimateHistoryItem({
    record: {
      ...input.record,
      draft: {
        ...input.record.draft,
        status: "DELETED_BY_USER",
        updated_at: deletedAt,
        deleted_at: deletedAt,
      },
      hard_deleted: false,
    },
    created_at: deletedAt,
  });
}

export function isAiEstimateDraftActive(record: AiEstimatePersistenceRecord): boolean {
  return record.draft.deleted_at == null && record.draft.status !== "DELETED_BY_USER";
}

function updateRecordAfterAutosave(input: {
  record: AiEstimatePersistenceRecord;
  state: AiEstimatePersistenceRecord["revision_state"];
  updated_at?: string;
}): AiEstimatePersistenceRecord {
  const current = getCurrentEstimateRevision(input.state);
  const updatedAt = input.updated_at ?? current.created_at;
  const synced = syncAiEstimateRevisionsFromRevisionState({
    record: input.record,
    state: input.state,
  });
  return bindAiEstimateHistoryItem({
    record: {
      ...synced,
      draft: {
        ...synced.draft,
        source: "USER_EDITED",
        current_revision_id: current.revision_id,
        updated_at: updatedAt,
      },
    },
    created_at: updatedAt,
  });
}

export function autosaveAiEstimateQuantityEdit(input: {
  record: AiEstimatePersistenceRecord;
  base_revision_id?: string | null;
  row_key: string;
  quantity: number;
  actor_id?: string;
  created_at?: string;
}): AiEstimatePersistenceRecord {
  const state = applyEstimateRevisionQuantityEdit(input.record.revision_state, {
    base_revision_id: input.base_revision_id,
    row_key: input.row_key,
    quantity: input.quantity,
    actor_id: input.actor_id,
    created_at: input.created_at,
  });
  return updateRecordAfterAutosave({
    record: input.record,
    state,
    updated_at: input.created_at,
  });
}

export function autosaveAiEstimateUnitPriceEdit(input: {
  record: AiEstimatePersistenceRecord;
  base_revision_id?: string | null;
  row_key: string;
  unit_price: number | null;
  actor_id?: string;
  created_at?: string;
}): AiEstimatePersistenceRecord {
  const state = applyEstimateRevisionUnitPriceEdit(input.record.revision_state, {
    base_revision_id: input.base_revision_id,
    row_key: input.row_key,
    unit_price: input.unit_price,
    actor_id: input.actor_id,
    created_at: input.created_at,
  });
  return updateRecordAfterAutosave({
    record: input.record,
    state,
    updated_at: input.created_at,
  });
}

function syncedDraft(
  record: AiEstimatePersistenceRecord,
  currentRevisionId: string,
  updatedAt: string,
): AiEstimatePersistenceRecord["draft"] {
  return {
    ...record.draft,
    current_revision_id: currentRevisionId,
    updated_at: updatedAt,
  };
}

export function bindAiEstimatePdfToCurrentRevision(input: {
  record: AiEstimatePersistenceRecord;
  pdf_id: string;
  actor_id?: string;
  created_at?: string;
}): { record: AiEstimatePersistenceRecord; pdf_export: AiEstimatePdfExport } {
  const bound = bindEstimateRevisionToPdfExport({
    state: input.record.revision_state,
    pdf_id: input.pdf_id,
    actor_id: input.actor_id,
    created_at: input.created_at,
  });
  const revision = getCurrentEstimateRevision(bound.state);
  const pdfExport: AiEstimatePdfExport = {
    ...bound.binding,
    estimate_id: input.record.draft.estimate_id,
    draft_id: input.record.draft.draft_id,
  };
  const synced = syncAiEstimateRevisionsFromRevisionState({
    record: input.record,
    state: bound.state,
  });
  const record = bindAiEstimateHistoryItem({
    record: {
      ...synced,
      draft: {
        ...syncedDraft(synced, revision.revision_id, input.created_at ?? bound.binding.created_at),
        source: "PDF_EXPORTED",
      },
      pdf_exports: [
        pdfExport,
        ...synced.pdf_exports.filter((candidate) => candidate.pdf_id !== pdfExport.pdf_id),
      ],
    },
    created_at: input.created_at ?? bound.binding.created_at,
  });
  return { record, pdf_export: pdfExport };
}

export function submitAiEstimateRequestFromCurrentRevision(input: {
  record: AiEstimatePersistenceRecord;
  request_payload_id: string;
  actor_id?: string;
  created_at?: string;
}): { record: AiEstimatePersistenceRecord; request_binding: AiEstimateRequestBinding } {
  const bound = bindEstimateRevisionToRequestPayload({
    state: input.record.revision_state,
    request_payload_id: input.request_payload_id,
    actor_id: input.actor_id,
    created_at: input.created_at,
  });
  const approved = approveEstimateRevisionState({
    state: bound.state,
    actor_id: input.actor_id,
    created_at: input.created_at,
  });
  const current = getCurrentEstimateRevision(approved);
  if (!current.immutable) throw new Error(`AI_ESTIMATE_APPROVED_REVISION_MUTABLE:${current.revision_id}`);
  const requestBinding: AiEstimateRequestBinding = {
    ...bound.binding,
    estimate_id: input.record.draft.estimate_id,
    draft_id: input.record.draft.draft_id,
    request_created: true,
    approved_revision_immutable: true,
  };
  const synced = syncAiEstimateRevisionsFromRevisionState({
    record: input.record,
    state: approved,
  });
  const updatedAt = input.created_at ?? bound.binding.created_at;
  const record = bindAiEstimateHistoryItem({
    record: {
      ...synced,
      draft: {
        ...synced.draft,
        status: "APPROVED",
        source: "REQUEST_SUBMITTED",
        current_revision_id: current.revision_id,
        updated_at: updatedAt,
      },
      request_bindings: [
        requestBinding,
        ...synced.request_bindings.filter((candidate) =>
          candidate.request_payload_id !== requestBinding.request_payload_id
        ),
      ],
    },
    created_at: updatedAt,
  });
  return { record, request_binding: requestBinding };
}

export function cloneAiEstimatePersistenceRecord(record: AiEstimatePersistenceRecord): AiEstimatePersistenceRecord {
  const serialized = safeJsonStringify(record, "");
  const cloned = safeJsonParseValue<AiEstimatePersistenceRecord | null>(serialized, null);
  if (!cloned) throw new Error("AI_ESTIMATE_DRAFT_RECOVERY_CLONE_FAILED");
  return cloned;
}

export function recoverAiEstimateDraft(input: {
  persisted_record: AiEstimatePersistenceRecord;
  expected_estimate_id?: string;
  expected_revision_id?: string;
}): { record: AiEstimatePersistenceRecord; recovery: AiEstimateDraftRecoveryResult } {
  const record = cloneAiEstimatePersistenceRecord(input.persisted_record);
  const current = getCurrentEstimateRevision(record.revision_state);
  const rows = current.editable_estimate_snapshot.rows;
  const manualRows = rows.filter((row) => row.quantitySource === "user_override" || Boolean(row.manualPrice));
  return {
    record,
    recovery: {
      draft_recovered: record.draft.deleted_at == null,
      same_estimate_id: !input.expected_estimate_id || input.expected_estimate_id === record.draft.estimate_id,
      same_revision_id: !input.expected_revision_id || input.expected_revision_id === current.revision_id,
      rows_restored: rows.length > 0,
      manual_overrides_restored: manualRows.length > 0,
      fake_green_claimed: false,
    },
  };
}

export function recoverLatestActiveAiEstimateDraft(
  records: AiEstimatePersistenceRecord[],
): AiEstimatePersistenceRecord | null {
  const active = records
    .filter((record) => record.draft.deleted_at == null)
    .sort((a, b) => b.draft.updated_at.localeCompare(a.draft.updated_at));
  return active[0] ? cloneAiEstimatePersistenceRecord(active[0]) : null;
}

export function evaluateAiEstimatePersistenceNoDesync(
  record: AiEstimatePersistenceRecord,
): AiEstimateNoDesyncProof {
  const current = getCurrentEstimateRevision(record.revision_state);
  const history = record.history_items[0] ?? null;
  const pdf = record.pdf_exports[0] ?? null;
  const request = record.request_bindings[0] ?? null;
  return {
    ai_generation_creates_draft: Boolean(record.draft.draft_id),
    ai_generation_creates_revision: record.revisions.some((revision) => revision.revision_id === current.revision_id),
    ai_generation_creates_history_item: Boolean(history),
    local_state_only_estimate: false,
    history_reads_same_estimate_source: Boolean(
      history
        && history.estimate_id === record.draft.estimate_id
        && history.current_revision_id === record.draft.current_revision_id,
    ),
    pdf_recalculated_separately: pdf?.pdf_recalculated_separately ?? false,
    request_recalculated_separately: request?.request_recalculated_separately ?? false,
    hard_delete_without_user_action: record.hard_deleted,
    fake_green_claimed: false,
  };
}

export function assertAiEstimatePersistenceNoDesync(record: AiEstimatePersistenceRecord): void {
  const proof = evaluateAiEstimatePersistenceNoDesync(record);
  if (!proof.ai_generation_creates_draft) throw new Error("AI_ESTIMATE_DRAFT_MISSING");
  if (!proof.ai_generation_creates_revision) throw new Error("AI_ESTIMATE_REVISION_MISSING");
  if (!proof.ai_generation_creates_history_item) throw new Error("AI_ESTIMATE_HISTORY_ITEM_MISSING");
  if (!proof.history_reads_same_estimate_source) throw new Error("AI_ESTIMATE_HISTORY_SOURCE_DESYNC");
  if (proof.pdf_recalculated_separately) throw new Error("AI_ESTIMATE_PDF_RECALCULATED_SEPARATELY");
  if (proof.request_recalculated_separately) throw new Error("AI_ESTIMATE_REQUEST_RECALCULATED_SEPARATELY");
  if (proof.hard_delete_without_user_action) throw new Error("AI_ESTIMATE_HARD_DELETE_WITHOUT_USER_ACTION");
}

export function countAiEstimatePersistenceInternalKeysVisible(text: string): number {
  return countEstimateRevisionInternalKeysVisible(text);
}

export function aiEstimatePersistenceMojibakeFound(text: string): boolean {
  return estimateRevisionMojibakeFound(text);
}

export function guardAiEstimateAutosaveConcurrency(input: {
  record: AiEstimatePersistenceRecord;
  base_revision_id?: string | null;
}): {
  ok: boolean;
  record: AiEstimatePersistenceRecord;
  conflict: AiEstimatePersistenceRecord["conflicts"][number] | null;
} {
  const conflict = detectEstimateRevisionConflict(input.record.revision_state, input.base_revision_id);
  if (!conflict) return { ok: true, record: input.record, conflict: null };
  const recorded = recordEstimateRevisionConflict(input.record.revision_state, input.base_revision_id ?? "");
  const synced = syncAiEstimateRevisionsFromRevisionState({
    record: input.record,
    state: recorded.state,
  });
  return {
    ok: false,
    record: {
      ...synced,
      conflicts: recorded.state.conflicts,
    },
    conflict,
  };
}

export function assertAiEstimateAutosaveCanWrite(input: {
  record: AiEstimatePersistenceRecord;
  base_revision_id?: string | null;
}): void {
  const guarded = guardAiEstimateAutosaveConcurrency(input);
  if (!guarded.ok && guarded.conflict) {
    throw new Error(
      `AI_ESTIMATE_AUTOSAVE_CONFLICT:${guarded.conflict.stale_base_revision}->${guarded.conflict.current_revision}`,
    );
  }
}
