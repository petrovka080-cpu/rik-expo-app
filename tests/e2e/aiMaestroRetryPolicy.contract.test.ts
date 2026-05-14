import {
  AI_MAESTRO_BACKOFF_MS,
  AI_MAESTRO_MAX_RETRY_COUNT,
  runAiMaestroWithRetry,
} from "../../scripts/e2e/aiMaestroRetryPolicy";

describe("AI Maestro retry policy", () => {
  it("uses bounded exponential backoff for transport flakes", async () => {
    let attempts = 0;
    const sleeps: number[] = [];
    const result = await runAiMaestroWithRetry({
      operation: async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("Maestro transport ECONNRESET");
        }
        return { final_status: "GREEN" };
      },
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      prepareDevice: () => undefined,
    });

    expect(AI_MAESTRO_MAX_RETRY_COUNT).toBe(2);
    expect(AI_MAESTRO_BACKOFF_MS).toEqual([1000, 3000, 10000]);
    expect(result.result).toEqual({ final_status: "GREEN" });
    expect(result.metrics.flake_retry_count).toBe(2);
    expect(result.metrics.transport_retry_count).toBe(2);
    expect(sleeps).toEqual([1000, 3000]);
  });

  it("does not retry assertion failures", async () => {
    let attempts = 0;
    const result = await runAiMaestroWithRetry({
      operation: async () => {
        attempts += 1;
        throw new Error("Assertion failed: No visible element found for id ai.command_center.screen");
      },
      sleep: async () => {
        throw new Error("sleep must not run for assertion failures");
      },
      prepareDevice: () => undefined,
    });

    expect(attempts).toBe(1);
    expect(result.result).toBeNull();
    expect(result.metrics.flake_retry_count).toBe(0);
    expect(result.final_classification).toBe("ASSERTION_FAILED_NO_RETRY");
  });
});
