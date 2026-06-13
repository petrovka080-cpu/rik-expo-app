import { WORK_ONTOLOGY_1000_RECIPE_BINDING_CASES } from "./workOntologyTestHelpers";

describe("work ontology 1000 recipe bindings", () => {
  it("binds every recipe case to explicit work, material, and pricebook scopes", () => {
    expect(WORK_ONTOLOGY_1000_RECIPE_BINDING_CASES).toHaveLength(1000);
    for (const testCase of WORK_ONTOLOGY_1000_RECIPE_BINDING_CASES) {
      expect(testCase.canonical_work_key).toBeTruthy();
      expect(testCase.recipe_scope).toBe(testCase.canonical_work_key);
      expect(testCase.material_recipe_scope).toBe(`${testCase.canonical_work_key}_material_recipe`);
      expect(testCase.pricebook_scope).toMatch(/^[A-Z]{2}_[A-Z0-9_]+_[A-Z_]+_MATERIALS$/);
    }
  });
});
