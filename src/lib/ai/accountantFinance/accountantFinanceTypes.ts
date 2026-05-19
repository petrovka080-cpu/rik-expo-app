import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";

export const ACCOUNTANT_REAL_FINANCE_WAVE =
  "S_AI_ACCOUNTANT_REAL_FINANCE_FUNNEL_POINT_OF_NO_RETURN" as const;

export type AccountantScreenId =
  | "accountant.main"
  | "accountant.invoice.detail"
  | "accountant.payment.detail"
  | "accountant.history"
  | "finance.copilot"
  | "director.finance";

export type AccountantFinanceSourceType =
  | "invoice"
  | "act"
  | "estimate_line"
  | "project_pdf"
  | "pdf_chunk"
  | "procurement_request"
  | "supplier_offer"
  | "supplier_document"
  | "payment"
  | "cashflow_slice"
  | "work"
  | "object"
  | "material"
  | "approval"
  | "country_profile"
  | "company_standard"
  | "chart_of_accounts";

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
  requiredContext: "invoice" | "payment" | "act" | "object" | "supplier" | "period" | "none";
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
  missingData: string[];
  nextStepRu: string;
  approvalRoute?: {
    required: boolean;
    approverRole: "director" | "finance" | "office" | "admin";
    reasonRu: string;
  };
  changedData: false;
  paymentCreated: false;
  postingCreated: false;
  invoiceMutated: false;
  autoApproval: false;
  providerTrace: string[];
  sourceTrace: string[];
  genericAnswerUsed: false;
  fakeInvoiceCreated: false;
  fakeActCreated: false;
  fakePaymentCreated: false;
  fakeDocumentCreated: false;
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
  accountant_invoice_detail_ready: boolean;
  accountant_payment_detail_ready: boolean;
  finance_copilot_ready: boolean;
  accountant_role_policy_exists: boolean;
  accountant_free_text_qa_enabled: boolean;
  buttons_and_free_text_use_same_pipeline: boolean;
  invoice_act_payment_chain_ready: boolean;
  estimate_and_project_sources_used: boolean;
  primary_documents_required: boolean;
  country_tax_claims_require_source: boolean;
  chart_of_accounts_claims_require_source: boolean;
  payment_risk_explainable: boolean;
  approval_route_visible: boolean;
  direct_payment_paths_found: number;
  direct_posting_paths_found: number;
  auto_approval_found: false;
  approval_bypass_found: number;
  fake_invoice_created: false;
  fake_act_created: false;
  fake_payment_created: false;
  fake_document_created: false;
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
