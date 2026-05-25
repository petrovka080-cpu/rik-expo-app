import fs from "node:fs";
import path from "node:path";

describe("PDF tabular regression no legacy renderer replacement", () => {
  it("keeps the isolated AI Estimate PDF renderer separate from the legacy renderer", () => {
    const aiRenderer = fs.readFileSync(path.resolve(process.cwd(), "src/lib/aiEstimatePdf/renderAiEstimatePdfDocument.ts"), "utf8");
    const legacyRenderer = fs.readFileSync(path.resolve(process.cwd(), "src/lib/estimatePdf/renderEstimatePdfDocument.ts"), "utf8");
    expect(aiRenderer).toContain("OPTION_B_ISOLATED_AI_ESTIMATE_RENDERER");
    expect(legacyRenderer).not.toContain("OPTION_B_ISOLATED_AI_ESTIMATE_RENDERER");
  });
});
