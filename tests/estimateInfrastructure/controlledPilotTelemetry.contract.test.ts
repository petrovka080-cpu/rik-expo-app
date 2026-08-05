import {
  CONTROLLED_PILOT_TELEMETRY_EVENT_NAMES,
  auditAiEstimatePilotTelemetryDryRun,
  buildControlledPilotTelemetryEvents,
} from "../../scripts/estimate/auditAiEstimatePilotTelemetryDryRun";
import { loadControlledPilotDryRunScenarios } from "../../scripts/estimate/runControlledPilotDryRunScenarios";

describe("controlled pilot telemetry dry-run", () => {
  it("emits required events with source sha, role, flow id and redacted payloads", () => {
    const sourceSha = "telemetry-source";
    const events = buildControlledPilotTelemetryEvents(sourceSha);
    const serialized = JSON.stringify(events);

    for (const eventName of CONTROLLED_PILOT_TELEMETRY_EVENT_NAMES) {
      expect(events.some((event) => event.event_name === eventName)).toBe(true);
    }
    expect(events.every((event) => event.source_sha === sourceSha)).toBe(true);
    expect(events.every((event) => event.role.length > 0)).toBe(true);
    expect(events.every((event) => event.flow_id.length > 0)).toBe(true);
    for (const scenario of loadControlledPilotDryRunScenarios().scenarios) {
      expect(serialized).not.toContain(scenario.prompt);
    }
    expect(serialized).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(serialized).not.toMatch(/\+?\d[\d\s().-]{7,}\d/);
    expect(serialized).not.toMatch(/sk-test-token|sk-[A-Za-z0-9_-]{8,}/);
  });

  it("summarizes telemetry acceptance without owner approval or release", () => {
    const summary = auditAiEstimatePilotTelemetryDryRun({ writeRuntime: false }).artifact;

    expect(summary.pilot_telemetry_dry_run_created).toBe(true);
    expect(summary.pilot_telemetry_events_emitted).toBe(true);
    expect(summary.telemetry_pii_redaction_passed).toBe(true);
    expect(summary.telemetry_source_sha_present).toBe(true);
    expect(summary.telemetry_role_present).toBe(true);
    expect(summary.telemetry_flow_id_present).toBe(true);
    expect(summary.owner_approved).toBe(false);
  });

  it("does not classify phone-like digits in source sha as pii", () => {
    const summary = auditAiEstimatePilotTelemetryDryRun({
      writeRuntime: false,
      sourceSha: "c01a5c4cae42845382cf3b672940657802ab65c9",
    }).artifact;

    expect(summary.blockers).not.toContain("telemetry_contains_phone");
    expect(summary.telemetry_pii_redaction_passed).toBe(true);
  });
});
