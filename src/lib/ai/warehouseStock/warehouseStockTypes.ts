import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";

export const WAREHOUSE_REAL_STOCK_WAVE =
  "S_AI_WAREHOUSE_REAL_STOCK_FUNNEL_POINT_OF_NO_RETURN" as const;

export type WarehouseScreenId =
  | "warehouse.main"
  | "warehouse.incoming"
  | "warehouse.issue"
  | "warehouse.stock.detail"
  | "warehouse.request.detail"
  | "warehouse.copilot"
  | "director.warehouse";

export type WarehouseStockSourceType =
  | "warehouse_stock"
  | "warehouse_incoming"
  | "warehouse_issue"
  | "material"
  | "specification"
  | "procurement_request"
  | "work"
  | "object"
  | "zone"
  | "pdf_chunk"
  | "document"
  | "approval"
  | "chat_message";

export type WarehouseStockItem = {
  id: string;
  materialId: string;
  materialNameRu: string;
  specificationText?: string;
  availableQty: number;
  reservedQty: number;
  incomingQty: number;
  unit: string;
  warehouseNameRu: string;
  objectId?: string;
  objectNameRu?: string;
  workId?: string;
  workNameRu?: string;
  requestId?: string;
  sourceRefs: string[];
};

export type WarehouseIncomingItem = {
  id: string;
  materialId: string;
  materialNameRu: string;
  quantity: number;
  unit: string;
  supplierNameRu?: string;
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
  unit: string;
  objectId?: string;
  objectNameRu?: string;
  workId?: string;
  workNameRu?: string;
  requestId?: string;
  status: "draft" | "ready_for_pick" | "blocked" | "issued" | "needs_approval";
  sourceRefs: string[];
};

export type WarehouseStockEvent = {
  id: string;
  eventType:
    | "stock_status"
    | "incoming_check"
    | "issue_readiness"
    | "material_blocker"
    | "discrepancy"
    | "approval_item";
  status:
    | "ready"
    | "blocked"
    | "needs_documents"
    | "needs_approval"
    | "discrepancy"
    | "informational";
  materialId?: string;
  materialNameRu?: string;
  objectId?: string;
  objectNameRu?: string;
  workId?: string;
  workNameRu?: string;
  quantity?: number;
  unit?: string;
  sourceRefs: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  riskReasonsRu: string[];
  missingData: (
    | "stock_source_missing"
    | "incoming_document_missing"
    | "issue_basis_missing"
    | "material_specification_missing"
    | "unit_conversion_missing"
    | "warehouse_receipt_missing"
    | "approval_missing"
    | "work_link_missing"
    | "object_link_missing"
    | "procurement_request_missing"
  )[];
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
  sources: ConstructionKnowledgeSource[];
  unitConversionConfigured: boolean;
  documentsProviderConnected: boolean;
};

export type WarehouseStockIntent =
  | "today_stock_summary"
  | "what_to_issue_by_object"
  | "critical_materials"
  | "material_blockers"
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
    | "screen"
    | "material"
    | "object"
    | "work"
    | "incoming"
    | "issue"
    | "none";
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
  | "aiWarehouseIncomingProvider"
  | "aiWarehouseIssueProvider"
  | "aiMaterialSpecificationProvider"
  | "aiWorkObjectLinkedProvider"
  | "aiProcurementLinkedRequestProvider"
  | "aiPdfAggregatorProvider"
  | "aiDocumentsProvider"
  | "aiApprovalProvider"
  | "aiUnitConversionProvider"
  | "aiWarehouseDiscrepancyProvider"
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
  role: "warehouse";
  questionRu: string;
  intent: WarehouseStockIntent;
  answerKind:
    | "stock_review"
    | "incoming_review"
    | "issue_readiness"
    | "discrepancy_check"
    | "handoff_draft"
    | "approval_route"
    | "exact_no_data_reason"
    | "clarifying_question";
  titleRu: string;
  shortAnswerRu: string;
  period: {
    labelRu: string;
    from?: string;
    to?: string;
  };
  events: WarehouseStockEvent[];
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
  issueExecuted: false;
  writeoffCreated: false;
  reservationCreated: false;
  autoApproval: false;
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
  warehouse_incoming_ready: boolean;
  warehouse_issue_ready: boolean;
  warehouse_stock_detail_ready_or_exact_route_reason: boolean;
  warehouse_role_policy_exists: boolean;
  warehouse_free_text_qa_enabled: boolean;
  buttons_and_free_text_use_same_pipeline: boolean;
  stock_summary_ready: boolean;
  incoming_readiness_ready: boolean;
  issue_readiness_ready: boolean;
  material_blockers_ready: boolean;
  discrepancy_check_ready: boolean;
  specification_provider_ready: boolean;
  unit_conversion_ready: boolean;
  documents_provider_ready: boolean;
  procurement_handoff_ready: boolean;
  foreman_handoff_ready: boolean;
  approval_route_visible: boolean;
  answers_include_materials_or_exact_reason: boolean;
  answers_include_objects_or_exact_reason: boolean;
  answers_include_works_or_exact_reason: boolean;
  answers_include_sources: boolean;
  answers_include_missing_documents: boolean;
  answers_include_risk_reasons: boolean;
  answers_include_next_step: boolean;
  stock_not_invented: boolean;
  incoming_not_invented: boolean;
  issue_not_invented: boolean;
  direct_stock_mutations_found: number;
  direct_receive_paths_found: number;
  direct_issue_paths_found: number;
  direct_writeoff_paths_found: number;
  stock_mutated_by_ai: boolean;
  incoming_accepted_by_ai: boolean;
  material_issued_by_ai: boolean;
  reservation_created_by_ai: boolean;
  auto_approval_found: boolean;
  approval_bypass_found: number;
  fake_stock_created: boolean;
  fake_incoming_created: boolean;
  fake_issue_created: boolean;
  fake_documents_created: boolean;
  warehouse_full_finance_leak_found: boolean;
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
};
