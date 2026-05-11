import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type { AiActionType, AiRiskLevel } from "../policy/aiRiskPolicy";

export type AiApprovalStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "expired"
  | "blocked";

export type AiApprovalAction = {
  actionId: string;
  actionType: AiActionType;
  status: AiApprovalStatus;
  riskLevel: AiRiskLevel;
  screenId: string;
  domain: AiDomain;
  requestedByRole: AiUserRole;
  requestedByUserIdHash?: string;
  organizationIdHash?: string;
  summary: string;
  redactedPayload: unknown;
  evidenceRefs: string[];
  idempotencyKey: string;
  createdAt: string;
  expiresAt: string;
};
