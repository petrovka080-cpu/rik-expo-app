import fs from "node:fs";
import path from "node:path";

describe("AI 10000 post-BOQ architecture: no screen-local calculation", () => {
  it("uses BuiltInAiIngress and shared runtime validation", () => {
    const validator = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/builtInAi10000/validateBuiltInAi10000PostBoqRuntime.ts"), "utf8");

    expect(validator).toContain("answerBuiltInAi");
    expect(validator).toContain("validateEstimateBoqDepth");
    expect(validator).not.toContain("calculateEstimateInScreen");
  });
});
