import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";

export type AiActionStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "expired"
  | "blocked";

export type AiActionRiskLevel =
  | "safe_read"
  | "draft_only"
  | "approval_required"
  | "forbidden";

export type AiActionLedgerActionType =
  | "draft_request"
  | "draft_report"
  | "draft_act"
  | "supplier_match"
  | "warehouse_low_stock"
  | "finance_risk"
  | "document_send"
  | "submit_request"
  | "confirm_supplier"
  | "create_order"
  | "change_warehouse_status"
  | "send_document"
  | "change_payment_status";

export type AiActionLedgerAuditEventType =
  | "ai.action.submitted_for_approval"
  | "ai.action.approved"
  | "ai.action.rejected"
  | "ai.action.execute_requested"
  | "ai.action.executed"
  | "ai.action.execution_blocked"
  | "ai.action.expired"
  | "ai.action.idempotency_reused";

export type AiActionLedgerAuditEvent = {
  eventType: AiActionLedgerAuditEventType;
  actionId?: string;
  actionType?: AiActionLedgerActionType;
  status?: AiActionStatus;
  role?: AiUserRole;
  screenId?: string;
  domain?: AiDomain;
  reason: string;
  evidenceRefs: string[];
  redacted: true;
  rawPromptExposed: false;
  rawProviderPayloadExposed: false;
  rawDbRowsExposed: false;
  credentialsExposed: false;
  createdAt: string;
};

export type AiActionLedgerRecord = {
  actionId: string;
  actionType: AiActionLedgerActionType;
  status: AiActionStatus;
  riskLevel: AiActionRiskLevel;
  role: AiUserRole;
  screenId: string;
  domain: AiDomain;
  summary: string;
  redactedPayload: unknown;
  evidenceRefs: string[];
  idempotencyKey: string;
  requestedByUserIdHash: string;
  organizationIdHash: string;
  createdAt: string;
  expiresAt: string;
  approvedByUserIdHash?: string;
  executedAt?: string;
};

export type AiActionLedgerBlockedCode =
  | "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND"
  | "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED"
  | "BLOCKED_APPROVAL_ACTION_INVALID_INPUT"
  | "BLOCKED_APPROVAL_ACTION_POLICY_DENIED"
  | "BLOCKED_APPROVAL_ACTION_EVIDENCE_REQUIRED"
  | "BLOCKED_APPROVAL_ACTION_IDEMPOTENCY_REQUIRED"
  | "BLOCKED_APPROVAL_ACTION_AUDIT_REQUIRED"
  | "BLOCKED_APPROVAL_ACTION_TRANSITION_DENIED"
  | "BLOCKED_APPROVAL_ACTION_NOT_FOUND"
  | "BLOCKED_DOMAIN_EXECUTOR_NOT_READY";

export type AiActionLedgerSafeMetadata = {
  persistentBackend: boolean;
  fakeLocalApproval: false;
  finalExecution: false;
  directDomainMutation: false;
  rawDbRowsExposed: false;
  rawPromptExposed: false;
  rawProviderPayloadStored: false;
  credentialsPrinted: false;
};

export type SubmitAiActionForApprovalInput = {
  actionType: AiActionLedgerActionType;
  screenId: string;
  domain: AiDomain;
  summary: string;
  redactedPayload: unknown;
  evidenceRefs: string[];
  idempotencyKey: string;
  requestedByUserIdHash: string;
  organizationIdHash: string;
  nowIso?: string;
};

export type SubmitAiActionForApprovalOutput = AiActionLedgerSafeMetadata & {
  status: "pending" | "blocked";
  actionId?: string;
  reason?: string;
  requiresApproval: true;
  persisted: boolean;
  idempotencyReused: boolean;
  auditEvents: AiActionLedgerAuditEvent[];
  record?: AiActionLedgerRecord;
  blocker?: AiActionLedgerBlockedCode;
};

export type AiActionStatusOutput = AiActionLedgerSafeMetadata & {
  status: AiActionStatus | "not_found" | "blocked";
  actionId: string;
  record?: AiActionLedgerRecord;
  persistedLookup: boolean;
  auditEvents: AiActionLedgerAuditEvent[];
  blocker?: AiActionLedgerBlockedCode;
  reason?: string;
};

export type AiActionDecisionOutput = AiActionLedgerSafeMetadata & {
  status: "approved" | "rejected" | "blocked";
  actionId: string;
  record?: AiActionLedgerRecord;
  persisted: boolean;
  auditEvents: AiActionLedgerAuditEvent[];
  blocker?: AiActionLedgerBlockedCode;
  reason?: string;
};

export type ExecuteApprovedAiActionOutput = AiActionLedgerSafeMetadata & {
  status: "executed" | "blocked";
  actionId: string;
  record?: AiActionLedgerRecord;
  persisted: boolean;
  auditEvents: AiActionLedgerAuditEvent[];
  blocker?: AiActionLedgerBlockedCode;
  reason?: string;
  domainExecutorReady: boolean;
};
