export const AI_ESTIMATE_CHANGE_CONTROL_WAVE =
  "S_AI_ESTIMATE_TEMPLATE_RATE_CATALOG_ONTOLOGY_CHANGE_CONTROL_POINT_OF_NO_RETURN";

export const AI_ESTIMATE_CHANGE_CONTROL_ARTIFACT_DIR = "artifacts/S_AI_ESTIMATE_CHANGE_CONTROL";

export const AI_ESTIMATE_CHANGE_CONTROL_GREEN_STATUS =
  "GREEN_AI_ESTIMATE_TEMPLATE_RATE_CATALOG_ONTOLOGY_CHANGE_CONTROL_READY";

export const AI_ESTIMATE_CHANGE_CONTROL_CLI_STATUS =
  "GREEN_AI_ESTIMATE_CHANGE_CONTROL_OPERATOR_CLI_READY_UI_FOLLOWUP_REQUIRED";

export const AI_ESTIMATE_CHANGE_CONTROL_BLOCKED_STATUS =
  "BLOCKED_AI_ESTIMATE_TEMPLATE_RATE_CATALOG_ONTOLOGY_CHANGE_CONTROL";

export const ESTIMATE_CHANGE_ENTITY_TYPES = [
  "WORLD_ONTOLOGY_DOMAIN",
  "WORLD_ONTOLOGY_OBJECT",
  "WORLD_ONTOLOGY_OPERATION",
  "WORLD_ONTOLOGY_METHOD",
  "WORLD_ONTOLOGY_MATERIAL_SYSTEM",
  "WORK_KEY_MAPPING",
  "PROFESSIONAL_BOQ_RECIPE",
  "GLOBAL_ESTIMATE_TEMPLATE",
  "FORMULA_RULE",
  "UNIT_CONVERSION_RULE",
  "RATEBOOK_ENTRY",
  "SOURCE_EVIDENCE_POLICY",
  "CATALOG_BINDING_POLICY",
  "TAX_RULE",
  "LOCAL_CURRENCY_POLICY",
  "DANGEROUS_WORK_SAFETY_RULE",
  "PDF_ESTIMATE_PAYLOAD_CONTRACT",
  "BOQ_DEPTH_POLICY",
] as const;

export type EstimateChangeEntityType = typeof ESTIMATE_CHANGE_ENTITY_TYPES[number];

export type EstimateChangeStatus =
  | "draft"
  | "validated"
  | "approved"
  | "active"
  | "archived"
  | "rolled_back";

export type EstimateValidationStatus = "passed" | "failed";

export type EstimateApprovalStatus = "approved" | "rejected";

export type EstimateConfigPayload = Record<string, unknown>;

export type EstimateConfigChangeInput = {
  entity_type: EstimateChangeEntityType;
  entity_id: string;
  new_payload: EstimateConfigPayload;
  actor_id: string;
};

export type EstimateConfigDiff = {
  changed_keys: string[];
  added_keys: string[];
  removed_keys: string[];
};

export type EstimateChangeImpactScope = {
  impacted_entity_types: EstimateChangeEntityType[];
  impacted_cases: string[];
  impacted_routes: string[];
  requires_web_smoke: boolean;
  requires_android_api34_smoke: boolean;
  requires_pdf_validation: boolean;
};

export type EstimateConfigChange = {
  id: string;
  entity_type: EstimateChangeEntityType;
  entity_id: string;
  entity_version: string;
  status: EstimateChangeStatus;
  old_payload: EstimateConfigPayload | null;
  new_payload: EstimateConfigPayload;
  diff_summary: EstimateConfigDiff;
  impact_scope: EstimateChangeImpactScope;
  validation_payload: EstimateConfigPayload | null;
  validation_status: EstimateValidationStatus | null;
  validation_artifacts: string[];
  actor_id: string;
  approved_by: string | null;
  approval_comment: string | null;
  rollback_to_version: string | null;
  previous_active_change_id: string | null;
  created_at: string;
  validated_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  rolled_back_at: string | null;
};

export type EstimateValidationIssue = {
  code: string;
  message: string;
  entity_type: EstimateChangeEntityType;
  entity_id: string;
};

export type EstimateValidationRun = {
  id: string;
  change_id: string;
  validation_type: string;
  status: EstimateValidationStatus;
  input_payload: EstimateConfigPayload;
  result_payload: EstimateConfigPayload;
  artifacts: string[];
  failures: EstimateValidationIssue[];
  started_at: string;
  finished_at: string;
};

export type EstimateConfigApproval = {
  id: string;
  change_id: string;
  approved_by: string;
  approval_status: EstimateApprovalStatus;
  approval_comment: string;
  approved_at: string;
};

