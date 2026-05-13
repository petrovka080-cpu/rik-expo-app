import {
  createAiActionLedgerRepository,
  type AiActionLedgerRepository,
} from "../../actionLedger/aiActionLedgerRepository";
import { stableHashOpaqueId } from "../../actionLedger/aiActionLedgerPolicy";
import type {
  AiActionLedgerActionType,
  AiActionLedgerBlockedCode,
  SubmitAiActionForApprovalOutput,
} from "../../actionLedger/aiActionLedgerTypes";
import { assertSubmitForApprovalAuditPolicy } from "../../approvalAudit/submitForApprovalAuditPolicy";
import {
  buildSubmitForApprovalAuditTrail,
  createSubmitForApprovalBlockedAuditEvent,
} from "../../approvalAudit/submitForApprovalAuditEvent";
import { redactSubmitForApprovalAuditPayload } from "../../approvalAudit/submitForApprovalRedaction";
import type {
  SubmitForApprovalAuditInput,
  SubmitForApprovalAuditTrail,
} from "../../approvalAudit/submitForApprovalAuditTypes";
import type { AiToolTransportAuthContext, AiSubmitForApprovalTransportInput } from "./aiToolTransportTypes";

export type { AiActionLedgerRepository };

export type SubmitForApprovalTransportRequest = {
  auth: AiToolTransportAuthContext;
  input: AiSubmitForApprovalTransportInput;
  organizationId?: string;
  actionType: AiActionLedgerActionType;
  repository?: AiActionLedgerRepository;
};

export type SubmitForApprovalTransportOutput = SubmitAiActionForApprovalOutput & {
  auditTrail: SubmitForApprovalAuditTrail;
};

export function actionTypeForApprovalTransportTarget(
  target: AiSubmitForApprovalTransportInput["approval_target"],
): AiActionLedgerActionType {
  if (target === "request") return "submit_request";
  if (target === "supplier_selection") return "confirm_supplier";
  if (target === "payment_status_change") return "change_payment_status";
  return "send_document";
}

export async function submitForApprovalTransport(
  request: SubmitForApprovalTransportRequest,
): Promise<SubmitForApprovalTransportOutput> {
  const repository = request.repository ?? createAiActionLedgerRepository(null);
  const redactedPayload = redactSubmitForApprovalAuditPayload({
    draft_id: request.input.draft_id,
    approval_target: request.input.approval_target,
    approval_reason: request.input.approval_reason,
  });
  const auditInput: SubmitForApprovalAuditInput = {
    actionType: request.actionType,
    role: request.auth.role,
    screenId: request.input.screen_id,
    domain: request.input.domain,
    summary: request.input.summary,
    redactedPayload,
    evidenceRefs: request.input.evidence_refs,
    idempotencyKey: request.input.idempotency_key,
  };
  const auditPolicy = assertSubmitForApprovalAuditPolicy(auditInput);
  if (!auditPolicy.allowed) {
    const auditEvent = createSubmitForApprovalBlockedAuditEvent({
      input: auditInput,
      reason: `submit_for_approval audit policy blocked request: ${auditPolicy.reason}`,
    });
    const blocker: AiActionLedgerBlockedCode =
      auditPolicy.reason === "evidence_required"
        ? "BLOCKED_APPROVAL_ACTION_EVIDENCE_REQUIRED"
        : auditPolicy.reason === "idempotency_required"
          ? "BLOCKED_APPROVAL_ACTION_IDEMPOTENCY_REQUIRED"
          : auditPolicy.reason === "redaction_failed"
            ? "BLOCKED_APPROVAL_ACTION_AUDIT_REQUIRED"
            : "BLOCKED_APPROVAL_ACTION_POLICY_DENIED";
    return {
      persistentBackend: false,
      fakeLocalApproval: false,
      finalExecution: false,
      directDomainMutation: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
      rawProviderPayloadStored: false,
      credentialsPrinted: false,
      status: "blocked",
      reason: auditEvent.reason,
      requiresApproval: true,
      persisted: false,
      idempotencyReused: false,
      auditEvents: [auditEvent],
      blocker,
      auditTrail: buildSubmitForApprovalAuditTrail({
        input: auditInput,
        status: "blocked",
        auditEvents: [auditEvent],
      }),
    };
  }

  const result = await repository.submitForApproval(
    {
      actionType: request.actionType,
      screenId: request.input.screen_id,
      domain: request.input.domain,
      requestedByUserIdHash: stableHashOpaqueId("user", request.auth.userId),
      organizationIdHash: stableHashOpaqueId(
        "org",
        request.organizationId ?? `${request.auth.role}:organization_scope`,
      ),
      summary: request.input.summary,
      redactedPayload,
      evidenceRefs: request.input.evidence_refs,
      idempotencyKey: request.input.idempotency_key,
    },
    request.auth.role,
  );

  return {
    ...result,
    auditTrail: buildSubmitForApprovalAuditTrail({
      input: auditInput,
      status: result.status,
      actionId: result.actionId ?? result.record?.actionId,
      auditEvents: result.auditEvents,
    }),
  };
}
