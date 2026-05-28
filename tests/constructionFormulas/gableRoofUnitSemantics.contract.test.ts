import { validateNoUnitInheritanceBug } from "../../src/lib/ai/constructionFormulas";
import { recipeFor } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("gable roof primitive units", () => {
  it("does not turn ridge height into a global linear-meter unit inheritance bug", () => {
    const { primitive, recipe } = recipeFor("estimate gable roof 67 sq_m ridge 2.5 m");
    expect(primitive.workKey).toBe("gable_roof_installation");
    expect(validateNoUnitInheritanceBug({ primitive, rows: recipe.rows })).toEqual(expect.objectContaining({ passed: true }));
    expect(new Set(recipe.rows.map((row) => row.unit)).size).toBeGreaterThan(1);
  });
});
