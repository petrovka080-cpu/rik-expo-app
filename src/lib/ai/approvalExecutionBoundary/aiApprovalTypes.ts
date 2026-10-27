import type { AiActionLedgerRecord } from "../../../features/ai/actionLedger/aiActionLedgerTypes";
import type { AiSafeActionDraft } from "../safeActions";

export const AI_APPROVAL_EXECUTION_WAVE =
  "S_AI_HUMAN_APPROVAL_LEDGER_EXECUTION_BOUNDARY_POINT_OF_NO_RETURN" as const;

export const AI_APPROVAL_EXECUTION_ARTIFACT_PREFIX =
  "S_AI_HUMAN_APPROVAL_LEDGER_EXECUTION_BOUNDARY" as const;

export const AI_APPROVAL_EXECUTION_GREEN_STATUS =
  "GREEN_AI_HUMAN_APPROVAL_LEDGER_EXECUTION_BOUNDARY_READY" as const;

export type AiApprovalActionKind =
  | "purchase_order_create"
  | "payment_prepare_or_post"
  | "warehouse_issue"
  | "warehouse_receive"
  | "warehouse_discrepancy_confirm"
  | "work_closeout"
  | "act_sign"
  | "document_final_link"
  | "marketplace_product_publish"
  | "office_reminder_send"
  | "client_report_publish"
  | "role_permission_change";

export const AI_APPROVAL_ACTION_KINDS: readonly AiApprovalActionKind[] = [
  "purchase_order_create",
  "payment_prepare_or_post",
  "warehouse_issue",
  "warehouse_receive",
  "warehouse_discrepancy_confirm",
  "work_closeout",
  "act_sign",
  "document_final_link",
  "marketplace_product_publish",
  "office_reminder_send",
  "client_report_publish",
  "role_permission_change",
] as const;

export type AiApprovalRequestStatus =
  | "draft"
  | "submitted_for_approval"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled"
  | "executed"
  | "execution_failed";

export type AiApprovalRequest = {
  id: string;
  actionKind: AiApprovalActionKind;
  sourceDraftId: string;
  sourceTraceId: string;
  orgId: string;
  projectId?: string;
  requestedByUserId: string;
  requestedByRole: string;
  targetEntityRefs: {
    entityType: string;
    entityId: string;
    sourceRefId: string;
    labelRu: string;
  }[];
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
  preconditions: {
    id: string;
    labelRu: string;
    status: "passed" | "missing" | "blocked" | "requires_review";
    reasonRu: string;
    sourceRefIds: string[];
  }[];
  impactDiff: AiApprovalImpactDiff;
  approvalPolicy: {
    requiredApproverRoles: string[];
    requiredDecisionCount: number;
    canRequesterApproveOwnRequest: false;
    ledgerRequired: true;
    canBypass: false;
  };
  status: AiApprovalRequestStatus;
  createdAt: string;
  expiresAt?: string;
  sourceDraftSnapshot: Pick<AiSafeActionDraft, "id" | "actionKind" | "idempotencyKey" | "safety">;
};

export type AiApprovalDecision = {
  id: string;
  approvalRequestId: string;
  decidedByUserId: string;
  decidedByRole: string;
  decision: "approved" | "rejected" | "needs_changes";
  commentRu?: string;
  decidedAt: string;
  sourceRefIdsReviewed: string[];
  impactDiffReviewed: boolean;
  preconditionsReviewed: boolean;
  approvalPolicySnapshot: {
    requiredApproverRoles: string[];
    requesterUserId: string;
    requesterCannotApproveOwnRequest: true;
    canBypass: false;
  };
  ledgerEntryId: string;
};

export type AiApprovalLedgerEntry = {
  id: string;
  approvalRequestId: string;
  decisionId?: string;
  event:
    | "approval_requested"
    | "approval_viewed"
    | "approval_approved"
    | "approval_rejected"
    | "approval_needs_changes"
    | "approval_expired"
    | "execution_started"
    | "execution_completed"
    | "execution_failed";
  actorUserId?: string;
  actorRole?: string;
  orgId: string;
  projectId?: string;
  timestamp: string;
  sourceTraceId: string;
  sourceDraftId?: string;
  snapshotHash: string;
  previousLedgerEntryId?: string;
  safeToShowToUser: boolean;
  immutable: true;
};