export type EstimateConfigRollbackEvent = {
  id: string;
  change_id: string;
  rolled_back_by: string;
  rollback_to_change_id: string;
  rollback_reason: string;
  rollback_result: EstimateConfigPayload;
  rolled_back_at: string;
};

export type EstimateConfigActiveVersion = {
  entity_type: EstimateChangeEntityType;
  entity_id: string;
  active_change_id: string;
  active_version: string;
  payload: EstimateConfigPayload;
  activated_at: string;
  activated_by: string;
};

export type EstimateChangeAuditEvent = {
  id: string;
  change_id: string;
  action:
    | "draft_created"
    | "validated"
    | "validation_failed"
    | "approved"
    | "published"
    | "rolled_back"
    | "direct_mutation";
  actor_id: string;
  at: string;
  payload: EstimateConfigPayload;
};

export type EstimateChangeControlStore = {
  changes: EstimateConfigChange[];
  validation_runs: EstimateValidationRun[];
  approvals: EstimateConfigApproval[];
  rollback_events: EstimateConfigRollbackEvent[];
  active_versions: EstimateConfigActiveVersion[];
  audit_log: EstimateChangeAuditEvent[];
};

export type EstimateGoldenCaseResult = {
  case_id: string;
  passed: boolean;
  failures: string[];
};

export type EstimateChangeControlMatrix = {
  wave: typeof AI_ESTIMATE_CHANGE_CONTROL_WAVE;
  final_status: string;
  prerequisite_world_construction_engine_green: boolean;
  prerequisite_50000_live_reality_green: boolean;
  prerequisite_android_api34_green: boolean;
  production_rollout_enabled: false;
  entity_types_controlled: EstimateChangeEntityType[];
  draft_status_ready: boolean;
  validated_status_ready: boolean;
  approved_status_ready: boolean;
  active_status_ready: boolean;
  archived_status_ready: boolean;
  rollback_ready: boolean;
  direct_active_mutation_found: boolean;
  publish_without_validation_found: boolean;
  publish_without_approval_found: boolean;
  mutation_without_audit_found: boolean;
  impact_scope_computed: boolean;
  golden_cases_run_before_publish: boolean;
  failed_golden_case_blocks_publish: boolean;
  template_validation_ready: boolean;
  boq_recipe_validation_ready: boolean;
  formula_validation_ready: boolean;
  rate_source_validation_ready: boolean;
  catalog_binding_validation_ready: boolean;
  tax_rule_source_validation_ready: boolean;
  dangerous_safety_validation_ready: boolean;
  pdf_payload_contract_validation_ready: boolean;
  rollback_restores_previous_active_version: boolean;
  audit_log_written_all_changes: boolean;
  operator_cli_ready: boolean;
  operator_ui_ready: boolean;
  web_change_control_smoke_passed: boolean;
  typecheck_passed: boolean;
  lint_passed: boolean;
  git_diff_check_passed: boolean;
  targeted_tests_passed: boolean;
  architecture_tests_passed: boolean;
  golden_tests_passed: boolean;
  runtime_proof_passed: boolean;
  closeout_audit_passed: boolean;
  full_jest_passed: boolean;
  release_verify_passed: boolean;
  commit_created: boolean;
  branch_pushed: boolean;
  final_worktree_clean: boolean;
  proof_source_fingerprint: string;
  stale_previous_evidence_ignored: boolean;
  current_git_head_pushed: boolean;
  current_worktree_clean: boolean;
  fake_green_claimed: false;
};

export const REQUIRED_AI_ESTIMATE_GOLDEN_CASES = [
  "strip_foundation_48m_width_0_4_depth_1_7",
  "roof_waterproofing_100sqm",
  "bathroom_waterproofing_20sqm",
  "ambiguous_waterproofing_100sqm",
  "hydro_turbine_100kw",
  "brick_masonry_74sqm",
  "gable_roof_100sqm",
  "asphalt_paving_10000sqm",
  "drywall_wall_cladding_352sqm",
  "carpet_laying_100sqm",
  "window_installation",
  "ventilation_cafe_120sqm",
  "electrical_house_180sqm",
  "solar_panels_30kw",
  "well_drilling_80m",
  "manual_catalog_item_addition",
  "request_draft_with_manual_catalog_item",
  "pdf_payload_parity",
  "pdf_cyrillic_readable",
  "dangerous_high_voltage_safe_estimate",
  "gas_work_safe_estimate",
] as const;

export type RequiredAiEstimateGoldenCase = typeof REQUIRED_AI_ESTIMATE_GOLDEN_CASES[number];
