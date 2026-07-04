import {
  assertEstimateTelemetryCoverage,
  buildCanonicalPilotTelemetryEvents,
  REQUIRED_ESTIMATE_PILOT_TELEMETRY_EVENTS,
} from "../../src/features/estimates/telemetry/estimateTelemetryEvents";
import {
  createEstimateTelemetryEvent,
  redactTelemetryValue,
  validateEstimateTelemetryEvent,
} from "../../src/features/estimates/telemetry/estimateTelemetryRecorder";

describe("estimate telemetry events", () => {
  it("covers all pilot observability lifecycle events", () => {
    const events = buildCanonicalPilotTelemetryEvents();
    const coverage = assertEstimateTelemetryCoverage(events);
    expect(coverage.required_events_covered).toBe(true);
    expect(new Set(events.map((event) => event.event_name))).toEqual(new Set(REQUIRED_ESTIMATE_PILOT_TELEMETRY_EVENTS));
    expect(events.flatMap(validateEstimateTelemetryEvent)).toEqual([]);
  });

  it("redacts private telemetry fields", () => {
    const event = createEstimateTelemetryEvent({
      event_name: "support_package_exported",
      payload: { phone: "+996700000000", email: "user@example.com", note: "token=abc" },
    });
    expect(JSON.stringify(event)).not.toContain("+996700000000");
    expect(JSON.stringify(redactTelemetryValue("email user@example.com"))).toContain("[redacted-email]");
  });
});
