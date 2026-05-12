import { canUseAiCapability, type AiDomain, type AiUserRole } from "../policy/aiRolePolicy";
import type {
  AiActionLedgerActionType,
  AiActionRiskLevel,
  AiActionStatus,
} from "./aiActionLedgerTypes";

export const AI_ACTION_LEDGER_ACTION_TYPES: readonly AiActionLedgerActionType[] = [
  "draft_request",
  "draft_report",
  "draft_act",
  "supplier_match",
  "warehouse_low_stock",
  "finance_risk",
  "document_send",
  "submit_request",
  "confirm_supplier",
  "create_order",
  "change_warehouse_status",
  "send_document",
  "change_payment_status",
];

export const AI_ACTION_LEDGER_STATUSES: readonly AiActionStatus[] = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "executed",
  "expired",
  "blocked",
];

const RISK_BY_ACTION: Record<AiActionLedgerActionType, AiActionRiskLevel> = {
  draft_request: "draft_only",
  draft_report: "draft_only",
  draft_act: "draft_only",
  supplier_match: "safe_read",
  warehouse_low_stock: "safe_read",
  finance_risk: "safe_read",
  document_send: "approval_required",
  submit_request: "approval_required",
  confirm_supplier: "approval_required",
  create_order: "approval_required",
  change_warehouse_status: "approval_required",
  send_document: "approval_required",
  change_payment_status: "approval_required",
};

const ALLOWED_TRANSITIONS: Record<AiActionStatus, readonly AiActionStatus[]> = {
  draft: ["pending"],
  pending: ["approved", "rejected", "expired"],
  approved: ["executed", "expired"],
  rejected: [],
  executed: [],
  expired: [],
  blocked: [],
};

export type AiActionLedgerPolicyDecision = {
  allowed: boolean;
  reason: string;
  riskLevel: AiActionRiskLevel;
  requiresApproval: boolean;
  auditRequired: true;
  evidenceRequired: true;
  idempotencyRequired: true;
};

function decision(params: {
  allowed: boolean;
  reason: string;
  riskLevel: AiActionRiskLevel;
  requiresApproval?: boolean;
}): AiActionLedgerPolicyDecision {
  return {
    allowed: params.allowed,
    reason: params.reason,
    riskLevel: params.riskLevel,
    requiresApproval: params.requiresApproval ?? params.riskLevel !== "safe_read",
    auditRequired: true,
    evidenceRequired: true,
    idempotencyRequired: true,
  };
}

export function normalizeAiActionLedgerActionType(
  value: unknown,
): AiActionLedgerActionType | null {
  return AI_ACTION_LEDGER_ACTION_TYPES.find((actionType) => actionType === value) ?? null;
}

export function getAiActionLedgerRiskLevel(
  actionType: AiActionLedgerActionType,
): AiActionRiskLevel {
  return RISK_BY_ACTION[actionType] ?? "forbidden";
}

export function canTransitionAiActionStatus(
  from: AiActionStatus,
  to: AiActionStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertAiActionLedgerSubmitPolicy(params: {
  actionType: AiActionLedgerActionType;
  role: AiUserRole;
  domain: AiDomain;
  evidenceRefs: readonly string[];
  idempotencyKey: string;
}): AiActionLedgerPolicyDecision {
  const riskLevel = getAiActionLedgerRiskLevel(params.actionType);
  if (riskLevel === "forbidden") {
    return decision({
      allowed: false,
      reason: "Forbidden AI action cannot be submitted for approval",
      riskLevel,
      requiresApproval: false,
    });
  }
  if (riskLevel === "safe_read") {
    return decision({
      allowed: false,
      reason: "Safe-read AI action can be explained, not submitted as approval action",
      riskLevel,
      requiresApproval: false,
    });
  }
  if (params.evidenceRefs.length === 0) {
    return decision({
      allowed: false,
      reason: "AI action ledger requires evidence before pending approval",
      riskLevel,
    });
  }
  if (params.idempotencyKey.trim().length < 16) {
    return decision({
      allowed: false,
      reason: "AI action ledger requires a stable idempotency key",
      riskLevel,
    });
  }
  if (!canUseAiCapability({ role: params.role, domain: params.domain, capability: "submit_for_approval" })) {
    return decision({
      allowed: false,
      reason: `AI role ${params.role} cannot submit approval action in ${params.domain}`,
      riskLevel,
    });
  }

  return decision({
    allowed: true,
    reason: "AI action can be persisted as pending approval",
    riskLevel,
    requiresApproval: true,
  });
}

export function assertAiActionLedgerApprovePolicy(params: {
  status: AiActionStatus;
  actionType: AiActionLedgerActionType;
  approverRole: AiUserRole;
  domain: AiDomain;
}): AiActionLedgerPolicyDecision {
  const riskLevel = getAiActionLedgerRiskLevel(params.actionType);
  if (riskLevel === "forbidden") {
    return decision({
      allowed: false,
      reason: "Forbidden AI action cannot be approved",
      riskLevel,
      requiresApproval: false,
    });
  }
  if (!canTransitionAiActionStatus(params.status, "approved")) {
    return decision({
      allowed: false,
      reason: `AI action status ${params.status} cannot transition to approved`,
      riskLevel,
    });
  }
  if (!canUseAiCapability({ role: params.approverRole, domain: params.domain, capability: "approve_action" })) {
    return decision({
      allowed: false,
      reason: `AI role ${params.approverRole} cannot approve action in ${params.domain}`,
      riskLevel,
    });
  }
  return decision({
    allowed: true,
    reason: "AI action can be approved by role policy",
    riskLevel,
  });
}

export function assertAiActionLedgerExecutePolicy(params: {
  status: AiActionStatus;
  actionType: AiActionLedgerActionType;
  executorRole: AiUserRole;
  domain: AiDomain;
  expiresAt: string;
  nowIso?: string;
  hasAuditEvent: boolean;
  idempotencyKey: string;
}): AiActionLedgerPolicyDecision {
  const riskLevel = getAiActionLedgerRiskLevel(params.actionType);
  if (riskLevel === "forbidden") {
    return decision({
      allowed: false,
      reason: "Forbidden AI action cannot execute",
      riskLevel,
      requiresApproval: false,
    });
  }
  if (params.status !== "approved") {
    return decision({
      allowed: false,
      reason: `AI action status ${params.status} cannot execute`,
      riskLevel,
    });
  }
  if (Date.parse(params.expiresAt) <= Date.parse(params.nowIso ?? new Date().toISOString())) {
    return decision({
      allowed: false,
      reason: "AI action approval is expired",
      riskLevel,
    });
  }
  if (params.idempotencyKey.trim().length < 16) {
    return decision({
      allowed: false,
      reason: "AI action execution requires idempotency",
      riskLevel,
    });
  }
  if (!params.hasAuditEvent) {
    return decision({
      allowed: false,
      reason: "AI action execution requires audit",
      riskLevel,
    });
  }
  if (
    !canUseAiCapability({
      role: params.executorRole,
      domain: params.domain,
      capability: "execute_approved_action",
      viaApprovalGate: true,
    })
  ) {
    return decision({
      allowed: false,
      reason: `AI role ${params.executorRole} cannot execute approved action in ${params.domain}`,
      riskLevel,
    });
  }
  return decision({
    allowed: true,
    reason: "AI action can execute only through central approved gate",
    riskLevel,
  });
}

export function stableHashOpaqueId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}:${(hash >>> 0).toString(36)}`;
}
