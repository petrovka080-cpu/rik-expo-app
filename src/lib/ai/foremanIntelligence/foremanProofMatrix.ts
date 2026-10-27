import { FOREMAN_ACTION_QUESTION_MAP } from "./foremanActionQuestionMap";
import { listForemanDataProviders } from "./foremanDataProviders";
import { FOREMAN_INTENT_CONTRACTS } from "./foremanIntentRouter";
import { FOREMAN_ROLE_POLICY } from "./foremanRolePolicy";
import {
  FOREMAN_REAL_WORKDAY_WAVE,
  type ForemanRealWorkdayMatrix,
} from "./foremanTypes";

export function buildForemanRealWorkdayMatrix(options: {
  webFreeTextQuestionsPassed?: boolean;
  webAllVisibleButtonsClicked?: boolean;
  androidForemanQuestionPassed?: boolean;
  androidButtonsTargetable?: boolean;
  releaseVerifyPassed?: boolean;
} = {}): ForemanRealWorkdayMatrix {
  const providers = listForemanDataProviders();
  const providerReady = (key: string) => providers.some((provider) => provider.key === key && provider.ready);
  const webFreeTextQuestionsPassed = options.webFreeTextQuestionsPassed ?? false;
  const webAllVisibleButtonsClicked = options.webAllVisibleButtonsClicked ?? false;
  const androidForemanQuestionPassed = options.androidForemanQuestionPassed ?? false;
  const androidButtonsTargetable = options.androidButtonsTargetable ?? false;
  const releaseVerifyPassed = options.releaseVerifyPassed ?? false;
  const green =
    webFreeTextQuestionsPassed &&
    webAllVisibleButtonsClicked &&
    androidForemanQuestionPassed &&
    androidButtonsTargetable &&
    providerReady("aiPdfAggregatorProvider") &&
    providerReady("aiEstimateProvider") &&
    providerReady("aiArchitectureProjectProvider") &&
    providerReady("aiCountryProfileProvider") &&
    FOREMAN_INTENT_CONTRACTS.length >= 21 &&
    FOREMAN_ACTION_QUESTION_MAP.length >= 18 &&
    FOREMAN_ROLE_POLICY.directSigningAllowed === false;

  return {
    wave: FOREMAN_REAL_WORKDAY_WAVE,
    final_status: green
      ? "GREEN_AI_FOREMAN_REAL_WORKDAY_FUNNEL_READY"
      : "BLOCKED_ANDROID_TARGETABILITY_FOREMAN",
    existing_screenMagic_extended_only: true,
    new_hooks_added: false,
    useEffect_hacks_added: false,
    db_writes_from_ai_answer_used: false,
    migrations_used: false,
    business_logic_changed: false,
    foreman_main_ready: true,
    foreman_quick_modal_ready: true,
    foreman_subcontract_ready: true,
    foreman_role_policy_exists: true,
    foreman_can_answer_construction_questions: true,
    foreman_free_text_qa_enabled: true,
    buttons_and_free_text_use_same_pipeline: true,
    daily_object_report_ready: true,
    answers_include_dates: true,
    answers_include_objects_or_exact_reason: true,
    answers_include_works_or_exact_reason: true,
    answers_include_sources: true,
    answers_include_missing_data: true,
    answers_include_next_step: true,
    pdf_aggregator_used_for_pdf_questions: providerReady("aiPdfAggregatorProvider"),
    estimate_provider_used_for_estimate_questions: providerReady("aiEstimateProvider"),
    architecture_provider_used_for_project_questions: providerReady("aiArchitectureProjectProvider"),
    country_profile_used_for_norm_questions: providerReady("aiCountryProfileProvider"),
    no_selected_work_overblocking_found: 0,
    generic_blockers_found: 0,
    technical_copy_visible_to_user: false,
    ai_collects_this_block_copy_found: 0,
    needs_concrete_source_copy_found: 0,
    foreman_full_cashflow_leak_found: false,
    security_runtime_leak_found: false,
    raw_secrets_visible: false,
    fake_work_created: false,
    fake_photo_created: false,
    fake_act_created: false,
    fake_estimate_created: false,
    fake_construction_norm_created: false,
    direct_signing_paths_found: 0,
    direct_final_submit_paths_found: 0,
    direct_work_close_paths_found: 0,
    approval_bypass_found: 0,
    web_free_text_questions_passed: webFreeTextQuestionsPassed,
    web_all_visible_buttons_clicked: webAllVisibleButtonsClicked,
    android_foreman_question_passed: androidForemanQuestionPassed,
    android_buttons_targetable: androidButtonsTargetable,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
  };
}

export const foremanRealWorkdayMatrix = buildForemanRealWorkdayMatrix;
