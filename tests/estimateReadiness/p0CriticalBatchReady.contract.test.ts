import {
  STOP_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_FAILED,
  validateProfessionalCatalogBatch,
} from "../../scripts/estimate/validateProfessionalCatalogBatch";

jest.setTimeout(90000);

describe("P0 critical professional catalog batch", () => {
  it("keeps mandatory cases blocked until norm, formula semantics and price coverage are verified", () => {
    const summary = validateProfessionalCatalogBatch();

    expect(summary.final_status).toBe(STOP_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_FAILED);
    expect(summary.p0_required_case_count).toBe(14);
    expect(summary.p0_ready_professional_count).toBe(0);
    expect(summary.p0_batch_template_count).toBeGreaterThan(0);
    expect(summary.p0_batch_ready_professional_template_count).toBe(0);
    expect(summary.all_required_calculator_modules_present).toBe(true);
    expect(summary.source_registry_ready).toBe(false);
    expect(summary.backfill_batches_ready).toBe(false);
    expect(summary.p0_missing_formula_trace_count).toBe(0);
    expect(summary.p0_norm_source_unregistered).toBeGreaterThan(0);
    expect(summary.p0_professional_ready_row_count).toBe(0);
    expect(summary.blockers).toEqual(expect.arrayContaining([
      expect.stringContaining("p0_norm_source_unregistered"),
      "catalog_backfill_batches_not_green",
    ]));
  });
});
