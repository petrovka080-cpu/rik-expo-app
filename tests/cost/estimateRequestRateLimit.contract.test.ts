import { evaluateAiEstimateCostGuard } from "../../src/lib/ai/cost";

describe("estimate request rate limit", () => {
  it("denies excessive estimate requests per session", () => {
    const decision = evaluateAiEstimateCostGuard({
      estimateRequestsForSession: 121,
      pdfGenerationsForSession: 0,
      catalogLookupsForEstimate: 0,
      localRateSourceLookupsForEstimate: 0,
      retriesForFailedEstimate: 0,
      repeatedFailedPrompts: 0,
      concurrentPdfJobs: 0,
      concurrentCatalogBindings: 0,
      proofRunnerFixtureBatchSize: 100,
    }).find((item) => item.key === "estimateRequestsForSession");
    expect(decision?.action).toBe("deny");
  });
});
