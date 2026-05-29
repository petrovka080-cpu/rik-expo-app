import { evaluateAiEstimateFailureLoop } from "../../src/lib/ai/cost";

describe("repeated failure rate limit", () => {
  it("stops the same failed prompt retry loop", () => {
    const result = evaluateAiEstimateFailureLoop({
      promptHash: "same_prompt",
      estimateRetries: 3,
      pdfRetries: 0,
      catalogLookupFailures: 0,
      sourceRefreshFailures: 0,
      modelToolRetries: 0,
      routeReloads: 0,
    });
    expect(result.repeated_failed_prompt_loop_found).toBe(true);
    expect(result.status).toBe("SAFE_FAILURE_LOOP_BLOCKED");
  });
});
