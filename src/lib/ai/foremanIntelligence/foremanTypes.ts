import type {
  ConstructionCountryProfile,
  ConstructionKnowledgeSource,
} from "../constructionKnowledgeCore";
import type {
  ConstructionDataGraphBlockerKind,
  ConstructionDataGraphEventStatus,
} from "../constructionDataGraph";

export const FOREMAN_REAL_WORKDAY_WAVE =
  "S_AI_FOREMAN_REAL_WORKDAY_FUNNEL_POINT_OF_NO_RETURN" as const;

export type AiSourceType =
  | ConstructionKnowledgeSource["type"]
  | "document"
  | "pdf_chunk"
  | "estimate_line"
  | "subcontractor"
  | "remark"
  | "warehouse_issue";

export type AiSourceRef = ConstructionKnowledgeSource;

export type AiFact = {
  id: string;
  textRu: string;
  sourceRefs: string[];
  confidence: "high" | "medium" | "low";
};

export type AiPermissionLimit = {
  kind:
    | "finance_hidden"
    | "security_hidden"
    | "runtime_hidden"
    | "other_role_hidden"
    | "supplier_terms_hidden";
  textRu: string;
};

export type AiDataProviderResult = {
  facts: AiFact[];
  sources: AiSourceRef[];
  missingData: string[];
  permissionLimited: AiPermissionLimit[];
  exactNoDataReasonRu?: string;
};

export type ForemanIntent =
  | "daily_object_report"
  | "what_done_today"
  | "what_not_done_today"
  | "closeout_readiness"
  | "missing_evidence_check"
  | "missing_photos_check"
  | "missing_documents_check"
  | "signature_check"
  | "subcontractor_blockers"
  | "material_blockers"
  | "warehouse_linked_status"
  | "procurement_handoff"
  | "estimate_comparison"
  | "architecture_pdf_check"
  | "construction_norms_check"
  | "act_draft"
  | "daily_report_draft"
  | "contractor_message_draft"
  | "approval_handoff"
  | "date_range_summary"
  | "object_timeline";

export type ForemanIntentContract = {
  intent: ForemanIntent;
  examplesRu: string[];
  allowedSources: AiSourceType[];
  requiredMinimumContext: "screen" | "object" | "work" | "date" | "document" | "none";
  canUseGeneralConstructionKnowledge: boolean;
  canUsePdfAggregator: boolean;
  answerMode: "read" | "draft" | "approval_route" | "clarifying";
};

export type ForemanActionQuestion = {
  screenId: "foreman.main" | "foreman.ai.quick_modal" | "foreman.subcontract";
  actionId: ForemanIntent;
  labelRu: string;
  concreteQuestionRu: string;
  allowedSources: AiSourceType[];
};

export type ForemanWorkItem = {
  id: string;
  nameRu: string;
  date: string;
  objectId: string;
  objectNameRu: string;
  zoneId?: string;
  zoneNameRu?: string;
  contractorId?: string;
  contractorNameRu?: string;
  plannedQty?: number;
  actualQty?: number;
  unit?: string;
  status: ConstructionDataGraphEventStatus;
  estimateLineId?: string;
  materialIds?: string[];
  blockers: {
    kind: ConstructionDataGraphBlockerKind;
    textRu: string;
  }[];
  sourceRefs: string[];
};

export type ForemanWorkdayContext = {
  screenId: "foreman.main" | "foreman.ai.quick_modal" | "foreman.subcontract";
  role: "foreman";
  currentDate: string;
  periodRu?: string;
  selectedWorkId?: string;
  works: ForemanWorkItem[];
  sources: ConstructionKnowledgeSource[];
  countryProfile?: ConstructionCountryProfile | null;
};

export type ForemanProviderKey =
  | "aiForemanScreenContextProvider"
  | "aiForemanWorksProvider"
  | "aiObjectsZonesProvider"
  | "aiWorkStatusProvider"
  | "aiWorkEvidenceProvider"
  | "aiPhotosProvider"
  | "aiActsProvider"
  | "aiReportsProvider"
  | "aiSubcontractorProvider"
  | "aiDocumentsProvider"
  | "aiPdfAggregatorProvider"
  | "aiEstimateProvider"
  | "aiArchitectureProjectProvider"
  | "aiConstructionNormsProvider"
  | "aiCountryProfileProvider"
  | "aiMaterialBlockerProvider"
  | "aiWarehouseLinkedStockProvider"
  | "aiProcurementLinkedRequestProvider"
  | "aiApprovalStatusProvider"
  | "aiChatLinkedContextProvider";

