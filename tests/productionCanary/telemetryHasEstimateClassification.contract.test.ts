import { telemetryEvent } from "./productionCanaryTestHelpers";

test("telemetry captures estimate classification and mode", () => {
  const event = telemetryEvent({ classification: "REGULATED_SAFE_PROFESSIONAL_ESTIMATE_OK", estimateMode: "regulated_safe" });
  expect(event.classification).toBe("REGULATED_SAFE_PROFESSIONAL_ESTIMATE_OK");
  expect(event.estimateMode).toBe("regulated_safe");
});
