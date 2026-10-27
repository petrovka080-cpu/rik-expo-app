import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";

export const WAREHOUSE_REAL_STOCK_WAVE =
  "S_AI_WAREHOUSE_REAL_STOCK_FUNNEL_POINT_OF_NO_RETURN" as const;

export type WarehouseScreenId =
  | "warehouse.main"
  | "warehouse.incoming"
  | "warehouse.issue"
  | "warehouse.stock.detail"
  | "warehouse.inventory"
  | "warehouse.reservations"
  | "warehouse.transfers"
  | "warehouse.request.detail"
  | "warehouse.copilot"
  | "map.main"
  | "director.warehouse";

export type WarehouseStockSourceType =
  | "stock_item"
  | "warehouse_location"
  | "incoming"
  | "issue"
  | "reservation"
  | "transfer"
  | "inventory_count"
  | "procurement_request"
  | "supplier_offer"
  | "marketplace_offer"
  | "waybill"
  | "invoice"
  | "document"
  | "pdf_chunk"
  | "work"
  | "object"
  | "estimate_line"
  | "project_specification"
  | "approval"
  | "warehouse_stock"
  | "warehouse_incoming"
  | "warehouse_issue"
  | "material"
  | "specification"
  | "zone"
  | "chat_message";

export type WarehouseLocationRef = {
  warehouseId?: string;
  warehouseNameRu?: string;
  zone?: string;
  shelf?: string;
  objectId?: string;
  objectNameRu?: string;
  sourceRefs: string[];
};

export type WarehouseMaterialSpecification = {
  brand?: string;
  mark?: string;
  size?: string;
  class?: string;
  thickness?: string;
  diameter?: string;
  specificationText?: string;
  sourceRefs?: string[];
};

export type WarehouseStockItem = {
  id: string;
  materialId: string;
  materialNameRu: string;
  specificationText?: string;
  specification?: WarehouseMaterialSpecification;
  inStockQty?: number;
  availableQty: number;
  reservedQty: number;
  incomingQty: number;
  unit: string;
  warehouseNameRu: string;
  location?: WarehouseLocationRef;
  objectId?: string;
  objectNameRu?: string;
  workId?: string;
  workNameRu?: string;
  requestId?: string;
  requestLineId?: string;
  estimateLineId?: string;
  projectSpecificationId?: string;
  sourceRefs: string[];
};

export type WarehouseIncomingItem = {
  id: string;
  materialId: string;
  materialNameRu: string;
  expectedQty?: number;
  actualQty?: number;
  waybillQty?: number;
  quantity: number;
  unit: string;
  supplierId?: string;
  supplierNameRu?: string;
  requestId?: string;
  requestLineId?: string;
  waybillId?: string;
  invoiceId?: string;
  location?: WarehouseLocationRef;
  status: "expected" | "arrived" | "needs_documents" | "disputed" | "accepted";
  documentRefs: string[];
  sourceRefs: string[];
};

export type WarehouseIssueItem = {
  id: string;
  materialId: string;
  materialNameRu: string;
  requestedQty: number;
  issuedQty: number;
  reservedQty?: number;
  unit: string;
  objectId?: string;
  objectNameRu?: string;
  workId?: string;
  workNameRu?: string;
  requestId?: string;
  approvalId?: string;
  status: "draft" | "ready_for_pick" | "blocked" | "issued" | "needs_approval";
  sourceRefs: string[];
};

export type WarehouseReservationItem = {
  id: string;
  materialId: string;
  materialNameRu: string;
  quantity: number;
  unit: string;
  objectId?: string;
  objectNameRu?: string;
  workId?: string;
  workNameRu?: string;
  requestId?: string;
  expiresAt?: string;
  status: "active" | "expired" | "released" | "pending_approval";
  sourceRefs: string[];
};

export type WarehouseTransferItem = {
  id: string;
  materialId: string;
  materialNameRu: string;
  quantity: number;
  unit: string;
  fromLocation?: WarehouseLocationRef;
  toLocation?: WarehouseLocationRef;
  objectId?: string;
  objectNameRu?: string;
  workId?: string;
  workNameRu?: string;
  approvalId?: string;
  status: "draft" | "needs_documents" | "pending_approval" | "ready_for_review" | "completed";
  sourceRefs: string[];
};

export type WarehouseInventoryCount = {
  id: string;
  materialId: string;
  materialNameRu: string;
  bookQty: number;
  countedQty?: number;
  unit: string;
  location?: WarehouseLocationRef;
  countedAt?: string;
  status: "pending_count" | "matched" | "mismatch" | "needs_location";
  sourceRefs: string[];
};

