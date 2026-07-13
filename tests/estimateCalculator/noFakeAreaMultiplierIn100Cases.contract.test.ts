import { extended100CertificationSummary } from "../estimateGolden/extended100TestHelpers";

describe("no fake area multiplier in 100 extended cases", () => {
  it("keeps real formula quantities across all representative work types", () => {
    const summary = extended100CertificationSummary();

    expect(summary.no_fake_area_multiplier).toBe(true);
    expect(summary.case_evaluations.every((item) => item.no_fake_area_multiplier)).toBe(true);
    expect(summary.case_evaluations.flatMap((item) => item.detector_failure_ids)).toEqual([]);
  });
});
