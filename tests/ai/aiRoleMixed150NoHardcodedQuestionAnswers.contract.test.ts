import fs from "fs";
import path from "path";

import { getAiRoleMixed150QuestionBank } from "../../src/lib/ai/evaluation/goldenBusinessDataset";

describe("S_AI_ROLE_MIXED_150: no questionId hardcoded answers", () => {
  it("uses dataset-driven answer generation, not per-question id switches", () => {
    const sourcePath = path.join(
      __dirname,
      "../../src/lib/ai/evaluation/goldenBusinessDataset/aiGoldenExpectedAnswers.ts",
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(getAiRoleMixed150QuestionBank()).toHaveLength(150);
    expect(source).not.toMatch(/switch\s*\(\s*question\.id\s*\)/);
    expect(source).not.toMatch(/case\s+["']internal-positive-/);
    expect(source).not.toMatch(/case\s+["']external-positive-/);
  });
});
