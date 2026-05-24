import { readJsonIfExists, sourceText } from "./ai50000Phase2TestHelpers";

describe("AI 50000 Phase 2 no production rollout", () => {
  it("keeps production rollout disabled", () => {
    expect(sourceText()).not.toContain("GREEN_PRODUCTION_ROLLOUT_READY");
    expect(sourceText()).not.toContain("GREEN_50K_PRODUCTION_READY");
    const matrix = readJsonIfExists("artifacts/S_BUILT_IN_AI_50000_PHASE2_matrix.json");
    if (!matrix) return;
    expect(matrix.production_rollout_enabled).toBe(false);
  });
});
