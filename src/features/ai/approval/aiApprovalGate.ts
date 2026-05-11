import { hasAiActionAuditEvent } from "../audit/aiActionAudit";
import type { AiActionAuditEvent } from "../audit/aiActionAuditTypes";
import {
  assertAiScreenAccess,
  type AiMutationPolicy,
} from "../policy/aiScreenCapabilityRegistry";
import {
  assertAiActionAllowed,
  getAiRiskLevel,
  type AiActionType,
  type AiPolicyDecision,
} from "../policy/aiRiskPolicy";
import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import { buildAiApprovalAction } from "./aiApprovalAction";
import type { AiApprovalAction } from "./aiApprovalTypes";

export type AiApprovalDraftParams = {
  actionType: AiActionType;
  screenId: string;
  domain: AiDomain;
  requestedByRole: AiUserRole;
  requestedByUserIdHash?: string;
  organizationIdHash?: string;
  summary: string;
  redactedPayload: unknown;
  evidenceRefs?: readonly string[];
  idempotencyKey: string;
  actionId?: string;
  createdAt?: string;
  expiresAt?: string;
};

export type CanExecuteAiApprovedActionParams = {
  auditEvent?: AiActionAuditEvent | null;
  now?: string | Date;
};

const decision = (params: {
  allowed: boolean;
  riskLevel: AiPolicyDecision["riskLevel"];
  requiresApproval?: boolean;
  reason: string;
}): AiPolicyDecision => ({
  allowed: params.allowed,
  riskLevel: params.riskLevel,
  requiresApproval: params.requiresApproval ?? params.riskLevel === "approval_required",
  reason: params.reason,
  redactionRequired: true,
  auditRequired: true,
});

function buildActionId(params: AiApprovalDraftParams): string {
  const base = [
    "ai",
    params.actionType,
    params.screenId,
    params.requestedByRole,
    params.idempotencyKey || "missing_idempotency",
  ].join(":");
  return base.replace(/[^a-zA-Z0-9:._-]+/g, "_").slice(0, 180);
}

function hasRedactedPayload(value: unknown): boolean {
  return value != null;
}

export function createAiApprovalDraft(params: AiApprovalDraftParams): AiApprovalAction {
  return buildAiApprovalAction({
    ...params,
    actionId: params.actionId ?? buildActionId(params),
    status: "draft",
  });
}

export function submitAiActionForApproval(params: AiApprovalDraftParams): AiApprovalAction {
  const riskLevel = getAiRiskLevel(params.actionType);
  const actionDecision = assertAiActionAllowed({
    actionType: params.actionType,
    role: params.requestedByRole,
    domain: params.domain,
  });
  const screenDecision = assertAiScreenAccess(params.screenId, params.requestedByRole);
  const canSubmit =
    actionDecision.allowed &&
    screenDecision.allowed &&
    riskLevel === "approval_required" &&
    params.idempotencyKey.trim().length > 0 &&
    hasRedactedPayload(params.redactedPayload);

  return buildAiApprovalAction({
    ...params,
    actionId: params.actionId ?? buildActionId(params),
    status: canSubmit ? "pending" : "blocked",
  });
}

export function canExecuteAiApprovedAction(
  action: AiApprovalAction,
  params: CanExecuteAiApprovedActionParams = {},
): AiPolicyDecision {
  const riskLevel = getAiRiskLevel(action.actionType);
  if (riskLevel === "forbidden") {
    return decision({
      allowed: false,
      riskLevel,
      requiresApproval: false,
      reason: "Forbidden AI action cannot execute",
    });
  }
  if (action.status !== "approved") {
    return decision({
      allowed: false,
      riskLevel,
      reason: `AI action status ${action.status} cannot execute`,
    });
  }
  const nowMs = params.now ? new Date(params.now).getTime() : Date.now();
  if (Number.isFinite(nowMs) && Date.parse(action.expiresAt) <= nowMs) {
    return decision({
      allowed: false,
      riskLevel,
      reason: "AI approval action is expired",
    });
  }
  if (!action.idempotencyKey.trim()) {
    return decision({
      allowed: false,
      riskLevel,
      reason: "AI approval action is missing idempotency key",
    });
  }
  if (!hasAiActionAuditEvent(params.auditEvent)) {
    return decision({
      allowed: false,
      riskLevel,
      reason: "AI approval action is missing audit event",
    });
  }

  const roleDecision = assertAiActionAllowed({
    actionType: action.actionType,
    role: action.requestedByRole,
    domain: action.domain,
    capability: "execute_approved_action",
  });
  const screenDecision = assertAiScreenAccess(action.screenId, action.requestedByRole);
  if (!roleDecision.allowed || !screenDecision.allowed) {
    return decision({
      allowed: false,
      riskLevel,
      reason: roleDecision.allowed ? screenDecision.reason : roleDecision.reason,
    });
  }

  return decision({
    allowed: true,
    riskLevel,
    requiresApproval: true,
    reason: "AI action can execute through approved gate",
  });
}

export function assertNoDirectAiMutation(params: {
  actionType: AiActionType;
  role: AiUserRole;
  screenId: string;
  domain: AiDomain;
  mutationPolicy?: AiMutationPolicy;
}): AiPolicyDecision {
  const riskLevel = getAiRiskLevel(params.actionType);
  if (riskLevel === "forbidden") {
    return decision({
      allowed: false,
      riskLevel,
      requiresApproval: false,
      reason: `Direct AI mutation blocked: ${params.actionType} is forbidden`,
    });
  }
  if (riskLevel === "approval_required" || params.mutationPolicy === "approval_required") {
    return decision({
      allowed: false,
      riskLevel,
      requiresApproval: true,
      reason: "Direct AI mutation blocked: submit_for_approval is required",
    });
  }
  return assertAiActionAllowed({
    actionType: params.actionType,
    role: params.role,
    domain: params.domain,
  });
}
