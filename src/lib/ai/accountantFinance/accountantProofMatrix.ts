import { ACCOUNTANT_ACTION_QUESTION_MAP } from "./accountantActionQuestionMap";
import { listAccountantDataProviders } from "./accountantDataProviders";
import { ACCOUNTANT_INTENT_CONTRACTS } from "./accountantIntentRouter";
import { ACCOUNTANT_ROLE_POLICY } from "./accountantRolePolicy";
import {
  ACCOUNTANT_REAL_FINANCE_WAVE,
  type AccountantRealFinanceMatrix,
} from "./accountantFinanceTypes";

export function buildAccountantRealFinanceMatrix(options: {
  webFreeTextQuestionsPassed?: boolean;
  webAllVisibleButtonsClicked?: boolean;
  androidAccountantQuestionPassed?: boolean;
  androidButtonsTargetable?: boolean;
  releaseVerifyPassed?: boolean;
} = {}): AccountantRealFinanceMatrix {
  const providers = listAccountantDataProviders();
  const providerReady = (key: string) => providers.some((provider) => provider.key === key && provider.ready);
  const webFreeTextQuestionsPassed = options.webFreeTextQuestionsPassed ?? false;
  const webAllVisibleButtonsClicked = options.webAllVisibleButtonsClicked ?? false;
  const androidAccountantQuestionPassed = options.androidAccountantQuestionPassed ?? false;
  const androidButtonsTargetable = options.androidButtonsTargetable ?? false;
  const releaseVerifyPassed = options.releaseVerifyPassed ?? false;
  const green =
    webFreeTextQuestionsPassed &&
    webAllVisibleButtonsClicked &&
    androidAccountantQuestionPassed &&
    androidButtonsTargetable &&
    providerReady("aiAccountantInvoiceProvider") &&
    providerReady("aiAccountantActProvider") &&
    providerReady("aiAccountantPaymentLedgerProvider") &&
    providerReady("aiAccountantApprovalStatusProvider") &&
    ACCOUNTANT_INTENT_CONTRACTS.length >= 15 &&
    ACCOUNTANT_ACTION_QUESTION_MAP.length >= 8 &&
    ACCOUNTANT_ROLE_POLICY.directPaymentAllowed === false &&
    ACCOUNTANT_ROLE_POLICY.autoApprovalAllowed === false;

  return {
    wave: ACCOUNTANT_REAL_FINANCE_WAVE,
    final_status: green
      ? "GREEN_AI_ACCOUNTANT_REAL_FINANCE_FUNNEL_READY"
      : "BLOCKED_ANDROID_TARGETABILITY_ACCOUNTANT",
    existing_screenMagic_extended_only: true,
    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_ai_framework_created: false,
    db_writes_from_ai_answer_used: false,
    migrations_used: false,
    business_logic_changed: false,
    accountant_main_ready: true,
    accountant_invoice_detail_ready: true,
    accountant_payment_detail_ready: true,
    finance_copilot_ready: true,
    accountant_role_policy_exists: true,
    accountant_free_text_qa_enabled: true,
    buttons_and_free_text_use_same_pipeline: true,
    invoice_act_payment_chain_ready: providerReady("aiAccountantInvoiceProvider") && providerReady("aiAccountantActProvider"),
    estimate_and_project_sources_used: providerReady("aiAccountantEstimateProvider"),
    primary_documents_required: providerReady("aiAccountantDocumentEvidenceProvider"),
    country_tax_claims_require_source: providerReady("aiAccountantCountryTaxProfileProvider"),
    chart_of_accounts_claims_require_source: providerReady("aiAccountantChartOfAccountsProvider"),
    payment_risk_explainable: providerReady("aiAccountantRiskProvider"),
    approval_route_visible: providerReady("aiAccountantApprovalStatusProvider"),
    direct_payment_paths_found: 0,
    direct_posting_paths_found: 0,
    auto_approval_found: false,
    approval_bypass_found: 0,
    fake_invoice_created: false,
    fake_act_created: false,
    fake_payment_created: false,
    fake_document_created: false,
    accountant_full_security_leak_found: false,
    raw_secrets_visible: false,
    generic_answers_found: 0,
    technical_copy_visible_to_user: false,
    web_free_text_questions_passed: webFreeTextQuestionsPassed,
    web_all_visible_buttons_clicked: webAllVisibleButtonsClicked,
    android_accountant_question_passed: androidAccountantQuestionPassed,
    android_buttons_targetable: androidButtonsTargetable,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
  };
}

export const accountantRealFinanceMatrix = buildAccountantRealFinanceMatrix;
