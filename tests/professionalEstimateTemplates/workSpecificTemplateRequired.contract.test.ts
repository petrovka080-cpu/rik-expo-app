import { PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG } from "./professionalEstimateTestHelpers";

describe("professional estimate work-specific templates", () => {
  it("has supported individual work templates with recipes and pricebook scopes", () => {
    expect(PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG.length).toBeGreaterThanOrEqual(900);
    for (const template of PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG) {
      expect(template.supported).toBe(true);
      expect(template.template_status).toBe("SUPPORTED");
      expect(template.material_recipe_rows.length).toBeGreaterThan(0);
      expect(template.required_material_keys.length).toBeGreaterThan(0);
      expect(template.catalog_binding_required).toBe(true);
      expect(template.pricebook_scope_required).toBe(true);
      expect(template.region_pricebook_scopes.KG_BISHKEK).toBeTruthy();
    }
  });
});
