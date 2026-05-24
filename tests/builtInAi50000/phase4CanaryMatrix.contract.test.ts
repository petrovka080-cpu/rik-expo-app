import fs from "node:fs";
import path from "node:path";

describe("built-in AI 50000 Phase 4 matrix", () => {
  it("does not claim green without canary safety proof artifacts", () => {
    const matrixPath = path.resolve(process.cwd(), "artifacts", "S_AI_ESTIMATE_50000_PHASE4_matrix.json");
    if (!fs.existsSync(matrixPath)) return;
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as Record<string, unknown>;
    expect(matrix.final_status).toBe("GREEN_AI_ESTIMATE_50000_PHASE4_CANARY_SAFETY_OBSERVABILITY_ROLLBACK_READY");
    expect(matrix.production_rollout_enabled).toBe(false);
    expect(matrix.web_canary_cases_passed).toBe(50);
    expect(matrix.android_canary_cases_passed).toBe(50);
    expect(matrix.rollback_proof_passed).toBe(true);
  });
});
