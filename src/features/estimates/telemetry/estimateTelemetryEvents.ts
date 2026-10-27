import {
  ESTIMATE_TELEMETRY_EVENT_NAMES,
  type EstimateTelemetryEvent,
  type EstimateTelemetryEventName,
} from "./estimateTelemetryTypes";
import {
  createEstimateTelemetryEvent,
  validateEstimateTelemetryEvent,
} from "./estimateTelemetryRecorder";

export const REQUIRED_ESTIMATE_PILOT_TELEMETRY_EVENTS: readonly EstimateTelemetryEventName[] = [
  "estimate_generated",
  "manual_item_added",
  "pdf_exported",
  "estimate_approved",
  "marketplace_handoff_created",
  "estimator_feedback_ingested",
  "fatal_fallback",
  "kill_switch_triggered",
] as const;

export function buildCanonicalPilotTelemetryEvents(): EstimateTelemetryEvent[] {
  return REQUIRED_ESTIMATE_PILOT_TELEMETRY_EVENTS.map((event_name, index) =>
    createEstimateTelemetryEvent({
      event_name,
      route: event_name === "marketplace_handoff_created" ? "marketplace" : event_name === "pdf_exported" ? "pdf" : "script",
      platform: "node",
      context: {
        source_sha: "canonical-contract-source",
        branch: "canonical-contract-branch",
      },
      request_id: `canonical_request_${index + 1}`,
      estimate_id: `canonical_estimate_${index + 1}`,
      payload: { contract_event: true, index },
      created_at: "2026-07-04T00:00:00.000Z",
    })
  );
}

export function assertEstimateTelemetryCoverage(events: readonly EstimateTelemetryEvent[]) {
  const eventNames = new Set(events.map((event) => event.event_name));
  const missing = REQUIRED_ESTIMATE_PILOT_TELEMETRY_EVENTS.filter((eventName) => !eventNames.has(eventName));
  const invalid = events.flatMap((event) =>
    validateEstimateTelemetryEvent(event).map((reason) => ({ event_id: event.event_id, reason }))
  );
  return {
    known_event_names: [...ESTIMATE_TELEMETRY_EVENT_NAMES],
    required_events: [...REQUIRED_ESTIMATE_PILOT_TELEMETRY_EVENTS],
    required_events_covered: missing.length === 0,
    missing,
    invalid,
    valid: missing.length === 0 && invalid.length === 0,
  };
}
