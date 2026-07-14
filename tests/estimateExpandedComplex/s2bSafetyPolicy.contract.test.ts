import { calculateExpandedComplexEstimate } from "../../src/lib/ai/expandedComplexWorks";
import { S2B_REGULATED_SAFETY_NOTICE, S2B_WAVE2_CONTROL_CASES } from "../../src/lib/ai/expandedComplexWorks/s2b/types";

describe("S2B safety policy", () => {
  it("adds an engineering safety notice for regulated S2B works", () => {
    for (const testCase of S2B_WAVE2_CONTROL_CASES) {
      const estimate = calculateExpandedComplexEstimate({ prompt: testCase.prompt });
      if (!estimate) throw new Error(`S2B_ESTIMATE_NOT_RESOLVED:${testCase.id}`);

      if (testCase.regulated) {
        expect(estimate.limitations).toContain(S2B_REGULATED_SAFETY_NOTICE);
      }
    }
  });
});
