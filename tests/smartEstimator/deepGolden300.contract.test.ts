import { deepGoldenSummary } from "./smartEstimatorTestHelpers";

describe("smart estimator deep golden 300", () => {
  it("passes deep golden work/material isolation", () => {
    const summary = deepGoldenSummary();
    expect(summary.deep_golden_cases).toBe(300);
    expect(summary.wrong_work_matches).toBe(0);
    expect(summary.forbidden_material_failures).toBe(0);
  });
});
