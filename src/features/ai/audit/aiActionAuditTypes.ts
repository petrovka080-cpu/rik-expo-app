import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type { AiActionType, AiRiskLevel } from "../policy/aiRiskPolicy";

export type AiActionAuditEventType =
  | "ai.policy.checked"
  | "ai.action.allowed"
  | "ai.action.denied"
  | "ai.action.draft_created"
  | "ai.action.approval_required"
  | "ai.action.submitted_for_approval"
  | "ai.action.blocked_for_role"
  | "ai.action.blocked_for_screen"
  | "ai.action.blocked_for_risk"
  | "ai.prompt.policy_applied";

export type AiActionAuditDecision =
  | "allow"
  | "deny"
  | "approval_required"
  | "blocked";

export type AiActionAuditEvent = {
  eventType: AiActionAuditEventType;
  actionType?: AiActionType;
  screenId?: string;
  domain?: AiDomain;
  role?: AiUserRole;
  riskLevel?: AiRiskLevel;
  decision: AiActionAuditDecision;
  reason: string;
  redacted: true;
  timestamp: string;
};
