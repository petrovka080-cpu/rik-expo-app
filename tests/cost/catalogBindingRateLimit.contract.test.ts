import { evaluateAiEstimateCostGuard } from "../../src/lib/ai/cost";

describe("catalog binding rate limit", () => {
  it("denies catalog lookup explosions beyond policy", () => {
    const decisions = evaluateAiEstimateCostGuard({
      estimateRequestsForSession: 1,
      pdfGenerationsForSession: 1,
      catalogLookupsForEstimate: 101,
      localRateSourceLookupsForEstimate: 1,
      retriesForFailedEstimate: 0,
      repeatedFailedPrompts: 0,
      concurrentPdfJobs: 1,
      concurrentCatalogBindings: 1,
      proofRunnerFixtureBatchSize: 100,
    });
    expect(decisions.find((item) => item.key === "catalogLookupsForEstimate")?.action).toBe("deny");
  });
});
