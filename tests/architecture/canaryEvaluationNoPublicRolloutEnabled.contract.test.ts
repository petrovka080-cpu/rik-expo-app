import fs from "node:fs";
import path from "node:path";

test("canary evaluation does not enable public rollout", () => {
  const matrixPath = path.join(process.cwd(), "artifacts", "S_AI_ESTIMATE_CANARY_EVALUATION", "matrix.json");
  if (fs.existsSync(matrixPath)) {
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as Record<string, unknown>;
    expect(matrix.production_rollout_enabled).toBe(false);
    expect(matrix.public_beta_enabled).toBe(false);
  }
});
