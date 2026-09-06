import {
  calculateExpandedComplexEstimate,
  getExpandedComplexWorkFamily,
} from "../../src/lib/ai/expandedComplexWorks";
import { s2bWave2KindForFamily } from "../../src/lib/ai/expandedComplexWorks/s2b/registry";
import { S2B_WAVE2_CONTROL_CASES } from "../../src/lib/ai/expandedComplexWorks/s2b/types";

describe("S2B work-family routing", () => {
  const backendOwnedFamilies = new Set([
    "village_water_supply",
    "village_sewer_network",
    "stormwater_drainage",
    "well_construction",
    "earth_dam",
  ]);

  it("routes every control prompt while keeping backend-owned families outside the retired client compiler", () => {
    for (const testCase of S2B_WAVE2_CONTROL_CASES) {
      const estimate = calculateExpandedComplexEstimate({ prompt: testCase.prompt });
      if (!estimate) throw new Error(`S2B_ROUTE_NOT_RESOLVED:${testCase.id}`);

      expect(estimate.work_family_id).toBe(testCase.familyId);
      expect(estimate.calculatorId).toBe(testCase.calculatorId);
      const clientCompilerKind = s2bWave2KindForFamily(
        getExpandedComplexWorkFamily(estimate.work_family_id)!,
      );
      if (backendOwnedFamilies.has(testCase.familyId)) {
        expect(clientCompilerKind).toBeNull();
      } else {
        expect(clientCompilerKind).toBe(testCase.kind);
      }
    }
  });
});
