import type { AiUserRole } from "../../src/features/ai/policy/aiRolePolicy";
import type { AiActionLedgerRecord } from "../../src/features/ai/actionLedger/aiActionLedgerTypes";
import {
  approvalInboxOrganizationHash,
  approvalInboxUserHash,
} from "../../src/features/ai/approvalInbox/approvalInboxActionPolicy";

export const APPROVAL_INBOX_ORG_ID = "approval-inbox-org";

export function approvalInboxAuth(role: AiUserRole, userId = `${role}-user`) {
  return { role, userId };
}

export function approvalInboxOrgHash(role: AiUserRole = "director"): string {
  return approvalInboxOrganizationHash({
    role,
    organizationId: APPROVAL_INBOX_ORG_ID,
  });
}

export function createApprovalInboxRecord(
  overrides: Partial<AiActionLedgerRecord> & {
    requestedByUserId?: string;
  } = {},
): AiActionLedgerRecord {
  const role = overrides.role ?? "buyer";
  const requestedByUserId = overrides.requestedByUserId ?? `${role}-user`;
  const actionType = overrides.actionType ?? "draft_request";
  const status = overrides.status ?? "pending";
  const domain = overrides.domain ?? "procurement";
  const screenId = overrides.screenId ?? "buyer.main";

  return {
    actionId: overrides.actionId ?? `ai_action:${actionType}:${status}:${screenId}`,
    actionType,
    status,
    riskLevel: overrides.riskLevel ?? "draft_only",
    role,
    screenId,
    domain,
    summary: overrides.summary ?? "Review AI prepared action",
    redactedPayload: overrides.redactedPayload ?? { draftHash: "draft:approval:1" },
    evidenceRefs: overrides.evidenceRefs ?? ["evidence:approval:1"],
    idempotencyKey: overrides.idempotencyKey ?? `approval-inbox-idempotency-${actionType}-0001`,
    requestedByUserIdHash:
      overrides.requestedByUserIdHash ?? approvalInboxUserHash(requestedByUserId),
    organizationIdHash: overrides.organizationIdHash ?? approvalInboxOrgHash(role),
    createdAt: overrides.createdAt ?? "2026-05-13T00:00:00.000Z",
    expiresAt: overrides.expiresAt ?? "2035-01-01T00:00:00.000Z",
    approvedByUserIdHash: overrides.approvedByUserIdHash,
    executedAt: overrides.executedAt,
  };
}
