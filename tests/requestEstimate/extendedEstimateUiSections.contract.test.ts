import { extended100CertificationSummary } from "../estimateGolden/extended100TestHelpers";

describe("request estimate extended UI sections", () => {
  it("keeps full extended sections visible for lifecycle smeta cases", () => {
    const summary = extended100CertificationSummary();

    expect(summary.golden_20_full_smeta_cases_passed).toBe(true);
    expect(summary.lifecycle_evaluations).toHaveLength(20);
    expect(summary.lifecycle_evaluations.every((item) => item.request_ui_sections_visible)).toBe(true);
    expect(summary.lifecycle_evaluations.flatMap((item) => item.failures)).toEqual([]);
  });
});
