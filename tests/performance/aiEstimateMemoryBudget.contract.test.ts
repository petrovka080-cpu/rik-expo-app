import { expectMemoryBudgetBoundary } from "./aiEstimatePerformanceBudgetTestHelpers";

describe("AI estimate memory budget", () => {
  it("keeps memory budget explicit and finite", () => {
    expectMemoryBudgetBoundary();
  });
});
