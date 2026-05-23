import fs from "node:fs";
import path from "node:path";

describe("built-in AI 10000 architecture: no second AI framework", () => {
  it("uses the existing BuiltIn AI and Global Estimate pipeline", () => {
    const runner = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runBuiltInAi10000RealWorldWorkTypesProof.ts"), "utf8");

    expect(runner).toContain("answerBuiltInAi");
    expect(runner).toContain("calculate_global_estimate");
    expect(runner).not.toMatch(/OpenAI|Anthropic|Gemini|fetch\(/);
  });
});
