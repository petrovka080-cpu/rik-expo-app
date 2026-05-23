import {
  BUILT_IN_AI_1000_CONSTRUCTION_CASES,
  BUILT_IN_AI_1000_ESTIMATE_CASES,
  BUILT_IN_AI_1000_PRODUCT_CASES,
} from "../../src/lib/ai/builtInAi1000/builtInAi1000ConstructionCases";
import { getAi1000Artifacts } from "./ai1000TestHelpers";

describe("built-in AI 1000 cases manifest", () => {
  it("contains exactly the required 1000 concrete cases", () => {
    const ids = BUILT_IN_AI_1000_CONSTRUCTION_CASES.map((testCase) => testCase.id);

    expect(BUILT_IN_AI_1000_CONSTRUCTION_CASES).toHaveLength(1000);
    expect(BUILT_IN_AI_1000_ESTIMATE_CASES).toHaveLength(971);
    expect(BUILT_IN_AI_1000_PRODUCT_CASES).toHaveLength(29);
    expect(new Set(ids).size).toBe(1000);
    expect(ids[0]).toBe("0001");
    expect(ids[999]).toBe("1000");
    expect(BUILT_IN_AI_1000_CONSTRUCTION_CASES.every((testCase) =>
      testCase.workKey && testCase.promptRu && testCase.volume > 0 && testCase.unit && testCase.expectedRowsContain.length > 0,
    )).toBe(true);
  });

  it("passes every case through the runtime proof", () => {
    const { matrix, failures } = getAi1000Artifacts();

    expect(matrix.cases_total).toBe(1000);
    expect(matrix.cases_passed).toBe(1000);
    expect(matrix.cases_failed).toBe(0);
    expect(failures).toEqual([]);
  });
});
