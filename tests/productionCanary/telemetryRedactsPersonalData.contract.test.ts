import { telemetryEvent } from "./productionCanaryTestHelpers";

test("telemetry redacts prompt preview personal data", () => {
  const event = telemetryEvent({ promptPreviewRedacted: "call +996 555 111 222 about address ул Абая 10" });
  expect(event.promptPreviewRedacted).toContain("[redacted_phone]");
  expect(event.promptPreviewRedacted).toContain("[redacted_address]");
});
