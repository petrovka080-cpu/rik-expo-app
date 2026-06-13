import { REAL_WORK_ONTOLOGY_10000_CASES, resolveConstructionWorkOntologyIntent, visiblePayload, INTERNAL_VISIBLE_PATTERN } from "./workOntologyTestHelpers";

describe("work ontology UI/PDF visible payload hygiene", () => {
  it("does not expose internal keys, mojibake, or debug placeholders in visible labels", () => {
    for (const testCase of REAL_WORK_ONTOLOGY_10000_CASES.filter((_, index) => index % 80 === 0)) {
      const result = resolveConstructionWorkOntologyIntent(testCase.user_input_ru);
      const visible = visiblePayload(result);
      expect(INTERNAL_VISIBLE_PATTERN.test(visible)).toBe(false);
      expect(visible).not.toMatch(/\uFFFD|fake|mock|demo/i);
    }
  });
});
