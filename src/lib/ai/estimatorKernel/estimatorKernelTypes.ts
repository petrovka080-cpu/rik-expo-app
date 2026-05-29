import type { GlobalEstimateConfidence, GlobalWorkCategory } from "../globalEstimate";

export type EstimatorKernelComplexity = "simple" | "medium" | "complex" | "infrastructure";

export type EstimatorKernelPricingPolicy = {
  localContextStatus: "exact" | "partial" | "missing" | "unsupported";
  currency: string;
  sourcePolicy: string;
  taxPolicy: string;
  allowIndicativePrices: boolean;
};

export type EstimatorReasoningPlan = {
  intent: "estimate";
  workKey: string;
  titleRu: string;
  category: GlobalWorkCategory;
  confidence: GlobalEstimateConfidence;
  templateExactMatch: boolean;
  parsableWorkDetected: boolean;
  regulatedWorkDetected: boolean;
  semanticFrame: {
    domain: string;
    object: string;
    operation: string;
    method?: string;
    materialSystem?: string;
    regulated: boolean;
    confidence: number;
  };
  quantities: {
    areaM2?: number;
    lengthM?: number;
    widthM?: number;
    heightM?: number;
    depthM?: number;
    count?: number;
    powerKw?: number;
    floorCount?: number;
    massTon?: number;
    rawDimensions?: string[];
  };
  formulas: {
    formulaId: string;
    inputs: Record<string, number>;
    outputs: Record<string, number>;
    assumptions: string[];
    missingInputs: string[];
  }[];
  boqPlan: {
    complexity: EstimatorKernelComplexity;
    sections: string[];
    requiredMaterials: string[];
    requiredLabor: string[];
    requiredEquipmentOrWarnings: string[];
    requiredLogisticsOrWarnings: string[];
    exclusions: string[];
    clarifyingQuestions: string[];
  };
  pricingPolicy: EstimatorKernelPricingPolicy;
};

export type EstimatorOutcomeClassification =
  | "UNIVERSAL_ESTIMATOR_OK"
  | "PARSABLE_DYNAMIC_BOQ_OK"
  | "REGULATED_SAFE_PROFESSIONAL_BOQ_OK"
  | "TEMPLATE_GAP_FOR_PARSABLE_WORK"
  | "ESTIMATE_INTENT_LOST_TO_ROLE_CONTEXT"
  | "SEMANTIC_FRAME_MISSING"
  | "WORK_PLAN_MISSING"
  | "FORMULA_FAILED"
  | "DYNAMIC_BOQ_NOT_USED"
  | "WEAK_GENERIC_ROWS_FOUND"
  | "CATALOG_BINDING_MISSING"
  | "SOURCE_EVIDENCE_MISSING"
  | "UI_MOJIBAKE_FOUND"
  | "PDF_MOJIBAKE_FOUND"
  | "UNKNOWN_NEEDS_TRACE";

export type EstimatorOutcome = {
  classification: EstimatorOutcomeClassification;
  plan: EstimatorReasoningPlan | null;
  parsableWorkDetected: boolean;
  regulatedWorkDetected: boolean;
  templateExactMatch: boolean;
  dynamicBoqUsed: boolean;
  failures: string[];
};

export type DynamicProfessionalBoqRow = {
  sectionType: "materials" | "labor" | "equipment" | "delivery";
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  comment: string;
  materialKey?: string;
  rateKey?: string;
  sourcePolicy: "configured_reference" | "manual_review";
};

export type DynamicProfessionalBoq = {
  compilerId: "DynamicProfessionalBoqCompiler";
  plan: EstimatorReasoningPlan;
  rows: DynamicProfessionalBoqRow[];
  assumptions: string[];
  exclusions: string[];
  costIncreaseFactors: string[];
  clarifyingQuestions: string[];
  warnings: string[];
};

export type DynamicBoqValidation = {
  passed: boolean;
  failures: string[];
  rowCount: number;
  minimumRows: number;
};
