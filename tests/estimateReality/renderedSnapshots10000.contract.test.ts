import {
  GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_VALIDATED_NO_BUILDS,
  validateRenderedEstimateSnapshots10000,
} from "../../scripts/estimate/validateRenderedEstimateSnapshots10000";

jest.setTimeout(180000);

describe("rendered estimate snapshots 10000", () => {
  it("renders and validates every professional BOQ snapshot without generic rows or buyer handoff drift", () => {
    const result = validateRenderedEstimateSnapshots10000({ batchId: "full-10000-verification" });

    expect(result.final_status).toBe(GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_VALIDATED_NO_BUILDS);
    expect(result.batch_id).toBe("full-10000-verification");
    expect(result.rendered_template_count).toBe(10000);
    expect(result.rendered_snapshot_count).toBe(10000);
    expect(result.rendered_row_count).toBe(599000);
    expect(result.rows_with_professional_names).toBe(result.rendered_row_count);
    expect(result.rows_with_norm_sources).toBe(result.rendered_row_count);
    expect(result.rows_with_formula_trace).toBe(result.rendered_row_count);
    expect(result.rendered_rows_have_professional_names).toBe(true);
    expect(result.rendered_rows_have_norm_sources).toBe(true);
    expect(result.rendered_rows_have_formula_trace).toBe(true);
    expect(result.rendered_material_units_correct).toBe(true);
    expect(result.buyer_subset_matches_snapshot).toBe(true);
    expect(result.rendered_snapshots_10000_passed).toBe(true);
    expect(result.fake_green_claimed).toBe(false);
    expect(result.marketplace_touched).toBe(false);
    expect(result.validation_blockers).toEqual([]);
  });
});
