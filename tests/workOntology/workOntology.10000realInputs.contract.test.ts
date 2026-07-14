import { REAL_WORK_ONTOLOGY_10000_CASES, resolveConstructionWorkOntologyIntent } from "./workOntologyTestHelpers";

describe("work ontology 10000 real inputs", () => {
  jest.setTimeout(180_000);

  it("meets the exact-match acceptance threshold with no high-confidence wrong match", () => {
    let exact = 0;
    let highConfidenceWrong = 0;
    let unresolved = 0;
    for (const testCase of REAL_WORK_ONTOLOGY_10000_CASES) {
      const result = resolveConstructionWorkOntologyIntent(testCase.user_input_ru);
      if (result.ambiguity_status !== "RESOLVED") {
        unresolved += 1;
        continue;
      }
      if (result.selected_work_key === testCase.expected_canonical_work_key) {
        exact += 1;
      } else if (result.confidence >= 0.85) {
        highConfidenceWrong += 1;
      }
    }
    expect(REAL_WORK_ONTOLOGY_10000_CASES).toHaveLength(10000);
    expect(exact).toBeGreaterThanOrEqual(9850);
    expect(unresolved).toBe(0);
    expect(highConfidenceWrong).toBe(0);
  });
});
