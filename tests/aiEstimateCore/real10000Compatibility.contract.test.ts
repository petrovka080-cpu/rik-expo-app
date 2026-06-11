import {
  exactPromptLookupScanReal10000,
  evaluateReal10000Case,
} from "../../scripts/e2e/real10000AcceptanceCore";
import { REAL_DIVERSE_10000_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

describe("AI estimate core real 10000 compatibility contract", () => {
  it("keeps the 10000 real-work fixture set and a compatibility sample green", () => {
    expect(REAL_DIVERSE_10000_CONSTRUCTION_WORKS).toHaveLength(10_000);
    expect(exactPromptLookupScanReal10000()).toMatchObject({ exact_prompt_lookup_found: false });

    for (const testCase of REAL_DIVERSE_10000_CONSTRUCTION_WORKS.slice(0, 30)) {
      const result = evaluateReal10000Case(testCase, { includePdf: false });
      expect(result.failures).toEqual([]);
      expect(result.runtimeTraceId).toBeTruthy();
      expect(result.rowCount).toBeGreaterThanOrEqual(testCase.expectedMinimumRows);
      expect(result.unitSemanticsPassed).toBe(true);
      expect(result.catalogBindingPassed).toBe(true);
      expect(result.sourceEvidencePassed).toBe(true);
      expect(result.uiTableVisible).toBe(true);
    }
  });
});
