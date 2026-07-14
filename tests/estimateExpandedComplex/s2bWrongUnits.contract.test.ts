import { calculateExpandedComplexEstimate } from "../../src/lib/ai/expandedComplexWorks";
import { S2B_INFRASTRUCTURE_FAMILY_MANIFEST } from "../../src/lib/ai/expandedComplexWorks/s2b/manifest";
import { S2B_WAVE2_CONTROL_CASES } from "../../src/lib/ai/expandedComplexWorks/s2b/types";
import { allExpandedRows } from "./expandedComplexTestHelpers";

describe("S2B wrong units", () => {
  it("keeps every control-case row inside the manifest allowed unit policy", () => {
    for (const testCase of S2B_WAVE2_CONTROL_CASES) {
      const manifest = S2B_INFRASTRUCTURE_FAMILY_MANIFEST.find((entry) => entry.work_family_id === testCase.familyId);
      if (!manifest) continue;
      const estimate = calculateExpandedComplexEstimate({ prompt: testCase.prompt });
      if (!estimate) throw new Error(`S2B_ESTIMATE_NOT_RESOLVED:${testCase.id}`);

      expect(allExpandedRows(estimate).filter((row) => !manifest.allowed_units.includes(row.unit))).toEqual([]);
    }
  });
});
