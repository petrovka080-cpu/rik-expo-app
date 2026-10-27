import { redactSensitiveText } from "../../../lib/security/redaction";
import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type {
  AiActionLedgerActionType,
  AiActionLedgerAuditEvent,
  AiActionLedgerAuditEventType,
  AiActionStatus,
} from "./aiActionLedgerTypes";
import { normalizeAiActionLedgerEvidenceRefs } from "./aiActionLedgerEvidence";

export type CreateAiActionLedgerAuditEventParams = {
  eventType: AiActionLedgerAuditEventType;
  actionId?: string;
  actionType?: AiActionLedgerActionType;
  status?: AiActionStatus;
  role?: AiUserRole;
  screenId?: string;
  domain?: AiDomain;
  reason: string;
  evidenceRefs?: readonly string[];
  createdAt?: string;
};

export function createAiActionLedgerAuditEvent(
  params: CreateAiActionLedgerAuditEventParams,
): AiActionLedgerAuditEvent {
  return {
    eventType: params.eventType,
    actionId: params.actionId,
    actionType: params.actionType,
    status: params.status,
    role: params.role,
    screenId: params.screenId,
    domain: params.domain,
    reason: redactSensitiveText(params.reason),
    evidenceRefs: normalizeAiActionLedgerEvidenceRefs(params.evidenceRefs ?? []),
    redacted: true,
    rawPromptExposed: false,
    rawProviderPayloadExposed: false,
    rawDbRowsExposed: false,
    credentialsExposed: false,
    createdAt: params.createdAt ?? new Date().toISOString(),
  };
}

export function hasAiActionLedgerAuditEvent(value: unknown): value is AiActionLedgerAuditEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as AiActionLedgerAuditEvent).redacted === true &&
    (value as AiActionLedgerAuditEvent).rawPromptExposed === false &&
    (value as AiActionLedgerAuditEvent).rawProviderPayloadExposed === false &&
    (value as AiActionLedgerAuditEvent).rawDbRowsExposed === false &&
    (value as AiActionLedgerAuditEvent).credentialsExposed === false &&
    typeof (value as AiActionLedgerAuditEvent).createdAt === "string"
  );
}
