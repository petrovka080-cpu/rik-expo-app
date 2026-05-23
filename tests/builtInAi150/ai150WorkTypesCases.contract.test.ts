import { GLOBAL_CONSTRUCTION_WORK_TYPE_150_CASES } from "../../src/lib/ai/globalEstimate/globalConstructionWorkTypeCatalog150";
import { getAi150Artifacts } from "./ai150TestHelpers";

describe("built-in AI 150 work type cases", () => {
  it("contains exactly the required 150 concrete work types", () => {
    const ids = GLOBAL_CONSTRUCTION_WORK_TYPE_150_CASES.map((testCase) => testCase.id);
    const workKeys = GLOBAL_CONSTRUCTION_WORK_TYPE_150_CASES.map((testCase) => testCase.workKey);

    expect(GLOBAL_CONSTRUCTION_WORK_TYPE_150_CASES).toHaveLength(150);
    expect(new Set(ids).size).toBe(150);
    expect(new Set(workKeys).size).toBe(150);
    expect(ids[0]).toBe("001");
    expect(ids[149]).toBe("150");
  });

  it("passes every case through the runtime proof", () => {
    const { matrix, failures } = getAi150Artifacts();

    expect(matrix.cases_total).toBe(150);
    expect(matrix.cases_passed).toBe(150);
    expect(matrix.cases_failed).toBe(0);
    expect(failures).toEqual([]);
  });
});
