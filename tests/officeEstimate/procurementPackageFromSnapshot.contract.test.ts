import {
  buildCommercialProcurementPackage,
  classifyProductionTrust,
} from "../../src/features/estimates/governance/productionTrust";

describe("commercial procurement package from snapshot", () => {
  it("sends only procurement rows and records excluded work rows", () => {
    const trust = classifyProductionTrust({
      estimate_id: "procurement",
      revision_id: "r1",
      source_prompt: "procurement",
      region: "KG",
      currency: "KGS",
      pricebook_version: null,
      date_of_estimate: "2026-07-04",
      source_quality: "company_verified_norm",
      expert_review_status: "APPROVED_FOR_PRELIMINARY",
      rows: [
        {
          row_id: "mat",
          name: "Material",
          item_type: "material",
          quantity: 10,
          unit: "m2",
          unit_price: null,
          total: null,
          included_in_procurement: true,
        },
        {
          row_id: "work",
          name: "Work",
          item_type: "work",
          quantity: 10,
          unit: "m2",
          unit_price: null,
          total: null,
          included_in_procurement: true,
        },
        {
          row_id: "helper",
          name: "Helper",
          item_type: "helper",
          quantity: 1,
          unit: "set",
          unit_price: null,
          total: null,
          included_in_procurement: true,
        },
      ],
    });
    const pkg = buildCommercialProcurementPackage({
      estimate: trust,
      sourcePrompt: "procurement",
      region: "KG",
      currency: "KGS",
      pricebookVersion: null,
    });

    expect(pkg.package_id).toContain("procurement");
    expect(pkg.materials).toHaveLength(1);
    expect(pkg.materials[0].row_id).toBe("mat");
    expect(pkg.excluded_work_rows.map((row) => row.row_id)).toEqual(["work"]);
    expect(pkg.missing_price_rows.length).toBeGreaterThan(0);
    expect([...pkg.materials, ...pkg.equipment_to_purchase, ...pkg.procurement_services].every((row) => row.item_type !== "work" && row.item_type !== "helper")).toBe(true);
  });
});
