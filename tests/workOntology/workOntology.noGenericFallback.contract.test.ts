import { REAL_WORK_ONTOLOGY_10000_CASES, resolveConstructionWorkOntologyIntent, workKeyLooksGeneric } from "./workOntologyTestHelpers";

describe("work ontology no generic fallback", () => {
  it("never returns generic construction work for known work samples", () => {
    const samples = REAL_WORK_ONTOLOGY_10000_CASES.filter((_, index) => index % 100 === 0);
    for (const testCase of samples) {
      const result = resolveConstructionWorkOntologyIntent(testCase.user_input_ru);
      expect(result.ambiguity_status).toBe("RESOLVED");
      expect(workKeyLooksGeneric(result.selected_work_key)).toBe(false);
      expect(workKeyLooksGeneric(result.recipe_scope)).toBe(false);
      expect(workKeyLooksGeneric(result.pricebook_scope)).toBe(false);
    }
  });
});
