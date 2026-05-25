import fs from "node:fs";
import path from "node:path";

describe("AI 1000 post-BOQ architecture: no second AI framework", () => {
  it("uses the existing BuiltInAiIngress path", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/builtInAi1000/validateBuiltInAi1000PostBoqResult.ts"), "utf8");

    expect(source).toContain("answerBuiltInAi");
    expect(source).not.toContain("createSecondAiFramework");
    expect(source).not.toContain("SecondAiFramework");
  });
});
