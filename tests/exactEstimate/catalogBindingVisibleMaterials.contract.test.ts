import { buildRoofExactEstimate, expectVisibleClean } from "./exactEstimateTestHelpers";

describe("catalog binding visible materials", () => {
  it("binds each exact material line to a clean visible catalog search label", () => {
    const result = buildRoofExactEstimate();

    expect(result.catalog_binding.length).toBe(result.material_lines.length);
    for (const row of result.catalog_binding) {
      expect(row.visible_material_name).toBeTruthy();
      expect(row.search_query).toBe(row.visible_material_name);
      expect(row.price_status === "VERIFIED" || row.price_status === "PRICE_MISSING").toBe(true);
    }
    expectVisibleClean(result);
  });
});
