import fs from "node:fs";
import path from "node:path";

test("canary evaluation matrix never claims fake green", () => {
  const matrixPath = path.join(process.cwd(), "artifacts", "S_AI_ESTIMATE_CANARY_EVALUATION", "matrix.json");
  if (!fs.existsSync(matrixPath)) return;
  const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as Record<string, unknown>;
  expect(matrix.fake_green_claimed).toBe(false);
});
