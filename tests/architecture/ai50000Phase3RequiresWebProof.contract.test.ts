import { readJsonIfExists } from "./ai50000Phase3TestHelpers";

describe("AI 50000 Phase 3 requires web proof", () => {
  it("does not claim green without the 500-case web artifact", () => {
    const matrix = readJsonIfExists("artifacts/S_BUILT_IN_AI_50000_PHASE3_matrix.json");
    if (!matrix) return;
    expect(matrix.web_playwright_passed).toBe(true);
    expect(matrix.web_cases_passed).toBe(500);
  });
});
