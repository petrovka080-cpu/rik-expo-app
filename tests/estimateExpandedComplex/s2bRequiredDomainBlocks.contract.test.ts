import { calculateExpandedComplexEstimate } from "../../src/lib/ai/expandedComplexWorks";
import { resolveS2BDomainBlockCoverage } from "../../src/lib/ai/expandedComplexWorks/s2b/domainBlockCoverage";
import { S2B_INFRASTRUCTURE_FAMILY_MANIFEST } from "../../src/lib/ai/expandedComplexWorks/s2b/manifest";
import { S2B_WAVE2_CONTROL_CASES } from "../../src/lib/ai/expandedComplexWorks/s2b/types";

describe("S2B required domain blocks", () => {
  it("accounts for every required block with exact row evidence or an explicit design-input gate", () => {
    let rowEvidenceCount = 0;
    let missingDesignInputCount = 0;

    for (const testCase of S2B_WAVE2_CONTROL_CASES) {
      const manifest = S2B_INFRASTRUCTURE_FAMILY_MANIFEST.find((entry) => entry.work_family_id === testCase.familyId);
      if (!manifest) continue;
      const estimate = calculateExpandedComplexEstimate({ prompt: testCase.prompt });
      if (!estimate) throw new Error(`S2B_ESTIMATE_NOT_RESOLVED:${testCase.id}`);

      const coverage = resolveS2BDomainBlockCoverage(manifest, estimate);
      expect(coverage.map((item) => item.block_id)).toEqual(manifest.required_domain_blocks);
      expect(coverage.some((item) => item.status === "UNRESOLVED")).toBe(false);

      for (const item of coverage) {
        if (item.status === "ROW_EVIDENCE") {
          expect(item.evidence_row_codes.length).toBeGreaterThan(0);
          expect(item.evidence_missing_inputs).toEqual([]);
          rowEvidenceCount += 1;
        } else {
          expect(item.status).toBe("MISSING_DESIGN_INPUT");
          expect(item.evidence_row_codes).toEqual([]);
          expect(item.evidence_missing_inputs.length).toBeGreaterThan(0);
          missingDesignInputCount += 1;
        }
      }
    }

    expect(rowEvidenceCount).toBeGreaterThan(0);
    expect(missingDesignInputCount).toBeGreaterThan(0);
  });
});
