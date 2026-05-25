import fs from "node:fs";
import path from "node:path";

describe("AI 1000 post-BOQ architecture: no screen-local calculation", () => {
  it("uses BuiltInAiIngress and the shared estimate result", () => {
    const validator = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/builtInAi1000/validateBuiltInAi1000PostBoqResult.ts"), "utf8");

    expect(validator).toContain("answerBuiltInAi");
    expect(validator).toContain("calculate_global_estimate");
    expect(validator).toContain("GlobalEstimateResult");
    expect(validator).not.toContain("calculateEstimateInScreen");
  });
});
