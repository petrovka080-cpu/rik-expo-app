import {
  PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG,
  forbiddenGenericMaterialLabels,
} from "./professionalEstimateTestHelpers";

describe("professional estimate no group-only generic templates", () => {
  it("does not mark group-only generic rows as supported work templates", () => {
    const forbidden = new Set(forbiddenGenericMaterialLabels().map((item) => item.toLocaleLowerCase("en-US")));
    const groupOnly = PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG.filter((template) =>
      template.material_recipe_rows.every((row) => forbidden.has(row.visible_name_ru.toLocaleLowerCase("en-US")))
    );
    expect(groupOnly).toHaveLength(0);
  });
});
