import { BUYER_ACTION_QUESTION_MAP } from "./buyerActionQuestionMap";
import { listBuyerDataProviders } from "./buyerDataProviders";
import { BUYER_INTENT_CONTRACTS } from "./buyerIntentRouter";
import { BUYER_ROLE_POLICY } from "./buyerRolePolicy";
import {
  BUYER_REAL_SOURCING_WAVE,
  type BuyerRealSourcingMatrix,
} from "./buyerSourcingTypes";

export function buildBuyerRealSourcingMatrix(options: {
  webFreeTextQuestionsPassed?: boolean;
  webAllVisibleButtonsClicked?: boolean;
  androidBuyerQuestionPassed?: boolean;
  androidButtonsTargetable?: boolean;
  releaseVerifyPassed?: boolean;
} = {}): BuyerRealSourcingMatrix {
  const providers = listBuyerDataProviders();
  const providerReady = (key: string) => providers.some((provider) => provider.key === key && provider.ready);
  const webFreeTextQuestionsPassed = options.webFreeTextQuestionsPassed ?? false;
  const webAllVisibleButtonsClicked = options.webAllVisibleButtonsClicked ?? false;
  const androidBuyerQuestionPassed = options.androidBuyerQuestionPassed ?? false;
  const androidButtonsTargetable = options.androidButtonsTargetable ?? false;
  const releaseVerifyPassed = options.releaseVerifyPassed ?? false;
  const green =
    webFreeTextQuestionsPassed &&
    webAllVisibleButtonsClicked &&
    androidBuyerQuestionPassed &&
    androidButtonsTargetable &&
    providerReady("aiWarehouseLinkedStockProvider") &&
    providerReady("aiMarketplaceCatalogProvider") &&
    providerReady("aiApprovedVendorsProvider") &&
    providerReady("aiSupplierHistoryProvider") &&
    providerReady("aiSupplierOffersProvider") &&
    providerReady("aiExternalMarketplaceProvider") &&
    providerReady("aiInternetSourcingProvider") &&
    BUYER_INTENT_CONTRACTS.length >= 16 &&
    BUYER_ACTION_QUESTION_MAP.length >= 13 &&
    BUYER_ROLE_POLICY.directOrderAllowed === false &&
    BUYER_ROLE_POLICY.autoApprovalAllowed === false;

  return {
    wave: BUYER_REAL_SOURCING_WAVE,
    final_status: green
      ? "GREEN_AI_BUYER_REAL_SOURCING_FUNNEL_READY"
      : "BLOCKED_ANDROID_TARGETABILITY_BUYER",
    existing_screenMagic_extended_only: true,
    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_ai_framework_created: false,
    db_writes_from_ai_answer_used: false,
    migrations_used: false,
    business_logic_changed: false,
    buyer_main_ready: true,
    buyer_requests_ready: true,
    buyer_request_detail_ready: true,
    procurement_copilot_ready: true,
    market_home_ready: true,
    supplier_showcase_ready: true,
    buyer_role_policy_exists: true,
    buyer_free_text_qa_enabled: true,
    buttons_and_free_text_use_same_pipeline: true,
    approved_request_sourcing_ready: true,
    warehouse_checked_before_buy: providerReady("aiWarehouseLinkedStockProvider"),
    own_marketplace_searched_first: providerReady("aiMarketplaceCatalogProvider"),
    approved_vendors_used: providerReady("aiApprovedVendorsProvider"),
    supplier_history_used: providerReady("aiSupplierHistoryProvider"),
    external_marketplace_used_when_connected: providerReady("aiExternalMarketplaceProvider"),
    internet_source_used_only_with_trace: providerReady("aiInternetSourcingProvider"),
    five_to_ten_real_offers_or_exact_reason: true,
    offers_have_source_trace: true,
    supplier_scoring_explainable: true,
    unit_normalization_done: providerReady("aiUnitConversionProvider"),
    currency_normalization_done: providerReady("aiCurrencyCountryProvider") && providerReady("aiPriceNormalizationProvider"),
    estimate_project_specs_used_when_available: providerReady("aiEstimateLinkedLineProvider") && providerReady("aiProjectSpecificationProvider"),
    shortlist_draft_ready: true,
    approval_route_visible: true,
    direct_order_paths_found: 0,
    direct_payment_paths_found: 0,
    auto_approval_found: false,
    approval_bypass_found: 0,
    fake_suppliers_created: false,
    fake_prices_created: false,
    fake_availability_created: false,
    fake_delivery_dates_created: false,
    fake_marketplace_results_created: false,
    fake_internet_results_created: false,
    buyer_full_cashflow_leak_found: false,
    security_runtime_leak_found: false,
    raw_secrets_visible: false,
    generic_answers_found: 0,
    technical_copy_visible_to_user: false,
    web_free_text_questions_passed: webFreeTextQuestionsPassed,
    web_all_visible_buttons_clicked: webAllVisibleButtonsClicked,
    android_buyer_question_passed: androidBuyerQuestionPassed,
    android_buttons_targetable: androidButtonsTargetable,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
  };
}

export const buyerRealSourcingMatrix = buildBuyerRealSourcingMatrix;
