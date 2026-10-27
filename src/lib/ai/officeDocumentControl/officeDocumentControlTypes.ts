export const OFFICE_DOCUMENT_CONTROL_WAVE =
  "S_AI_OFFICE_DOCUMENT_CONTROL_FUNNEL_POINT_OF_NO_RETURN" as const;

export type OfficeDocumentControlScreenId =
  | "office.hub"
  | "office.tasks"
  | "office.documents_queue"
  | "office.approval_packages"
  | "office.reminders"
  | "office.deadlines"
  | "office.document.detail";

export type OfficeDocumentControlSourceType =
  | "office_task"
  | "document"
  | "pdf_chunk"
  | "approval_package"
  | "approval"
  | "invoice"
  | "payment"
  | "work"
  | "object"
  | "report"
  | "act"
  | "warehouse_issue"
  | "procurement_request"
  | "chat_message"
  | "deadline"
  | "reminder"
  | "safe_security_summary";

export type OfficeOwnerRole =
  | "office"
  | "accountant"
  | "buyer"
  | "warehouse"
  | "foreman"
  | "director"
  | "contractor";

export type OfficeAnswerStatus =
  | "data_unchanged"
  | "draft_prepared"
  | "approval_required";

export type OfficeDocumentControlSourceRef = {
  id: string;
  type: OfficeDocumentControlSourceType;
  labelRu: string;
  date?: string;
  page?: number;
};

export type OfficeUnsafeTechnicalSource = {
  id: string;
  type: "raw_runtime" | "raw_security_event" | "service_role" | "provider_payload" | "env_secret";
  labelRu: string;
};

export type OfficeTaskItem = {
  id: string;
  titleRu: string;
  status: "stuck" | "overdue" | "pending" | "ready_for_review";
  ownerRole?: OfficeOwnerRole;
  nextOwnerRole?: OfficeOwnerRole;
  dueAt?: string;
  overdueDays?: number;
  whyStuckRu?: string;
  missingData: string[];
  sourceRefs: string[];
};

export type OfficeDocumentQueueItem = {
  id: string;
  titleRu: string;
  documentType: "pdf" | "act" | "invoice" | "waybill" | "report" | "contract" | "photo" | "other";
  status: "needs_processing" | "unlinked" | "missing" | "needs_signature" | "ready_for_review" | "blocked";
  ownerRole?: OfficeOwnerRole;
  linkedObjectId?: string;
  linkedWorkId?: string;
  linkedPaymentId?: string;
  linkedApprovalPackageId?: string;
  blocks: ("payment" | "work_closeout" | "approval" | "director_package")[];
  missingData: string[];
  sourceRefs: string[];
};

export type OfficeApprovalPackage = {
  id: string;
  titleRu: string;
  status: "incomplete" | "waiting_documents" | "waiting_owner" | "ready_for_review" | "pending_director";
  ownerRole?: OfficeOwnerRole;
  approvalId?: string;
  linkedPaymentId?: string;
  linkedWorkId?: string;
  linkedRequestId?: string;
  relatedDocumentIds: string[];
  missingDocuments: string[];
  missingData: string[];
  sourceRefs: string[];
};

export type OfficeReminderDraft = {
  id: string;
  targetRole?: OfficeOwnerRole;
  targetLabelRu: string;
  status: "draft" | "needs_source" | "blocked";
  reasonRu: string;
  blocks: ("payment" | "work_closeout" | "approval" | "director_package")[];
  sourceRefs: string[];
  finalSent: false;
};

export type OfficeDeadlineItem = {
  id: string;
  titleRu: string;
  dueAt?: string;
  status: "overdue" | "due_today" | "upcoming" | "blocked";
  ownerRole?: OfficeOwnerRole;
  linkedItemType: "document" | "approval_package" | "task" | "payment" | "work";
  linkedItemId: string;
  missingData: string[];
  sourceRefs: string[];
};

export type OfficeDocumentControlContext = {
  screenId: OfficeDocumentControlScreenId;
  role: "office";
  questionRu?: string;
  selectedDocumentId?: string;
  period?: {
    from?: string;
    to?: string;
    labelRu: string;
  };
  tasks: OfficeTaskItem[];
  documentsQueue: OfficeDocumentQueueItem[];
  approvalPackages: OfficeApprovalPackage[];
  reminders: OfficeReminderDraft[];
  deadlines: OfficeDeadlineItem[];
  sources: OfficeDocumentControlSourceRef[];
  unsafeTechnicalSources?: OfficeUnsafeTechnicalSource[];
};

