import { buildLiveEstimate, expectNoGenericConstructionRows, expectSpecificRows, LIVE_ESTIMATE_CASES } from "./liveAiEstimatePdfRealityTestHelpers";

describe("live asphalt estimate web acceptance", () => {
  it("resolves asphalt with asphalt-specific rows", () => {
    const item = LIVE_ESTIMATE_CASES.find((candidate) => candidate.expectedWorkKey === "asphalt_paving")!;
    const estimate = buildLiveEstimate(item.prompt);

    expect(estimate.work.workKey).toBe("asphalt_paving");
    expectSpecificRows(estimate, item.expectedTokens);
    expectNoGenericConstructionRows(estimate);
  });
});
