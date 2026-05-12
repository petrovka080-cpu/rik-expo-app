import { canUseAiCapability } from "../policy/aiRolePolicy";
import {
  canTransitionAiActionStatus,
  getAiActionLedgerRiskLevel,
} from "../actionLedger/aiActionLedgerPolicy";
import type {
  AiActionLedgerActionType,
  AiActionLedgerRecord,
} from "../actionLedger/aiActionLedgerTypes";
import type { ApprovedActionExecutionRequest } from "./approvedActionExecutorTypes";

export const APPROVED_PROCUREMENT_EXECUTOR_ACTION_TYPES = [
  "draft_request",
  "submit_request",
] as const satisfies readonly AiActionLedgerActionType[];

export const FORBIDDEN_APPROVED_EXECUTOR_ACTION_TYPES = [
  "confirm_supplier",
  "create_order",
  "change_warehouse_status",
  "send_document",
  "document_send",
  "change_payment_status",
  "delete_data",
  "raw_db_export",
  "direct_supabase_query",
] as const;

export type ApprovedActionExecutionPolicyDecision = {
  allowed: boolean;
  reason: string;
  blocker?:
    | "BLOCKED_APPROVAL_ACTION_POLICY_DENIED"
    | "BLOCKED_APPROVAL_ACTION_TRANSITION_DENIED"
    | "BLOCKED_APPROVAL_ACTION_EVIDENCE_REQUIRED"
    | "BLOCKED_APPROVAL_ACTION_IDEMPOTENCY_REQUIRED";
  auditRequired: true;
  evidenceRequired: true;
  idempotencyRequired: true;
  centralGateRequired: true;
};

const decision = (
  allowed: boolean,
  reason: string,
  blocker?: ApprovedActionExecutionPolicyDecision["blocker"],
): ApprovedActionExecutionPolicyDecision => ({
  allowed,
  reason,
  blocker,
  auditRequired: true,
  evidenceRequired: true,
  idempotencyRequired: true,
  centralGateRequired: true,
});

export function isApprovedProcurementExecutorActionType(
  actionType: AiActionLedgerActionType,
): actionType is "draft_request" | "submit_request" {
  return (APPROVED_PROCUREMENT_EXECUTOR_ACTION_TYPES as readonly string[]).includes(actionType);
}

export function isForbiddenApprovedExecutorActionType(
  actionType: string,
): boolean {
  return FORBIDDEN_APPROVED_EXECUTOR_ACTION_TYPES.some((forbidden) => forbidden === actionType);
}

export function evaluateApprovedActionExecutionPolicy(params: {
  record: AiActionLedgerRecord;
  request: ApprovedActionExecutionRequest;
  hasAuditEvent: boolean;
  nowIso?: string;
}): ApprovedActionExecutionPolicyDecision {
  const { record, request } = params;
  if (record.status !== "approved") {
    return decision(
      false,
      `AI action status ${record.status} cannot execute`,
      "BLOCKED_APPROVAL_ACTION_TRANSITION_DENIED",
    );
  }
  if (!canTransitionAiActionStatus(record.status, "executed")) {
    return decision(
      false,
      `AI action status ${record.status} cannot transition to executed`,
      "BLOCKED_APPROVAL_ACTION_TRANSITION_DENIED",
    );
  }
  if (Date.parse(record.expiresAt) <= Date.parse(params.nowIso ?? new Date().toISOString())) {
    return decision(false, "AI action approval is expired", "BLOCKED_APPROVAL_ACTION_TRANSITION_DENIED");
  }
  if (getAiActionLedgerRiskLevel(record.actionType) === "forbidden") {
    return decision(false, "Forbidden AI action cannot execute", "BLOCKED_APPROVAL_ACTION_POLICY_DENIED");
  }
  if (!isApprovedProcurementExecutorActionType(record.actionType) || record.domain !== "procurement") {
    return decision(false, "No bounded procurement executor is registered for this action type", "BLOCKED_APPROVAL_ACTION_POLICY_DENIED");
  }
  if (record.evidenceRefs.length === 0) {
    return decision(false, "Approved action execution requires evidence", "BLOCKED_APPROVAL_ACTION_EVIDENCE_REQUIRED");
  }
  if (record.idempotencyKey.trim().length < 16 || request.idempotencyKey.trim().length < 16) {
    return decision(false, "Approved action execution requires idempotency", "BLOCKED_APPROVAL_ACTION_IDEMPOTENCY_REQUIRED");
  }
  if (record.idempotencyKey !== request.idempotencyKey) {
    return decision(false, "Execution idempotency key does not match the approved action", "BLOCKED_APPROVAL_ACTION_IDEMPOTENCY_REQUIRED");
  }
  if (!params.hasAuditEvent) {
    return decision(false, "Approved action execution requires audit", "BLOCKED_APPROVAL_ACTION_POLICY_DENIED");
  }
  if (
    !canUseAiCapability({
      role: request.requestedByRole,
      domain: record.domain,
      capability: "execute_approved_action",
      viaApprovalGate: true,
    })
  ) {
    return decision(false, `AI role ${request.requestedByRole} cannot execute approved procurement action`, "BLOCKED_APPROVAL_ACTION_POLICY_DENIED");
  }

  return decision(true, "Approved procurement action can execute through central gate");
}
