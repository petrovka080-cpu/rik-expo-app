import {
  validateFormulaOutputUnits,
  validateNoUnitInheritanceBug,
} from "../../src/lib/ai/constructionFormulas";
import { recipeFor } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("construction unit inheritance guard", () => {
  it("does not copy the user unit onto every BOQ row", () => {
    for (const prompt of [
      "estimate painting wall 100 sq_m",
      "estimate ventilation cafe 120 sq_m",
      "estimate road asphalt 500 sq_m",
    ]) {
      const { primitive, recipe } = recipeFor(prompt);
      expect(validateNoUnitInheritanceBug({ primitive, rows: recipe.rows })).toEqual(expect.objectContaining({ passed: true }));
      expect(validateFormulaOutputUnits({ primitive, rows: recipe.rows })).toEqual(expect.objectContaining({ passed: true }));
    }
  });
});
