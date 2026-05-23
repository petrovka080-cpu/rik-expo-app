import { buildLiveEstimate, expectNoGenericConstructionRows, expectSpecificRows, LIVE_ESTIMATE_CASES } from "./liveAiEstimatePdfRealityTestHelpers";

describe("live brick masonry estimate acceptance", () => {
  it("resolves brick masonry to masonry-specific rows", () => {
    const item = LIVE_ESTIMATE_CASES.find((candidate) => candidate.expectedWorkKey === "brick_masonry")!;
    const estimate = buildLiveEstimate(item.prompt, "/chat");

    expect(estimate.work.workKey).toBe("brick_masonry");
    expectSpecificRows(estimate, item.expectedTokens);
    expectNoGenericConstructionRows(estimate);
  });
});
