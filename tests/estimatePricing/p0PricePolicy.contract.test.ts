import { validateProfessionalCatalogBatch } from "../../scripts/estimate/validateProfessionalCatalogBatch";

jest.setTimeout(90000);

describe("P0 price policy", () => {
  it("keeps P0 rows in explicit missing-price state until a verified ratebook is bound", () => {
    const summary = validateProfessionalCatalogBatch();

    expect(summary.case_results.every((item) => item.all_rows_missing_price_handled_honestly)).toBe(true);
    expect(summary.case_results.every((item) => item.blocking_reasons.includes("p0_missing_price_policy_not_explicit"))).toBe(false);
  });
});
