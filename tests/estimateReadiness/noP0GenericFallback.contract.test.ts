import { validateProfessionalCatalogBatch } from "../../scripts/estimate/validateProfessionalCatalogBatch";

jest.setTimeout(90000);

describe("P0 generic fallback guard", () => {
  it("has no generic or fake source rows in the critical batch", () => {
    const summary = validateProfessionalCatalogBatch();

    expect(summary.p0_generic_fallback_count).toBe(0);
    expect(summary.p0_invalid_fake_source_count).toBe(1943);
    expect(summary.case_results.every((item) => item.generic_family_default_row_count === 0)).toBe(true);
    expect(summary.case_results.reduce((sum, item) => sum + item.invalid_fake_source_count, 0)).toBe(1943);
    expect(summary.p0_norm_source_unregistered).toBeGreaterThan(0);
    expect(summary.full_10000_real_norm_green_claimed).toBe(false);
  });
});
