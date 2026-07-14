import {
  buildCommercialPdfTrustModel,
  classifyProductionTrust,
} from "../../src/features/estimates/governance/productionTrust";

describe("commercial PDF trust sections", () => {
  it("exposes commercial status, trust, source quality and expert review sections", () => {
    const trust = classifyProductionTrust({
      estimate_id: "commercial-pdf",
      revision_id: "r1",
      source_prompt: "commercial pdf",
      region: "KG",
      currency: "KGS",
      pricebook_version: null,
      date_of_estimate: "2026-07-04",
      source_quality: "company_verified_norm",
      expert_review_status: "APPROVED_FOR_PRELIMINARY",
      rows: [{
        row_id: "material",
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

    expect(pdf.sections).toEqual(expect.arrayContaining([
      "Estimate status / trust level",
      "Pricing summary",
      "Missing price list",
      "Norm/source appendix",
      "Expert review appendix",
      "Procurement appendix",
    ]));
    expect(pdf.trust_level).toBe("QUANTITY_ONLY_PRICE_MISSING");
    expect(pdf.estimate_level).toBe("QUANTITY_ONLY");
    expect(pdf.source_quality_visible).toBe(true);
    expect(pdf.expert_review_status_visible).toBe(true);
    expect(pdf.rows_equal_snapshot).toBe(true);
    expect(pdf.no_mojibake).toBe(true);
  });
});
