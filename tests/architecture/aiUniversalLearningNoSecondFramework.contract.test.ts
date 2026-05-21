import fs from "node:fs";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE architecture: no second framework", () => {
  it("reuses the existing live AI route module instead of a parallel runtime", () => {
    const source = fs.readFileSync("src/lib/ai/liveUi/liveAiActionRouter.ts", "utf8");
    expect(source).toContain("universalLearningCore");
    expect(source).not.toMatch(/new\s+AIFramework|createSecondAiFramework|second_ai_framework_created:\s*true/);
  });
});
