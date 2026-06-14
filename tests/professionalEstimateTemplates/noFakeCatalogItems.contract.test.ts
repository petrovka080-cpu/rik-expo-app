import {
  PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG,
  bindProfessionalRecipeRowToCatalog,
} from "./professionalEstimateTestHelpers";

describe("professional estimate no fake catalog items", () => {
  it("never fabricates catalog item ids", () => {
    const bindings = PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG
      .slice(0, 100)
      .flatMap((template) => template.material_recipe_rows.map(bindProfessionalRecipeRowToCatalog));
    expect(bindings.filter((binding) => binding.fake_catalog_item_claimed)).toHaveLength(0);
    expect(bindings.filter((binding) => binding.catalog_item_id?.startsWith("fake_"))).toHaveLength(0);
  });
});
