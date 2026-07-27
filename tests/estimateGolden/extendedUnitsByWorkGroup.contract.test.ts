import { extended100CertificationSummary } from "./extended100TestHelpers";

describe("extended professional estimate units by work group", () => {
  it("uses row-specific units instead of m2 everywhere", () => {
    const summary = extended100CertificationSummary();

    expect(summary.unit_invariants_passed).toBe(true);
    expect(summary.case_evaluations.every((item) => item.unit_unique_count >= 3)).toBe(true);
    expect(summary.case_evaluations.flatMap((item) => item.detector_failure_ids)).toEqual([]);
    expect(
      summary.case_evaluations
        .filter((item) => [
          "017_brick_masonry",
          "045_brick_partition_masonry",
          "068_block_masonry",
          "089_aerated_block_masonry",
        ].includes(item.case_id))
        .map((item) => ({ case_id: item.case_id, unit_invariants_passed: item.unit_invariants_passed })),
    ).toEqual([
      { case_id: "017_brick_masonry", unit_invariants_passed: true },
      { case_id: "045_brick_partition_masonry", unit_invariants_passed: true },
      { case_id: "068_block_masonry", unit_invariants_passed: true },
      { case_id: "089_aerated_block_masonry", unit_invariants_passed: true },
    ]);
  });
});
