import { readJsonIfExists, sourceText } from "./ai50000Phase4TestHelpers";

describe("AI 50000 Phase 4 no production rollout", () => {
  it("keeps production rollout disabled", () => {
    expect(sourceText()).not.toContain("AI_50000_PRODUCTION_ROLLOUT_ENABLED=true");
    const matrix = readJsonIfExists("artifacts/S_AI_ESTIMATE_50000_PHASE4_matrix.json");
    if (!matrix) return;
    expect(matrix.production_rollout_enabled).toBe(false);
  });
});
