import {
  classifyAiEmulatorFailure,
  resolveAiEmulatorFailureClassification,
  shouldRetryAiEmulatorFailure,
} from "../../scripts/e2e/aiEmulatorFlakePolicy";

describe("AI emulator flake policy", () => {
  it("retries only transport and device-offline failures", () => {
    expect(classifyAiEmulatorFailure("ECONNRESET from Maestro transport")).toBe("transport_flake");
    expect(classifyAiEmulatorFailure("adb: device offline")).toBe("device_offline");
    expect(shouldRetryAiEmulatorFailure("transport_flake")).toBe(true);
    expect(shouldRetryAiEmulatorFailure("device_offline")).toBe(true);
  });

  it("does not retry deterministic assertion, targetability, or safety blockers", () => {
    expect(classifyAiEmulatorFailure("No visible element found for id ai.knowledge.preview")).toBe("targetability_blocker");
    expect(classifyAiEmulatorFailure("Assertion failed: assertVisible")).toBe("assertion_failed");
    expect(classifyAiEmulatorFailure("role_leakage_observed true")).toBe("safety_blocker");
    expect(shouldRetryAiEmulatorFailure("targetability_blocker")).toBe(false);
    expect(shouldRetryAiEmulatorFailure("assertion_failed")).toBe(false);
    expect(shouldRetryAiEmulatorFailure("safety_blocker")).toBe(false);
    expect(resolveAiEmulatorFailureClassification("targetability_blocker", false)).toBe("ASSERTION_FAILED_NO_RETRY");
  });
});
