import { buildAiEstimateCanaryTelemetry } from "../../src/lib/ai/observability/buildAiEstimateCanaryTelemetry";
import { validateAiEstimateCanaryTelemetry } from "../../src/lib/ai/observability/validateAiEstimateCanaryTelemetry";

test("internal canary telemetry includes runtime trace and classification", () => {
  const event = buildAiEstimateCanaryTelemetry({
    runtimeTraceId: "trace_internal_canary",
    route: "/request",
    entrypoint: "request",
    intent: "estimate",
    domain: "flooring",
    object: "linoleum",
    operation: "installation",
    classification: "EXPANDED_PROFESSIONAL_ESTIMATE_OK",
    rowCount: 18,
    qualityScore: 100,
    latencyMs: 120,
  });

  expect(validateAiEstimateCanaryTelemetry(event).valid).toBe(true);
});