export type AiApprovalPreconditionRecheck = {
  approvalRequestId: string;
  checkedAt: string;
  result: "passed" | "failed" | "stale_data" | "permission_changed" | "missing_source" | "requires_review";
  checks: {
    labelRu: string;
    status: "passed" | "failed" | "stale" | "missing" | "permission_changed";
    reasonRu: string;
    sourceRefIds: string[];
  }[];
  executionAllowed: boolean;
};

export type AiApprovalImpactDiff = {
  willChange: {
    entityType: string;
    entityId?: string;
    fieldRu: string;
    beforeRu?: string;
    afterRu: string;
    sourceRefIds: string[];
  }[];
  willCreate: {
    entityType: string;
    labelRu: string;
    fieldsRu: {
      fieldRu: string;
      valueRu: string;
      sourceRefIds: string[];
    }[];
  }[];
  willNotDo: string[];
};

export type AiExecutionBoundaryRequest = {
  approvalRequestId: string;
  approvedDecisionId: string;
  ledgerEntryId: string;
  actionKind: AiApprovalActionKind;
  orgId: string;
  projectId?: string;
  requestedByUserId: string;
  approvedByUserId: string;
  sourceDraftId: string;
  sourceTraceId: string;
  idempotencyKey: string;
  preconditionRecheck: AiApprovalPreconditionRecheck;
};

export type AiExecutionBoundaryResult = {
  approvalRequestId: string;
  status: "executed" | "blocked" | "failed" | "already_executed" | "requires_review";
  executedByService:
    | "procurement_service"
    | "payment_service"
    | "warehouse_service"
    | "field_service"
    | "document_service"
    | "marketplace_service"
    | "office_service"
    | "client_report_service"
    | "none";
  createdOrChangedRefs: {
    entityType: string;
    entityId: string;
    labelRu: string;
    sourceRefId?: string;
  }[];
  resultRu: string;
  safety: {
    usedApprovedBusinessService: boolean;
    directDbMutation: false;
    approvalBypass: false;
    autoApproval: false;
  };
  ledgerEntries: AiApprovalLedgerEntry[];
  existingLedgerRecord?: AiActionLedgerRecord;
};

export type AiExecutionServiceName =
  | "procurement_service"
  | "payment_service"
  | "warehouse_service"
  | "field_service"
  | "document_service"
  | "marketplace_service"
  | "office_service"
  | "client_report_service";

export type AiExecutionServiceDefinition = {
  actionKind: AiApprovalActionKind;
  serviceName: AiExecutionServiceName;
  allowedAfterApprovalOnly: true;
  requiresLedgerEntry: true;
  requiresPreconditionRecheck: true;
  requiresIdempotencyKey: true;
  canBeCalledByAiDirectly: false;
};

export type AiApprovalExecutionIdempotency = {
  idempotencyKey: string;
  approvalRequestId: string;
  actionKind: AiApprovalActionKind;
  payloadHash: string;
  firstExecutionAt?: string;
  status: "not_executed" | "executed" | "execution_failed" | "blocked";
  resultRefIds: string[];
};

export type AiApprovalRuntimeGuardResult = {
  approvalRequestId: string;
  passed: boolean;
  ledgerEntryRequired: true;
  ledgerEntryFound: boolean;
  approvalDecisionRequired: true;
  approvalDecisionFound: boolean;
  requesterDidNotApproveOwnRequest: boolean;
  preconditionRecheckPassed: boolean;
  idempotencyPassed: boolean;
  usedExecutionBoundary: boolean;
  usedApprovedBusinessService: boolean;
  directDbMutationFound: boolean;
  failureReason?:
    | "missing_ledger_entry"
    | "missing_approval_decision"
    | "requester_approved_own_request"
    | "precondition_recheck_failed"
    | "idempotency_failed"
    | "execution_boundary_bypassed"
    | "direct_db_mutation"
    | "unapproved_service_call"
    | "approval_bypass"
    | "auto_approval";
};

export type AiApprovalPatchScanFinding = {
  file: string;
  pattern: string;
  reasonRu: string;
};

export type AiApprovalPatchScanResult = {
  hooksFound: number;
  useEffectHacksFound: number;
  secondApprovalFrameworkFound: number;
  secondActionFrameworkFound: number;
  screenLocalApprovalLogicFound: number;
  screenLocalExecutionLogicFound: number;
  directDbMutationFound: number;
  executionBoundaryBypassFound: number;
  approvalBypassFound: number;
  autoApprovalFound: number;
  requesterSelfApprovalFound: number;
  hardcodedApprovalFound: number;
  findings: AiApprovalPatchScanFinding[];
};
