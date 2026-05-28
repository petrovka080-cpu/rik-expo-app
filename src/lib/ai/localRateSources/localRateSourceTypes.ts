import type { GlobalEstimateConfidence } from "../globalEstimate";

export type LocalRateSourceLevel =
  | "project_ratebook"
  | "admin_ratebook"
  | "city_ratebook"
  | "region_reference"
  | "global_fallback_warning"
  | "boq_only_manual_estimator_required";

export type LocalRateSourcePolicy = {
  level: LocalRateSourceLevel;
  sourceId?: string;
  sourceType?: string;
  sourceDate?: string;
  confidence: GlobalEstimateConfidence;
  warning?: string;
};

export type PricedRowEvidenceInput = {
  rowId: string;
  unitPrice?: number;
  sourceId?: string;
  sourceType?: string;
  sourceDate?: string;
};
