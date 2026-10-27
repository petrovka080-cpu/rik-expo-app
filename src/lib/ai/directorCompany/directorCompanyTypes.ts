export const DIRECTOR_REAL_COMPANY_WAVE =
  "S_AI_DIRECTOR_REAL_COMPANY_FUNNEL_POINT_OF_NO_RETURN" as const;

export type DirectorCompanyScreenId =
  | "director.dashboard"
  | "director.reports"
  | "ai.command_center"
  | "director.approvals"
  | "director.risks"
  | "director.company.timeline";

export type DirectorCompanySourceType =
  | "work"
  | "object"
  | "contractor"
  | "procurement_request"
  | "supplier_offer"
  | "marketplace_offer"
  | "warehouse_stock"
  | "warehouse_incoming"
  | "warehouse_issue"
  | "payment"
  | "invoice"
  | "act"
  | "cashflow"
  | "document"
  | "pdf_chunk"
  | "report"
  | "approval"
  | "chat_message"
  | "office_task"
  | "security_summary";

export type DirectorIntent =
  | "today_decision_queue"
  | "top_company_risks"
  | "blocked_objects_summary"
  | "approval_queue_review"
  | "finance_risk_summary"
  | "cashflow_risk_summary"
  | "procurement_blockers"
  | "supplier_delivery_risks"
  | "warehouse_deficits"
  | "incoming_discrepancies"
  | "field_closeout_blockers"
  | "contractor_blockers"
  | "document_evidence_gaps"
  | "office_stuck_work"
  | "company_timeline"
  | "object_chain_trace"
  | "weekly_executive_summary"
  | "director_delegation_draft"
  | "approval_rationale_review"
  | "security_safe_summary";

export type DirectorAnswerKind =
  | "decision_queue"
  | "executive_summary"
  | "cross_domain_risk_report"
  | "approval_review"
  | "company_timeline"
  | "cashflow_risk_summary"
  | "director_draft"
  | "delegation_draft"
  | "exact_no_data_reason"
  | "clarifying_question";

export type DirectorSourceRef = {
  id: string;
  type: DirectorCompanySourceType;
  labelRu: string;
  date?: string;
  page?: number;
};

export type DirectorUnsafeTechnicalSource = {
  id: string;
  type: "raw_runtime" | "raw_security_event" | "service_role" | "provider_payload" | "env_secret";
  labelRu: string;
};

export type CompanyDecisionEvent = {
  id: string;
  eventType:
    | "approval_pending"
    | "payment_risk"
    | "procurement_blocker"
    | "warehouse_deficit"
    | "incoming_discrepancy"
    | "field_closeout_blocker"
    | "contractor_blocker"
    | "document_missing"
    | "report_risk"
    | "office_stuck_work"
    | "cashflow_risk"
    | "security_summary_risk";
  severity: "low" | "medium" | "high" | "critical";
  status:
    | "needs_director_decision"
    | "needs_data"
    | "needs_owner_action"
    | "ready_for_approval_review"
    | "blocked"
    | "watch";
  titleRu: string;
  summaryRu: string;
  ownerRole:
    | "director"
    | "accountant"
    | "buyer"
    | "warehouse"
    | "foreman"
    | "contractor"
    | "office"
    | "security"
    | "admin";
  linkedContext: {
    objectId?: string;
    objectNameRu?: string;
    workId?: string;
    workNameRu?: string;
    requestId?: string;
    supplierId?: string;
    supplierNameRu?: string;
    stockItemId?: string;
    materialNameRu?: string;
    invoiceId?: string;
    paymentId?: string;
    actId?: string;
    documentId?: string;
    reportId?: string;
    approvalId?: string;
  };
  dates: {
    createdAt?: string;
    dueAt?: string;
    lastUpdatedAt?: string;
    overdueDays?: number;
  };
  amount?: {
    value: number;
    currency: string;
    kind: "payment" | "invoice" | "budget" | "cashflow_forecast";
  };
  blockers: {
    kind:
      | "missing_document"
      | "missing_photo"
      | "missing_signature"
      | "warehouse_missing"
      | "supplier_missing"
      | "approval_missing"
      | "cashflow_unknown"
      | "payment_without_basis"
      | "incoming_not_confirmed"
      | "unit_mismatch"
      | "price_risk"
      | "contractor_not_confirmed"
      | "office_overdue";
    textRu: string;
  }[];
  risks: {
    kind:
      | "schedule"
      | "financial"
      | "document"
      | "warehouse"
      | "procurement"
      | "quality"
      | "contractor"
      | "approval"
      | "security";
    level: "low" | "medium" | "high" | "critical";
    reasonRu: string;
  }[];
  decisionOptions: {
    optionRu: string;
    consequenceRu: string;
    requiresApproval: boolean;
    unsafeDirectAction: false;
  }[];
  sourceRefs: string[];
};

