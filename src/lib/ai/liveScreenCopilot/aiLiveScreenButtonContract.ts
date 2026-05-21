import type { AiAppEntityType } from "../appContextGraph";
import type { UniversalRoleQaEntity, UniversalRoleQaIntent } from "../universalRoleQa";

export const AI_LIVE_SCREEN_COPILOT_WAVE =
  "S_AI_LIVE_SCREEN_COPILOT_UI_BUTTONS_RUSSIAN_PROOF_POINT_OF_NO_RETURN" as const;

export const AI_LIVE_SCREEN_COPILOT_GREEN_STATUS =
  "GREEN_AI_LIVE_SCREEN_COPILOT_UI_BUTTONS_RUSSIAN_PROOF_READY" as const;

export type AiLiveScreenActionMode =
  | "safe_read"
  | "draft_only"
  | "approval_required"
  | "forbidden";

export type AiLiveScreenSourcePlanHint =
  | "app_context_graph"
  | "app_data"
  | "pdf_document"
  | "internal_marketplace"
  | "supplier_history"
  | "public_web"
  | "general_construction_knowledge"
  | "accounting_reference";

export type AiLiveScreenOpenLinkType = Extract<
  AiAppEntityType,
  | "procurement_request"
  | "work"
  | "warehouse_issue"
  | "payment"
  | "invoice"
  | "act"
  | "document"
  | "pdf_document"
  | "marketplace_product"
  | "supplier"
>;

export type AiLiveScreenButtonEntity = Extract<
  UniversalRoleQaEntity,
  | "procurement_request"
  | "warehouse_stock"
  | "warehouse_issue"
  | "payment"
  | "invoice"
  | "act"
  | "document"
  | "pdf_document"
  | "work"
  | "material"
  | "supplier"
  | "contractor"
  | "marketplace_product"
  | "photo"
  | "approval"
  | "unknown"
>;

export type AiLiveScreenButtonIntent = Extract<
  UniversalRoleQaIntent,
  | "app_data_count"
  | "app_data_list"
  | "procurement_request_review"
  | "procurement_offer_selection"
  | "warehouse_stock_review"
  | "warehouse_issue_trace"
  | "warehouse_deficit_review"
  | "finance_payment_review"
  | "finance_debt_review"
  | "finance_partial_payment_review"
  | "accounting_entry_help"
  | "field_work_review"
  | "field_work_closeout_help"
  | "contractor_acceptance_review"
  | "document_pdf_explanation"
  | "document_missing_links_review"
  | "document_payment_blocker_review"
  | "director_decision_summary"
  | "office_stuck_work_review"
  | "client_progress_review"
  | "construction_estimate"
  | "marketplace_supplier_search"
  | "marketplace_product_draft"
>;

export type AiLiveScreenButton = {
  id: string;
  screenId: string;
  role: string;
  labelRu: string;
  concreteQuestionRu: string;
  intent: AiLiveScreenButtonIntent;
  entity: AiLiveScreenButtonEntity;
  actionMode: AiLiveScreenActionMode;
  sourcePlanHint: AiLiveScreenSourcePlanHint[];
  expectedAnswerSignalsRu: string[];
  forbiddenAnswerSignalsRu: string[];
  expectedOpenLinkTypes: AiLiveScreenOpenLinkType[];
  resultRequirement: {
    mustShowShortAnswer: true;
    mustShowSourceSection: true;
    mustShowNextStep: true;
    mustShowStatus: true;
    mustShowOpenLinksIfInternalObjectsFound: true;
  };
};

export const AI_LIVE_SCREEN_BUTTON_RESULT_REQUIREMENT: AiLiveScreenButton["resultRequirement"] = {
  mustShowShortAnswer: true,
  mustShowSourceSection: true,
  mustShowNextStep: true,
  mustShowStatus: true,
  mustShowOpenLinksIfInternalObjectsFound: true,
};

export type AiLiveButtonResultGuard = {
  buttonId: string;
  screenId: string;
  clicked: boolean;
  resultVisible: boolean;
  answerMatchesButton: boolean;
  hasShortAnswer: boolean;
  hasSourceSection: boolean;
  hasNextStep: boolean;
  hasStatus: boolean;
  hasOpenLinksWhenExpected: boolean;
  noBlankModal: boolean;
  noEnglishNoise: boolean;
  noDebugNoise: boolean;
  noProviderNoise: boolean;
  noDangerousMutation: boolean;
  failureReason?:
    | "button_not_clickable"
    | "no_result_visible"
    | "blank_modal"
    | "answer_mismatch"
    | "missing_sources"
    | "missing_next_step"
    | "missing_status"
    | "english_noise"
    | "debug_noise"
    | "provider_noise"
    | "dangerous_mutation";
};
