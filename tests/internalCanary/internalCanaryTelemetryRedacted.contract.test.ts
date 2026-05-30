import { buildAiEstimateCanaryTelemetry } from "../../src/lib/ai/observability/buildAiEstimateCanaryTelemetry";
import { validateAiEstimateCanaryTelemetry } from "../../src/lib/ai/observability/validateAiEstimateCanaryTelemetry";

test("internal canary telemetry redacts personal data", () => {
  const event = buildAiEstimateCanaryTelemetry({
    runtimeTraceId: "trace_internal_canary",
    route: "/ai?context=request",
    entrypoint: "embedded_ai",
    intent: "estimate",
    domain: "electrical",
    object: "house_wiring",
    operation: "installation",
    classification: "EXPANDED_PROFESSIONAL_ESTIMATE_OK",
    promptPreviewRedacted: "call +996 555 222 333 for estimate",
  });

  expect(event.promptPreviewRedacted).toContain("[redacted_phone]");
  expect(validateAiEstimateCanaryTelemetry(event).valid).toBe(true);
});
