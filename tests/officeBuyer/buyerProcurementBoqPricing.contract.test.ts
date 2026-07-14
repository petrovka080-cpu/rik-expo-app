import { buildEstimatePriceCatalogBoqProof } from "../../src/lib/ai/estimatePricing/priceCatalogBoq";
import type { MarketSupplierListingCandidate } from "../../src/lib/ai/marketPricebook";

const listing: MarketSupplierListingCandidate = {
  listing_id: "market-listing:block-masonry-units:buyer",
  supplier_id: "supplier:buyer-visible",
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

describe("buyer procurement BOQ pricing contract", () => {
  it("hands buyer only material procurement rows with prices, sources, and supplier candidates", () => {
    const proof = buildEstimatePriceCatalogBoqProof({
      city: "Bishkek",
      supplierListings: [listing],
    });

    expect(proof.buyer_receives_material_boq).toBe(true);
    expect(proof.buyer_work_rows_excluded_from_procurement).toBe(true);
    expect(proof.procurementRows.length).toBeGreaterThan(0);
    expect(proof.procurementRows.every((line) => line.rowKind !== "labor")).toBe(true);
    expect(proof.procurementRows.some((line) => line.sourceLabel && line.unitPrice != null)).toBe(true);
    expect(proof.buyer_supplier_matches_visible).toBe(true);
    expect(proof.market_price_used_as_candidate_not_silent_truth).toBe(true);
  });
});
