import { assertRecipeGreen } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("parametric BOQ family-derived recipes", () => {
  it("allows family-derived recipes only with concrete work-specific row names", () => {
    const result = assertRecipeGreen("estimate facade insulation 180 sq_m");
    expect(["family_derived_recipe", "method_derived_recipe", "material_system_derived_recipe"]).toContain(result.recipe.mode);
    const names = result.recipe.rows.map((row) => row.nameRu.toLocaleLowerCase("ru-RU"));
    expect(names.some((name) => name.includes("facade") || name.includes("insulation"))).toBe(true);
    expect(names.every((name) => !["material", "installation", "work", "works", "other"].includes(name))).toBe(true);
  });
});
