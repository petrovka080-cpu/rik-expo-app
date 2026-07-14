import { validateProfessionalCatalogBatch } from "../../scripts/estimate/validateProfessionalCatalogBatch";

jest.setTimeout(90000);

describe("P0 buyer handoff snapshot subset", () => {
  it("exposes procurement material rows without leaking labor-only rows as buyer materials", () => {
    const summary = validateProfessionalCatalogBatch();

    expect(summary.case_results.every((item) => item.buyer_material_handoff_row_count > 0)).toBe(true);
    expect(summary.case_results.every((item) => item.buyer_material_handoff_row_count <= item.material_row_count)).toBe(true);
    expect(summary.case_results.every((item) => item.labor_row_count > 0)).toBe(true);
  });
});
