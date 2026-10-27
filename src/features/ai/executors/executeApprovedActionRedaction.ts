import type { ApprovedActionCreatedEntityRef } from "./approvedActionExecutorTypes";

const FORBIDDEN_KEY_PATTERN =
  /\b(rawPrompt|raw_prompt|providerPayload|provider_payload|rawDbRows|raw_db_rows|user_id|organization_id|company_id|Authorization|token|secret|service[_-]?role|credentials)\b/i;

export function approvedActionPayloadHasForbiddenFields(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(approvedActionPayloadHasForbiddenFields);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(
    ([key, nested]) => FORBIDDEN_KEY_PATTERN.test(key) || approvedActionPayloadHasForbiddenFields(nested),
  );
}

export function readRedactedCreatedEntityRef(value: unknown): ApprovedActionCreatedEntityRef | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const ref = record.createdEntityRef;
  if (!ref || typeof ref !== "object" || Array.isArray(ref)) return undefined;
  const nested = ref as Record<string, unknown>;
  return nested.entityType === "request" && typeof nested.entityIdHash === "string" && nested.entityIdHash.trim()
    ? { entityType: "request", entityIdHash: nested.entityIdHash.trim() }
    : undefined;
}
