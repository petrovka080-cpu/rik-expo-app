import { createAiActionLedgerAuditEvent } from "../actionLedger/aiActionLedgerAudit";
import { normalizeAiActionLedgerEvidenceRefs } from "../actionLedger/aiActionLedgerEvidence";
import { stableHashOpaqueId } from "../actionLedger/aiActionLedgerPolicy";
import type { AiActionLedgerAuditEvent } from "../actionLedger/aiActionLedgerTypes";
import {
  SUBMIT_FOR_APPROVAL_AUDIT_CONTRACT,
  type SubmitForApprovalAuditInput,
  type SubmitForApprovalAuditTrail,
} from "./submitForApprovalAuditTypes";

function buildAuditTrailRef(input: SubmitForApprovalAuditInput, actionId?: string): string {
  return stableHashOpaqueId(
    "audit",
    [
      "submit_for_approval",
      actionId ?? "pending",
      input.actionType,
      input.screenId,
      input.domain,
      input.idempotencyKey,
    ].join(":"),
  );
}

export function createSubmitForApprovalSubmittedAuditEvent(params: {
  input: SubmitForApprovalAuditInput;
  actionId?: string;
  createdAt?: string;
}): AiActionLedgerAuditEvent {
  return createAiActionLedgerAuditEvent({
    eventType: "ai.action.submitted_for_approval",
    actionId: params.actionId,
    actionType: params.input.actionType,
    status: "pending",
    role: params.input.role,
    screenId: params.input.screenId,
    domain: params.input.domain,
    reason: "submit_for_approval persisted a pending action with audit, evidence, and idempotency.",
    evidenceRefs: params.input.evidenceRefs,
    createdAt: params.createdAt,
  });
}

export function createSubmitForApprovalBlockedAuditEvent(params: {
  input: SubmitForApprovalAuditInput;
  reason: string;
  createdAt?: string;
}): AiActionLedgerAuditEvent {
  return createAiActionLedgerAuditEvent({
    eventType: "ai.action.execution_blocked",
    actionType: params.input.actionType,
    status: "blocked",
    role: params.input.role,
    screenId: params.input.screenId,
    domain: params.input.domain,
    reason: params.reason,
    evidenceRefs: params.input.evidenceRefs,
    createdAt: params.createdAt,
  });
}

export function buildSubmitForApprovalAuditTrail(params: {
  input: SubmitForApprovalAuditInput;
  status: "pending" | "blocked";
  actionId?: string;
  auditEvents?: readonly AiActionLedgerAuditEvent[];
}): SubmitForApprovalAuditTrail {
  const evidenceRefs = normalizeAiActionLedgerEvidenceRefs(params.input.evidenceRefs);
  const auditEvents =
    params.auditEvents && params.auditEvents.length > 0
      ? [...params.auditEvents]
      : [createSubmitForApprovalSubmittedAuditEvent({ input: params.input, actionId: params.actionId })];

  return {
    contractId: SUBMIT_FOR_APPROVAL_AUDIT_CONTRACT.contractId,
    auditTrailRef: buildAuditTrailRef(params.input, params.actionId),
    actionId: params.actionId,
    actionType: params.input.actionType,
    role: params.input.role,
    screenId: params.input.screenId,
    domain: params.input.domain,
    status: params.status,
    riskLevel: SUBMIT_FOR_APPROVAL_AUDIT_CONTRACT.riskLevel,
    auditEvents,
    auditEventCount: auditEvents.length,
    evidenceRefs,
    idempotencyKeyPresent: true,
    redacted: true,
    redactedPayloadOnly: true,
    finalExecution: false,
    directDomainMutation: false,
    mutationCount: 0,
    providerCalled: false,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
    rawProviderPayloadStored: false,
    credentialsPrinted: false,
  };
}
