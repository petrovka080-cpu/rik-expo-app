import {
  createAiActionLedgerRepository,
  type AiActionLedgerRepository,
} from "../../actionLedger/aiActionLedgerRepository";
import { stableHashOpaqueId } from "../../actionLedger/aiActionLedgerPolicy";
import type {
  AiActionLedgerActionType,
  SubmitAiActionForApprovalOutput,
} from "../../actionLedger/aiActionLedgerTypes";
import type { AiToolTransportAuthContext, AiSubmitForApprovalTransportInput } from "./aiToolTransportTypes";

export type { AiActionLedgerRepository };

export type SubmitForApprovalTransportRequest = {
  auth: AiToolTransportAuthContext;
  input: AiSubmitForApprovalTransportInput;
  organizationId?: string;
  actionType: AiActionLedgerActionType;
  repository?: AiActionLedgerRepository;
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
): Promise<SubmitAiActionForApprovalOutput> {
  const repository = request.repository ?? createAiActionLedgerRepository(null);
  return repository.submitForApproval(
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
      redactedPayload: {
        draft_id: request.input.draft_id,
        approval_target: request.input.approval_target,
        approval_reason: request.input.approval_reason,
      },
      evidenceRefs: request.input.evidence_refs,
      idempotencyKey: request.input.idempotency_key,
    },
    request.auth.role,
  );
}
