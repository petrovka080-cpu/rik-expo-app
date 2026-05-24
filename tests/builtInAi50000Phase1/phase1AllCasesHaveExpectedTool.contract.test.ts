import { PHASE1_CASES } from "./phase1TestHelpers";

describe("built-in AI 50000 Phase 1 expected tool contract", () => {
  it("declares the backend tool expected by every case", () => {
    expect(PHASE1_CASES.every((testCase) => testCase.expectedTool.length > 0)).toBe(true);
    expect(PHASE1_CASES.some((testCase) => testCase.expectedTool === "calculate_global_estimate")).toBe(true);
    expect(PHASE1_CASES.some((testCase) => testCase.expectedTool === "search_material_products")).toBe(true);
  });
});
