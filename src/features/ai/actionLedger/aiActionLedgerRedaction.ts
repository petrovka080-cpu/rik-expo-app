import { redactSensitiveValue } from "../../../lib/security/redaction";

const rawIdKeys = ["user_id", "company_id", "organization_id"] as const;
const rawPayloadKeys = ["raw_db_row", "raw_prompt", "provider_payload"] as const;
const credentialKeys = [
  "authorization",
  ["service", "role"].join("_"),
  "token",
  "secret",
  "password",
  "credential",
] as const;
const camelCaseForbiddenKeys = [
  "userId",
  "companyId",
  "organizationId",
  "rawDbRow",
  "rawDbRows",
  "rawPrompt",
  "providerPayload",
  "authorizationHeader",
  "serviceRole",
] as const;
const forbiddenKeyNames = [
  ...rawIdKeys,
  ...rawPayloadKeys,
  ...credentialKeys,
  ...camelCaseForbiddenKeys,
] as const;
const FORBIDDEN_KEY_PATTERN = new RegExp(
  `(^|_)(${forbiddenKeyNames.join("|")})s?$`,
  "i",
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitize(value: unknown, seen = new WeakSet<object>()): unknown {
  const redacted = redactSensitiveValue(value);
  if (!isRecord(redacted) && !Array.isArray(redacted)) return redacted;
  if (typeof redacted !== "object" || redacted === null) return redacted;
  if (seen.has(redacted)) return "[circular]";
  seen.add(redacted);

  if (Array.isArray(redacted)) {
    return redacted.map((entry) => sanitize(entry, seen));
  }

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(redacted)) {
    if (FORBIDDEN_KEY_PATTERN.test(key)) {
      output[`${key}Hash`] = "redacted";
      continue;
    }
    output[key] = sanitize(entry, seen);
  }
  return output;
}

export function redactAiActionLedgerPayload(value: unknown): unknown {
  return sanitize(value);
}

export function findAiActionLedgerForbiddenPayloadKeys(value: unknown): string[] {
  const findings: string[] = [];
  const visit = (entry: unknown, path: string): void => {
    if (Array.isArray(entry)) {
      entry.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (!isRecord(entry)) return;
    for (const [key, child] of Object.entries(entry)) {
      const keyPath = path ? `${path}.${key}` : key;
      if (FORBIDDEN_KEY_PATTERN.test(key)) findings.push(keyPath);
      visit(child, keyPath);
    }
  };
  visit(value, "");
  return findings;
}

export function isAiActionLedgerPayloadSafe(value: unknown): boolean {
  return findAiActionLedgerForbiddenPayloadKeys(value).length === 0;
}
