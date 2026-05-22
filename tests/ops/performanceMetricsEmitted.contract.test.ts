import {
  OPS_METRIC_REGISTRY,
  REQUIRED_OPS_METRIC_NAMES,
  buildOpsAlertThresholds,
  getOpsMetricEvents,
  recordOpsMetric,
  resetOpsMetricEvents,
  validateOpsMetricDefinition,
} from "../../src/lib/ops/productionOpsTelemetry";

describe("production performance and ops metric coverage", () => {
  beforeEach(() => {
    resetOpsMetricEvents();
  });

  it("registers every required metric with structured log event and alert threshold", () => {
    const registeredNames = OPS_METRIC_REGISTRY.map((metric) => metric.name);
    const thresholds = buildOpsAlertThresholds();

    expect(registeredNames).toEqual(expect.arrayContaining(REQUIRED_OPS_METRIC_NAMES));
    for (const metric of OPS_METRIC_REGISTRY) {
      expect(validateOpsMetricDefinition(metric)).toBe(true);
      expect(metric.structuredLogEvent).toMatch(/^ops\./);
      expect(metric.alertThreshold).toBeGreaterThan(0);
      expect(thresholds[metric.name]).toBe(metric.alertThreshold);
    }
  });

  it("emits duration and counter metrics into the structured in-memory sink", () => {
    recordOpsMetric({
      name: "db_query_duration_ms",
      value: 241.2,
      attributes: { queryName: "listPayments", tenantScope: "company" },
    });
    recordOpsMetric({
      name: "marketplace_publish_attempts",
      value: 1,
      attributes: { result: "validation_error", safeCode: "missing_phone" },
    });
    recordOpsMetric({
      name: "validation_error_counts",
      value: 3,
      attributes: { safeCode: "required_fields" },
    });

    const events = getOpsMetricEvents();
    expect(events.map((event) => event.name)).toEqual([
      "db_query_duration_ms",
      "marketplace_publish_attempts",
      "validation_error_counts",
    ]);
    expect(events.every((event) => event.piiSafe && event.redacted)).toBe(true);
    expect(events[0]?.value).toBe(241);
    expect(events[1]?.unit).toBe("count");
  });
});