export type DirectorApprovalItem = {
  id: string;
  titleRu: string;
  status: "pending" | "overdue" | "ready_for_review" | "needs_data";
  approvalId: string;
  ownerRole: CompanyDecisionEvent["ownerRole"];
  riskLevel: CompanyDecisionEvent["severity"];
  dueAt?: string;
  overdueDays?: number;
  linkedObjectId?: string;
  linkedWorkId?: string;
  linkedRequestId?: string;
  linkedInvoiceId?: string;
  missingData: string[];
  sourceRefs: string[];
};

export type DirectorWorkItem = {
  id: string;
  objectId: string;
  objectNameRu: string;
  workNameRu: string;
  status: "planned" | "in_progress" | "done" | "blocked" | "ready_for_act";
  contractorNameRu?: string;
  materialNameRu?: string;
  missingPhotos?: boolean;
  missingSignature?: boolean;
  missingAct?: boolean;
  blockerRu?: string;
  sourceRefs: string[];
};

export type DirectorProcurementItem = {
  id: string;
  objectId?: string;
  objectNameRu?: string;
  workId?: string;
  workNameRu?: string;
  itemRu: string;
  supplierNameRu?: string;
  status: "approved" | "sourcing" | "blocked" | "pending_approval" | "delivery_risk";
  deliveryDueAt?: string;
  missingData: string[];
  sourceRefs: string[];
};

export type DirectorWarehouseItem = {
  id: string;
  materialNameRu: string;
  objectId?: string;
  objectNameRu?: string;
  workId?: string;
  workNameRu?: string;
  requestedQty?: number;
  availableQty?: number;
  deficitQty?: number;
  unit?: string;
  incomingConfirmed: boolean;
  sourceRefs: string[];
};

export type DirectorFinanceItem = {
  id: string;
  invoiceId?: string;
  paymentId?: string;
  supplierNameRu?: string;
  amount: number;
  currency: string;
  status: "pending_approval" | "blocked" | "ready_for_review" | "paid" | "forecast";
  riskLevel: CompanyDecisionEvent["severity"];
  missingDocuments: string[];
  linkedRequestId?: string;
  linkedWorkId?: string;
  linkedObjectId?: string;
  sourceRefs: string[];
};

export type DirectorDocumentItem = {
  id: string;
  titleRu: string;
  documentType: "act" | "invoice" | "waybill" | "report" | "pdf" | "photo" | "contract";
  status: "missing" | "unlinked" | "needs_review" | "ready";
  linkedObjectId?: string;
  linkedWorkId?: string;
  sourceRefs: string[];
};

export type DirectorReportItem = {
  id: string;
  titleRu: string;
  periodRu: string;
  status: "draft" | "needs_evidence" | "ready_for_review";
  missingData: string[];
  sourceRefs: string[];
};

export type DirectorOfficeTask = {
  id: string;
  titleRu: string;
  ownerRole: "office" | "accountant" | "buyer" | "warehouse" | "foreman";
  status: "stuck" | "overdue" | "pending";
  dueAt?: string;
  overdueDays?: number;
  sourceRefs: string[];
};

export type DirectorCashflowForecast = {
  id: string;
  periodRu: string;
  amount: number;
  currency: string;
  assumptionRu: string;
  sourceRefs: string[];
};

