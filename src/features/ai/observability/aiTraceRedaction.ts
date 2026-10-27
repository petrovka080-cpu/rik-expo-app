import {
  redactSensitiveText,
  SENSITIVE_REDACTION_MARKER,
} from "../../../lib/security/redaction";
import type { AiTraceAttributeValue, AiTraceAttributes } from "./aiTraceTypes";

export const FORBIDDEN_AI_TRACE_KEY_PATTERN =
  /\b(rawPrompt|raw_prompt|prompt|providerPayload|provider_payload|rawProviderPayload|raw_provider_payload|rawDbRows|raw_db_rows|dbRows|db_rows|databaseRow|database_row|Authorization|authorization|token|secret|password|service[_-]?role|credentials|fullUserEmail|userEmail|email)\b/i;

const MAX_TRACE_ATTRIBUTE_DEPTH = 4;
const MAX_TRACE_ARRAY_ITEMS = 20;
const MAX_TRACE_TEXT_LENGTH = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clampText(value: string): string {
  const redacted = redactSensitiveText(value).replace(/\s+/g, " ").trim();
  return redacted.length > MAX_TRACE_TEXT_LENGTH
    ? `${redacted.slice(0, MAX_TRACE_TEXT_LENGTH)}...`
    : redacted;
}

export function hasForbiddenAiTraceKeys(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenAiTraceKeys);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) => FORBIDDEN_AI_TRACE_KEY_PATTERN.test(key) || hasForbiddenAiTraceKeys(nested),
  );
}

export function redactAiTraceValue(
  value: unknown,
  depth = 0,
): AiTraceAttributeValue {
  if (depth > MAX_TRACE_ATTRIBUTE_DEPTH) return "[redacted:depth-limit]";
  if (value == null) return null;
  if (typeof value === "boolean" || typeof value === "number") {
    return Number.isFinite(value) || typeof value === "boolean" ? value : null;
  }
  if (typeof value === "string") return clampText(value);
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_TRACE_ARRAY_ITEMS)
      .map((entry) => redactAiTraceValue(entry, depth + 1));
  }
  if (!isRecord(value)) return String(value);

  const redacted: Record<string, AiTraceAttributeValue> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_AI_TRACE_KEY_PATTERN.test(key)) {
      redacted[key] = SENSITIVE_REDACTION_MARKER;
      continue;
    }
    redacted[key] = redactAiTraceValue(nested, depth + 1);
  }
  return redacted;
}

export function redactAiTraceAttributes(
  attributes: Record<string, unknown> | undefined,
): AiTraceAttributes {
  const source = attributes ?? {};
  const redacted: AiTraceAttributes = {};
  for (const [key, value] of Object.entries(source).slice(0, 50)) {
    redacted[key] = FORBIDDEN_AI_TRACE_KEY_PATTERN.test(key)
      ? SENSITIVE_REDACTION_MARKER
      : redactAiTraceValue(value);
  }
  return redacted;
}

export function normalizeAiTraceEvidenceRefs(
  evidenceRefs: readonly string[] | undefined,
): readonly string[] {
  return [...new Set((evidenceRefs ?? []).map((ref) => clampText(ref)).filter(Boolean))].slice(0, 20);
}
