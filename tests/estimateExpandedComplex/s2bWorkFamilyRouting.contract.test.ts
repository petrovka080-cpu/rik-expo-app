import {
  calculateExpandedComplexEstimate,
  getExpandedComplexWorkFamily,
} from "../../src/lib/ai/expandedComplexWorks";
import { s2bWave2KindForFamily } from "../../src/lib/ai/expandedComplexWorks/s2b/registry";
import { S2B_WAVE2_CONTROL_CASES } from "../../src/lib/ai/expandedComplexWorks/s2b/types";

describe("S2B work-family routing", () => {
  it("routes every S2B control prompt to the expected family, calculator and kind", () => {
    for (const testCase of S2B_WAVE2_CONTROL_CASES) {
      const estimate = calculateExpandedComplexEstimate({ prompt: testCase.prompt });
      if (!estimate) throw new Error(`S2B_ROUTE_NOT_RESOLVED:${testCase.id}`);

      expect(estimate.work_family_id).toBe(testCase.familyId);
      expect(estimate.calculatorId).toBe(testCase.calculatorId);
      expect(s2bWave2KindForFamily(getExpandedComplexWorkFamily(estimate.work_family_id)!)).toBe(testCase.kind);
    }
  });
});
