import {
  buildPricebookRoofEstimate,
  directExactResolution,
} from "./pricebookRatebookTestHelpers";

describe("price source audit trail contract", () => {
  it("attaches source audit trail to exact estimate lines and direct lookup results", () => {
    const result = buildPricebookRoofEstimate();
    const direct = directExactResolution();
    const verified = result.material_lines.filter((line) => line.price_status === "VERIFIED");

    expect(direct.price_source_audit?.selected_rate_id).toBeTruthy();
    expect(verified.length).toBeGreaterThan(0);
    for (const line of verified) {
      expect(line.governance_status).toBe("VERIFIED_PRICE_SELECTED");
      expect(line.price_source_audit.selected_rate_id).toBeTruthy();
      expect(line.price_source_audit.source_reference).toBe(line.source_reference);
      expect(line.price_source_audit.supplier_id).toBe(line.supplier_id);
      expect(line.price_source_audit.validation_failures).toEqual([]);
    }
  });
});