export type WarehouseStockEvent = {
  id: string;
  eventType:
    | "stock_overview"
    | "incoming_check"
    | "issue_readiness"
    | "reservation_check"
    | "transfer_check"
    | "inventory_discrepancy"
    | "material_blocker"
    | "writeoff_candidate"
    | "return_check";
  status:
    | "ok"
    | "needs_review"
    | "blocked"
    | "partial"
    | "ready_for_draft"
    | "pending_approval"
    | "completed_read_only";
  materialId: string;
  materialNameRu: string;
  specification?: WarehouseMaterialSpecification;
  quantity: {
    requested?: number;
    expectedIncoming?: number;
    actualIncoming?: number;
    inStock?: number;
    reserved?: number;
    available?: number;
    requestedForIssue?: number;
    issued?: number;
    deficit?: number;
    unit: string;
  };
  location?: Omit<WarehouseLocationRef, "sourceRefs">;
  linkedContext: {
    requestId?: string;
    requestLineId?: string;
    supplierId?: string;
    supplierNameRu?: string;
    incomingId?: string;
    issueId?: string;
    reservationId?: string;
    transferId?: string;
    inventoryCountId?: string;
    workId?: string;
    workNameRu?: string;
    objectId?: string;
    objectNameRu?: string;
    estimateLineId?: string;
    documentIds?: string[];
    approvalId?: string;
  };
  blockers: {
    kind:
      | "stock_missing"
      | "reserved_not_available"
      | "incoming_missing"
      | "waybill_missing"
      | "quantity_mismatch"
      | "unit_mismatch"
      | "specification_mismatch"
      | "quality_issue"
      | "approval_missing"
      | "location_missing"
      | "document_missing"
      | "inventory_mismatch";
    textRu: string;
  }[];
  riskLevel: "low" | "medium" | "high" | "critical";
  sourceRefs: string[];
  objectId?: string;
  objectNameRu?: string;
  workId?: string;
  workNameRu?: string;
  unit?: string;
  riskReasonsRu: string[];
  missingData: string[];
};

export type WarehouseStockContext = {
  screenId: WarehouseScreenId;
  role: "warehouse";
  questionRu?: string;
  selectedMaterialId?: string;
  selectedObjectId?: string;
  selectedIssueId?: string;
  selectedIncomingId?: string;
  countryCode?: string;
  currency?: string;
  stockItems: WarehouseStockItem[];
  incoming: WarehouseIncomingItem[];
  issues: WarehouseIssueItem[];
  reservations?: WarehouseReservationItem[];
  transfers?: WarehouseTransferItem[];
  inventoryCounts?: WarehouseInventoryCount[];
  locations?: WarehouseLocationRef[];
  sources: ConstructionKnowledgeSource[];
  unitConversionConfigured: boolean;
  packageConversionConfigured?: boolean;
  quantityNormalizationConfigured?: boolean;
  documentsProviderConnected: boolean;
};

export type WarehouseStockIntent =
  | "stock_overview"
  | "critical_deficits"
  | "material_blockers"
  | "issue_readiness"
  | "incoming_review"
  | "incoming_waybill_reconciliation"
  | "inventory_discrepancy_check"
  | "reservation_check"
  | "transfer_readiness"
  | "location_missing_check"
  | "stock_without_documents"
  | "warehouse_to_work_link"
  | "warehouse_to_procurement_link"
  | "warehouse_to_estimate_spec_check"
  | "warehouse_to_project_spec_check"
  | "draft_issue_document"
  | "draft_discrepancy_act"
  | "warehouse_approval_handoff"
  | "today_stock_summary"
  | "what_to_issue_by_object"
  | "critical_materials"
  | "warehouse_linked_status"
  | "incoming_readiness"
  | "incoming_discrepancy_check"
  | "issue_readiness_check"
  | "missing_documents_check"
  | "specification_match_check"
  | "unit_conversion_check"
  | "procurement_handoff"
  | "foreman_handoff"
  | "approval_route"
  | "document_request_draft"
  | "inventory_reconciliation";

export type WarehouseIntentContract = {
  intent: WarehouseStockIntent;
  examplesRu: string[];
  requiredContext:
    | "material"
    | "stock_item"
    | "incoming"
    | "issue"
    | "object"
    | "work"
    | "period"
    | "none"
    | "screen";
  allowedSources: WarehouseStockSourceType[];
  answerMode: "read" | "draft" | "approval_route" | "clarifying";
};

