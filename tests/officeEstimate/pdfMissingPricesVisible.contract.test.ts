import {
  buildCommercialPdfTrustModel,
  classifyProductionTrust,
} from "../../src/features/estimates/governance/productionTrust";

describe("PDF missing prices visible", () => {
  it("keeps full total non-final when a price is missing", () => {
    const trust = classifyProductionTrust({
      estimate_id: "missing-price-pdf",
      revision_id: "r1",
      source_prompt: "missing price pdf",
      region: "KG",
      currency: "KGS",
      pricebook_version: null,
      date_of_estimate: "2026-07-04",
      source_quality: "company_verified_norm",
      expert_review_status: "APPROVED_FOR_PRELIMINARY",
      rows: [{
        row_id: "row",
        name: "Material",
        item_type: "material",
        quantity: 1,
        unit: "pcs",
        unit_price: null,
        total: null,
        included_in_procurement: true,
      }],
    });
    const pdf = buildCommercialPdfTrustModel(trust);

    expect(trust.full_total).toBeNull();
    expect(trust.full_total_status).toBe("NOT_FINAL");
    expect(pdf.missing_prices_visible).toBe(true);
    expect(pdf.full_total_not_final_if_prices_missing).toBe(true);
    expect(pdf.raw_json_visible).toBe(false);
  });
});
