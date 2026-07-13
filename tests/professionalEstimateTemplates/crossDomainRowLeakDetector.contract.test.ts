import { detectCrossDomainRowLeaks } from "../../src/lib/ai/professionalEstimateTemplates";
import type { ProfessionalEstimateRecipeRow } from "../../src/lib/ai/professionalEstimateTemplates";

function row(overrides: Partial<ProfessionalEstimateRecipeRow>): ProfessionalEstimateRecipeRow {
  return {
    row_key: "brick_masonry_mortar",
    row_kind: "material",
    row_domain: "masonry",
    visible_name_ru: "Кладочный раствор",
    material_key: "brick_masonry_mortar",
    catalog_item_id: null,
    unit: "bag",
    quantity_formula: "quantity * 1",
    waste_percent: 0,
    is_required: true,
    price_required: true,
    price_source_policy: "regional_pricebook",
    allowed_work_keys: ["brick_masonry"],
    forbidden_work_keys: [],
    source_policy: "work_specific_template",
    paid_control_row: false,
    forbidden_as_paid_control_row: false,
    ...overrides,
  };
}

describe("professional estimate cross-domain row leak detector", () => {
  it("blocks masonry rows leaking into carpet/flooring estimates", () => {
    const leaks = detectCrossDomainRowLeaks({
      selected_work_key: "carpet_laying",
      expected_domain: "flooring",
      rows: [row({})],
    });

    expect(leaks).toHaveLength(1);
    expect(leaks[0]).toMatchObject({
      status: "BLOCKED_CROSS_DOMAIN_ROW_LEAK",
      selected_work_key: "carpet_laying",
      leaked_domain: "masonry",
      expected_domain: "flooring",
      fake_green_claimed: false,
    });
  });

  it("also catches forbidden masonry terms even if a row is mislabeled as flooring", () => {
    const leaks = detectCrossDomainRowLeaks({
      selected_work_key: "carpet_laying",
      expected_domain: "flooring",
      rows: [
        row({
          row_key: "carpet_fake_brick",
          row_domain: "flooring",
          visible_name_ru: "Кирпич / блок",
          allowed_work_keys: ["carpet_laying"],
        }),
      ],
    });

    expect(leaks).toHaveLength(1);
    expect(leaks[0].reason).toBe("FORBIDDEN_TERM_FOR_DOMAIN");
  });
});