export type WarehouseActionQuestion = {
  screenId: WarehouseScreenId;
  actionId: WarehouseStockIntent;
  labelRu: string;
  concreteQuestionRu: string;
  requiredContext: WarehouseIntentContract["requiredContext"][];
  allowedSources: WarehouseStockSourceType[];
  answerMode: WarehouseIntentContract["answerMode"];
};

export type WarehouseProviderKey =
  | "aiWarehouseScreenContextProvider"
  | "aiWarehouseStockProvider"
  | "aiWarehouseStockDetailProvider"
  | "aiWarehouseIncomingProvider"
  | "aiWarehouseIssueProvider"
  | "aiWarehouseReservationProvider"
  | "aiWarehouseTransferProvider"
  | "aiWarehouseInventoryProvider"
  | "aiWarehouseDiscrepancyProvider"
  | "aiWarehouseLocationProvider"
  | "aiMaterialIdentityProvider"
  | "aiMaterialSpecificationProvider"
  | "aiUnitConversionProvider"
  | "aiPackageConversionProvider"
  | "aiQuantityNormalizationProvider"
  | "aiProcurementLinkedRequestProvider"
  | "aiSupplierLinkedOfferProvider"
  | "aiMarketplaceLinkedOfferProvider"
  | "aiDocumentsProvider"
  | "aiPdfAggregatorProvider"
  | "aiWaybillProvider"
  | "aiInvoiceLinkedProvider"
  | "aiWorkObjectLinkedProvider"
  | "aiEstimateLinkedLineProvider"
  | "aiProjectSpecificationProvider"
  | "aiApprovalProvider"
  | "aiCountryProfileProvider"
  | "aiWarehouseAnswerComposer"
  | "aiWarehouseSourceSanitizer";

export type WarehouseProviderDescriptor = {
  key: WarehouseProviderKey;
  pure: boolean;
  usesHooks: boolean;
  usesUseEffectHack: boolean;
  dbWrites: boolean;
  directMutation: boolean;
  createsFakeData: boolean;
  ready: boolean;
};

export type WarehouseDataProviderResult = {
  facts: {
    id: string;
    textRu: string;
    sourceRefs: string[];
    confidence: "high" | "medium" | "low";
  }[];
  sources: ConstructionKnowledgeSource[];
  missingData: string[];
  permissionLimited: string[];
  exactNoDataReasonRu?: string;
};

export type WarehouseStockAnswer = {
  screenId: WarehouseScreenId;
  role: "warehouse" | "logistics";
  questionRu: string;
  intent: WarehouseStockIntent;
  answerKind:
    | "stock_summary"
    | "incoming_review"
    | "issue_readiness"
    | "material_blocker_report"
    | "inventory_discrepancy_report"
    | "reservation_report"
    | "transfer_review"
    | "draft_issue"
    | "draft_discrepancy_act"
    | "approval_route"
    | "exact_no_data_reason"
    | "clarifying_question"
    | "stock_review"
    | "discrepancy_check"
    | "handoff_draft";
  titleRu: string;
  shortAnswerRu: string;
  period?: {
    from?: string;
    to?: string;
    labelRu: string;
  };
  events: WarehouseStockEvent[];
  totals?: {
    stockItems?: number;
    criticalDeficits?: number;
    pendingIncoming?: number;
    readyToIssue?: number;
    blockedIssues?: number;
    discrepancies?: number;
  };
  stockSummary: {
    totalItems: number;
    availableQty: number;
    reservedQty: number;
    incomingQty: number;
    blockedIssues: number;
    criticalMaterials: number;
  };
  discrepancies: {
    eventId: string;
    reasonRu: string;
    sourceRefs: string[];
  }[];
  risks: {
    eventId: string;
    level: "low" | "medium" | "high" | "critical";
    reasonRu: string;
    sourceRefs: string[];
  }[];
  sources: {
    id: string;
    type: WarehouseStockSourceType;
    labelRu: string;
    date?: string;
    page?: number;
  }[];
  missingData: string[];
  hiddenByPermission: {
    sourceType: string;
    reasonRu: string;
  }[];
  nextStepRu: string;
  answerRu: string;
  sourceTrace: string[];
  providerTrace: string[];
  changedData: false;
  stockMutated: false;
  incomingAccepted: false;
  issueCompleted: false;
  transferCompleted: false;
  writeoffCompleted: false;
  autoApproval: false;
  issueExecuted: false;
  writeoffCreated: false;
  reservationCreated: false;
  fakeStockCreated: false;
  fakeIncomingCreated: false;
  fakeIssueCreated: false;
  fakeDocumentCreated: false;
  genericAnswerUsed: false;
};

