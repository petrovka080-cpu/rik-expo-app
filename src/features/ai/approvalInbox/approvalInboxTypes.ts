import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type {
  AiActionDecisionOutput,
  AiActionLedgerActionType,
  AiActionLedgerBlockedCode,
  AiActionLedgerRecord,
  AiActionRiskLevel,
  AiActionStatus,
  ExecuteApprovedAiActionOutput,
} from "../actionLedger/aiActionLedgerTypes";
import type { AiActionLedgerPersistentBackend } from "../actionLedger/aiActionLedgerRepository";

export type ApprovalInboxStatus = "loaded" | "empty" | "blocked";

export type ApprovalInboxActionStatus = Extract<
  AiActionStatus,
  "pending" | "approved" | "rejected" | "expired" | "blocked"
>;

export type ApprovalInboxReviewAction =
  | "view"
  | "ask_why"
  | "edit_preview"
  | "approve"
  | "reject";

export type ApprovalInboxBlocker =
  | AiActionLedgerBlockedCode
  | "BLOCKED_APPROVAL_INBOX_AUTH_REQUIRED"
  | "BLOCKED_APPROVAL_REVIEW_PANEL_REQUIRED"
  | "BLOCKED_APPROVAL_ACTION_LEDGER_NOT_READY";

export type ApprovalInboxActionCard = {
  actionId: string;
  actionType: AiActionLedgerActionType;
  status: ApprovalInboxActionStatus;
  riskLevel: Extract<AiActionRiskLevel, "draft_only" | "approval_required" | "forbidden">;
  domain: AiDomain;
  screenId: string;
  title: string;
  summary: string;
  riskFlags: string[];
  evidenceRefs: string[];
  createdAt: string;
  expiresAt: string;
  allowedReviewActions: ApprovalInboxReviewAction[];
  executionAvailable: boolean;
  requiresApproval: true;
  rawDbRowsExposed: false;
  rawPromptExposed: false;
  rawProviderPayloadStored: false;
};

export type ApprovalInboxCounts = {
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
};

export type ApprovalInboxResponse = {
  status: ApprovalInboxStatus;
  role: AiUserRole;
  actions: ApprovalInboxActionCard[];
  counts: ApprovalInboxCounts;
  nextCursor: string | null;
  blocker?: ApprovalInboxBlocker;
  reason?: string;
  persistentLedgerUsed: boolean;
  fakeLocalApproval: false;
  mutationCount: 0;
  finalMutationAllowed: false;
  directSupabaseFromUi: false;
  modelProviderFromUi: false;
  rawDbRowsExposed: false;
  rawPromptExposed: false;
};

export type ApprovalInboxActionDetail = ApprovalInboxResponse & {
  action: ApprovalInboxActionCard | null;
  redactedPayloadPreview: unknown;
};

export type ApprovalInboxEditPreviewOutput = {
  status: "loaded" | "blocked";
  actionId: string;
  title: string;
  summary: string;
  redactedPayloadPreview: unknown;
  evidenceRefs: string[];
  mutationCount: 0;
  finalMutationAllowed: false;
  blocker?: ApprovalInboxBlocker;
  reason?: string;
};

export type ApprovalInboxAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type ApprovalInboxListRequest = {
  auth: ApprovalInboxAuthContext | null;
  organizationId?: string;
  backend?: AiActionLedgerPersistentBackend | null;
  cursor?: string | null;
  limit?: number;
};

export type ApprovalInboxActionRequest = ApprovalInboxListRequest & {
  actionId: string;
};

export type ApprovalInboxDecisionRequest = ApprovalInboxActionRequest & {
  reviewPanelConfirmed?: boolean;
  reason?: string;
};

export type ApprovalInboxBffDto =
  | {
      contractId: "ai_approval_inbox_bff_v1";
      documentType: "ai_approval_inbox";
      endpoint: "GET /agent/approval-inbox";
      result: ApprovalInboxResponse;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      providerCalled: false;
      rawDbRowsExposed: false;
      rawPromptExposed: false;
    }
  | {
      contractId: "ai_approval_inbox_bff_v1";
      documentType: "ai_approval_inbox_detail";
      endpoint: "GET /agent/approval-inbox/:actionId";
      result: ApprovalInboxActionDetail;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      providerCalled: false;
      rawDbRowsExposed: false;
      rawPromptExposed: false;
    }
  | {
      contractId: "ai_approval_inbox_bff_v1";
      documentType: "ai_approval_inbox_approve" | "ai_approval_inbox_reject";
      endpoint: "POST /agent/approval-inbox/:actionId/approve" | "POST /agent/approval-inbox/:actionId/reject";
      result: AiActionDecisionOutput;
      reviewPanelRequired: true;
      roleScoped: true;
      auditRequired: true;
      finalExecution: false;
      providerCalled: false;
      rawDbRowsExposed: false;
      rawPromptExposed: false;
    }
  | {
      contractId: "ai_approval_inbox_bff_v1";
      documentType: "ai_approval_inbox_edit_preview";
      endpoint: "POST /agent/approval-inbox/:actionId/edit-preview";
      result: ApprovalInboxEditPreviewOutput;
      roleScoped: true;
      readOnly: true;
      providerCalled: false;
      rawDbRowsExposed: false;
      rawPromptExposed: false;
    }
  | {
      contractId: "ai_approval_inbox_bff_v1";
      documentType: "ai_approval_inbox_execute_approved";
      endpoint: "POST /agent/approval-inbox/:actionId/execute-approved";
      result: ExecuteApprovedAiActionOutput;
      roleScoped: true;
      auditRequired: true;
      finalExecution: false;
      providerCalled: false;
      rawDbRowsExposed: false;
      rawPromptExposed: false;
    };

export type ApprovalInboxBffEnvelope =
  | { ok: true; data: ApprovalInboxBffDto }
  | {
      ok: false;
      error: {
        code: "AI_APPROVAL_INBOX_AUTH_REQUIRED" | "AI_APPROVAL_INBOX_INVALID_INPUT";
        message: string;
      };
    };

export type ApprovalInboxRecordScope = {
  record: AiActionLedgerRecord;
  requestedByCurrentUser: boolean;
};
