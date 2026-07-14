import {
  buildEstimatePriceCatalogBoqProof,
  type EstimateManualPriceOverride,
} from "../../src/lib/ai/estimatePricing/priceCatalogBoq";
import type { MarketSupplierListingCandidate } from "../../src/lib/ai/marketPricebook";

const masonryListing: MarketSupplierListingCandidate = {
  listing_id: "market-listing:block-masonry-units:1",
  supplier_id: "supplier:verified-market-user-1",
  supplier_name: "Verified Market Supplier",
  material_key: "block_masonry_masonry_units",
  unit: "piece",
  unit_price: 302,
  region: "KG_BISHKEK",
  city: "Bishkek",
  currency: "KGS",
  source_updated_at: "2026-07-01",
  available_qty: 25000,
  fake_supplier_claimed: false,
  fake_price_claimed: false,
};

describe("estimate supplier matching contract", () => {
  it("matches real input market listings to procurement material rows without auto-award", () => {
    const proof = buildEstimatePriceCatalogBoqProof({
      city: "Bishkek",
      supplierListings: [masonryListing],
    });
    const matched = proof.procurementRows.filter((line) => line.supplierMatchStatus === "matched");

    expect(proof.supplier_matching_works).toBe(true);
    expect(proof.market_listing_can_match_estimate_material).toBe(true);
    expect(proof.buyer_supplier_matches_visible).toBe(true);
    expect(proof.market_price_used_as_candidate_not_silent_truth).toBe(true);
    expect(matched).toHaveLength(1);
    expect(matched[0]?.autoAwarded).toBe(false);
    expect(matched[0]?.supplierName).toBe(masonryListing.supplier_name);
  });

  it("keeps manual price override separate from supplier matching", () => {
    const override: EstimateManualPriceOverride = {
      rowKey: "block_masonry_masonry_units",
      unitPrice: 310,
      currency: "KGS",
      overriddenByUserId: "user:buyer-1",
      overriddenByRole: "buyer",
      overrideReason: "quote not yet formalized",
      overrideCreatedAt: "2026-07-01T11:00:00.000Z",
      oldPriceSourceId: "KG_BISHKEK_2026_06_MARKET_GOVERNED:block_masonry_masonry_units:piece",
    };
    const proof = buildEstimatePriceCatalogBoqProof({
      city: "Bishkek",
      supplierListings: [masonryListing],
      manualOverrides: [override],
    });
    const line = proof.procurementRows.find((item) => item.rowKey === override.rowKey);

    expect(line?.priceStatus).toBe("manual_override");
    expect(line?.supplierMatchStatus).toBe("matched");
    expect(line?.fakeSupplierClaimed).toBe(false);
  });
});
