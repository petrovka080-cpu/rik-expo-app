import { productionCasesCount, productionSummary } from "./smartEstimatorTestHelpers";

describe("smart estimator 1500", () => {
  it("processes all production cases", () => {
    const summary = productionSummary();
    expect(productionCasesCount()).toBe(1500);
    expect(summary.cases_total).toBe(1500);
    expect(summary.cases_processed).toBe(1500);
    expect(summary.estimate_ready_or_honest_partial_or_clarification).toBe(1500);
    expect(summary.failures).toBe(0);
  });
});
