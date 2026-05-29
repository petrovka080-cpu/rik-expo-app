import { expectRepresentativeLocalRateSource } from "./aiEstimatePerformanceBudgetTestHelpers";

describe("local rate source latency budget", () => {
  it("resolves local source policy within budget", () => {
    expect(expectRepresentativeLocalRateSource().confidence).toBeTruthy();
  });
});
