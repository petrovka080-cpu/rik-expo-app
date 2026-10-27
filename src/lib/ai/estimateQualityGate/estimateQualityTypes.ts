import type {
  ProfessionalCurrency,
  ProfessionalEstimateSnapshot,
  ProfessionalRegion,
} from "../professionalEstimateTemplates";
import type { SmartEstimatorResult } from "../smartEstimator";

export const ESTIMATE_QUALITY_GATE_WAVE =
  "S_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_SANITY_CORE_CLOSEOUT_POINT_OF_NO_RETURN" as const;

export const GREEN_ESTIMATE_QUALITY_GATE =
  "GREEN_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_SANITY_CORE_READY" as const;

export type EstimateQualityGateStatus =
  | "QUALITY_PASSED"
  | "QUALITY_PASSED_WITH_WARNINGS"
  | "PARTIAL_PRICE_MISSING"
  | "NEEDS_CLARIFICATION"
  | "QUALITY_BLOCKED";

export type EstimateQualityFailureCode =
  | "WRONG_WORK_MATCH"
  | "LOW_CONFIDENCE_AUTO_SELECTED"
  | "CROSS_DOMAIN_ROW_LEAK"
  | "ROW_WITHOUT_PROVENANCE"
  | "GENERIC_MATERIAL_ROW"
  | "PAID_CONTROL_ROW"
  | "MATERIAL_INCOMPATIBLE_WITH_WORK"
  | "MISSING_REQUIRED_MATERIAL"
  | "MISSING_REQUIRED_LABOR_ROW"
  | "RANDOM_PRICE_FOUND"
  | "FAKE_SUPPLIER_FOUND"
  | "ZERO_AS_KNOWN_PRICE"
  | "LINE_TOTAL_FROM_MISSING_PRICE"
  | "WRONG_CURRENCY"
  | "USD_FOR_KG_OR_KZ"
  | "SNAPSHOT_DESYNC"
  | "PDF_RECALCULATED_SEPARATELY"
  | "REQUEST_HISTORY_PAYLOAD_MISMATCH"
  | "MOJIBAKE_FOUND"
  | "INTERNAL_KEY_VISIBLE";

export type EstimateQualityFailure = {
  code: EstimateQualityFailureCode;
  severity: "BLOCKER" | "WARNING";
  selected_work_key?: string;
  row_key?: string;
  visible_name_ru?: string;
  details_ru: string;
};

export type EstimateQualityWarning = EstimateQualityFailure & {
  severity: "WARNING";
};

export type EstimateQualityGateInput = {
  source_user_input: string;
  smart_estimator_result: SmartEstimatorResult;
  expected_region?: ProfessionalRegion;
  expected_currency?: ProfessionalCurrency;
  strict_mode: boolean;
  source: "runtime" | "audit" | "test" | "release_verify";
};

export type EstimateQualityChecks = {
  work_resolution_passed: boolean;
  quantity_sanity_passed: boolean;
  template_completeness_passed: boolean;
  row_domain_isolation_passed: boolean;
  material_compatibility_passed: boolean;
  price_integrity_passed: boolean;
  regional_currency_passed: boolean;
  snapshot_integrity_passed: boolean;
  professional_completeness_passed: boolean;
  pdf_request_history_parity_passed: boolean;
};

export type EstimateQualityGateResult = {
  status: EstimateQualityGateStatus;
  quality_score: number;
  blocking_failures: EstimateQualityFailure[];
  warnings: EstimateQualityWarning[];
  checks: EstimateQualityChecks;
  fake_green_claimed: false;
};

export type EstimateQualityRuleName = keyof EstimateQualityChecks;

export type EstimateQualityRuleResult = {
  check: EstimateQualityRuleName;
  passed: boolean;
  failures: EstimateQualityFailure[];
  warnings?: EstimateQualityWarning[];
  fake_green_claimed: false;
};

export type EstimateQualitySnapshotContext = {
  result: SmartEstimatorResult;
  snapshot: ProfessionalEstimateSnapshot | null;
  input: EstimateQualityGateInput;
};
