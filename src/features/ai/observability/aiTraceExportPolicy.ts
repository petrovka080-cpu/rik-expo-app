import { AI_TRACE_EVENT_NAMES, type AiTraceEvent } from "./aiTraceTypes";

export const AI_TRACE_EXPORT_POLICY = Object.freeze({
  policyId: "ai_trace_export_policy_v1",
  allowedEvents: AI_TRACE_EVENT_NAMES,
  maxEvents: 200,
  maxAttributesPerEvent: 50,
  redactionRequired: true,
  noRawPrompt: true,
  noRawProviderPayload: true,
  noRawDbRow: true,
  noSecrets: true,
  noFullUserEmail: true,
  noAuthorizationHeader: true,
  noToken: true,
} as const);

export type AiTraceExportBundle = {
  policyId: typeof AI_TRACE_EXPORT_POLICY.policyId;
  exportedAt: string;
  eventCount: number;
  events: readonly AiTraceEvent[];
  redacted: true;
  rawPromptExposed: false;
  rawProviderPayloadExposed: false;
  rawDbRowsExposed: false;
  credentialsExposed: false;
};

export function canExportAiTraceEvent(event: AiTraceEvent): boolean {
  return (
    AI_TRACE_EXPORT_POLICY.allowedEvents.includes(event.eventName) &&
    event.redacted === true &&
    event.rawPromptExposed === false &&
    event.rawProviderPayloadExposed === false &&
    event.rawDbRowsExposed === false &&
    event.credentialsExposed === false &&
    event.fullUserEmailExposed === false &&
    event.authorizationHeaderExposed === false &&
    event.tokenExposed === false
  );
}

export function exportAiTraceEvents(
  events: readonly AiTraceEvent[],
  exportedAt = new Date().toISOString(),
): AiTraceExportBundle {
  const safeEvents = events
    .filter(canExportAiTraceEvent)
    .slice(0, AI_TRACE_EXPORT_POLICY.maxEvents);
  return {
    policyId: AI_TRACE_EXPORT_POLICY.policyId,
    exportedAt,
    eventCount: safeEvents.length,
    events: safeEvents,
    redacted: true,
    rawPromptExposed: false,
    rawProviderPayloadExposed: false,
    rawDbRowsExposed: false,
    credentialsExposed: false,
  };
}
