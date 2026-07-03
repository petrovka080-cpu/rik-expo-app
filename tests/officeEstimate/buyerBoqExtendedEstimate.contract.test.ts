import { extended100CertificationSummary } from "../estimateGolden/extended100TestHelpers";

describe("buyer BOQ extended estimate projection", () => {
  it("projects only material procurement rows with matching quantities and trace", () => {
    const summary = extended100CertificationSummary();

    expect(summary.buyer_boq_extended_projection_passed).toBe(true);
    expect(summary.buyer_receives_material_rows_only).toBe(true);
    expect(summary.buyer_material_quantities_match_estimate).toBe(true);
    expect(summary.buyer_items_not_truncated).toBe(true);
    expect(summary.lifecycle_evaluations.every((item) => item.buyer_boq_extended_projection_passed)).toBe(true);
  });
});
