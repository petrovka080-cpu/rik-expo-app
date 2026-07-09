export const AI_ESTIMATE_REPLAYABLE_CORE_SCHEMA = "ai-estimate-replay-record-v1" as const;

export const AI_ESTIMATE_CATALOG_VERSION = "ai-estimate-catalog-11610-v1" as const;
export const AI_ESTIMATE_NORM_REGISTRY_VERSION = "professional-norm-registry-v1" as const;
export const AI_ESTIMATE_PRICEBOOK_VERSION = "trusted-pricebook-4751-v1" as const;
export const AI_ESTIMATE_CALCULATOR_VERSION = "shared-estimate-core-v1" as const;

export type EstimateReplayHashSet = {
  prompt_hash: string;
  params_hash: string;
  boq_hash: string;
  material_quantity_hash: string;
  snapshot_hash: string;
  costing_hash: string;
  pdf_package_hash: string;
  buyer_handoff_hash: string;
};

export type EstimateReplayVersionLineage = {
  source_sha: string;
  catalog_version: string;
  norm_registry_version: string;
  pricebook_version: string;
  calculator_version: string;
};

export type EstimateReplayRecord = {
  schema: typeof AI_ESTIMATE_REPLAYABLE_CORE_SCHEMA;
  record_id: string;
  case_id: string;
  source_prompt: string;
  selected_template_id: string;
  estimate_draft_id: string;
  revision_id: string;
  snapshot_id: string;
  pdf_artifact_id: string;
  buyer_handoff_id: string;
  created_at: string;
  matched_family: string;
  row_count: number;
  material_rows_count: number;
  work_rows_count: number;
  snapshot_rows_hash: string;
  snapshot_totals_hash: string;
  version_lineage: EstimateReplayVersionLineage;
  hashes: EstimateReplayHashSet;
  replay_record_builder_created: true;
  all_replay_records_have_snapshot: true;
  all_replay_records_have_version_lineage: true;
  fake_green_claimed: false;
};

export type EstimateReplayDriftType =
  | "none"
  | "prompt_or_param_change"
  | "formula_or_catalog_update"
  | "norm_registry_update"
  | "pricebook_update"
  | "artifact_package_update"
  | "buyer_handoff_update";

export type EstimateReplayMismatch = {
  hash_name: keyof EstimateReplayHashSet;
  expected_hash: string;
  actual_hash: string;
  drift_type: EstimateReplayDriftType;
};

export type EstimateReplayComparison = {
  status: "passed" | "failed";
  drift_detected: boolean;
  drift_type: EstimateReplayDriftType;
  expected_record_id: string;
  actual_record_id: string;
  mismatches: EstimateReplayMismatch[];
  mismatch_count: number;
  rows_count_match: boolean;
  material_rows_count_match: boolean;
  work_rows_count_match: boolean;
  snapshot_rows_hash_match: boolean;
  snapshot_totals_hash_match: boolean;
  blocking_reasons: string[];
};

export type EstimateReplayRecordValidation = {
  replay_core_contract_created: true;
  replay_record_builder_created: boolean;
  replay_runner_created: boolean;
  replay_comparator_created: boolean;
  all_replay_records_have_snapshot: boolean;
  all_replay_records_have_version_lineage: boolean;
  valid: boolean;
  failures: string[];
};
