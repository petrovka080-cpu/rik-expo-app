import {
  canUseAiCapability,
  getAllowedAiDomainsForRole,
  hasDirectorFullAiAccess,
  type AiDomain,
  type AiUserRole,
} from "../policy/aiRolePolicy";
import {
  assertAiActionLedgerApprovePolicy,
  getAiActionLedgerRiskLevel,
  stableHashOpaqueId,
} from "../actionLedger/aiActionLedgerPolicy";
import type { AiActionLedgerRecord } from "../actionLedger/aiActionLedgerTypes";
import { hasApprovalInboxEvidence } from "./approvalInboxEvidence";
import type { ApprovalInboxReviewAction } from "./approvalInboxTypes";

const APPROVABLE_STATUSES = new Set(["pending"]);

export function approvalInboxUserHash(userId: string): string {
  return stableHashOpaqueId("user", userId);
}

export function approvalInboxOrganizationHash(params: {
  role: AiUserRole;
  organizationId?: string;
}): string {
  return stableHashOpaqueId("org", params.organizationId ?? `${params.role}:organization_scope`);
}

export function canReadApprovalInboxAction(params: {
  role: AiUserRole;
  userIdHash: string;
  record: AiActionLedgerRecord;
}): boolean {
  const { role, record } = params;
  if (role === "unknown") return false;
  if (!hasApprovalInboxEvidence(record)) return false;
  if (hasDirectorFullAiAccess(role)) return true;
  if (!getAllowedAiDomainsForRole(role).includes(record.domain)) return false;
  if (!canUseAiCapability({ role, domain: record.domain, capability: "read_context" })) {
    return false;
  }

  if (role === "contractor" || role === "foreman") {
    return record.requestedByUserIdHash === params.userIdHash;
  }

  return true;
}

export function canApproveApprovalInboxAction(params: {
  role: AiUserRole;
  record: AiActionLedgerRecord;
}): boolean {
  if (!APPROVABLE_STATUSES.has(params.record.status)) return false;
  if (!hasApprovalInboxEvidence(params.record)) return false;
  if (getAiActionLedgerRiskLevel(params.record.actionType) === "forbidden") return false;
  return assertAiActionLedgerApprovePolicy({
    status: params.record.status,
    actionType: params.record.actionType,
    approverRole: params.role,
    domain: params.record.domain,
  }).allowed;
}

export function canRejectApprovalInboxAction(params: {
  role: AiUserRole;
  record: AiActionLedgerRecord;
}): boolean {
  return canApproveApprovalInboxAction(params);
}

export function canEditPreviewApprovalInboxAction(params: {
  role: AiUserRole;
  domain: AiDomain;
  record: AiActionLedgerRecord;
}): boolean {
  return (
    params.record.status === "pending" &&
    hasApprovalInboxEvidence(params.record) &&
    canUseAiCapability({ role: params.role, domain: params.domain, capability: "draft" })
  );
}

export function canExecuteApprovalInboxAction(params: {
  role: AiUserRole;
  record: AiActionLedgerRecord;
}): boolean {
  return (
    params.record.status === "approved" &&
    canUseAiCapability({
      role: params.role,
      domain: params.record.domain,
      capability: "execute_approved_action",
      viaApprovalGate: true,
    })
  );
}

export function resolveApprovalInboxReviewActions(params: {
  role: AiUserRole;
  record: AiActionLedgerRecord;
}): ApprovalInboxReviewAction[] {
  const actions: ApprovalInboxReviewAction[] = ["view", "ask_why"];
  if (
    canEditPreviewApprovalInboxAction({
      role: params.role,
      domain: params.record.domain,
      record: params.record,
    })
  ) {
    actions.push("edit_preview");
  }
  if (canApproveApprovalInboxAction(params)) actions.push("approve");
  if (canRejectApprovalInboxAction(params)) actions.push("reject");
  if (canExecuteApprovalInboxAction(params)) actions.push("execute_approved");
  return actions;
}
