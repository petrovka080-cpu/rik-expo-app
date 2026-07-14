import { buildRoofExactEstimate } from "./exactEstimateTestHelpers";

describe("missing price handled honestly", () => {
  it("uses PRICE_MISSING with null price and null total", () => {
    const result = buildRoofExactEstimate();
    const missing = result.material_lines.filter((line) => line.price_status === "PRICE_MISSING");

    expect(missing.length).toBeGreaterThan(0);
    for (const line of missing) {
      expect(line.price_value).toBeNull();
      expect(line.line_total).toBeNull();
      expect(line.visible_unit_price).toBe("PRICE_MISSING");
      expect(line.visible_line_total).toBe("PRICE_MISSING");
    }
    expect(result.totals.total_status).toBe("PARTIAL_PRICE_MISSING");
    expect(result.totals.grand_known_total).toBeNull();
  });
});
