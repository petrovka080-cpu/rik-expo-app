import {
  normalizeAiTraceEvidenceRefs,
  redactAiTraceAttributes,
} from "./aiTraceRedaction";
import type { AiTraceEvent, AiTraceEventInput } from "./aiTraceTypes";

export type AiTraceRecorder = {
  record(input: AiTraceEventInput): AiTraceEvent;
  list(): readonly AiTraceEvent[];
  flush(): readonly AiTraceEvent[];
};

function defaultTraceId(input: AiTraceEventInput): string {
  return [
    "ai_trace",
    input.eventName,
    input.screenId ?? "screen",
    input.toolName ?? "tool",
    input.actionIdHash ?? "action",
  ]
    .join(":")
    .replace(/[^a-zA-Z0-9:._-]+/g, "_")
    .slice(0, 180);
}

export function recordAiTraceEvent(input: AiTraceEventInput): AiTraceEvent {
  return {
    traceId: input.traceId?.trim() || defaultTraceId(input),
    eventName: input.eventName,
    createdAt: input.createdAt ?? new Date().toISOString(),
    role: input.role,
    domain: input.domain,
    screenId: input.screenId,
    toolName: input.toolName,
    actionIdHash: input.actionIdHash,
    outcome: input.outcome,
    blockedReason: input.blockedReason,
    evidenceRefs: normalizeAiTraceEvidenceRefs(input.evidenceRefs),
    attributes: redactAiTraceAttributes(input.attributes),
    redacted: true,
    rawPromptExposed: false,
    rawProviderPayloadExposed: false,
    rawDbRowsExposed: false,
    credentialsExposed: false,
    fullUserEmailExposed: false,
    authorizationHeaderExposed: false,
    tokenExposed: false,
  };
}

export function createAiTraceRecorder(options: {
  emit?: (event: AiTraceEvent) => void;
} = {}): AiTraceRecorder {
  const events: AiTraceEvent[] = [];
  return {
    record(input) {
      const event = recordAiTraceEvent(input);
      events.push(event);
      options.emit?.(event);
      return event;
    },
    list() {
      return [...events];
    },
    flush() {
      const snapshot = [...events];
      events.length = 0;
      return snapshot;
    },
  };
}
