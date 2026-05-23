import {
  BUILT_IN_AI_10000_CONSTRUCTION_CASES,
  BUILT_IN_AI_10000_DOMAINS,
  BUILT_IN_AI_10000_ESTIMATE_CASES,
  BUILT_IN_AI_10000_PRODUCT_CASES,
} from "../../src/lib/ai/builtInAi10000";
import { getAi10000Artifacts } from "./ai10000TestHelpers";

describe("built-in AI 10000 cases manifest", () => {
  it("contains the required 100-domain real-world case pack", () => {
    const ids = BUILT_IN_AI_10000_CONSTRUCTION_CASES.map((testCase) => testCase.id);

    expect(BUILT_IN_AI_10000_DOMAINS).toHaveLength(100);
    expect(BUILT_IN_AI_10000_CONSTRUCTION_CASES).toHaveLength(10000);
    expect(BUILT_IN_AI_10000_ESTIMATE_CASES).toHaveLength(9000);
    expect(BUILT_IN_AI_10000_PRODUCT_CASES).toHaveLength(1000);
    expect(new Set(ids).size).toBe(10000);
    expect(ids[0]).toBe("00001");
    expect(ids[9999]).toBe("10000");
    expect(BUILT_IN_AI_10000_CONSTRUCTION_CASES.every((testCase) =>
      testCase.domainKey &&
      testCase.workKey &&
      testCase.promptRu &&
      testCase.volume > 0 &&
      testCase.unit &&
      testCase.expectedRowsContain.length > 0,
    )).toBe(true);
  });

  it("passes every case through the runtime proof", () => {
    const { matrix, failures } = getAi10000Artifacts();

    expect(matrix.cases_total).toBe(10000);
    expect(matrix.cases_passed).toBe(10000);
    expect(matrix.cases_failed).toBe(0);
    expect(failures).toEqual([]);
  });
});
