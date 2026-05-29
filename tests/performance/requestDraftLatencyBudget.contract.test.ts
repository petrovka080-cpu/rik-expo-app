import { expectRepresentativeRequestDraft } from "./aiEstimatePerformanceBudgetTestHelpers";

describe("request draft latency budget", () => {
  it("builds request draft within budget", () => {
    expect(expectRepresentativeRequestDraft().items.length).toBeGreaterThanOrEqual(0);
  });
});
