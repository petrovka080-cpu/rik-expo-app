import fs from "node:fs";
import path from "node:path";

describe("AI 1000 post-BOQ architecture: no inline estimate rows", () => {
  it("does not define screen-local inline rows", () => {
    const files = [
      "src/lib/ai/builtInAi1000/builtInAi1000PostBoqCatalogCases.ts",
      "src/lib/ai/builtInAi1000/validateBuiltInAi1000PostBoqResult.ts",
      "scripts/e2e/runBuiltInAi1000PostBoqCatalogProof.ts",
    ].map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");

    expect(files).not.toContain("inlineEstimateRows");
    expect(files).not.toContain("inlineGenericConstructionRows");
  });
});
