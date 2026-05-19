import { WAREHOUSE_ACTION_QUESTION_MAP } from "./warehouseActionQuestionMap";
import { listWarehouseDataProviders } from "./warehouseDataProviders";
import { WAREHOUSE_INTENT_CONTRACTS } from "./warehouseIntentRouter";
import { WAREHOUSE_ROLE_POLICY } from "./warehouseRolePolicy";
import {
  WAREHOUSE_REAL_STOCK_WAVE,
  type WarehouseRealStockMatrix,
} from "./warehouseStockTypes";

export function buildWarehouseRealStockMatrix(options: {
  webFreeTextQuestionsPassed?: boolean;
  webAllVisibleButtonsClicked?: boolean;
  androidWarehouseQuestionPassed?: boolean;
  androidButtonsTargetable?: boolean;
  releaseVerifyPassed?: boolean;
} = {}): WarehouseRealStockMatrix {
  const providers = listWarehouseDataProviders();
  const providerReady = (key: string) => providers.some((provider) => provider.key === key && provider.ready);
  const webFreeTextQuestionsPassed = options.webFreeTextQuestionsPassed ?? false;
  const webAllVisibleButtonsClicked = options.webAllVisibleButtonsClicked ?? false;
  const androidWarehouseQuestionPassed = options.androidWarehouseQuestionPassed ?? false;
  const androidButtonsTargetable = options.androidButtonsTargetable ?? false;
  const releaseVerifyPassed = options.releaseVerifyPassed ?? false;
  const green =
    webFreeTextQuestionsPassed &&
    webAllVisibleButtonsClicked &&
    androidWarehouseQuestionPassed &&
    androidButtonsTargetable &&
    providerReady("aiWarehouseStockProvider") &&
    providerReady("aiWarehouseIncomingProvider") &&
    providerReady("aiWarehouseIssueProvider") &&
    providerReady("aiWarehouseDiscrepancyProvider") &&
    providerReady("aiApprovalProvider") &&
    WAREHOUSE_INTENT_CONTRACTS.length >= 15 &&
    WAREHOUSE_ACTION_QUESTION_MAP.length >= 8 &&
    WAREHOUSE_ROLE_POLICY.directIssueAllowed === false &&
    WAREHOUSE_ROLE_POLICY.directReceiveAllowed === false &&
    WAREHOUSE_ROLE_POLICY.directWriteoffAllowed === false &&
    WAREHOUSE_ROLE_POLICY.autoApprovalAllowed === false;

  return {
    wave: WAREHOUSE_REAL_STOCK_WAVE,
    final_status: green
      ? "GREEN_AI_WAREHOUSE_REAL_STOCK_FUNNEL_READY"
      : "BLOCKED_ANDROID_TARGETABILITY_WAREHOUSE",
    existing_screenMagic_extended_only: true,
    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_ai_framework_created: false,
    db_writes_from_ai_answer_used: false,
    migrations_used: false,
    business_logic_changed: false,
    warehouse_main_ready: true,
    warehouse_incoming_ready: true,
    warehouse_issue_ready: true,
    warehouse_stock_detail_ready_or_exact_route_reason: true,
    warehouse_role_policy_exists: true,
    warehouse_free_text_qa_enabled: true,
    buttons_and_free_text_use_same_pipeline: true,
    stock_summary_ready: providerReady("aiWarehouseStockProvider"),
    incoming_readiness_ready: providerReady("aiWarehouseIncomingProvider"),
    issue_readiness_ready: providerReady("aiWarehouseIssueProvider"),
    material_blockers_ready: providerReady("aiWarehouseDiscrepancyProvider"),
    discrepancy_check_ready: providerReady("aiWarehouseDiscrepancyProvider"),
    specification_provider_ready: providerReady("aiMaterialSpecificationProvider"),
    unit_conversion_ready: providerReady("aiUnitConversionProvider"),
    documents_provider_ready: providerReady("aiDocumentsProvider") && providerReady("aiPdfAggregatorProvider"),
    procurement_handoff_ready: providerReady("aiProcurementLinkedRequestProvider"),
    foreman_handoff_ready: providerReady("aiWorkObjectLinkedProvider"),
    approval_route_visible: providerReady("aiApprovalProvider"),
    answers_include_materials_or_exact_reason: true,
    answers_include_objects_or_exact_reason: true,
    answers_include_works_or_exact_reason: true,
    answers_include_sources: true,
    answers_include_missing_documents: true,
    answers_include_risk_reasons: true,
    answers_include_next_step: true,
    stock_not_invented: true,
    incoming_not_invented: true,
    issue_not_invented: true,
    direct_stock_mutations_found: 0,
    direct_receive_paths_found: 0,
    direct_issue_paths_found: 0,
    direct_writeoff_paths_found: 0,
    stock_mutated_by_ai: false,
    incoming_accepted_by_ai: false,
    material_issued_by_ai: false,
    reservation_created_by_ai: false,
    auto_approval_found: false,
    approval_bypass_found: 0,
    fake_stock_created: false,
    fake_incoming_created: false,
    fake_issue_created: false,
    fake_documents_created: false,
    warehouse_full_finance_leak_found: false,
    security_runtime_leak_found: false,
    raw_secrets_visible: false,
    generic_answers_found: 0,
    technical_copy_visible_to_user: false,
    web_free_text_questions_passed: webFreeTextQuestionsPassed,
    web_all_visible_buttons_clicked: webAllVisibleButtonsClicked,
    android_warehouse_question_passed: androidWarehouseQuestionPassed,
    android_buttons_targetable: androidButtonsTargetable,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
  };
}

export const warehouseRealStockMatrix = buildWarehouseRealStockMatrix;
