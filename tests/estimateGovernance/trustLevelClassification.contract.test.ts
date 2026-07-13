import { classifyProductionTrust } from "../../src/features/estimates/governance/productionTrust";

const baseRow = {
  row_id: "row",
  name: "Material",
  item_type: "material" as const,
  quantity: 1,
  unit: "pcs",
  unit_price: null,
  total: null,
  included_in_procurement: true,
};

describe("production trust classification", () => {
  it("downgrades missing price and design inputs without faking final totals", () => {
    const input = {
      estimate_id: "missing-price",
      revision_id: "r1",
      source_prompt: "missing price",
      region: "KG",
      currency: "KGS",
      pricebook_version: null,
      date_of_estimate: "2026-07-04",
      source_quality: "company_verified_norm",
      expert_review_status: "APPROVED_FOR_PRELIMINARY",
      rows: [baseRow],
    } as const;
    const missingPrice = classifyProductionTrust(input);
    const missingDesign = classifyProductionTrust({
      ...input,
      estimate_id: "missing-design",
      missing_design_inputs: ["drawings"],
    });

    expect(missingPrice.trust_level).toBe("QUANTITY_ONLY_PRICE_MISSING");
    expect(missingPrice.estimate_level).toBe("QUANTITY_ONLY");
    expect(missingPrice.full_total_status).toBe("NOT_FINAL");
    expect(missingPrice.full_total).toBeNull();
    expect(missingDesign.trust_level).toBe("NEEDS_DESIGN_INPUTS");
    expect(missingDesign.missing_design_inputs_count).toBe(1);
    expect(missingPrice.rows.every((row) => row.trust_reason)).toBe(true);
  });

  it("blocks fake source and generic fallback", () => {
    const input = {
      estimate_id: "fake-source",
      revision_id: "r1",
      source_prompt: "fake source",
      region: "KG",
      currency: "KGS",
      pricebook_version: null,
      date_of_estimate: "2026-07-04",
      source_quality: "generated_family_default",
      expert_review_status: "APPROVED_FOR_PRELIMINARY",
      rows: [baseRow],
    } as const;
    const fake = classifyProductionTrust(input);
    const generic = classifyProductionTrust({
      ...input,
      estimate_id: "generic",
      source_quality: "company_verified_norm",
      has_generic_fallback: true,
    });

    expect(fake.trust_level).toBe("BLOCKED_FAKE_SOURCE");
    expect(generic.trust_level).toBe("BLOCKED_GENERIC_FALLBACK");
  });
});
