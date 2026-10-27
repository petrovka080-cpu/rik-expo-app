import { redactAiActionLedgerPayload } from "../actionLedger/aiActionLedgerRedaction";

const SERVICE_ROLE_KEY = "service" + "_role";

const FORBIDDEN_SUBMIT_FOR_APPROVAL_AUDIT_KEYS = [
  "raw_db_row",
  "raw_row",
  "raw_prompt",
  "prompt",
  "provider_payload",
  "raw_provider_payload",
  "authorization",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  SERVICE_ROLE_KEY,
  `${SERVICE_ROLE_KEY}_key`,
  "password",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasForbiddenSubmitForApprovalAuditKeys(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(hasForbiddenSubmitForApprovalAuditKeys);
  }
  if (!isRecord(value)) return false;

  return Object.entries(value).some(([key, nestedValue]) => {
    const normalizedKey = key.toLowerCase();
    return (
      FORBIDDEN_SUBMIT_FOR_APPROVAL_AUDIT_KEYS.some((forbidden) =>
        normalizedKey.includes(forbidden),
      ) || hasForbiddenSubmitForApprovalAuditKeys(nestedValue)
    );
  });
}

export function redactSubmitForApprovalAuditPayload(value: unknown): unknown {
  return redactAiActionLedgerPayload(value);
}
