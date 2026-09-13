import { validateProfessionalCatalogBatch } from "../../scripts/estimate/validateProfessionalCatalogBatch";

jest.setTimeout(90000);

describe("P0 generic fallback guard", () => {
  it("does not admit generated, fake, or missing sources in the critical batch", () => {
    const summary = validateProfessionalCatalogBatch();
    const currentP0RowDenominator = summary.case_results.reduce(
      (sum, item) => sum + item.row_count,
      0,
    );

    expect(summary.p0_generic_fallback_count).toBe(0);
    expect(currentP0RowDenominator).toBeGreaterThan(0);
    expect(summary.p0_invalid_fake_source_count).toBeGreaterThan(0);
    expect(summary.case_results.every((item) => item.generic_family_default_row_count === 0)).toBe(true);
    expect(summary.case_results.reduce((sum, item) => sum + item.invalid_fake_source_count, 0))
      .toBe(summary.p0_invalid_fake_source_count);
    expect(summary.p0_norm_source_unregistered).toBe(currentP0RowDenominator);
    expect(summary.p0_norm_source_verified).toBe(0);
    expect(summary.full_10000_real_norm_green_claimed).toBe(false);
  });
});
