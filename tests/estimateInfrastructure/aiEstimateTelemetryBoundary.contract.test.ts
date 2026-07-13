import { validateAiEstimateTelemetry } from "../../src/lib/estimate/observability/validateAiEstimateTelemetry";

describe("AI estimate telemetry boundary", () => {
  it("emits platform events with redacted payloads", () => {
    const result = validateAiEstimateTelemetry();

    expect(result.ok).toBe(true);
    expect(result.telemetryEventsEmitted).toBe(true);
    expect(result.piiRedactionPassed).toBe(true);
    expect(result.fullPromptNotLoggedUnredacted).toBe(true);
    expect(result.tokensNotLogged).toBe(true);
  });
});
