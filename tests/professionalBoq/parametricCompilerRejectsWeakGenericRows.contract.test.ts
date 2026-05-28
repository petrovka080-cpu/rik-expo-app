import { assertRecipeGreen, OPEN_WORLD_PRIMITIVE_STRESS_PACK } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("parametric BOQ compiler weak row rejection", () => {
  it("rejects standalone generic material/work/misc rows for sampled open-world primitives", () => {
    for (const item of OPEN_WORLD_PRIMITIVE_STRESS_PACK.slice(0, 40)) {
      const result = assertRecipeGreen(item.prompt);
      expect(result.recipe.rows.map((row) => row.nameRu.toLocaleLowerCase("ru-RU"))).not.toEqual(
        expect.arrayContaining(["material", "work", "works", "misc", "other", "construction works"]),
      );
    }
  });
});
