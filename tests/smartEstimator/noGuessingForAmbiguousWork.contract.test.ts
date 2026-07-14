import { ambiguousEstimate, clarificationSummary } from "./smartEstimatorTestHelpers";

describe("smart estimator no guessing", () => {
  it("does not auto-select ambiguous work", () => {
    const result = ambiguousEstimate();
    expect(result.work_resolution.selected_work_key).toBeNull();
    expect(result.snapshot).toBeNull();
    expect(clarificationSummary().no_guessing_for_ambiguous_work).toBe(true);
  });
});
