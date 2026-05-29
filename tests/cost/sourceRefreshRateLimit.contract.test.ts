import { evaluateAiEstimateCostGuard } from "../../src/lib/ai/cost";

describe("source refresh rate limit", () => {
  it("falls back to BOQ without price instead of blocking answer", () => {
    const decision = evaluateAiEstimateCostGuard({
      estimateRequestsForSession: 1,
      pdfGenerationsForSession: 0,
      catalogLookupsForEstimate: 0,
      localRateSourceLookupsForEstimate: 101,
      retriesForFailedEstimate: 0,
      repeatedFailedPrompts: 0,
      concurrentPdfJobs: 0,
      concurrentCatalogBindings: 0,
      proofRunnerFixtureBatchSize: 100,
    }).find((item) => item.key === "localRateSourceLookupsForEstimate");
    expect(decision?.action).toBe("fallback_to_boq_without_price");
    expect(decision?.visibleMessageRu).toBeTruthy();
  });
});
