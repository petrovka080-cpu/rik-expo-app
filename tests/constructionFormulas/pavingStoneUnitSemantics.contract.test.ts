import { validateNoUnitInheritanceBug } from "../../src/lib/ai/constructionFormulas";
import { recipeFor } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("paving primitive units", () => {
  it("keeps roadworks equipment and delivery off area-unit inheritance", () => {
    const { primitive, recipe } = recipeFor("estimate paving stone driveway 587 sq_m");
    expect(primitive.domain).toBe("roadworks");
    expect(validateNoUnitInheritanceBug({ primitive, rows: recipe.rows })).toEqual(expect.objectContaining({ passed: true }));
    expect(recipe.rows.filter((row) => row.sectionType === "equipment").every((row) => row.unit !== "sq_m")).toBe(true);
  });
});
