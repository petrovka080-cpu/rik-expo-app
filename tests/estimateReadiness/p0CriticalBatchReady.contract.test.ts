import {
  GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_READY_NO_BUILDS,
  validateProfessionalCatalogBatch,
} from "../../scripts/estimate/validateProfessionalCatalogBatch";

jest.setTimeout(90000);

describe("P0 critical professional catalog batch", () => {
  it("is ready for all mandatory cases and families", () => {
    const summary = validateProfessionalCatalogBatch();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_READY_NO_BUILDS);
    expect(summary.p0_required_case_count).toBe(14);
    expect(summary.p0_ready_professional_count).toBe(14);
    expect(summary.p0_batch_template_count).toBeGreaterThan(0);
    expect(summary.p0_batch_ready_professional_template_count).toBe(summary.p0_batch_template_count);
    expect(summary.all_required_calculator_modules_present).toBe(true);
    expect(summary.source_registry_ready).toBe(true);
    expect(summary.backfill_batches_ready).toBe(true);
    expect(summary.blockers).toEqual([]);
  });
});
