import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";

export const BUYER_REAL_SOURCING_WAVE =
  "S_AI_BUYER_REAL_SOURCING_FUNNEL_POINT_OF_NO_RETURN" as const;

export type BuyerScreenId =
  | "buyer.main"
  | "buyer.requests"
  | "buyer.request.detail"
  | "procurement.copilot"
  | "market.home"
  | "supplier.showcase";

export type BuyerSourcingSourceType =
  | "buyer_request"
  | "request_line"
  | "estimate_line"
  | "project_pdf"
  | "pdf_chunk"
  | "warehouse_stock"
  | "warehouse_incoming"
  | "warehouse_issue"
  | "own_marketplace"
  | "approved_vendor"
  | "supplier_history"
  | "supplier_offer"
  | "external_marketplace"
  | "internet_source"
  | "approval";

export type BuyerSourcePriority =
  | "warehouse"
  | "own_marketplace"
  | "approved_vendors"
  | "supplier_history"
  | "supplier_offers"
  | "external_marketplaces"
  | "internet";

export const BUYER_SOURCE_PRIORITY: readonly BuyerSourcePriority[] = [
  "warehouse",
  "own_marketplace",
  "approved_vendors",
  "supplier_history",
  "supplier_offers",
  "external_marketplaces",
  "internet",
] as const;

export type BuyerSourcingProviderRequest = {
  requestId: string;
  requestLineId?: string;
  countryCode?: string;
  cityOrRegion?: string;
  currency?: string;
  item: {
    nameRu: string;
    category?: string;
    quantity: number;
    unit: string;
    requiredDate?: string;
    specificationText?: string;
    brandPreference?: string;
    allowAnalogs: boolean;
  };
  linkedContext: {
    objectId?: string;
    workId?: string;
    estimateLineId?: string;
    projectDocumentId?: string;
    pdfChunkIds?: string[];
  };
  sourcePriority: BuyerSourcePriority[];
};

export type BuyerSourcingOffer = {
  id: string;
  sourceType:
    | "warehouse_stock"
    | "own_marketplace"
    | "approved_vendor"
    | "supplier_history"
    | "supplier_offer"
    | "external_marketplace"
    | "internet_source";
  requestId?: string;
  requestLineId?: string;
  supplierId?: string;
  supplierNameRu: string;
  itemNameRu: string;
  brand?: string;
  specificationMatch: "exact" | "close_analog" | "needs_review" | "unknown";
  quantityAvailable?: number;
  unit: string;
  price?: number;
  currency?: string;
  priceDate?: string;
  deliveryDays?: number;
  deliveryRegion?: string;
  availability: "in_stock" | "limited" | "on_request" | "unknown";
  minOrderQty?: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskReasonsRu: string[];
  sourceLabelRu: string;
  sourceUrl?: string;
  sourceDocumentId?: string;
  sourcePage?: number;
  lastCheckedAt: string;
};

export type BuyerRequestLine = {
  id: string;
  itemRu: string;
  category?: string;
  quantity: number;
  unit: string;
  requiredDate?: string;
  specificationText?: string;
  brandPreference?: string;
  allowAnalogs: boolean;
  materialId?: string;
  serviceId?: string;
};

export type BuyerRequest = {
  id: string;
  status: "approved" | "pending_approval" | "draft" | "needs_clarification";
  createdAt: string;
  createdByRu?: string;
  approvedByRu?: string;
  objectId?: string;
  objectRu?: string;
  zoneRu?: string;
  workId?: string;
  workRu?: string;
  priority?: "critical" | "high" | "normal" | "low";
  lines: BuyerRequestLine[];
  sourceRefs: string[];
};

export type BuyerWarehouseStock = {
  id: string;
  requestLineId?: string;
  materialId?: string;
  itemRu: string;
  availableQty?: number;
  reservedQty?: number;
  incomingQty?: number;
  unit: string;
  sourceRef: string;
};

export type BuyerProviderTraceItem = {
  provider: BuyerProviderKey;
  checked: boolean;
  sourceRefs: string[];
  exactNoDataReasonRu?: string;
};

