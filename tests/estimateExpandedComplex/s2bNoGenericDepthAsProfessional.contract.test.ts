import { calculateExpandedComplexEstimate } from "../../src/lib/ai/expandedComplexWorks";
import { S2B_WAVE2_CONTROL_CASES } from "../../src/lib/ai/expandedComplexWorks/s2b/types";
import { allExpandedRows } from "./expandedComplexTestHelpers";

describe("S2B no generic depth as professional", () => {
  it("does not use professional_* supplement rows for S2B families", () => {
    for (const testCase of S2B_WAVE2_CONTROL_CASES) {
      const estimate = calculateExpandedComplexEstimate({ prompt: testCase.prompt });
      if (!estimate) throw new Error(`S2B_ESTIMATE_NOT_RESOLVED:${testCase.id}`);

      expect(allExpandedRows(estimate).some((row) => row.code.startsWith("professional_"))).toBe(false);
    }
  });
});
