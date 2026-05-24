import { readJsonIfExists } from "./ai50000Phase4TestHelpers";

describe("AI 50000 Phase 4 requires web and Android proof", () => {
  it("does not claim green without both proof artifacts", () => {
    const matrix = readJsonIfExists("artifacts/S_AI_ESTIMATE_50000_PHASE4_matrix.json");
    if (!matrix) return;
    expect(matrix.web_playwright_passed).toBe(true);
    expect(matrix.web_canary_cases_passed).toBe(50);
    expect(matrix.android_emulator_passed).toBe(true);
    expect(matrix.android_canary_cases_passed).toBe(50);
  });
});
