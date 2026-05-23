import { buildLiveEstimate, expectNoGenericConstructionRows, expectSpecificRows, LIVE_ESTIMATE_CASES } from "./liveAiEstimatePdfRealityTestHelpers";

describe("live gable roof estimate acceptance", () => {
  it("resolves gable roof to roof-specific rows", () => {
    const item = LIVE_ESTIMATE_CASES.find((candidate) => candidate.expectedWorkKey === "gable_roof_installation")!;
    const estimate = buildLiveEstimate(item.prompt, "/chat");

    expect(estimate.work.workKey).toBe("gable_roof_installation");
    expectSpecificRows(estimate, item.expectedTokens);
    expectNoGenericConstructionRows(estimate);
  });
});
