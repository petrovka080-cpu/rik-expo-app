import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";

export const ACCOUNTANT_REAL_FINANCE_WAVE =
  "S_AI_ACCOUNTANT_REAL_FINANCE_FUNNEL_POINT_OF_NO_RETURN" as const;

export type AccountantScreenId =
  | "accountant.main"
  | "finance.payments"
  | "finance.payment.detail"
  | "finance.invoices"
  | "finance.invoice.detail"
  | "finance.cashflow"
  | "finance.approvals"
  | "accountant.invoice.detail"
  | "accountant.payment.detail"
  | "accountant.history"
  | "finance.copilot"
  | "director.finance";

export type AccountantFinanceSourceType =
  | "payment"
  | "invoice"
  | "act"
  | "contract"
  | "waybill"
  | "document"
  | "estimate_line"
  | "project_pdf"
  | "pdf_chunk"
  | "approval"
  | "procurement_request"
  | "supplier_offer"
  | "supplier_document"
  | "warehouse_incoming"
  | "warehouse_issue"
  | "cashflow"
  | "cashflow_slice"
  | "accounting_record"
  | "work"
  | "object"
  | "material"
  | "country_profile"
  | "company_policy"
  | "company_standard"
  | "chart_of_accounts";

export type FinanceEvent = {
  id: string;
  eventType:
    | "supplier_invoice"
    | "contractor_act"
    | "material_payment"
    | "service_payment"
    | "advance_payment"
    | "partial_payment"
    | "debt"
    | "refund"
    | "cashflow_item"
    | "approval_item";
  status:
    | "draft"
    | "needs_documents"
    | "ready_for_review"
    | "pending_approval"
    | "approved"
    | "blocked"
    | "paid"
    | "rejected";
  amount?: number;
  currency?: string;
  supplierId?: string;
  supplierNameRu?: string;
  contractorId?: string;
  contractorNameRu?: string;
  objectId?: string;
  objectNameRu?: string;
  workId?: string;
  workNameRu?: string;
  requestId?: string;
  invoiceId?: string;
  actId?: string;
  paymentId?: string;
  approvalId?: string;
  documentRefs: string[];
  sourceRefs: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  riskReasonsRu: string[];
  missingData: (
    | "invoice_missing"
    | "act_missing"
    | "waybill_missing"
    | "contract_missing"
    | "approval_missing"
    | "warehouse_receipt_missing"
    | "work_confirmation_missing"
    | "estimate_link_missing"
    | "currency_rate_missing"
    | "tax_profile_missing"
    | "budget_limit_missing"
  )[];
};

export type AccountantFinanceProviderRequest = {
  invoiceId?: string;
  paymentId?: string;
  countryCode?: string;
  currency?: string;
  item: {
    invoiceNumber?: string;
    supplierNameRu?: string;
    amount: number;
    currency: string;
    dueDate?: string;
  };
  linkedContext: {
    requestId?: string;
    actId?: string;
    workId?: string;
    objectId?: string;
    estimateLineId?: string;
    projectDocumentId?: string;
    pdfChunkIds?: string[];
  };
};

export type AccountantInvoice = {
  id: string;
  numberRu: string;
  supplierNameRu: string;
  amount: number;
  currency: string;
  invoiceDate: string;
  dueDate?: string;
  status: "received" | "needs_check" | "ready_for_approval" | "partially_paid" | "paid" | "blocked";
  requestId?: string;
  actId?: string;
  workId?: string;
  objectId?: string;
  estimateLineId?: string;
  sourceRefs: string[];
};

export type AccountantAct = {
  id: string;
  titleRu: string;
  amount?: number;
  currency?: string;
  signedByHuman: boolean;
  linkedWorkId?: string;
  linkedEstimateLineId?: string;
  sourceRefs: string[];
};

export type AccountantPayment = {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  paidAt?: string;
  status: "planned" | "pending_approval" | "approved" | "paid" | "blocked";
  sourceRefs: string[];
};

