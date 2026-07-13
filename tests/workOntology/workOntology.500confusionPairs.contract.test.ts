import { CONSTRUCTION_WORK_ONTOLOGY, resolveWithKeyHint, WORK_ONTOLOGY_500_CONFUSION_PAIRS } from "./workOntologyTestHelpers";

describe("work ontology 500 confusion pairs", () => {
  it("resolves every controlled pair to the expected side and never the forbidden side", () => {
    expect(WORK_ONTOLOGY_500_CONFUSION_PAIRS).toHaveLength(500);
    const byKey = new Map(CONSTRUCTION_WORK_ONTOLOGY.map((entry) => [entry.canonical_work_key, entry]));
    for (const testCase of WORK_ONTOLOGY_500_CONFUSION_PAIRS) {
      const result = resolveWithKeyHint(testCase.user_input_ru, testCase.expected_canonical_work_key);
      const expectedEntry = byKey.get(testCase.expected_canonical_work_key);
      expect(result.ambiguity_status).toBe("RESOLVED");
      expect(result.selected_work_key).toBe(testCase.expected_canonical_work_key);
      expect(result.selected_work_key).not.toBe(testCase.must_not_match);
      expect(result.category).toBe(expectedEntry?.category);
      expect(result.unit).toBe(testCase.unit);
    }
  });
});
