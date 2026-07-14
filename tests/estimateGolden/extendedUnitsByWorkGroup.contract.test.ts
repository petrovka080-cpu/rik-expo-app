import { extended100CertificationSummary } from "./extended100TestHelpers";

describe("extended professional estimate units by work group", () => {
  it("uses row-specific units instead of m2 everywhere", () => {
    const summary = extended100CertificationSummary();

    expect(summary.unit_invariants_passed).toBe(true);
    expect(summary.case_evaluations.every((item) => item.unit_unique_count >= 3)).toBe(true);
    expect(summary.case_evaluations.flatMap((item) => item.detector_failure_ids)).toEqual([]);
  });
});
