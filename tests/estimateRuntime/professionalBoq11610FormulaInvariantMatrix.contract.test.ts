import { runProfessionalBoq11610FormulaInvariantMatrix } from "../../scripts/estimate/runProfessionalBoq11610FormulaInvariantMatrix";
import { GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY } from "../../scripts/estimate/professionalBoq11610RegressionSealCore";

jest.setTimeout(420000);

describe("professional BOQ 11610 formula invariant matrix", () => {
  it("creates a new revision, stale PDF/buyer state, updated trace, and valid rows after parameter edits", () => {
    const summary = runProfessionalBoq11610FormulaInvariantMatrix();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY);
    expect(summary.formula_invariant_matrix_created).toBe(true);
    expect(summary.parameter_override_cases_passed).toBe("11610/11610");
    expect(summary.new_revision_created_after_parameter_edit).toBe(true);
    expect(summary.snapshot_hash_changes_after_parameter_edit).toBe(true);
    expect(summary.affected_rows_change_after_parameter_edit).toBe(true);
    expect(summary.unaffected_rows_remain_stable).toBe(true);
    expect(summary.pdf_marked_stale_after_parameter_edit).toBe(true);
    expect(summary.buyer_package_marked_stale_after_parameter_edit).toBe(true);
    expect(summary.formula_trace_updates_after_parameter_edit).toBe(true);
    expect(summary.post_edit_invalid_quantity_rows_count).toBe(0);
    expect(summary.unreasoned_non_editable_cases_count).toBe(0);
  });
});
