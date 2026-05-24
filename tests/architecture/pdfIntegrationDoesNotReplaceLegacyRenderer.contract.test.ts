import { readRepoFile } from "../aiEstimatePdf/aiEstimatePdfSafeIntegrationTestHelpers";

describe("PDF integration legacy renderer guard", () => {
  it("keeps legacy estimate renderer separate from the AI estimate renderer", () => {
    const legacy = readRepoFile("src/lib/estimatePdf/renderEstimatePdfDocument.ts");
    const ai = readRepoFile("src/lib/aiEstimatePdf/renderAiEstimatePdfDocument.ts");
    expect(legacy).toContain("renderEstimatePdfDocument");
    expect(legacy).toContain("buildEstimatePdfTextLines");
    expect(ai).toContain("OPTION_B_ISOLATED_AI_ESTIMATE_RENDERER");
    expect(ai).not.toContain("buildEstimatePdfTextLines");
  });
});