export type WarehouseRealStockMatrix = {
  wave: typeof WAREHOUSE_REAL_STOCK_WAVE;
  final_status: "GREEN_AI_WAREHOUSE_REAL_STOCK_FUNNEL_READY" | string;
  existing_screenMagic_extended_only: boolean;
  new_hooks_added: boolean;
  useEffect_hacks_added: boolean;
  second_ai_framework_created: boolean;
  db_writes_from_ai_answer_used: boolean;
  migrations_used: boolean;
  business_logic_changed: boolean;
  warehouse_main_ready: boolean;
  warehouse_incoming_ready_or_exact_route_reason: boolean;
  warehouse_issue_ready_or_exact_route_reason: boolean;
  warehouse_stock_detail_ready_or_exact_route_reason: boolean;
  warehouse_inventory_ready_or_exact_route_reason: boolean;
  warehouse_reservations_ready_or_exact_route_reason: boolean;
  warehouse_transfers_ready_or_exact_route_reason: boolean;
  map_main_stock_context_ready: boolean;
  warehouse_role_policy_exists: boolean;
  warehouse_free_text_qa_enabled: boolean;
  buttons_and_free_text_use_same_pipeline: boolean;
  stock_overview_ready: boolean;
  critical_deficits_ready: boolean;
  material_blockers_ready: boolean;
  issue_readiness_ready: boolean;
  incoming_reconciliation_ready: boolean;
  inventory_discrepancy_ready: boolean;
  reservation_report_ready: boolean;
  transfer_review_ready: boolean;
  answers_include_period_or_exact_reason: boolean;
  answers_include_materials_or_exact_reason: boolean;
  answers_include_stock_sources: boolean;
  answers_include_reserve_context: boolean;
  answers_include_incoming_issue_context: boolean;
  answers_include_missing_data: boolean;
  answers_include_risk_reasons: boolean;
  answers_include_next_step: boolean;
  unit_normalization_done_with_trace: boolean;
  quantity_comparison_requires_same_unit_or_trace: boolean;
  construction_core_used_for_work_object_estimate_project_links: boolean;
  buyer_stock_handoff_ready: boolean;
  accountant_incoming_trace_ready: boolean;
  direct_receive_paths_found: number;
  direct_issue_paths_found: number;
  direct_writeoff_paths_found: number;
  direct_transfer_paths_found: number;
  stock_mutated_by_ai: boolean;
  auto_approval_found: boolean;
  approval_bypass_found: number;
  fake_stock_created: boolean;
  fake_incoming_created: boolean;
  fake_issue_created: boolean;
  fake_reserve_created: boolean;
  fake_writeoff_created: boolean;
  fake_transfer_created: boolean;
  fake_location_created: boolean;
  fake_eta_created: boolean;
  fake_waybill_created: boolean;
  warehouse_full_cashflow_leak_found: boolean;
  security_runtime_leak_found: boolean;
  raw_secrets_visible: boolean;
  generic_answers_found: number;
  technical_copy_visible_to_user: boolean;
  web_free_text_questions_passed: boolean;
  web_all_visible_buttons_clicked: boolean;
  android_warehouse_question_passed: boolean;
  android_buttons_targetable: boolean;
  release_verify_passed: boolean;
  fake_green_claimed: boolean;
  warehouse_incoming_ready?: boolean;
  warehouse_issue_ready?: boolean;
  stock_summary_ready?: boolean;
  incoming_readiness_ready?: boolean;
  discrepancy_check_ready?: boolean;
  specification_provider_ready?: boolean;
  unit_conversion_ready?: boolean;
  documents_provider_ready?: boolean;
  procurement_handoff_ready?: boolean;
  foreman_handoff_ready?: boolean;
  approval_route_visible?: boolean;
  answers_include_objects_or_exact_reason?: boolean;
  answers_include_works_or_exact_reason?: boolean;
  answers_include_sources?: boolean;
  answers_include_missing_documents?: boolean;
  stock_not_invented?: boolean;
  incoming_not_invented?: boolean;
  issue_not_invented?: boolean;
  direct_stock_mutations_found?: number;
  incoming_accepted_by_ai?: boolean;
  material_issued_by_ai?: boolean;
  reservation_created_by_ai?: boolean;
  fake_documents_created?: boolean;
  warehouse_full_finance_leak_found?: boolean;
};
