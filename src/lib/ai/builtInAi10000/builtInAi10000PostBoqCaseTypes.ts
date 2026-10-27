import type { GlobalUnitInput, GlobalWorkCategory } from "../globalEstimate/globalEstimateTypes";

export const BUILT_IN_AI_10000_POST_BOQ_WAVE =
  "S_BUILT_IN_AI_10000_POST_BOQ_CATALOG_DOMAIN_COVERAGE_POINT_OF_NO_RETURN";

export const BUILT_IN_AI_10000_POST_BOQ_GREEN_STATUS =
  "GREEN_BUILT_IN_AI_10000_POST_BOQ_CATALOG_READY";

export const BUILT_IN_AI_10000_POST_BOQ_PREFIX =
  "S_BUILT_IN_AI_10000_POST_BOQ_CATALOG";

export type BuiltInAi10000PostBoqIntent =
  | "estimate"
  | "product_search"
  | "procurement"
  | "documentation"
  | "inspection";

export type BuiltInAi10000PostBoqExpectedTool =
  | "calculate_global_estimate"
  | "search_material_products"
  | "search_marketplace_products"
  | "create_procurement_list"
  | "generate_estimate_pdf";

export type BuiltInAi10000PostBoqSourcePolicy =
  | "fresh_required"
  | "stale_allowed_with_warning"
  | "manual_review_allowed"
  | "unpriced_allowed";

export type BuiltInAi10000PostBoqRouteCoverage =
  | "chat"
  | "ai_foreman"
  | "request"
  | "product_search"
  | "pdf_viewer";

export type BuiltInAi10000PostBoqProductSearchPolicy = {
  expectedProductFamily: string;
  fakeStockForbidden: true;
  fakeSupplierForbidden: true;
  fakeAvailabilityForbidden: true;
};

export type BuiltInAi10000PostBoqCase = {
  id: string;
  domainId: string;
  category: string;
  workFamily: string;
  workKey: string;
  promptRu: string;
  promptEn?: string;

  intent: BuiltInAi10000PostBoqIntent;
  expectedTool: BuiltInAi10000PostBoqExpectedTool;

  volume?: number;
  unit?: GlobalUnitInput["normalizedUnit"] | string;

  templateId?: string;
  requiredRateKeys: string[];
  requiredCatalogPolicies: string[];
  sourcePolicy: BuiltInAi10000PostBoqSourcePolicy;

  boqDepthPolicyKey: string;
  expectedRowsContain: string[];
  forbiddenRowsContain: string[];

  routeCoverage: BuiltInAi10000PostBoqRouteCoverage[];

  requiresPdfAction: boolean;
  requiresSourceEvidence: boolean;
  requiresTaxStatusOrWarning: boolean;

  dangerousWork: boolean;
  noDiyInstructionsRequired: boolean;
  specialistReviewRequired: boolean;

  productSearch?: BuiltInAi10000PostBoqProductSearchPolicy;
};

export type BuiltInAi10000PostBoqDomain = {
  domainId: string;
  macroGroupId: string;
  category: GlobalWorkCategory;
  workFamily: string;
  workKey: string;
  title: string;
  promptAnchor: string;
  expectedRowsContain: string[];
  forbiddenRowsContain?: string[];
  dangerousWork?: boolean;
  intent?: BuiltInAi10000PostBoqIntent;
  sourcePolicy?: BuiltInAi10000PostBoqSourcePolicy;
  productFamily?: string;
};

export type BuiltInAi10000PostBoqRuntimeResult = {
  id: string;
  domainId: string;
  intent: BuiltInAi10000PostBoqIntent;
  expectedTool: BuiltInAi10000PostBoqExpectedTool;
  selectedTool: string | null;
  detectedIntent: string | null;
  backendCalled: boolean;
  runtimeTraceCaptured: boolean;
  workKeyResolved: string | null;
  categoryResolved: string | null;
  workKeyOrCategoryMatched: boolean;
  globalEstimateResultUsed: boolean;
  materialsSectionPresent: boolean;
  laborOrEquipmentSectionPresent: boolean;
  materialRowsHaveRateKeys: boolean;
  catalogBindingPolicySatisfied: boolean;
  sourceEvidencePresentAllPricedRows: boolean;
  taxStatusOrWarningPresent: boolean;
  pdfActionPresent: boolean;
  productSourceEvidencePresent: boolean;
  inventedCatalogItemFound: boolean;
  fakeStockFound: boolean;
  fakeSupplierFound: boolean;
  fakeAvailabilityFound: boolean;
  dangerousDiyInstructionsFound: boolean;
  boqDepthPassed: boolean;
  rowCount: number;
  minimumRows: number;
  passed: boolean;
  failureCodes: string[];
};
