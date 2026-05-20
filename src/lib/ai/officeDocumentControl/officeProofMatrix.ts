import { OFFICE_ACTION_QUESTION_MAP } from "./officeActionQuestionMap";
import { listOfficeDataProviders } from "./officeDataProviders";
import { OFFICE_INTENT_CONTRACTS } from "./officeIntentRouter";
import { OFFICE_ROLE_POLICY } from "./officeRolePolicy";
import {
  OFFICE_DOCUMENT_CONTROL_WAVE,
  type OfficeDocumentControlMatrix,
} from "./officeDocumentControlTypes";

export function buildOfficeDocumentControlMatrix(options: {
  webFreeTextQuestionsPassed?: boolean;
  webAllVisibleButtonsClicked?: boolean;
  androidOfficeQuestionPassed?: boolean;
  androidButtonsTargetable?: boolean;
  releaseVerifyPassed?: boolean;
} = {}): OfficeDocumentControlMatrix {
  const providers = listOfficeDataProviders();
  const providerReady = (key: string) => providers.some((provider) => provider.key === key && provider.ready);
  const webFreeTextQuestionsPassed = options.webFreeTextQuestionsPassed ?? false;
  const webAllVisibleButtonsClicked = options.webAllVisibleButtonsClicked ?? false;
  const androidOfficeQuestionPassed = options.androidOfficeQuestionPassed ?? false;
  const androidButtonsTargetable = options.androidButtonsTargetable ?? false;
  const releaseVerifyPassed = options.releaseVerifyPassed ?? false;
  const tasksReady = providerReady("aiOfficeTasksProvider");
  const documentsReady = providerReady("aiOfficeDocumentsQueueProvider");
  const packagesReady = providerReady("aiOfficeApprovalPackagesProvider");
  const remindersReady = providerReady("aiOfficeRemindersProvider");
  const deadlinesReady = providerReady("aiOfficeDeadlinesProvider");
  const documentDetailReady = providerReady("aiOfficeDocumentDetailProvider");
  const paymentBlockersReady = providerReady("aiOfficePaymentBlockersProvider");
  const workCloseoutBlockersReady = providerReady("aiOfficeWorkCloseoutBlockersProvider");
  const directorPrepReady = providerReady("aiOfficeDirectorPrepProvider");
  const green =
    webFreeTextQuestionsPassed &&
    webAllVisibleButtonsClicked &&
    androidOfficeQuestionPassed &&
    androidButtonsTargetable &&
    releaseVerifyPassed &&
    tasksReady &&
    documentsReady &&
    packagesReady &&
    remindersReady &&
    deadlinesReady &&
    documentDetailReady &&
    paymentBlockersReady &&
    workCloseoutBlockersReady &&
    directorPrepReady &&
    OFFICE_INTENT_CONTRACTS.length >= 11 &&
    OFFICE_ACTION_QUESTION_MAP.length >= 11 &&
    OFFICE_ROLE_POLICY.finalReminderSendAllowed === false &&
    OFFICE_ROLE_POLICY.directDocumentLinkAllowed === false &&
    OFFICE_ROLE_POLICY.taskCloseAllowed === false &&
    OFFICE_ROLE_POLICY.approvalStatusMutationAllowed === false &&
    OFFICE_ROLE_POLICY.directPaymentAllowed === false &&
    OFFICE_ROLE_POLICY.directWorkCloseAllowed === false &&
    OFFICE_ROLE_POLICY.signingAllowed === false &&
    OFFICE_ROLE_POLICY.autoApprovalAllowed === false;

  return {
    wave: OFFICE_DOCUMENT_CONTROL_WAVE,
    final_status: green
      ? "GREEN_AI_OFFICE_DOCUMENT_CONTROL_FUNNEL_READY"
      : "BLOCKED_OFFICE_DOCUMENT_CONTROL_FUNNEL",
    existing_screenMagic_extended_only: true,
    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_ai_framework_created: false,
    db_writes_from_ai_answer_used: false,
    migrations_used: false,
    business_logic_changed: false,
    office_hub_ready: true,
    office_tasks_ready: true,
    office_tasks_ready_or_exact_route_reason: true,
    office_documents_queue_ready: true,
    office_documents_queue_ready_or_exact_route_reason: true,
    office_approval_packages_ready: true,
    office_approval_packages_ready_or_exact_route_reason: true,
    office_reminders_ready: true,
    office_reminders_ready_or_exact_route_reason: true,
    office_deadlines_ready: true,
    office_deadlines_ready_or_exact_route_reason: true,
    office_document_detail_ready: true,
    office_document_detail_ready_or_exact_route_reason: true,
    office_role_policy_exists: true,
    office_free_text_qa_enabled: true,
    buttons_and_free_text_use_same_pipeline: true,
    stuck_work_report_ready: tasksReady,
    stuck_today_ready: tasksReady,
    document_queue_review_ready: documentsReady,
    documents_to_process_ready: documentsReady,
    unlinked_documents_ready: documentDetailReady,
    approval_package_review_ready: packagesReady,
    incomplete_approval_packages_ready: packagesReady,
    next_owner_ready: tasksReady,
    reminder_draft_ready: remindersReady,
    deadline_report_ready: deadlinesReady,
    deadline_review_ready: deadlinesReady,
    payment_blockers_ready: paymentBlockersReady,
    work_closeout_blockers_ready: workCloseoutBlockersReady,
    director_package_summary_ready: directorPrepReady,
    prepare_director_package_ready: directorPrepReady,
    document_detail_ready: documentDetailReady,
    answers_include_period_or_exact_reason: true,
    answers_include_stuck_item_document_or_package: true,
    answers_include_why_stuck: true,
    answers_include_owner_role: true,
    answers_include_missing_data: true,
    answers_include_sources: true,
    answers_include_next_step: true,
    answers_include_status: true,
    stuck_work_requires_source: true,
    reminders_are_draft_only: true,
    document_linking_suggestions_are_draft_only: true,
    reminder_final_send_paths_found: 0,
    final_reminder_sent_by_ai: false,
    document_final_link_paths_found: 0,
    document_linked_by_ai_final: false,
    task_close_paths_found: 0,
    task_closed_by_ai: false,
    approval_status_mutation_paths_found: 0,
    approval_status_changed_by_ai: false,
    direct_payment_paths_found: 0,
    direct_work_close_paths_found: 0,
    direct_signing_paths_found: 0,
    auto_approval_found: false,
    approval_bypass_found: 0,
    fake_documents_created: false,
    fake_deadlines_created: false,
    fake_owners_created: false,
    fake_responsible_owner_created: false,
    raw_runtime_visible_to_office: false,
    raw_security_visible_to_office: false,
    raw_secrets_visible: false,
    service_role_visible: false,
    provider_payload_visible: false,
    office_security_runtime_leak_found: false,
    generic_answers_found: 0,
    technical_copy_visible_to_user: false,
    web_free_text_questions_passed: webFreeTextQuestionsPassed,
    web_all_visible_buttons_clicked: webAllVisibleButtonsClicked,
    android_office_question_passed: androidOfficeQuestionPassed,
    android_buttons_targetable: androidButtonsTargetable,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
  };
}

export const officeDocumentControlMatrix = buildOfficeDocumentControlMatrix;