export type OfficeDocumentControlIntent =
  | "stuck_today"
  | "documents_to_process"
  | "unlinked_documents"
  | "incomplete_approval_packages"
  | "next_owner"
  | "reminder_draft"
  | "deadline_review"
  | "payment_blockers"
  | "work_closeout_blockers"
  | "prepare_director_package"
  | "document_detail";

export type OfficeAnswerKind =
  | "stuck_work_queue"
  | "document_queue"
  | "approval_package_review"
  | "reminder_draft"
  | "deadline_review"
  | "blocker_report"
  | "director_prep"
  | "document_detail"
  | "exact_no_data_reason"
  | "clarifying_question";

export type OfficeIntentContract = {
  intent: OfficeDocumentControlIntent;
  examplesRu: string[];
  requiredContext: "period" | "document" | "package" | "task" | "owner" | "none";
  allowedSources: OfficeDocumentControlSourceType[];
  answerMode: "read" | "draft" | "approval_route" | "clarifying";
};

export type OfficeActionQuestion = {
  screenId: OfficeDocumentControlScreenId;
  actionId: OfficeDocumentControlIntent;
  labelRu: string;
  concreteQuestionRu: string;
  requiredContext: OfficeIntentContract["requiredContext"][];
  allowedSources: OfficeDocumentControlSourceType[];
  answerMode: OfficeIntentContract["answerMode"];
};

export type OfficeStuckItem = {
  id: string;
  itemType: "task" | "document" | "approval_package" | "reminder" | "deadline";
  titleRu: string;
  whyStuckRu: string;
  ownerRole: OfficeOwnerRole | "missing_owner";
  missingData: string[];
  sourceRefs: string[];
  blocks: ("payment" | "work_closeout" | "approval" | "director_package")[];
  nextStepRu: string;
  status: OfficeAnswerStatus;
  riskLevel: "low" | "medium" | "high" | "critical";
};

export type OfficeDocumentControlAnswer = {
  screenId: OfficeDocumentControlScreenId;
  role: "office";
  questionRu: string;
  answerKind: OfficeAnswerKind;
  titleRu: string;
  shortAnswerRu: string;
  period?: {
    from?: string;
    to?: string;
    labelRu: string;
  };
  exactReasonRu?: string;
  stuckItems: OfficeStuckItem[];
  documentsToProcess: OfficeStuckItem[];
  approvalPackages: OfficeStuckItem[];
  reminders: OfficeStuckItem[];
  deadlines: OfficeStuckItem[];
  paymentBlockers: OfficeStuckItem[];
  workCloseoutBlockers: OfficeStuckItem[];
  sources: OfficeDocumentControlSourceRef[];
  missingData: string[];
  hiddenTechnicalData: {
    sourceType: string;
    reasonRu: string;
  }[];
  nextStepRu: string;
  status: OfficeAnswerStatus;
  changedData: false;
  reminderSentFinal: false;
  documentLinkedByAi: false;
  taskClosedByAi: false;
  approvalStatusChangedByAi: false;
  paymentMutated: false;
  workClosedByAi: false;
  signedByAi: false;
  answerRu: string;
  sourceTrace: string[];
  providerTrace: string[];
  genericAnswerUsed: false;
  fakeDocumentCreated: false;
  fakeDeadlineCreated: false;
  fakeOwnerCreated: false;
  rawRuntimeVisible: false;
  rawSecretsVisible: false;
  serviceRoleVisible: false;
  providerPayloadVisible: false;
};

export type OfficeDataProviderResult = {
  facts: {
    id: string;
    textRu: string;
    sourceRefs: string[];
    confidence: "high" | "medium" | "low";
  }[];
  sources: OfficeDocumentControlSourceRef[];
  missingData: string[];
  permissionLimited: string[];
  exactNoDataReasonRu?: string;
};

export type OfficeProviderKey =
  | "aiOfficeSourceSanitizer"
  | "aiOfficeScreenContextProvider"
  | "aiOfficeTasksProvider"
  | "aiOfficeDocumentsQueueProvider"
  | "aiOfficeApprovalPackagesProvider"
  | "aiOfficeRemindersProvider"
  | "aiOfficeDeadlinesProvider"
  | "aiOfficeDocumentDetailProvider"
  | "aiOfficePaymentBlockersProvider"
  | "aiOfficeWorkCloseoutBlockersProvider"
  | "aiOfficeDirectorPrepProvider"
  | "aiOfficeAnswerComposer";

