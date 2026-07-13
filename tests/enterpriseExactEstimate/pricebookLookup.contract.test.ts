import { evaluatePricebookLookup } from "../../scripts/e2e/userInputExactMaterialPriceEstimate.shared";

describe("enterprise exact estimate pricebook lookup", () => {
  it("uses governed verified pricebook rows and keeps unknown rows missing", () => {
    const result = evaluatePricebookLookup();

    expect(result.final_status).toBe("GREEN_EXACT_MATERIAL_PRICEBOOK_LOOKUP_READY");
    expect(result.verified_lookup_rows).toBeGreaterThan(0);
    expect(result.unknown_material_status).toBe("PRICE_MISSING");
    expect(result.unknown_material_price_value).toBeNull();
    expect(result.no_fake_prices).toBe(true);
    expect(result.no_fake_suppliers).toBe(true);
    expect(result.failures).toEqual([]);
  });
});
