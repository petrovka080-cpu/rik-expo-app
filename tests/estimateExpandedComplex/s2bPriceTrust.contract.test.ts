import { calculateExpandedComplexEstimate } from "../../src/lib/ai/expandedComplexWorks";
import { S2B_WAVE2_CONTROL_CASES } from "../../src/lib/ai/expandedComplexWorks/s2b/types";
import { allExpandedRows } from "./expandedComplexTestHelpers";

describe("S2B price trust", () => {
  it("keeps prices missing and never allows a final total", () => {
    for (const testCase of S2B_WAVE2_CONTROL_CASES) {
      const estimate = calculateExpandedComplexEstimate({ prompt: testCase.prompt });
      if (!estimate) throw new Error(`S2B_ESTIMATE_NOT_RESOLVED:${testCase.id}`);

      expect(estimate.price_state.status).toBe("PRICE_MISSING");
      expect(estimate.price_state.finalTotalAllowed).toBe(false);
      expect(allExpandedRows(estimate).every((row) => row.priceStatus === "PRICE_MISSING" && row.unitPrice === null && row.total === null)).toBe(true);
    }
  });
});
