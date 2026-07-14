import { resolveSupplierMarketListingCandidate } from "../../src/lib/ai/marketPricebook";

describe("estimate market listing price candidate contract", () => {
  it("uses market listings as selectable candidates, not silent final truth", () => {
    const match = resolveSupplierMarketListingCandidate({
      material_key: "block_masonry_masonry_units",
      unit: "piece",
      region: "KG_BISHKEK",
      city: "Bishkek",
      listings: [
        {
          listing_id: "listing:1",
          supplier_id: "supplier:1",
          supplier_name: "Verified Market Supplier",
          material_key: "block_masonry_masonry_units",
          unit: "piece",
          unit_price: 302,
          region: "KG_BISHKEK",
          city: "Bishkek",
          currency: "KGS",
          source_updated_at: "2026-07-01",
          fake_supplier_claimed: false,
          fake_price_claimed: false,
        },
      ],
    });

    expect(match.status).toBe("matched");
    expect(match.source).toBe("market_listing_candidate");
    expect(match.auto_awarded).toBe(false);
    expect(match.fake_supplier_claimed).toBe(false);
    expect(match.fake_price_claimed).toBe(false);
  });
});
