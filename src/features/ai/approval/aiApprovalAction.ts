import { redactSensitiveValue } from "../../../lib/security/redaction";
import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import { getAiRiskLevel, type AiActionType } from "../policy/aiRiskPolicy";
import type { AiApprovalAction, AiApprovalStatus } from "./aiApprovalTypes";

export type BuildAiApprovalActionParams = {
  actionId: string;
  actionType: AiActionType;
  status: AiApprovalStatus;
  screenId: string;
  domain: AiDomain;
  requestedByRole: AiUserRole;
  requestedByUserIdHash?: string;
  organizationIdHash?: string;
  summary: string;
  redactedPayload: unknown;
  evidenceRefs?: readonly string[];
  idempotencyKey: string;
  createdAt?: string;
  expiresAt?: string;
};

const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000;

export function buildAiApprovalAction(params: BuildAiApprovalActionParams): AiApprovalAction {
  const createdAt = params.createdAt ?? new Date().toISOString();
  const expiresAt =
    params.expiresAt ?? new Date(new Date(createdAt).getTime() + DEFAULT_EXPIRY_MS).toISOString();

  return {
    actionId: params.actionId,
    actionType: params.actionType,
    status: params.status,
    riskLevel: getAiRiskLevel(params.actionType),
    screenId: params.screenId,
    domain: params.domain,
    requestedByRole: params.requestedByRole,
    requestedByUserIdHash: params.requestedByUserIdHash,
    organizationIdHash: params.organizationIdHash,
    summary: params.summary,
    redactedPayload: redactSensitiveValue(params.redactedPayload),
    evidenceRefs: [...(params.evidenceRefs ?? [])],
    idempotencyKey: params.idempotencyKey,
    createdAt,
    expiresAt,
  };
}
