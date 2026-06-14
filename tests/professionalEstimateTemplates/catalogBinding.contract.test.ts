import {
  PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG,
  bindProfessionalRecipeRowToCatalog,
} from "./professionalEstimateTestHelpers";

describe("professional estimate catalog binding", () => {
  it("builds catalog lookup bindings without fake catalog ids", () => {
    const materialRow = PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG[0].material_recipe_rows[0];
    const binding = bindProfessionalRecipeRowToCatalog(materialRow);
    expect(binding.material_key).toBe(materialRow.material_key);
    expect(binding.search_query).toBe(materialRow.visible_name_ru);
    expect(binding.fake_catalog_item_claimed).toBe(false);
  });
});