export type AccountantCashflowSlice = {
  id: string;
  scope: "invoice" | "supplier" | "object" | "company_redacted";
  periodRu: string;
  incomingAmount?: number;
  outgoingAmount?: number;
  currency: string;
  sourceRefs: string[];
};

export type AccountantFinanceContext = {
  screenId: AccountantScreenId;
  role: "accountant";
  questionRu?: string;
  selectedInvoiceId?: string;
  selectedPaymentId?: string;
  countryCode?: string;
  currency?: string;
  invoices: AccountantInvoice[];
  acts: AccountantAct[];
  payments: AccountantPayment[];
  cashflow: AccountantCashflowSlice[];
  sources: ConstructionKnowledgeSource[];
  chartOfAccountsConfigured: boolean;
  countryTaxProfileConfigured: boolean;
};

export type AccountantIntent =
  | "payment_readiness_check"
  | "critical_payments"
  | "missing_documents_for_payment"
  | "cashflow_summary"
  | "cashflow_forecast"
  | "supplier_debt_summary"
  | "contractor_payment_check"
  | "invoice_to_request_reconciliation"
  | "invoice_to_warehouse_reconciliation"
  | "act_to_payment_reconciliation"
  | "estimate_to_act_reconciliation"
  | "approval_queue_for_finance"
  | "director_payment_rationale"
  | "document_request_draft"
  | "payment_risk_explanation"
  | "budget_limit_check"
  | "country_accounting_context_check"
  | "chart_of_accounts_mapping"
  | "payment_readiness"
  | "invoice_risk_check"
  | "act_invoice_match"
  | "estimate_act_invoice_chain"
  | "missing_primary_documents"
  | "payment_movement_summary"
  | "cashflow_slice"
  | "creditor_debtor_summary"
  | "prepare_payment_rationale"
  | "prepare_approval_handoff"
  | "tax_country_context_check"
  | "chart_of_accounts_check"
  | "document_basis_check"
  | "procurement_invoice_link"
  | "free_text_finance_summary";

export type AccountantIntentContract = {
  intent: AccountantIntent;
  examplesRu: string[];
  requiredContext: "invoice" | "payment" | "act" | "object" | "supplier" | "contractor" | "period" | "none";
  allowedSources: AccountantFinanceSourceType[];
  answerMode: "read" | "draft" | "approval_route" | "clarifying";
};

export type AccountantActionQuestion = {
  screenId: AccountantScreenId;
  actionId: AccountantIntent;
  labelRu: string;
  concreteQuestionRu: string;
  requiredContext: AccountantIntentContract["requiredContext"][];
  allowedSources: AccountantFinanceSourceType[];
  answerMode: AccountantIntentContract["answerMode"];
};

export type AccountantProviderKey =
  | "aiAccountantScreenContextProvider"
  | "aiPaymentsProvider"
  | "aiPaymentDetailProvider"
  | "aiInvoicesProvider"
  | "aiInvoiceDetailProvider"
  | "aiActsProvider"
  | "aiContractsProvider"
  | "aiWaybillsProvider"
  | "aiDocumentsProvider"
  | "aiPdfAggregatorProvider"
  | "aiApprovalProvider"
  | "aiProcurementLinkedRequestProvider"
  | "aiSupplierLinkedProvider"
  | "aiWarehouseLinkedIncomingProvider"
  | "aiWarehouseLinkedIssueProvider"
  | "aiWorkObjectLinkedProvider"
  | "aiEstimateLinkedLineProvider"
  | "aiCashflowProvider"
  | "aiReceivablesPayablesProvider"
  | "aiAccountingRecordsProvider"
  | "aiChartOfAccountsProvider"
  | "aiBudgetLimitProvider"
  | "aiCurrencyCountryProvider"
  | "aiExchangeRateProvider"
  | "aiTaxAccountingProfileProvider"
  | "aiCompanyAccountingPolicyProvider"
  | "aiFinanceRiskProvider"
  | "aiAccountantInvoiceProvider"
  | "aiAccountantActProvider"
  | "aiAccountantEstimateProvider"
  | "aiAccountantProcurementLinkProvider"
  | "aiAccountantDocumentEvidenceProvider"
  | "aiAccountantPaymentLedgerProvider"
  | "aiAccountantCashflowSliceProvider"
  | "aiAccountantDebtCreditorProvider"
  | "aiAccountantChartOfAccountsProvider"
  | "aiAccountantCountryTaxProfileProvider"
  | "aiAccountantApprovalStatusProvider"
  | "aiAccountantRiskProvider"
  | "aiAccountantAnswerComposer"
  | "aiAccountantSourceSanitizer";

