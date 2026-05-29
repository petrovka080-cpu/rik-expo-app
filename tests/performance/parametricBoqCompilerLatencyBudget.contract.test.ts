import { expectRepresentativeParametricRecipe } from "./aiEstimatePerformanceBudgetTestHelpers";

describe("parametric BOQ compiler latency budget", () => {
  it("compiles work-specific parametric recipe within p95 policy", () => {
    expect(expectRepresentativeParametricRecipe().rows.length).toBeGreaterThan(0);
  });
});
