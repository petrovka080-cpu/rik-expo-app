import { readJsonIfExists } from "./ai50000Phase2TestHelpers";

describe("AI 50000 Phase 2 requires web proof", () => {
  it("requires Playwright proof when final matrix exists", () => {
    const matrix = readJsonIfExists("artifacts/S_BUILT_IN_AI_50000_PHASE2_matrix.json");
    if (!matrix) return;
    expect(matrix.web_playwright_passed).toBe(true);
    expect(matrix.web_live_sample_cases_total).toBe(250);
  });
});
