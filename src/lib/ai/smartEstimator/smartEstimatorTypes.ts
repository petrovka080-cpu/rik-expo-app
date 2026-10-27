import type {
  ProfessionalCurrency,
  ProfessionalEstimateCaseUnit,
  ProfessionalEstimateSnapshot,
  ProfessionalGroupKey,
  ProfessionalRegion,
} from "../professionalEstimateTemplates";
import type {
  WorkOntologyCandidateScore,
  WorkOntologyCountry,
} from "../workOntology/constructionWorkOntologyTypes";

export const SMART_ESTIMATOR_WAVE =
  "S_SMART_ESTIMATOR_ORCHESTRATOR_REAL_PRICE_EXPANDED_ESTIMATE_CORE_CLOSEOUT_POINT_OF_NO_RETURN" as const;

export const GREEN_SMART_ESTIMATOR =
  "GREEN_SMART_ESTIMATOR_ORCHESTRATOR_REAL_PRICE_EXPANDED_ESTIMATE_CORE_READY" as const;

export const SMART_ESTIMATOR_PROTOCOL_VERSION = "smart-estimator-v1" as const;

export type SmartEstimatorStatus =
  | "ESTIMATE_READY"
  | "PARTIAL_PRICE_MISSING"
  | "NEEDS_CLARIFICATION"
  | "WORK_NOT_SUPPORTED";

export type SmartEstimatorClarificationReason =
  | "MISSING_REGION"
  | "MISSING_QUANTITY"
  | "AMBIGUOUS_WORK_INPUT"
  | "WORK_NOT_SUPPORTED";

export type SmartEstimatorInput = {
  user_input: string;
  selected_work_key?: string | null;
  known_quantity?: number | null;
  known_unit?: ProfessionalEstimateCaseUnit | null;
  region?: ProfessionalRegion | null;
  country?: WorkOntologyCountry | null;
};

export type SmartEstimatorAnalyzedInput = {
  user_input: string;
  normalized_input: string;
  region: ProfessionalRegion | null;
  region_source: "provided" | "text" | "missing";
  country: WorkOntologyCountry | null;
  quantity: number | null;
  unit: ProfessionalEstimateCaseUnit | null;
  quantity_source: "provided" | "text" | "missing";
  selected_work_key: string | null;
  fake_green_claimed: false;
};

export type SmartEstimatorCandidate = Pick<
  WorkOntologyCandidateScore,
  "canonical_work_key" | "visible_name_ru" | "category" | "confidence" | "score" | "reasons"
>;

export type SmartEstimatorWorkResolution = {
  status: "RESOLVED" | "AMBIGUOUS_WORK_INPUT" | "WORK_NOT_SUPPORTED";
  selected_work_key: string | null;
  visible_work_name_ru: string | null;
  group_key: ProfessionalGroupKey | null;
  confidence: number;
  candidates: SmartEstimatorCandidate[];
  resolver_used: "selected_work_key" | "no_hint_ontology" | "strict_carpet_object_override" | "none";
  fake_green_claimed: false;
};

export type SmartEstimatorClarification = {
  reason: SmartEstimatorClarificationReason;
  question_ru: string;
  required_fields: ("region" | "quantity" | "work")[];
  candidates: SmartEstimatorCandidate[];
  fake_green_claimed: false;
};

export type SmartEstimatorPriceAudit = {
  random_prices_found: number;
  fake_suppliers_found: number;
  zero_as_known_price_found: number;
  line_total_from_missing_price: number;
  missing_price_rows: number;
  missing_prices_reported_honestly: boolean;
  fake_green_claimed: false;
};

export type SmartEstimatorMaterialAudit = {
  rows_checked: number;
  cross_domain_row_leaks: number;
  row_without_provenance: number;
  generic_material_rows: number;
  paid_control_rows: number;
  fake_green_claimed: false;
};

export type SmartEstimatorNoDesyncAudit = {
  snapshot_desync_cases: number;
  ui_pdf_request_history_hashes_match: boolean;
  ui_repriced_after_snapshot: false;
  pdf_repriced_after_snapshot: false;
  history_repriced_after_snapshot: false;
  fake_green_claimed: false;
};

export type SmartEstimatorExplanation = {
  user_visible_summary_ru: string;
  work_ru: string | null;
  region: ProfessionalRegion | null;
  currency: ProfessionalCurrency | null;
  price_policy_ru: string;
  snapshot_policy_ru: string;
  fake_green_claimed: false;
};

export type SmartEstimatorSnapshot = {
  protocol_version: typeof SMART_ESTIMATOR_PROTOCOL_VERSION;
  snapshot_id: string;
  status: Exclude<SmartEstimatorStatus, "NEEDS_CLARIFICATION" | "WORK_NOT_SUPPORTED">;
  professional_snapshot: ProfessionalEstimateSnapshot;
  ui_payload_hash: string;
  pdf_payload_hash: string;
  request_payload_hash: string;
  history_payload_hash: string;
  all_hashes_match: boolean;
  smart_snapshot_hash: string;
  fake_green_claimed: false;
};

export type SmartEstimatorResult = {
  protocol_version: typeof SMART_ESTIMATOR_PROTOCOL_VERSION;
  status: SmartEstimatorStatus;
  analysis: SmartEstimatorAnalyzedInput;
  work_resolution: SmartEstimatorWorkResolution;
  clarification: SmartEstimatorClarification | null;
  snapshot: SmartEstimatorSnapshot | null;
  material_audit: SmartEstimatorMaterialAudit | null;
  price_audit: SmartEstimatorPriceAudit | null;
  no_desync_audit: SmartEstimatorNoDesyncAudit | null;
  explanation: SmartEstimatorExplanation;
  fake_green_claimed: false;
};
