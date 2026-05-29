import { validateAiEstimateTelemetryEvent } from "../../src/lib/ai/observability/validateAiEstimateTelemetryEvent";
import { telemetryEvent } from "./productionCanaryTestHelpers";

test("telemetry rejects secrets", () => {
  const event = telemetryEvent({ promptPreviewRedacted: "token sk-test-value" });
  expect(event.promptPreviewRedacted).toContain("[redacted_secret]");
  expect(validateAiEstimateTelemetryEvent(event).issues).not.toContain("TELEMETRY_PRIVATE_OR_SECRET_DATA_FOUND");
});
