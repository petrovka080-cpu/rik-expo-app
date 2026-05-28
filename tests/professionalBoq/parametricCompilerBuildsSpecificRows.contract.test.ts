import { assertRecipeGreen, professionalBoqFor, recipeFor } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("parametric BOQ compiler specific rows", () => {
  it("builds concrete rows for exact and family-derived primitive work", () => {
    const exact = assertRecipeGreen("estimate roof waterproofing 100 sq_m");
    expect(exact.recipe.mode).toBe("exact_governed_recipe");

    const family = assertRecipeGreen("estimate painting wall 100 sq_m");
    expect(family.recipe.mode).toBe("family_derived_recipe");
    expect(family.recipe.rows.length).toBeGreaterThanOrEqual(12);
    expect(family.recipe.rows.map((row) => row.nameRu).join("\n")).toContain("painting");

    const boq = professionalBoqFor("estimate painting wall 100 sq_m");
    expect(boq.compilerId).toBe("ParametricBoqRecipeCompiler");
    expect(boq.recipeMode).toBe("family_derived_recipe");
  });
});
