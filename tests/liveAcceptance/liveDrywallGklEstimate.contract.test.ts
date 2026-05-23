import { buildLiveEstimate, expectNoGenericConstructionRows, expectSpecificRows, LIVE_ESTIMATE_CASES } from "./liveAiEstimatePdfRealityTestHelpers";

describe("live drywall GKL estimate acceptance", () => {
  it("resolves GKL to drywall-specific materials and labor", () => {
    const item = LIVE_ESTIMATE_CASES.find((candidate) => candidate.expectedWorkKey === "drywall_partition")!;
    const estimate = buildLiveEstimate(item.prompt, "/chat");

    expect(estimate.work.workKey).toBe("drywall_partition");
    expectSpecificRows(estimate, item.expectedTokens);
    expectNoGenericConstructionRows(estimate);
  });
});
