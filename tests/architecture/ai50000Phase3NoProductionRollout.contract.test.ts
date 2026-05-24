import { readJsonIfExists, sourceText } from "./ai50000Phase3TestHelpers";

describe("AI 50000 Phase 3 no production rollout", () => {
  it("keeps Phase 3 as a live sample gate only", () => {
    expect(sourceText()).not.toContain("GREEN_PRODUCTION_ROLLOUT_READY");
    const matrix = readJsonIfExists("artifacts/S_BUILT_IN_AI_50000_PHASE3_matrix.json");
    if (!matrix) return;
    expect(matrix.production_rollout_enabled).toBe(false);
  });
});
