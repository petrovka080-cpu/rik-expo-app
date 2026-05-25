import fs from "node:fs";
import path from "node:path";

describe("AI 1000 post-BOQ architecture: legacy PDF remains intact", () => {
  it("uses the existing estimate PDF source mapper", () => {
    const runner = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runBuiltInAi1000PostBoqCatalogProof.ts"), "utf8");

    expect(runner).toContain("mapAiEstimatePdfSourceToExistingConsumerPdfModel");
    expect(runner).toContain("generateAiEstimatePdf");
    expect(runner).not.toContain("replaceLegacyPdfRendererGlobally");
  });
});
