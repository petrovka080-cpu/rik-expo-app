import { evaluateAiEstimateFailureLoop } from "../../src/lib/ai/cost";

describe("no unbounded model loop", () => {
  it("blocks repeated model/tool retries", () => {
    const result = evaluateAiEstimateFailureLoop({
      promptHash: "same_prompt",
      estimateRetries: 0,
      pdfRetries: 0,
      catalogLookupFailures: 0,
      sourceRefreshFailures: 0,
      modelToolRetries: 2,
      routeReloads: 0,
    });
    expect(result.status).toBe("SAFE_FAILURE_LOOP_BLOCKED");
  });
});
