import { validateNoUnitInheritanceBug } from "../../src/lib/ai/constructionFormulas";
import { recipeFor } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("hydropower infrastructure units", () => {
  it("uses infrastructure units instead of area inheritance", () => {
    const { primitive, recipe } = recipeFor("estimate hydropower turbine 100 kw");
    expect(primitive.domain).toBe("hydropower");
    expect(primitive.complexity).toBe("infrastructure");
    expect(validateNoUnitInheritanceBug({ primitive, rows: recipe.rows })).toEqual(expect.objectContaining({ passed: true }));
    expect(recipe.rows.length).toBeGreaterThanOrEqual(45);
    expect(recipe.rows.some((row) => row.unit === "set" || row.unit === "pcs")).toBe(true);
  });
});
