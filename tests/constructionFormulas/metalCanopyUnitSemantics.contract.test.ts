import { validateNoUnitInheritanceBug } from "../../src/lib/ai/constructionFormulas";
import { recipeFor } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("metal canopy primitive units", () => {
  it("keeps canopy equipment and logistics off area units", () => {
    const { primitive, recipe } = recipeFor("estimate canopy metal canopy 647 sq_m");
    expect(primitive.domain).toBe("canopies");
    expect(validateNoUnitInheritanceBug({ primitive, rows: recipe.rows })).toEqual(expect.objectContaining({ passed: true }));
    expect(recipe.rows.filter((row) => row.sectionType === "equipment").every((row) => row.unit !== "sq_m")).toBe(true);
    expect(recipe.rows.filter((row) => row.sectionType === "delivery").every((row) => row.unit !== "sq_m")).toBe(true);
  });
});