export type AccountantProviderDescriptor = {
  key: AccountantProviderKey;
  pure: true;
  usesHooks: false;
  usesUseEffectHack: false;
  dbWrites: false;
  directMutation: false;
  createsFakeData: false;
  ready: boolean;
};

export type AccountantDataProviderResult = {
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

export type AccountantFinanceRisk = {
  id: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  reasonsRu: string[];
  sourceRefs: string[];
};

export type AccountantFinanceAnswer = {
  screenId: AccountantScreenId;
  role: "accountant";
  invoiceId?: string;
  paymentId?: string;
  questionRu: string;
  answerKind:
    | "finance_review"
    | "cashflow_summary"
    | "document_gap_check"
    | "director_rationale"
    | "draft_request"
    | "finance_result"
    | "payment_readiness"
    | "risk_explanation"
    | "approval_route"
    | "draft_rationale"
    | "exact_no_data_reason"
    | "clarifying_question";
  titleRu: string;
  shortAnswerRu: string;
  answerRu: string;
  period?: {
    from?: string;
    to?: string;
    labelRu: string;
  };
  events: FinanceEvent[];
  totals?: {
    payableReady?: number;
    payableBlocked?: number;
    pendingApproval?: number;
    paid?: number;
    currency?: string;
  };
  documentGaps: {
    eventId: string;
    missingRu: string;
    whyRequiredRu: string;
  }[];
  invoiceSummary: {
    numberRu?: string;
    supplierNameRu?: string;
    amount?: number;
    currency?: string;
    status?: AccountantInvoice["status"];
  };
  chain: {
    invoiceId?: string;
    requestId?: string;
    actId?: string;
    workId?: string;
    objectId?: string;
    estimateLineId?: string;
  };
  risks: AccountantFinanceRisk[];
  riskExplanations: {
    eventId: string;
    level: "low" | "medium" | "high" | "critical";
    reasonRu: string;
    sourceRefs: string[];
  }[];
  sources: {
    id: string;
    type: AccountantFinanceSourceType;
    labelRu: string;
    page?: number;
    date?: string;
  }[];
  missingData: string[];
  hiddenByPermission: {
    sourceType: string;
    reasonRu: string;
  }[];
  nextStepRu: string;
  approvalRoute?: {
    required: boolean;
    approverRole: "director" | "finance" | "office" | "admin";
    reasonRu: string;
    sourceRefs?: string[];
  };
  changedData: false;
  paymentCreated: false;
  paymentExecuted: false;
  postingCreated: false;
  accountingRecordCreated: false;
  invoiceMutated: false;
  autoApproval: false;
  providerTrace: string[];
  sourceTrace: string[];
  genericAnswerUsed: false;
  fakeInvoiceCreated: false;
  fakeActCreated: false;
  fakePaymentCreated: false;
  fakeDocumentCreated: false;
  fakeWaybillCreated: false;
  fakeCashflowCreated: false;
  fakeAccountingRecordCreated: false;
  cashflowInvented: false;
  forecastLabeledAsForecast: boolean;
  countryAccountingClaimHasSource: boolean;
  chartOfAccountsMappingHasConfiguredSource: boolean;
  directPaymentPathUsed: false;
  approvalBypassUsed: false;
};

export type AccountantRealFinanceMatrix = {
  wave: typeof ACCOUNTANT_REAL_FINANCE_WAVE;
  final_status:
    | "GREEN_AI_ACCOUNTANT_REAL_FINANCE_FUNNEL_READY"
    | "BLOCKED_ACCOUNTANT_ROLE_POLICY_MISSING"
    | "BLOCKED_ACCOUNTANT_PIPELINE_NOT_CONNECTED"
    | "BLOCKED_ACCOUNTANT_DATA_PROVIDER_MISSING"
    | "BLOCKED_ACCOUNTANT_FREE_TEXT_QA_NOT_CONNECTED"
    | "BLOCKED_ANDROID_TARGETABILITY_ACCOUNTANT";
  existing_screenMagic_extended_only: true;
  new_hooks_added: false;
  useEffect_hacks_added: false;
  second_ai_framework_created: false;
  db_writes_from_ai_answer_used: false;
  migrations_used: false;
  business_logic_changed: false;
  accountant_main_ready: boolean;
  finance_payments_ready_or_exact_route_reason: boolean;
  finance_payment_detail_ready_or_exact_route_reason: boolean;
  finance_invoices_ready_or_exact_route_reason: boolean;
  finance_invoice_detail_ready_or_exact_route_reason: boolean;
  finance_cashflow_ready_or_exact_route_reason: boolean;
  finance_approvals_ready_or_exact_route_reason: boolean;
  accountant_invoice_detail_ready: boolean;
  accountant_payment_detail_ready: boolean;
  finance_copilot_ready: boolean;
  accountant_role_policy_exists: boolean;
  accountant_free_text_qa_enabled: boolean;
  buttons_and_free_text_use_same_pipeline: boolean;
  payment_readiness_ready: boolean;
  critical_payments_ready: boolean;
  missing_documents_ready: boolean;
  invoice_reconciliation_ready: boolean;
  act_payment_reconciliation_ready: boolean;
  cashflow_summary_ready: boolean;
  cashflow_forecast_ready: boolean;
  director_rationale_draft_ready: boolean;
  invoice_act_payment_chain_ready: boolean;
  estimate_and_project_sources_used: boolean;
  primary_documents_required: boolean;
  country_tax_claims_require_source: boolean;
  chart_of_accounts_claims_require_source: boolean;
  payment_risk_explainable: boolean;
  approval_route_visible: boolean;
  answers_include_period_or_exact_reason: boolean;
  answers_include_sources: boolean;
  answers_include_missing_documents: boolean;
  answers_include_risk_reasons: boolean;
  answers_include_next_step: boolean;
  cashflow_not_invented: boolean;
  forecast_labeled_as_forecast: boolean;
  country_accounting_claims_require_source: boolean;
  chart_of_accounts_mapping_requires_configured_source: boolean;
  construction_core_used_for_act_work_estimate_links: boolean;
  warehouse_checked_when_payment_requires_delivery_confirmation: boolean;
  approval_ledger_used: boolean;
  direct_payment_paths_found: number;
  direct_posting_paths_found: number;
  payment_created_by_ai: false;
  accounting_records_created_by_ai: false;
  auto_approval_found: false;
  approval_bypass_found: number;
  fake_invoice_created: false;
  fake_act_created: false;
  fake_payment_created: false;
  fake_waybills_created: false;
  fake_document_created: false;
  fake_cashflow_created: false;
  fake_accounting_records_created: false;
  accountant_security_runtime_leak_found: false;
  accountant_full_security_leak_found: false;
  raw_secrets_visible: false;
  generic_answers_found: number;
  technical_copy_visible_to_user: false;
  web_free_text_questions_passed: boolean;
  web_all_visible_buttons_clicked: boolean;
  android_accountant_question_passed: boolean;
  android_buttons_targetable: boolean;
  release_verify_passed?: boolean;
  fake_green_claimed: false;
};