export type DirectorSecuritySummary = {
  id: string;
  titleRu: string;
  riskLevel: CompanyDecisionEvent["severity"];
  forbiddenAttemptsCount: number;
  summaryRu: string;
  sourceRefs: string[];
};

export type DirectorCompanyContext = {
  screenId: DirectorCompanyScreenId;
  role: "director";
  questionRu?: string;
  period?: {
    from?: string;
    to?: string;
    labelRu: string;
  };
  approvals: DirectorApprovalItem[];
  works: DirectorWorkItem[];
  procurementRequests: DirectorProcurementItem[];
  warehouse: DirectorWarehouseItem[];
  finance: DirectorFinanceItem[];
  documents: DirectorDocumentItem[];
  reports: DirectorReportItem[];
  officeTasks: DirectorOfficeTask[];
  cashflowForecasts: DirectorCashflowForecast[];
  securitySummaries: DirectorSecuritySummary[];
  sources: DirectorSourceRef[];
  unsafeTechnicalSources?: DirectorUnsafeTechnicalSource[];
  forecastProviderConnected: boolean;
  securitySummaryProviderConnected: boolean;
};

export type DirectorCompanyAnswer = {
  screenId: string;
  role: "director";
  questionRu: string;
  answerKind: DirectorAnswerKind;
  titleRu: string;
  shortAnswerRu: string;
  period?: {
    from?: string;
    to?: string;
    labelRu: string;
  };
  topDecision?: {
    eventId: string;
    titleRu: string;
    reasonRu: string;
    riskRu: string;
    nextStepRu: string;
  };
  events: CompanyDecisionEvent[];
  domainSummary: {
    field?: string;
    procurement?: string;
    warehouse?: string;
    finance?: string;
    documents?: string;
    office?: string;
    approvals?: string;
    security?: string;
  };
  sources: DirectorSourceRef[];
  missingData: string[];
  hiddenTechnicalData: {
    sourceType: string;
    reasonRu: string;
  }[];
  nextStepRu: string;
  changedData: false;
  approvedByAi: false;
  rejectedByAi: false;
  paymentExecuted: false;
  orderCreated: false;
  stockMutated: false;
  rolePolicyMutated: false;
  finalSubmit: false;
  answerRu: string;
  sourceTrace: string[];
  providerTrace: string[];
  genericAnswerUsed: false;
  fakeDataCreated: false;
};

export type DirectorDataProviderResult = {
  facts: {
    id: string;
    textRu: string;
    sourceRefs: string[];
    confidence: "high" | "medium" | "low";
  }[];
  sources: DirectorSourceRef[];
  missingData: string[];
  permissionLimited: string[];
  exactNoDataReasonRu?: string;
};

export type DirectorProviderKey =
  | "aiDirectorScreenContextProvider"
  | "aiCompanyDecisionEventProvider"
  | "aiCompanyRiskProvider"
  | "aiCompanyTimelineProvider"
  | "aiCompanyKpiProvider"
  | "aiApprovalQueueProvider"
  | "aiDirectorApprovalContextProvider"
  | "aiDirectorFinanceProvider"
  | "aiDirectorCashflowProvider"
  | "aiDirectorProcurementProvider"
  | "aiDirectorSupplierProvider"
  | "aiDirectorMarketplaceProvider"
  | "aiDirectorWarehouseProvider"
  | "aiDirectorFieldProvider"
  | "aiDirectorContractorProvider"
  | "aiDirectorDocumentsProvider"
  | "aiDirectorReportsProvider"
  | "aiDirectorOfficeProvider"
  | "aiDirectorSecuritySummaryProvider"
  | "aiConstructionKnowledgeCoreProvider"
  | "aiCountryProfileProvider"
  | "aiForecastProvider"
  | "aiDirectorAnswerComposer"
  | "aiDirectorSourceSanitizer";

export type DirectorProviderDescriptor = {
  key: DirectorProviderKey;
  pure: true;
  usesHooks: false;
  usesUseEffectHack: false;
  dbWrites: false;
  directMutation: false;
  createsFakeData: false;
  ready: boolean;
};

