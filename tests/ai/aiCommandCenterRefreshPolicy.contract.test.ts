import {
  AI_COMMAND_CENTER_REFRESH_POLICY,
  decideAiCommandCenterRefresh,
} from "../../src/features/ai/commandCenter/aiCommandCenterRefreshPolicy";

describe("AI Command Center refresh policy", () => {
  it("requires throttle, cancellation, timeout, and in-flight dedupe", () => {
    expect(AI_COMMAND_CENTER_REFRESH_POLICY).toMatchObject({
      minRefreshIntervalMs: 30_000,
      requestTimeoutMs: 8_000,
      duplicateInFlightAllowed: false,
      cancellationRequired: true,
      pollingLoopAllowed: false,
      pollingLoopCeiling: 0,
    });

    expect(decideAiCommandCenterRefresh({ nowMs: 40_000, lastRefreshAtMs: 20_000 })).toMatchObject({
      allowed: false,
      reason: "refresh_throttled",
      pollingLoopAllowed: false,
    });
    expect(decideAiCommandCenterRefresh({ nowMs: 40_000, inFlight: true })).toMatchObject({
      allowed: false,
      reason: "refresh_in_flight",
      retryAllowed: false,
    });
    expect(decideAiCommandCenterRefresh({ nowMs: 60_001, lastRefreshAtMs: 30_000 })).toMatchObject({
      allowed: true,
      reason: "refresh_allowed",
      requiresCancellation: true,
      timeoutMs: 8_000,
    });
  });
});