export type OfficeProviderDescriptor = {
  key: OfficeProviderKey;
  pure: true;
  usesHooks: false;
  usesUseEffectHack: false;
  dbWrites: false;
  directMutation: false;
  createsFakeData: false;
  ready: boolean;
};

export type OfficeDocumentControlMatrix = {
  wave: typeof OFFICE_DOCUMENT_CONTROL_WAVE;
  final_status:
    | "GREEN_AI_OFFICE_DOCUMENT_CONTROL_FUNNEL_READY"
    | "BLOCKED_OFFICE_DOCUMENT_CONTROL_FUNNEL";
  existing_screenMagic_extended_only: boolean;
  new_hooks_added: boolean;
  useEffect_hacks_added: boolean;
  second_ai_framework_created: boolean;
  db_writes_from_ai_answer_used: boolean;
  migrations_used: boolean;
  business_logic_changed: boolean;
  office_hub_ready: boolean;
  office_tasks_ready: boolean;
  office_tasks_ready_or_exact_route_reason: boolean;
  office_documents_queue_ready: boolean;
  office_documents_queue_ready_or_exact_route_reason: boolean;
  office_approval_packages_ready: boolean;
  office_approval_packages_ready_or_exact_route_reason: boolean;
  office_reminders_ready: boolean;
  office_reminders_ready_or_exact_route_reason: boolean;
  office_deadlines_ready: boolean;
  office_deadlines_ready_or_exact_route_reason: boolean;
  office_document_detail_ready: boolean;
  office_document_detail_ready_or_exact_route_reason: boolean;
  office_role_policy_exists: boolean;
  office_free_text_qa_enabled: boolean;
  buttons_and_free_text_use_same_pipeline: boolean;
  stuck_work_report_ready: boolean;
  stuck_today_ready: boolean;
  document_queue_review_ready: boolean;
  documents_to_process_ready: boolean;
  unlinked_documents_ready: boolean;
  approval_package_review_ready: boolean;
  incomplete_approval_packages_ready: boolean;
  next_owner_ready: boolean;
  reminder_draft_ready: boolean;
  deadline_report_ready: boolean;
  deadline_review_ready: boolean;
  payment_blockers_ready: boolean;
  work_closeout_blockers_ready: boolean;
  director_package_summary_ready: boolean;
  prepare_director_package_ready: boolean;
  document_detail_ready: boolean;
  answers_include_period_or_exact_reason: boolean;
  answers_include_stuck_item_document_or_package: boolean;
  answers_include_why_stuck: boolean;
  answers_include_owner_role: boolean;
  answers_include_missing_data: boolean;
  answers_include_sources: boolean;
  answers_include_next_step: boolean;
  answers_include_status: boolean;
  stuck_work_requires_source: boolean;
  reminders_are_draft_only: boolean;
  document_linking_suggestions_are_draft_only: boolean;
  reminder_final_send_paths_found: number;
  final_reminder_sent_by_ai: boolean;
  document_final_link_paths_found: number;
  document_linked_by_ai_final: boolean;
  task_close_paths_found: number;
  task_closed_by_ai: boolean;
  approval_status_mutation_paths_found: number;
  approval_status_changed_by_ai: boolean;
  direct_payment_paths_found: number;
  direct_work_close_paths_found: number;
  direct_signing_paths_found: number;
  auto_approval_found: boolean;
  approval_bypass_found: number;
  fake_documents_created: boolean;
  fake_deadlines_created: boolean;
  fake_owners_created: boolean;
  fake_responsible_owner_created: boolean;
  raw_runtime_visible_to_office: boolean;
  raw_security_visible_to_office: boolean;
  raw_secrets_visible: boolean;
  service_role_visible: boolean;
  provider_payload_visible: boolean;
  office_security_runtime_leak_found: boolean;
  generic_answers_found: number;
  technical_copy_visible_to_user: boolean;
  web_free_text_questions_passed: boolean;
  web_all_visible_buttons_clicked: boolean;
  android_office_question_passed: boolean;
  android_buttons_targetable: boolean;
  release_verify_passed: boolean;
  fake_green_claimed: boolean;
};
