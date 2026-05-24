import type { GlobalUnitInput, GlobalWorkCategory } from "../globalEstimate/globalEstimateTypes";

export type BuiltInAi50000Phase1Intent =
  | "estimate"
  | "product_search"
  | "procurement"
  | "documentation"
  | "inspection";

export type BuiltInAi50000Phase1ExpectedTool =
  | "calculate_global_estimate"
  | "search_material_products"
  | "search_marketplace_products"
  | "create_procurement_list"
  | "generate_estimate_pdf";

export type BuiltInAi50000RouteCoverage =
  | "chat"
  | "ai_foreman"
  | "request"
  | "product_search"
  | "pdf_viewer";

export type BuiltInAi50000SourcePolicy =
  | "fresh_required"
  | "stale_allowed_with_warning"
  | "manual_review_allowed"
  | "unpriced_allowed";

export type BuiltInAi50000MacroDomain = {
  id: string;
  ordinal: number;
  title: string;
  category: GlobalWorkCategory;
  workFamily: string;
  defaultWorkKey: string;
  promptAnchor: string;
  expectedRowsContain: string[];
  dangerousWork: boolean;
  productFamily: string;
};

export type BuiltInAi50000Phase1Case = {
  id: string;
  shardId: number;

  macroDomainId: string;
  domainId: string;
  category: string;
  workFamily: string;
  workKey: string;

  promptRu: string;
  promptEn?: string;

  intent: BuiltInAi50000Phase1Intent;
  expectedTool: BuiltInAi50000Phase1ExpectedTool;

  volume?: number;
  unit?: GlobalUnitInput["normalizedUnit"];

  templateId?: string;
  requiredRateKeys: string[];

  expectedRowsContain: string[];
  forbiddenRowsContain: string[];

  routeCoverage: BuiltInAi50000RouteCoverage[];

  requiresPdfAction: boolean;
  requiresSourceEvidence: boolean;
  requiresTaxStatusOrWarning: boolean;

  dangerousWork: boolean;
  noDiyInstructionsRequired: boolean;
  specialistReviewRequired: boolean;

  productSearch?: {
    expectedProductFamily: string;
    fakeStockForbidden: boolean;
    fakeSupplierForbidden: boolean;
    fakeAvailabilityForbidden: boolean;
  };

  sourcePolicy: BuiltInAi50000SourcePolicy;
};

export type BuiltInAi50000Shard = {
  shardId: number;
  totalShards: number;
  caseIds: string[];
  macroDomainIds: string[];
  casesTotal: number;
};

export type BuiltInAi50000RuntimeCaseResult = {
  id: string;
  shardId: number;
  macroDomainId: string;
  intent: BuiltInAi50000Phase1Intent;
  expectedTool: BuiltInAi50000Phase1ExpectedTool;
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
  quantitiesPresent: boolean;
  totalsPresent: boolean;
  sourceEvidencePresentAllPricedRows: boolean;
  costFactorsPresent: boolean;
  clarifyingQuestionsPresent: boolean;
  taxStatusOrWarningPresent: boolean;
  pdfActionPresent: boolean;
  productSourceEvidencePresent: boolean;
  fakeStockFound: boolean;
  fakeSupplierFound: boolean;
  fakeAvailabilityFound: boolean;
  forbiddenFallbackRowsFound: boolean;
  dangerousDiyInstructionsFound: boolean;
  passed: boolean;
  failureCodes: string[];
};
