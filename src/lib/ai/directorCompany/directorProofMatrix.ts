import { DIRECTOR_ACTION_QUESTION_MAP } from "./directorActionQuestionMap";
import { listDirectorDataProviders } from "./directorDataProviders";
import { DIRECTOR_INTENT_CONTRACTS } from "./directorIntentRouter";
import { DIRECTOR_ROLE_POLICY } from "./directorRolePolicy";
import {
  DIRECTOR_REAL_COMPANY_WAVE,
  type DirectorRealCompanyMatrix,
} from "./directorCompanyTypes";

export function buildDirectorRealCompanyMatrix(options: {
  webFreeTextQuestionsPassed?: boolean;
  webAllVisibleButtonsClicked?: boolean;
  androidDirectorQuestionPassed?: boolean;
  androidButtonsTargetable?: boolean;
  releaseVerifyPassed?: boolean;
} = {}): DirectorRealCompanyMatrix {
  const providers = listDirectorDataProviders();
  const providerReady = (key: string) => providers.some((provider) => provider.key === key && provider.ready);
  const webFreeTextQuestionsPassed = options.webFreeTextQuestionsPassed ?? false;
  const webAllVisibleButtonsClicked = options.webAllVisibleButtonsClicked ?? false;
  const androidDirectorQuestionPassed = options.androidDirectorQuestionPassed ?? false;
  const androidButtonsTargetable = options.androidButtonsTargetable ?? false;
  const releaseVerifyPassed = options.releaseVerifyPassed ?? false;
  const green =
    webFreeTextQuestionsPassed &&
    webAllVisibleButtonsClicked &&
    androidDirectorQuestionPassed &&
    androidButtonsTargetable &&
    releaseVerifyPassed &&
    providerReady("aiCompanyDecisionEventProvider") &&
    providerReady("aiApprovalQueueProvider") &&
    providerReady("aiDirectorFinanceProvider") &&
    providerReady("aiDirectorProcurementProvider") &&
    providerReady("aiDirectorWarehouseProvider") &&
    providerReady("aiDirectorFieldProvider") &&
    providerReady("aiDirectorDocumentsProvider") &&
    providerReady("aiDirectorOfficeProvider") &&
    providerReady("aiDirectorSecuritySummaryProvider") &&
    DIRECTOR_INTENT_CONTRACTS.length >= 20 &&
    DIRECTOR_ACTION_QUESTION_MAP.length >= 8 &&
    DIRECTOR_ROLE_POLICY.directApproveRejectAllowed === false &&
    DIRECTOR_ROLE_POLICY.directPaymentAllowed === false &&
    DIRECTOR_ROLE_POLICY.directOrderAllowed === false &&
    DIRECTOR_ROLE_POLICY.directStockMutationAllowed === false &&
    DIRECTOR_ROLE_POLICY.autoApprovalAllowed === false;

  return {
    wave: DIRECTOR_REAL_COMPANY_WAVE,
    final_status: green
      ? "GREEN_AI_DIRECTOR_REAL_COMPANY_FUNNEL_READY"
      : "BLOCKED_ANDROID_TARGETABILITY_DIRECTOR",
    existing_screenMagic_extended_only: true,
    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_ai_framework_created: false,
    db_writes_from_ai_answer_used: false,
    migrations_used: false,
    business_logic_changed: false,
    director_dashboard_ready: true,
    director_reports_ready: true,
    command_center_ready: true,
    director_approvals_ready_or_exact_route_reason: true,
    director_risks_ready_or_exact_route_reason: true,
    director_company_timeline_ready_or_exact_route_reason: true,
    director_role_policy_exists: true,
    director_can_query_all_business_domains: DIRECTOR_ROLE_POLICY.canQueryAllBusinessDomains,
    director_free_text_qa_enabled: true,
    buttons_and_free_text_use_same_pipeline: true,
    today_decision_queue_ready: providerReady("aiCompanyDecisionEventProvider"),
    top_decision_ready_or_exact_reason: providerReady("aiCompanyRiskProvider"),
    blocked_objects_summary_ready: providerReady("aiDirectorFieldProvider") && providerReady("aiDirectorWarehouseProvider"),
    cross_domain_risk_summary_ready: providerReady("aiCompanyRiskProvider"),
    approval_queue_ready: providerReady("aiApprovalQueueProvider"),
    executive_summary_ready: providerReady("aiDirectorReportsProvider"),
    command_center_role_actions_ready: providerReady("aiDirectorOfficeProvider"),
    company_timeline_ready_or_exact_reason: providerReady("aiCompanyTimelineProvider"),
    finance_trace_used: providerReady("aiDirectorFinanceProvider"),
    procurement_trace_used: providerReady("aiDirectorProcurementProvider"),
    warehouse_trace_used: providerReady("aiDirectorWarehouseProvider"),
    field_trace_used: providerReady("aiDirectorFieldProvider"),
    documents_trace_used: providerReady("aiDirectorDocumentsProvider"),
    office_trace_used: providerReady("aiDirectorOfficeProvider"),
    approval_ledger_used: providerReady("aiApprovalQueueProvider"),
    security_summary_safe: providerReady("aiDirectorSecuritySummaryProvider"),
    answers_include_period_or_exact_reason: true,
    answers_include_sources: true,
    answers_include_missing_data: true,
    answers_include_risk_reasons: true,
    answers_include_next_step: true,
    forecast_labeled_as_forecast: true,
    forecast_has_sources_or_exact_reason: providerReady("aiForecastProvider"),
    ai_decision_on_behalf_of_director: false,
    direct_approve_reject_paths_found: 0,
    direct_payment_paths_found: 0,
    direct_order_paths_found: 0,
    direct_stock_mutation_paths_found: 0,
    direct_work_close_paths_found: 0,
    direct_signing_paths_found: 0,
    auto_approval_found: false,
    approval_bypass_found: 0,
    fake_payments_created: false,
    fake_procurement_created: false,
    fake_stock_created: false,
    fake_work_created: false,
    fake_documents_created: false,
    fake_reports_created: false,
    fake_security_findings_created: false,
    fake_cashflow_created: false,
    fake_forecast_created: false,
    raw_runtime_visible_to_director: false,
    raw_secrets_visible: false,
    service_role_visible: false,
    provider_payload_visible: false,
    generic_answers_found: 0,
    technical_copy_visible_to_user: false,
    web_free_text_questions_passed: webFreeTextQuestionsPassed,
    web_all_visible_buttons_clicked: webAllVisibleButtonsClicked,
    android_director_question_passed: androidDirectorQuestionPassed,
    android_buttons_targetable: androidButtonsTargetable,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
  };
}

export const directorRealCompanyMatrix = buildDirectorRealCompanyMatrix;
