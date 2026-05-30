import { buildAiEstimateTelemetryEvent } from "../../src/lib/ai/observability/buildAiEstimateTelemetryEvent";
import { validateAiEstimateTelemetryEvent } from "../../src/lib/ai/observability/validateAiEstimateTelemetryEvent";

test("limited public beta emits redacted telemetry", () => {
  const telemetry = buildAiEstimateTelemetryEvent({
    runtimeTraceId: "trace_beta_telemetry",
    route: "/request",
    entrypoint: "request",
    intent: "estimate",
    domain: "roof_waterproofing",
    object: "roof",
    operation: "waterproofing",
    classification: "EXPANDED_PROFESSIONAL_ESTIMATE_OK",
    promptPreviewRedacted: "user phone +996 555 111 222 should be redacted",
  });

  expect(validateAiEstimateTelemetryEvent(telemetry).valid).toBe(true);
  expect(telemetry.promptPreviewRedacted).toContain("[redacted_phone]");
});