export type BuyerSourcingContext = {
  screenId: BuyerScreenId;
  role: "buyer";
  questionRu?: string;
  request: BuyerRequest;
  selectedRequestLineId?: string;
  countryCode?: string;
  cityOrRegion?: string;
  currency?: string;
  sourcePriority?: BuyerSourcePriority[];
  sources: ConstructionKnowledgeSource[];
  warehouseStock: BuyerWarehouseStock[];
  offers: BuyerSourcingOffer[];
  externalMarketplaceConnected: boolean;
  internetSourcingConnected: boolean;
};

export type BuyerIntent =
  | "approved_request_sourcing"
  | "find_5_10_suppliers"
  | "compare_suppliers"
  | "find_analogs"
  | "check_warehouse_before_buy"
  | "check_estimate_quantity"
  | "check_project_specification"
  | "prepare_rfq_draft"
  | "prepare_shortlist"
  | "prepare_approval_handoff"
  | "supplier_risk_check"
  | "price_delivery_comparison"
  | "external_marketplace_search"
  | "own_marketplace_search"
  | "urgent_delivery_options"
  | "missing_procurement_data";

export type BuyerIntentContract = {
  intent: BuyerIntent;
  examplesRu: string[];
  requiredContext:
    | "approved_request"
    | "request_line"
    | "material"
    | "service"
    | "marketplace"
    | "supplier"
    | "none";
  allowedSources: BuyerSourcingSourceType[];
  answerMode: "read" | "draft" | "approval_route" | "clarifying";
};

export type BuyerActionQuestion = {
  screenId: BuyerScreenId;
  actionId: BuyerIntent;
  labelRu: string;
  concreteQuestionRu: string;
  requiredContext: BuyerIntentContract["requiredContext"][];
  allowedSources: BuyerSourcingSourceType[];
  answerMode: BuyerIntentContract["answerMode"];
};

export type BuyerProviderKey =
  | "aiBuyerScreenContextProvider"
  | "aiBuyerRequestProvider"
  | "aiBuyerRequestLineProvider"
  | "aiApprovedRequestProvider"
  | "aiMaterialSpecificationProvider"
  | "aiEstimateLinkedLineProvider"
  | "aiProjectSpecificationProvider"
  | "aiPdfAggregatorProvider"
  | "aiWarehouseLinkedStockProvider"
  | "aiMarketplaceCatalogProvider"
  | "aiApprovedVendorsProvider"
  | "aiSupplierHistoryProvider"
  | "aiSupplierOffersProvider"
  | "aiExternalMarketplaceProvider"
  | "aiInternetSourcingProvider"
  | "aiPriceNormalizationProvider"
  | "aiUnitConversionProvider"
  | "aiCurrencyCountryProvider"
  | "aiDeliveryRegionProvider"
  | "aiSupplierRiskProvider"
  | "aiProcurementApprovalProvider"
  | "aiBuyerAnswerComposer"
  | "aiBuyerSourceSanitizer";

export type BuyerProviderDescriptor = {
  key: BuyerProviderKey;
  pure: true;
  usesHooks: false;
  usesUseEffectHack: false;
  dbWrites: false;
  directMutation: false;
  createsFakeData: false;
  ready: boolean;
};

export type BuyerDataProviderResult = {
  facts: {
    id: string;
    textRu: string;
    sourceRefs: string[];
    confidence: "high" | "medium" | "low";
  }[];
  sources: ConstructionKnowledgeSource[];
  offers: BuyerSourcingOffer[];
  missingData: string[];
  permissionLimited: string[];
  exactNoDataReasonRu?: string;
};

export type SupplierScore = {
  offerId: string;
  totalScore: number;
  priceScore: number;
  deliveryScore: number;
  availabilityScore: number;
  specificationMatchScore: number;
  reliabilityScore: number;
  documentRiskScore: number;
  reasonsRu: string[];
  warningsRu: string[];
};

export type BuyerStockCheck = {
  checked: boolean;
  availableQty?: number;
  deficitQty?: number;
  sourceRefs: string[];
};

