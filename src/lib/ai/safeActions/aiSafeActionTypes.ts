import type { AiSourceRef } from "../appContextGraph";
import type { AiActionLedgerActionType } from "../../../features/ai/actionLedger/aiActionLedgerTypes";

export const AI_SAFE_ACTION_WAVE =
  "S_AI_SAFE_ACTION_DRAFT_APPROVAL_ORCHESTRATOR_POINT_OF_NO_RETURN" as const;

export const AI_SAFE_ACTION_ARTIFACT_PREFIX =
  "S_AI_SAFE_ACTION_DRAFT_APPROVAL_ORCHESTRATOR" as const;

export const AI_SAFE_ACTION_GREEN_STATUS =
  "GREEN_AI_SAFE_ACTION_DRAFT_APPROVAL_ORCHESTRATOR_READY" as const;

export type AiSafeActionKind =
  | "procurement_purchase_draft"
  | "warehouse_deficit_request_draft"
  | "warehouse_discrepancy_draft"
  | "accountant_payment_checklist_draft"
  | "accounting_entry_reference_draft"
  | "foreman_act_draft"
  | "work_closeout_checklist_draft"
  | "contractor_remark_response_draft"
  | "document_link_suggestion_draft"
  | "marketplace_product_card_draft"
  | "office_reminder_draft"
  | "client_progress_report_draft";

export const AI_SAFE_ACTION_KINDS: readonly AiSafeActionKind[] = [
  "procurement_purchase_draft",
  "warehouse_deficit_request_draft",
  "warehouse_discrepancy_draft",
  "accountant_payment_checklist_draft",
  "accounting_entry_reference_draft",
  "foreman_act_draft",
  "work_closeout_checklist_draft",
  "contractor_remark_response_draft",
  "document_link_suggestion_draft",
  "marketplace_product_card_draft",
  "office_reminder_draft",
  "client_progress_report_draft",
] as const;

export type AiSafeActionMode = "safe_read" | "draft_only" | "approval_required" | "forbidden";

export type AiSafeActionDraftStatus =
  | "draft_created"
  | "needs_missing_data"
  | "needs_human_confirmation"
  | "approval_required"
  | "ready_for_existing_service"
  | "forbidden";

export type AiSafeActionDraftType =
  | "purchase_request"
  | "payment_checklist"
  | "act_draft"
  | "document_link"
  | "warehouse_discrepancy"
  | "marketplace_product"
  | "reminder"
  | "client_report";

export type AiSafeActionApprovalType =
  | "director_approval"
  | "accountant_review"
  | "warehouse_manager_review"
  | "foreman_review"
  | "document_review"
  | "marketplace_moderation"
  | "client_report_review"
  | "none";

export type AiSafeActionPrecondition = {
  id: string;
  labelRu: string;
  status: "passed" | "missing" | "blocked" | "permission_limited" | "requires_review";
  reasonRu: string;
  sourceRefIds: string[];
  requiredForFinalExecution: boolean;
};

export type AiSafeActionImpactDiff = {
  actionKind: AiSafeActionKind;
  willCreateDrafts: {
    draftType: AiSafeActionDraftType;
    labelRu: string;
    fieldsRu: {
      fieldRu: string;
      valueRu: string;
      sourceRefIds: string[];
    }[];
  }[];
  willNotDo: string[];
  requiresApproval: boolean;
  approvalReasonRu?: string;
  businessMutationBlocked: true;
};

export type AiSafeActionApprovalRoute = {
  required: boolean;
  approvalType: AiSafeActionApprovalType;
  approverRoles: string[];
  reasonRu: string;
  ledgerRequired: boolean;
  canBypass: false;
};

export type AiSafeActionHumanConfirmation = {
  actionDraftId: string;
  required: true;
  confirmationTextRu: string;
  confirmButtonLabelRu: string;
  cancelButtonLabelRu: string;
  userMustSee: (
    | "source_refs"
    | "impact_diff"
    | "missing_data"
    | "approval_route"
    | "safety_status"
  )[];
  finalExecutionAllowed: false;
};

export type AiSafeActionIdempotencyKey = {
  actionKind: AiSafeActionKind;
  orgId: string;
  projectId?: string;
  sourceRefIds: string[];
  draftPayloadHash: string;
  userId: string;
  createdForQuestionHash: string;
};

