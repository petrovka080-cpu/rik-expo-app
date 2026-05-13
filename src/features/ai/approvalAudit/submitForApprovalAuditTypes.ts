import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type {
  AiActionLedgerActionType,
  AiActionLedgerAuditEvent,
} from "../actionLedger/aiActionLedgerTypes";

export const SUBMIT_FOR_APPROVAL_AUDIT_CONTRACT = Object.freeze({
  contractId: "submit_for_approval_audit_trail_v1",
  toolName: "submit_for_approval",
  status: "pending",
  riskLevel: "approval_required",
  auditRequired: true,
  evidenceRequired: true,
  idempotencyRequired: true,
  redactedPayloadOnly: true,
  finalExecution: false,
  directDomainMutation: false,
  fakeLocalApproval: false,
  providerCalled: false,
  rawDbRowsExposed: false,
  rawPromptExposed: false,
  rawProviderPayloadStored: false,
  credentialsPrinted: false,
} as const);

export type SubmitForApprovalAuditDecisionReason =
  | "allowed"
  | "role_denied"
  | "action_type_denied"
  | "screen_id_required"
  | "summary_required"
  | "idempotency_required"
  | "evidence_required"
  | "redaction_failed";

export type SubmitForApprovalAuditInput = {
  actionType: AiActionLedgerActionType;
  role: AiUserRole;
  screenId: string;
  domain: AiDomain;
  summary: string;
  redactedPayload: unknown;
  evidenceRefs: readonly string[];
  idempotencyKey: string;
};

export type SubmitForApprovalAuditDecision = {
  allowed: boolean;
  reason: SubmitForApprovalAuditDecisionReason;
  role: AiUserRole;
  domain: AiDomain;
  actionType: AiActionLedgerActionType;
  riskLevel: "approval_required";
  auditRequired: true;
  evidenceRequired: true;
  idempotencyRequired: true;
  finalExecution: false;
  directDomainMutation: false;
};

export type SubmitForApprovalAuditTrail = {
  contractId: typeof SUBMIT_FOR_APPROVAL_AUDIT_CONTRACT.contractId;
  auditTrailRef: string;
  actionId?: string;
  actionType: AiActionLedgerActionType;
  role: AiUserRole;
  screenId: string;
  domain: AiDomain;
  status: "pending" | "blocked";
  riskLevel: "approval_required";
  auditEvents: AiActionLedgerAuditEvent[];
  auditEventCount: number;
  evidenceRefs: string[];
  idempotencyKeyPresent: true;
  redacted: true;
  redactedPayloadOnly: true;
  finalExecution: false;
  directDomainMutation: false;
  mutationCount: 0;
  providerCalled: false;
  rawDbRowsExposed: false;
  rawPromptExposed: false;
  rawProviderPayloadStored: false;
  credentialsPrinted: false;
};
