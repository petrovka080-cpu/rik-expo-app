import {
  evaluateMissingPrice,
  evaluatePricebookLookup,
} from "../../scripts/e2e/userInputExactMaterialPriceEstimate.shared";

describe("enterprise exact estimate pricebook and ratebook governance", () => {
  it("uses verified sources and keeps unknown prices honest", () => {
    const pricebook = evaluatePricebookLookup();
    const missingPrice = evaluateMissingPrice();

    expect(pricebook.final_status).toBe("GREEN_EXACT_MATERIAL_PRICEBOOK_LOOKUP_READY");
    expect(pricebook.failures).toEqual([]);
    expect(pricebook.verified_lookup_rows).toBeGreaterThan(0);
    expect(pricebook.unknown_material_status).toBe("PRICE_MISSING");
    expect(pricebook.unknown_material_price_value).toBeNull();
    expect(pricebook.no_fake_prices).toBe(true);
    expect(pricebook.no_fake_suppliers).toBe(true);
    expect(missingPrice.final_status).toBe("GREEN_EXACT_MATERIAL_PRICE_MISSING_PRICE_READY");
    expect(missingPrice.failures).toEqual([]);
  });
});
