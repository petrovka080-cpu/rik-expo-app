import { UNFINISHED_AI_ESTIMATE_CASES, P0_UNFINISHED_AI_ESTIMATE_CASES } from "./aiEstimateCoreTestHelpers";

describe("unfinished AI estimate cases manifest", () => {
  it("contains the required 80 core cases with 8 P0 cases", () => {
    expect(UNFINISHED_AI_ESTIMATE_CASES).toHaveLength(80);
    expect(P0_UNFINISHED_AI_ESTIMATE_CASES).toHaveLength(8);
    expect(new Set(UNFINISHED_AI_ESTIMATE_CASES.map((item) => item.id)).size).toBe(80);
  });

  it("requires backend estimate, source evidence, tax status and PDF action for every case", () => {
    for (const testCase of UNFINISHED_AI_ESTIMATE_CASES) {
      expect(testCase.expectedIntent).toBe("estimate");
      expect(testCase.expectedTool).toBe("calculate_global_estimate");
      expect(testCase.requiresPdfAction).toBe(true);
      expect(testCase.requiresSourceEvidence).toBe(true);
      expect(testCase.requiresTaxStatusOrWarning).toBe(true);
      expect(testCase.forbiddenRowsContain).toContain("Строительные работы");
    }
  });
});
