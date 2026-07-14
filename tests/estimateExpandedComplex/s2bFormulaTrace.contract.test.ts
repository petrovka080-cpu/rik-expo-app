import { calculateExpandedComplexEstimate } from "../../src/lib/ai/expandedComplexWorks";
import { S2B_WAVE2_CONTROL_CASES } from "../../src/lib/ai/expandedComplexWorks/s2b/types";
import { allExpandedRows } from "./expandedComplexTestHelpers";

describe("S2B formula trace", () => {
  it("records one trace entry for every runtime BOQ row", () => {
    for (const testCase of S2B_WAVE2_CONTROL_CASES) {
      const estimate = calculateExpandedComplexEstimate({ prompt: testCase.prompt });
      if (!estimate) throw new Error(`S2B_ESTIMATE_NOT_RESOLVED:${testCase.id}`);
      const rows = allExpandedRows(estimate);

      expect(estimate.calculation_trace).toHaveLength(rows.length);
      for (const row of rows) {
        expect(estimate.calculation_trace.some((step) => step.startsWith(`${row.code}:`))).toBe(true);
        expect(row.quantityFormula.length).toBeGreaterThan(0);
      }
    }
  });
});
