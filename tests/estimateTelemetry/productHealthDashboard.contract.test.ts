import { buildEstimateProductHealthDashboard } from "../../scripts/estimate/buildEstimateProductHealthDashboard";
import { buildCanonicalPilotTelemetryEvents } from "../../src/features/estimates/telemetry/estimateTelemetryEvents";

describe("estimate product health dashboard", () => {
  it("turns required telemetry into a green product dashboard", () => {
    const dashboard = buildEstimateProductHealthDashboard(buildCanonicalPilotTelemetryEvents(), {
      sourceSha: "test-source",
      generatedAt: "2026-07-04T00:00:00.000Z",
    });
    expect(dashboard.final_status).toBe("GREEN_AI_ESTIMATE_PRODUCT_HEALTH_DASHBOARD");
    expect(dashboard.telemetry_coverage.required_events_covered).toBe(true);
    expect(dashboard.metrics.event_counts.kill_switch_triggered).toBe(1);
  });
});
