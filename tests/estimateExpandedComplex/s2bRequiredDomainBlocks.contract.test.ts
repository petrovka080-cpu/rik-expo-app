import { calculateExpandedComplexEstimate } from "../../src/lib/ai/expandedComplexWorks";
import { S2B_INFRASTRUCTURE_FAMILY_MANIFEST } from "../../src/lib/ai/expandedComplexWorks/s2b/manifest";
import { S2B_WAVE2_CONTROL_CASES } from "../../src/lib/ai/expandedComplexWorks/s2b/types";
import { allExpandedRows } from "./expandedComplexTestHelpers";

describe("S2B required domain blocks", () => {
  it("includes required domain tokens for every control case manifest entry", () => {
    for (const testCase of S2B_WAVE2_CONTROL_CASES) {
      const manifest = S2B_INFRASTRUCTURE_FAMILY_MANIFEST.find((entry) => entry.work_family_id === testCase.familyId);
      if (!manifest) continue;
      const estimate = calculateExpandedComplexEstimate({ prompt: testCase.prompt });
      if (!estimate) throw new Error(`S2B_ESTIMATE_NOT_RESOLVED:${testCase.id}`);

      const rows = allExpandedRows(estimate);
      const haystack = `${rows.map((row) => `${row.code} ${row.group} ${row.titleRu}`).join("\n")}\n${estimate.calculation_trace.join("\n")}`.toLowerCase();
      for (const block of manifest.required_domain_blocks) {
        expect(haystack).toContain(block.toLowerCase());
      }
    }
  });
});
