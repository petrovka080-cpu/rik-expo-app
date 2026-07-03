import { validateProfessionalCatalogBatch } from "../../scripts/estimate/validateProfessionalCatalogBatch";

jest.setTimeout(90000);

describe("P0 synthetic family default guard", () => {
  it("does not use synthetic family default rows as a professional substitute", () => {
    const summary = validateProfessionalCatalogBatch();

    expect(summary.p0_synthetic_family_default_count).toBe(0);
    expect(summary.case_results.every((item) =>
      item.source_backed_row_count === item.row_count &&
      item.all_rows_have_norm_source
    )).toBe(true);
    expect(summary.full_10000_real_norm_green_claimed).toBe(false);
    expect(summary.marketplace_touched).toBe(false);
  });
});
