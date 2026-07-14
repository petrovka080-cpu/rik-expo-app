import {
  applyApprovedBenchmarkCorrections,
  buildExpertAdjudicationQueue,
  type GoldenBenchmarkDeviation,
} from "../../scripts/estimate/goldenBenchmarkCore";

describe("golden benchmark expert adjudication workflow", () => {
  it("turns failures into a reviewed versioned correction queue", () => {
    const deviations: GoldenBenchmarkDeviation[] = [{
      case_id: "case",
      row_code: "row",
      type: "WRONG_QUANTITY",
      severity: "major",
      message: "quantity drift",
    }];
    const queue = buildExpertAdjudicationQueue(deviations);

    expect(queue.failures_not_silently_ignored).toBe(true);
    expect(queue.entries).toHaveLength(1);
    expect(queue.entries[0].status).toBe("PENDING_EXPERT_REVIEW");
    expect(queue.entries[0].versioned_change_required).toBe(true);
    expect(queue.entries[0].allowed_decisions).toContain("formula_wrong");

    expect(() => applyApprovedBenchmarkCorrections({
      corrections: [{
        adjudication_id: queue.entries[0].adjudication_id,
        decision: "formula_wrong",
        approved: true,
      }],
    })).toThrow(/approved_corrections_require_versioned_change/);

    expect(applyApprovedBenchmarkCorrections({
      corrections: [{
        adjudication_id: queue.entries[0].adjudication_id,
        decision: "formula_wrong",
        approved: true,
        formula_version_bump: "formula_v2",
      }],
    })).toMatchObject({
      approved_corrections_versioned: true,
      formula_changes_require_version_bump: true,
      recipe_changes_require_version_bump: true,
      benchmark_reference_changes_reviewed: true,
    });
  });
});