export type DirectorIntentContract = {
  intent: DirectorIntent;
  examplesRu: string[];
  requiredContext:
    | "company"
    | "object"
    | "approval"
    | "payment"
    | "request"
    | "material"
    | "period"
    | "none";
  allowedSources: DirectorCompanySourceType[];
  answerMode: "read" | "draft" | "approval_route" | "clarifying";
};

export type DirectorActionQuestion = {
  screenId: DirectorCompanyScreenId;
  actionId: DirectorIntent;
  labelRu: string;
  concreteQuestionRu: string;
  requiredContext: DirectorIntentContract["requiredContext"][];
  allowedSources: DirectorCompanySourceType[];
  answerMode: DirectorIntentContract["answerMode"];
};

export type DirectorRealCompanyMatrix = {
  wave: typeof DIRECTOR_REAL_COMPANY_WAVE;
  final_status:
    | "GREEN_AI_DIRECTOR_REAL_COMPANY_FUNNEL_READY"
    | "BLOCKED_ANDROID_TARGETABILITY_DIRECTOR";
  existing_screenMagic_extended_only: boolean;
  new_hooks_added: boolean;
  useEffect_hacks_added: boolean;
  second_ai_framework_created: boolean;
  db_writes_from_ai_answer_used: boolean;
  migrations_used: boolean;
  business_logic_changed: boolean;
  director_dashboard_ready: boolean;
  director_reports_ready: boolean;
  command_center_ready: boolean;
  director_approvals_ready_or_exact_route_reason: boolean;
  director_risks_ready_or_exact_route_reason: boolean;
  director_company_timeline_ready_or_exact_route_reason: boolean;
  director_role_policy_exists: boolean;
  director_can_query_all_business_domains: boolean;
  director_free_text_qa_enabled: boolean;
  buttons_and_free_text_use_same_pipeline: boolean;
  today_decision_queue_ready: boolean;
  top_decision_ready_or_exact_reason: boolean;
  blocked_objects_summary_ready: boolean;
  cross_domain_risk_summary_ready: boolean;
  approval_queue_ready: boolean;
  executive_summary_ready: boolean;
  command_center_role_actions_ready: boolean;
  company_timeline_ready_or_exact_reason: boolean;
  finance_trace_used: boolean;
  procurement_trace_used: boolean;
  warehouse_trace_used: boolean;
  field_trace_used: boolean;
  documents_trace_used: boolean;
  office_trace_used: boolean;
  approval_ledger_used: boolean;
  security_summary_safe: boolean;
  answers_include_period_or_exact_reason: boolean;
  answers_include_sources: boolean;
  answers_include_missing_data: boolean;
  answers_include_risk_reasons: boolean;
  answers_include_next_step: boolean;
  forecast_labeled_as_forecast: boolean;
  forecast_has_sources_or_exact_reason: boolean;
  ai_decision_on_behalf_of_director: boolean;
  direct_approve_reject_paths_found: number;
  direct_payment_paths_found: number;
  direct_order_paths_found: number;
  direct_stock_mutation_paths_found: number;
  direct_work_close_paths_found: number;
  direct_signing_paths_found: number;
  auto_approval_found: boolean;
  approval_bypass_found: number;
  fake_payments_created: boolean;
  fake_procurement_created: boolean;
  fake_stock_created: boolean;
  fake_work_created: boolean;
  fake_documents_created: boolean;
  fake_reports_created: boolean;
  fake_security_findings_created: boolean;
  fake_cashflow_created: boolean;
  fake_forecast_created: boolean;
  raw_runtime_visible_to_director: boolean;
  raw_secrets_visible: boolean;
  service_role_visible: boolean;
  provider_payload_visible: boolean;
  generic_answers_found: number;
  technical_copy_visible_to_user: boolean;
  web_free_text_questions_passed: boolean;
  web_all_visible_buttons_clicked: boolean;
  android_director_question_passed: boolean;
  android_buttons_targetable: boolean;
  release_verify_passed: boolean;
  fake_green_claimed: boolean;
};
