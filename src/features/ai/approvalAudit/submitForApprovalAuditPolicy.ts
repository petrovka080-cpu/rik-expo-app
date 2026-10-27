import { canUseAiCapability } from "../policy/aiRolePolicy";
import { getAiActionLedgerRiskLevel } from "../actionLedger/aiActionLedgerPolicy";
import type { AiActionLedgerActionType } from "../actionLedger/aiActionLedgerTypes";
import {
  SUBMIT_FOR_APPROVAL_AUDIT_CONTRACT,
  type SubmitForApprovalAuditDecision,
  type SubmitForApprovalAuditInput,
} from "./submitForApprovalAuditTypes";
import { hasForbiddenSubmitForApprovalAuditKeys } from "./submitForApprovalRedaction";

const ALLOWED_SUBMIT_FOR_APPROVAL_ACTION_TYPES: readonly AiActionLedgerActionType[] = [
  "draft_request",
  "draft_report",
  "draft_act",
  "submit_request",
  "confirm_supplier",
  "send_document",
  "change_payment_status",
];

function text(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function decision(
  input: SubmitForApprovalAuditInput,
  allowed: boolean,
  reason: SubmitForApprovalAuditDecision["reason"],
): SubmitForApprovalAuditDecision {
  return {
    allowed,
    reason,
    role: input.role,
    domain: input.domain,
    actionType: input.actionType,
    riskLevel: SUBMIT_FOR_APPROVAL_AUDIT_CONTRACT.riskLevel,
    auditRequired: true,
    evidenceRequired: true,
    idempotencyRequired: true,
    finalExecution: false,
    directDomainMutation: false,
  };
}

export function assertSubmitForApprovalAuditPolicy(
  input: SubmitForApprovalAuditInput,
): SubmitForApprovalAuditDecision {
  if (
    !canUseAiCapability({
      role: input.role,
      domain: input.domain,
      capability: "submit_for_approval",
    })
  ) {
    return decision(input, false, "role_denied");
  }

  if (
    !ALLOWED_SUBMIT_FOR_APPROVAL_ACTION_TYPES.includes(input.actionType) ||
    getAiActionLedgerRiskLevel(input.actionType) === "forbidden"
  ) {
    return decision(input, false, "action_type_denied");
  }

  if (!text(input.screenId)) return decision(input, false, "screen_id_required");
  if (!text(input.summary)) return decision(input, false, "summary_required");
  if (text(input.idempotencyKey).length < 16) {
    return decision(input, false, "idempotency_required");
  }
  if (input.evidenceRefs.length === 0) return decision(input, false, "evidence_required");
  if (hasForbiddenSubmitForApprovalAuditKeys(input.redactedPayload)) {
    return decision(input, false, "redaction_failed");
  }

  return decision(input, true, "allowed");
}
