import fs from "node:fs";
import path from "node:path";

describe("AI 10000 post-BOQ architecture: no second AI framework", () => {
  it("stays on the existing BuiltInAiIngress stack", () => {
    const files = [
      "src/lib/ai/builtInAi10000/builtInAi10000PostBoqGenerator.ts",
      "src/lib/ai/builtInAi10000/validateBuiltInAi10000PostBoqRuntime.ts",
      "scripts/e2e/runBuiltInAi10000PostBoqCatalogProof.ts",
    ];
    const source = files.map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");

    expect(source).toContain("answerBuiltInAi");
    expect(source).not.toMatch(/langchain|llamaindex|semantic-kernel|openai\.chat\.completions/i);
  });
});
