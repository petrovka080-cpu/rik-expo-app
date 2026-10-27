import {
  FORBIDDEN_AI_TRACE_KEY_PATTERN,
  redactAiTraceValue,
} from "../observability/aiTraceRedaction";
import type { AiTraceAttributeValue } from "../observability/aiTraceTypes";
import { hasForbiddenAiToolTransportKeys } from "../tools/transport/aiToolTransportTypes";

export type AgentRuntimeRedactionResult = {
  payload: AiTraceAttributeValue;
  payloadBytes: number;
  forbiddenKeysDetected: boolean;
  rawRowsExposed: false;
  rawPromptExposed: false;
  rawProviderPayloadExposed: false;
  secretsExposed: false;
};

const MAX_RUNTIME_PAYLOAD_BYTES_FOR_REDACTION = 24_000;

function measurePayloadBytes(value: unknown): number {
  try {
    return JSON.stringify(value ?? {}).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function containsForbiddenRuntimeKey(value: unknown): boolean {
  if (hasForbiddenAiToolTransportKeys(value)) return true;
  if (Array.isArray(value)) return value.some(containsForbiddenRuntimeKey);
  if (typeof value !== "object" || value === null) return false;

  return Object.entries(value).some(
    ([key, nested]) =>
      FORBIDDEN_AI_TRACE_KEY_PATTERN.test(key) || containsForbiddenRuntimeKey(nested),
  );
}

export function redactAgentRuntimePayload(payload: unknown): AgentRuntimeRedactionResult {
  const payloadBytes = measurePayloadBytes(payload);
  const forbiddenKeysDetected = containsForbiddenRuntimeKey(payload);

  return {
    payload:
      payloadBytes > MAX_RUNTIME_PAYLOAD_BYTES_FOR_REDACTION
        ? "[redacted:payload-too-large]"
        : redactAiTraceValue(payload),
    payloadBytes,
    forbiddenKeysDetected,
    rawRowsExposed: false,
    rawPromptExposed: false,
    rawProviderPayloadExposed: false,
    secretsExposed: false,
  };
}