export type ForemanProviderDescriptor = {
  key: ForemanProviderKey;
  pure: true;
  usesHooks: false;
  usesUseEffectHack: false;
  dbWrites: false;
  directMutation: false;
  createsFakeData: false;
  ready: boolean;
};

export type ForemanWorkdayAnswerStatus =
  | "data_not_changed"
  | "draft_prepared"
  | "requires_approval";

export type ForemanWorkdayAnswer = {
  intent: ForemanIntent;
  answerRu: string;
  shortRu: string;
  periodRu: string;
  sources: ConstructionKnowledgeSource[];
  missingData: string[];
  risks: string[];
  nextStepRu: string;
  status: ForemanWorkdayAnswerStatus;
  changedData: false;
  providerTrace: string[];
  noSelectedWorkOverblocked: false;
  genericBlockerUsed: false;
  directSigningUsed: false;
  directFinalSubmitUsed: false;
  directWorkCloseUsed: false;
  approvalBypassUsed: false;
};

export type ForemanRealWorkdayMatrix = {
  wave: typeof FOREMAN_REAL_WORKDAY_WAVE;
  final_status:
    | "GREEN_AI_FOREMAN_REAL_WORKDAY_FUNNEL_READY"
    | "BLOCKED_FOREMAN_ROLE_POLICY_MISSING"
    | "BLOCKED_FOREMAN_PIPELINE_NOT_CONNECTED"
    | "BLOCKED_PDF_AGGREGATOR_NOT_CONNECTED"
    | "BLOCKED_ESTIMATE_PROVIDER_NOT_CONNECTED"
    | "BLOCKED_ARCHITECTURE_PROVIDER_NOT_CONNECTED"
    | "BLOCKED_COUNTRY_PROFILE_NOT_CONFIGURED"
    | "BLOCKED_FOREMAN_FREE_TEXT_QA_NOT_CONNECTED"
    | "BLOCKED_ANDROID_TARGETABILITY_FOREMAN";
  existing_screenMagic_extended_only: true;
  new_hooks_added: false;
  useEffect_hacks_added: false;
  db_writes_from_ai_answer_used: false;
  migrations_used: false;
  business_logic_changed: false;
  foreman_main_ready: boolean;
  foreman_quick_modal_ready: boolean;
  foreman_subcontract_ready: boolean;
  foreman_role_policy_exists: boolean;
  foreman_can_answer_construction_questions: boolean;
  foreman_free_text_qa_enabled: boolean;
  buttons_and_free_text_use_same_pipeline: boolean;
  daily_object_report_ready: boolean;
  answers_include_dates: boolean;
  answers_include_objects_or_exact_reason: boolean;
  answers_include_works_or_exact_reason: boolean;
  answers_include_sources: boolean;
  answers_include_missing_data: boolean;
  answers_include_next_step: boolean;
  pdf_aggregator_used_for_pdf_questions: boolean;
  estimate_provider_used_for_estimate_questions: boolean;
  architecture_provider_used_for_project_questions: boolean;
  country_profile_used_for_norm_questions: boolean;
  no_selected_work_overblocking_found: number;
  generic_blockers_found: number;
  technical_copy_visible_to_user: false;
  ai_collects_this_block_copy_found: number;
  needs_concrete_source_copy_found: number;
  foreman_full_cashflow_leak_found: false;
  security_runtime_leak_found: false;
  raw_secrets_visible: false;
  fake_work_created: false;
  fake_photo_created: false;
  fake_act_created: false;
  fake_estimate_created: false;
  fake_construction_norm_created: false;
  direct_signing_paths_found: number;
  direct_final_submit_paths_found: number;
  direct_work_close_paths_found: number;
  approval_bypass_found: number;
  web_free_text_questions_passed: boolean;
  web_all_visible_buttons_clicked: boolean;
  android_foreman_question_passed: boolean;
  android_buttons_targetable: boolean;
  release_verify_passed?: boolean;
  fake_green_claimed: false;
};
