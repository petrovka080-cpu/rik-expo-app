import type { AiSourceRef } from "../appContextGraph";
import type { AiExpectedNumericFact, AiGoldenBusinessDataset } from "../evaluation/goldenBusinessDataset";

export const AI_ROLE_BUSINESS_COPILOTS_WAVE =
  "S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS_POINT_OF_NO_RETURN" as const;

export const AI_ROLE_BUSINESS_COPILOTS_PREFIX =
  "S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS" as const;

export const AI_ROLE_BUSINESS_COPILOTS_GREEN_STATUS =
  "GREEN_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS_READY" as const;

export type AiRoleWorkflowId =
  | "director_daily_decision_queue"
  | "director_object_blocker_review"
  | "foreman_today_closeout"
  | "foreman_material_evidence_check"
  | "buyer_approved_request_to_purchase_draft"
  | "buyer_supplier_comparison"
  | "accountant_payment_readiness"
  | "accountant_accounting_entry_reference"
  | "warehouse_item_trace"
  | "warehouse_deficit_to_request_draft"
  | "contractor_acceptance_closeout"
  | "contractor_remark_response_draft"
  | "document_pdf_evidence_linking"
  | "document_payment_blocker_review"
  | "marketplace_photo_product_draft"
  | "marketplace_request_product_match"
  | "office_stuck_work_review"
  | "client_progress_summary";

export type AiRoleWorkflowRole =
  | "director"
  | "foreman"
  | "buyer"
  | "accountant"
  | "warehouse"
  | "contractor"
  | "documents"
  | "marketplace_user"
  | "office"
  | "client";

export type AiRoleWorkflowSource =
  | "app_context_graph"
  | "app_data"
  | "pdf_document"
  | "internal_marketplace"
  | "supplier_history"
  | "warehouse"
  | "procurement"
  | "finance"
  | "field"
  | "documents"
  | "reports"
  | "external_knowledge";

export type AiRoleWorkflowEntity =
  | "procurement_request"
  | "warehouse_issue"
  | "warehouse_stock"
  | "work"
  | "payment"
  | "invoice"
  | "act"
  | "document"
  | "pdf_document"
  | "marketplace_product"
  | "supplier"
  | "contractor"
  | "approval"
  | "report";

export type AiRoleWorkflowActionMode =
  | "safe_read"
  | "draft_only"
  | "approval_required"
  | "permission_limited";

export type AiRoleWorkflowAnswerSection =
  | "short"
  | "facts"
  | "links"
  | "chain"
  | "risks"
  | "missing"
  | "draft"
  | "next_step"
  | "status";

export type AiRoleWorkflowManifest = {
  workflowId: AiRoleWorkflowId;
  role: AiRoleWorkflowRole;
  titleRu: string;
  userGoalRu: string;
  triggerQuestionsRu: string[];
  requiredSources: AiRoleWorkflowSource[];
  requiredEntities: AiRoleWorkflowEntity[];
  allowedActionModes: AiRoleWorkflowActionMode[];
  forbiddenFinalActions: string[];
  requiredAnswerSections: AiRoleWorkflowAnswerSection[];
};

export type AiRoleWorkflowRequest = {
  workflowId: AiRoleWorkflowId;
  role?: AiRoleWorkflowRole;
  screenId?: string;
  questionRu: string;
  normalizedQuestionRu?: string;
};

export type AiRoleWorkflowContext = {
  dataset: AiGoldenBusinessDataset;
  sourceRefs: AiSourceRef[];
  sourceRefIds: {
    request124: string;
    workGkl: string;
    workElectrical: string;
    workPlaster: string;
    workWaterproofing: string;
    warehouseIssue: string;
    warehouseStock: string;
    payment77: string;
    payment78: string;
    payment79: string;
    pdfInvoice45: string;
    invoice45: string;
    marketplaceProduct: string;
    supplier: string;
    contractor: string;
    clientReport: string;
  };
};

export type AiRoleWorkflowAnswer = {
  workflowId: AiRoleWorkflowId;
  role: string;
  screenId: string;
  questionRu: string;
  normalizedQuestionRu: string;
  shortAnswerRu: string;
  businessState: {
    currentStatusRu: string;
    blockerRu?: string;
    riskRu?: string;
    priorityRu?: string;
  };
  facts: {
    textRu: string;
    sourceRefIds: string[];
    numericFacts?: {
      key: string;
      value: number;
      unit?: string;
    }[];
  }[];
  chain: {
    stepRu: string;
    sourceRefIds: string[];
    status: "done" | "pending" | "blocked" | "missing" | "draft";
  }[];
  openLinks: {
    labelRu: string;
    sourceRefId: string;
    enabled: boolean;
    route?: string;
    disabledReasonRu?: string;
  }[];
  draft?: {
    titleRu: string;
    bodyRu: string;
    draftType:
      | "purchase_draft"
      | "payment_checklist"
      | "act_draft"
      | "contractor_message"
      | "reminder_draft"
      | "marketplace_product_draft"
      | "client_report_draft";
    finalSubmitAllowed: false;
  };
  missingData: string[];
  nextStepRu: string;
  statusRu:
    | "Данные не изменены"
    | "Черновик подготовлен"
    | "Требуется согласование"
    | "Доступ ограничен";
  safetyStatus: {
    changedData: false;
    draftOnly: boolean;
    approvalRequired: boolean;
    finalSubmit: false;
    autoApproval: false;
    dangerousMutation: false;
  };
};

export type AiRoleWorkflowSafetyGuardResult = {
  workflowId: AiRoleWorkflowId;
  passed: boolean;
  safeReadOnly: boolean;
  draftOnlyWhenDraft: boolean;
  approvalRequiredWhenNeeded: boolean;
  dangerousMutationFound: boolean;
  finalSubmitFound: boolean;
  approvalBypassFound: boolean;
  crossRoleLeakFound: boolean;
  failureReason?:
    | "workflow_mutated_data"
    | "final_submit_without_human"
    | "approval_bypass"
    | "role_scope_leak"
    | "missing_source_refs"
    | "missing_open_links"
    | "missing_numeric_facts"
    | "generic_workflow_answer"
    | "draft_not_marked_as_draft"
    | "accounting_review_warning_missing";
};

export type AiRoleWorkflowTrace = {
  workflowId: AiRoleWorkflowId;
  role: AiRoleWorkflowRole;
  questionRu: string;
  answer: AiRoleWorkflowAnswer;
  safety: AiRoleWorkflowSafetyGuardResult;
  expectedNumericFacts: AiExpectedNumericFact[];
};
