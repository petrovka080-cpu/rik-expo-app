import { expectRepresentativeWorkPlan } from "./aiEstimatePerformanceBudgetTestHelpers";

describe("construction work plan latency budget", () => {
  it("builds ConstructionWorkPlan within p95 policy", () => {
    expect(expectRepresentativeWorkPlan().workKey).toBeTruthy();
  });
});