export type AiSafeActionAuditEvent = {
  id: string;
  actionDraftId: string;
  event:
    | "draft_proposed_by_ai"
    | "preconditions_checked"
    | "impact_diff_shown"
    | "human_confirmed_draft"
    | "sent_to_approval_route"
    | "blocked_by_policy"
    | "cancelled_by_user"
    | "existing_draft_reused";
  actor: "ai" | "human" | "system";
  userId?: string;
  timestamp: string;
  sourceTraceId?: string;
  safeToShowToUser: boolean;
};

export type AiSafeActionContext = {
  sourceRefs: AiSourceRef[];
  numericFacts: Record<string, number>;
  textFactsRu: Record<string, string>;
};

export type AiSafeActionRegistryEntry = {
  actionKind: AiSafeActionKind;
  titleRu: string;
  defaultRole: string;
  defaultScreenId: string;
  mode: AiSafeActionMode;
  draftType: AiSafeActionDraftType;
  ledgerActionType: AiActionLedgerActionType;
  requiredSourceRefIds: string[];
  approvalType: AiSafeActionApprovalType;
  approverRoles: string[];
  forbiddenFinalActionsRu: string[];
};

export type AiSafeActionBuildInput = {
  actionKind: AiSafeActionKind;
  role?: string;
  screenId?: string;
  userId?: string;
  orgId?: string;
  projectId?: string;
  questionRu?: string;
  buttonId?: string;
  sourceAnswerId?: string;
  sourceTraceId?: string;
  context?: AiSafeActionContext;
  nowIso?: string;
};

export type AiSafeActionDraft = {
  id: string;
  actionKind: AiSafeActionKind;
  mode: AiSafeActionMode;
  role: string;
  screenId: string;
  userId: string;
  orgId: string;
  projectId?: string;
  questionRu?: string;
  buttonId?: string;
  sourceAnswerId?: string;
  sourceTraceId?: string;
  titleRu: string;
  summaryRu: string;
  sourceRefIds: string[];
  openLinks: {
    labelRu: string;
    sourceRefId: string;
    route?: string;
    enabled: boolean;
    disabledReasonRu?: string;
  }[];
  draftPayload: Record<string, unknown>;
  humanReadableDraftRu: string;
  missingData: string[];
  preconditions: AiSafeActionPrecondition[];
  impactDiff: AiSafeActionImpactDiff;
  approvalRoute?: AiSafeActionApprovalRoute;
  humanConfirmation: AiSafeActionHumanConfirmation;
  idempotencyKey: AiSafeActionIdempotencyKey;
  auditTrail: AiSafeActionAuditEvent[];
  status: AiSafeActionDraftStatus;
  safety: {
    changedData: false;
    finalSubmit: false;
    autoApproval: false;
    dangerousMutation: false;
    requiresHumanConfirmation: true;
  };
  createdAt: string;
};

export type AiSafeActionExecutionGuardResult = {
  actionDraftId: string;
  passed: boolean;
  noDbWriteFromAnswer: boolean;
  noFinalSubmit: boolean;
  noAutoApproval: boolean;
  noDangerousMutation: boolean;
  humanConfirmationRequired: boolean;
  sourceRefsPresent: boolean;
  impactDiffPresent: boolean;
  approvalRouteChecked: boolean;
  idempotencyChecked: boolean;
  failureReason?:
    | "db_write_from_answer"
    | "final_submit_attempted"
    | "auto_approval_attempted"
    | "dangerous_mutation_attempted"
    | "missing_human_confirmation"
    | "missing_source_refs"
    | "missing_impact_diff"
    | "missing_approval_route"
    | "duplicate_draft_created"
    | "permission_bypass"
    | "hardcoded_action";
};

export type AiSafeActionPatchScanFinding = {
  file: string;
  pattern: string;
  reasonRu: string;
};

export type AiSafeActionPatchScanResult = {
  hooksFound: number;
  useEffectHacksFound: number;
  secondActionFrameworkFound: number;
  screenLocalActionLogicFound: number;
  dbWriteFromAnswerFound: number;
  finalSubmitFound: number;
  approvalBypassFound: number;
  dangerousMutationFound: number;
  hardcodedActionsFound: number;
  findings: AiSafeActionPatchScanFinding[];
};
