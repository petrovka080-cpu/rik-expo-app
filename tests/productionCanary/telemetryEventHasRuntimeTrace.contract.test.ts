import { validateAiEstimateTelemetryEvent } from "../../src/lib/ai/observability/validateAiEstimateTelemetryEvent";
import { telemetryEvent } from "./productionCanaryTestHelpers";

test("telemetry event includes runtime trace", () => {
  const event = telemetryEvent();
  expect(event.runtimeTraceId).toBe("trace_production_canary_contract");
  expect(validateAiEstimateTelemetryEvent(event).valid).toBe(true);
});