export type BuyerSourcingAnswer = {
  screenId: BuyerScreenId;
  role: "buyer";
  requestId: string;
  questionRu: string;
  answerKind:
    | "sourcing_result"
    | "shortlist_draft"
    | "approval_route"
    | "supplier_comparison"
    | "exact_no_data_reason"
    | "clarifying_question";
  titleRu: string;
  shortAnswerRu: string;
  answerRu: string;
  requestSummary: {
    objectRu?: string;
    workRu?: string;
    itemRu: string;
    quantity: number;
    unit: string;
    requiredDate?: string;
    approved: boolean;
  };
  stockCheck: BuyerStockCheck;
  offers: BuyerSourcingOffer[];
  scores: SupplierScore[];
  shortlist: {
    offerId: string;
    reasonRu: string;
    checksBeforeApprovalRu: string[];
  }[];
  missingData: string[];
  approvalRoute?: {
    required: boolean;
    approverRole: "director" | "office" | "finance" | "admin";
    reasonRu: string;
  };
  nextStepRu: string;
  changedData: false;
  orderCreated: false;
  paymentCreated: false;
  autoApproval: false;
  providerTrace: string[];
  sourceTrace: string[];
  genericAnswerUsed: false;
  fakeSupplierCreated: false;
  fakePriceCreated: false;
  fakeAvailabilityCreated: false;
  directOrderPathUsed: false;
  approvalBypassUsed: false;
};

export type BuyerRealSourcingMatrix = {
  wave: typeof BUYER_REAL_SOURCING_WAVE;
  final_status:
    | "GREEN_AI_BUYER_REAL_SOURCING_FUNNEL_READY"
    | "BLOCKED_BUYER_ROLE_POLICY_MISSING"
    | "BLOCKED_BUYER_PIPELINE_NOT_CONNECTED"
    | "BLOCKED_OWN_MARKETPLACE_NOT_CONNECTED"
    | "BLOCKED_EXTERNAL_MARKETPLACE_NOT_CONNECTED"
    | "BLOCKED_APPROVED_REQUEST_CONTEXT_MISSING"
    | "BLOCKED_WAREHOUSE_LINKED_STOCK_PROVIDER_MISSING"
    | "BLOCKED_BUYER_FREE_TEXT_QA_NOT_CONNECTED"
    | "BLOCKED_ANDROID_TARGETABILITY_BUYER";
  existing_screenMagic_extended_only: true;
  new_hooks_added: false;
  useEffect_hacks_added: false;
  second_ai_framework_created: false;
  db_writes_from_ai_answer_used: false;
  migrations_used: false;
  business_logic_changed: false;
  buyer_main_ready: boolean;
  buyer_requests_ready: boolean;
  buyer_request_detail_ready: boolean;
  procurement_copilot_ready: boolean;
  market_home_ready: boolean;
  supplier_showcase_ready: boolean;
  buyer_role_policy_exists: boolean;
  buyer_free_text_qa_enabled: boolean;
  buttons_and_free_text_use_same_pipeline: boolean;
  approved_request_sourcing_ready: boolean;
  warehouse_checked_before_buy: boolean;
  own_marketplace_searched_first: boolean;
  approved_vendors_used: boolean;
  supplier_history_used: boolean;
  external_marketplace_used_when_connected: boolean;
  internet_source_used_only_with_trace: boolean;
  five_to_ten_real_offers_or_exact_reason: boolean;
  offers_have_source_trace: boolean;
  supplier_scoring_explainable: boolean;
  unit_normalization_done: boolean;
  currency_normalization_done: boolean;
  estimate_project_specs_used_when_available: boolean;
  shortlist_draft_ready: boolean;
  approval_route_visible: boolean;
  direct_order_paths_found: number;
  direct_payment_paths_found: number;
  auto_approval_found: false;
  approval_bypass_found: number;
  fake_suppliers_created: false;
  fake_prices_created: false;
  fake_availability_created: false;
  fake_delivery_dates_created: false;
  fake_marketplace_results_created: false;
  fake_internet_results_created: false;
  buyer_full_cashflow_leak_found: false;
  security_runtime_leak_found: false;
  raw_secrets_visible: false;
  generic_answers_found: number;
  technical_copy_visible_to_user: false;
  web_free_text_questions_passed: boolean;
  web_all_visible_buttons_clicked: boolean;
  android_buyer_question_passed: boolean;
  android_buttons_targetable: boolean;
  release_verify_passed?: boolean;
  fake_green_claimed: false;
};
