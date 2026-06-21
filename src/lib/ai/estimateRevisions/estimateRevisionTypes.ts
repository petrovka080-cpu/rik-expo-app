import type { EditableEstimateSnapshot } from "../editableEstimate";

export type EstimateRevisionStatus =
  | "DRAFT"
  | "READY_FOR_REVIEW"
  | "APPROVED"
  | "SUPERSEDED"
  | "RESTORED"
  | "ARCHIVED";

export type EstimateRevisionSource =
  | "AI_GENERATED"
  | "USER_EDITED"
  | "AI_RECALCULATED"
  | "CATALOG_SELECTED"
  | "PHOTO_MATERIAL_BOUND"
  | "RESTORED_FROM_REVISION"
  | "APPROVED_FREEZE";

export type EstimateRevisionCurrency = "KGS" | "KZT" | "RUB" | "UZS";

export type EstimateRevisionActor = "user" | "ai" | "system";

export type EstimateRevisionEventType =
  | "AI_ESTIMATE_CREATED"
  | "QUANTITY_CHANGED"
  | "UNIT_PRICE_CHANGED"
  | "ROW_ADDED"
  | "ROW_REMOVED"
  | "ROW_RESTORED"
  | "CATALOG_ITEM_SELECTED"
  | "PHOTO_MATERIAL_PRODUCT_BOUND"
  | "AI_RECALCULATED"
  | "REVISION_RESTORED"
  | "PDF_EXPORTED"
  | "REQUEST_SUBMITTED"
  | "APPROVED"
  | "APPROVAL_REVOKED"
  | "REVISION_CONFLICT_DETECTED";

export type EstimateRevisionSnapshot = {
  revision_id: string;
  snapshot_id: string;
  estimate_id: string;
  request_id?: string;
  version_number: number;
  parent_revision_id: string | null;
  status: EstimateRevisionStatus;
  source: EstimateRevisionSource;
  selected_work_key: string;
  region: string;
  currency: EstimateRevisionCurrency;
  rows_hash: string;
  totals_hash: string;
  full_snapshot_hash: string;
  editable_estimate_snapshot: EditableEstimateSnapshot;
  created_by: EstimateRevisionActor;
  created_at: string;
  immutable: boolean;
  fake_green_claimed: false;
};

export type EstimateRevisionEvent = {
  event_id: string;
  revision_id: string;
  estimate_id: string;
  event_type: EstimateRevisionEventType;
  row_key?: string;
  before_value?: unknown;
  after_value?: unknown;
  actor: EstimateRevisionActor;
  actor_id?: string;
  reason_ru?: string;
  created_at: string;
};

export type EstimateRevisionDiff = {
  from_revision_id: string;
  to_revision_id: string;
  changed_rows: {
    row_key: string;
    change_type:
      | "QUANTITY_CHANGED"
      | "PRICE_CHANGED"
      | "ROW_ADDED"
      | "ROW_REMOVED"
      | "CATALOG_CHANGED"
      | "STATUS_CHANGED";
    before_ru: string;
    after_ru: string;
  }[];
  total_before: number | null;
  total_after: number | null;
  total_delta: number | null;
  currency: string;
};

export type EstimateRevisionPdfBinding = {
  pdf_id: string;
  pdf_export_revision_id: string;
  pdf_snapshot_id: string;
  pdf_rows_hash: string;
  pdf_totals_hash: string;
  pdf_full_snapshot_hash: string;
  pdf_recalculated_separately: false;
  created_at: string;
  fake_green_claimed: false;
};

export type EstimateRevisionRequestBinding = {
  request_payload_id: string;
  request_revision_id: string;
  request_snapshot_id: string;
  request_rows_hash: string;
  request_totals_hash: string;
  request_recalculated_separately: false;
  created_at: string;
  fake_green_claimed: false;
};

export type EstimateRevisionHistoryBinding = {
  history_entry_id: string;
  history_revision_id: string;
  history_snapshot_id: string;
  history_rows_hash: string;
  history_totals_hash: string;
  history_recalculated_separately: false;
  created_at: string;
  fake_green_claimed: false;
};

export type EstimateRevisionApprovalFreeze = {
  freeze_id: string;
  approved_revision_id: string;
  approved_snapshot_id: string;
  approved_full_snapshot_hash: string;
  approved_rows_hash: string;
  approved_totals_hash: string;
  actor_id?: string;
  created_at: string;
  immutable: true;
  fake_green_claimed: false;
};

export type EstimateRevisionConflict = {
  status: "REVISION_CONFLICT";
  stale_base_revision: number;
  stale_base_revision_id: string;
  current_revision: number;
  current_revision_id: string;
  silent_overwrite: false;
  merge_or_reload_prompt_required: true;
  fake_green_claimed: false;
};

export type EstimateRevisionState = {
  estimate_id: string;
  request_id?: string;
  current_revision_id: string;
  revisions: EstimateRevisionSnapshot[];
  events: EstimateRevisionEvent[];
  diffs: EstimateRevisionDiff[];
  pdf_exports: EstimateRevisionPdfBinding[];
  request_bindings: EstimateRevisionRequestBinding[];
  history_bindings: EstimateRevisionHistoryBinding[];
  approval_freezes: EstimateRevisionApprovalFreeze[];
  conflicts: EstimateRevisionConflict[];
  fake_green_claimed: false;
};

export type CreateEstimateRevisionStateInput = {
  estimate_id: string;
  request_id?: string;
  selected_work_key: string;
  region: string;
  currency: EstimateRevisionCurrency;
  editable_estimate_snapshot: EditableEstimateSnapshot;
  created_by?: EstimateRevisionActor;
  created_at?: string;
  source?: EstimateRevisionSource;
  status?: EstimateRevisionStatus;
};

export type CreateEstimateRevisionFromSnapshotInput = {
  base_revision_id?: string | null;
  editable_estimate_snapshot: EditableEstimateSnapshot;
  source: EstimateRevisionSource;
  status?: EstimateRevisionStatus;
  actor: EstimateRevisionActor;
  actor_id?: string;
  event_type: EstimateRevisionEventType;
  row_key?: string;
  before_value?: unknown;
  after_value?: unknown;
  reason_ru?: string;
  created_at?: string;
};
