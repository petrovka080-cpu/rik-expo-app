import { readRepoFile } from "../aiEstimatePdf/aiEstimatePdfSafeIntegrationTestHelpers";

describe("legacy PDF renderer protection", () => {
  it("keeps the old estimate renderer module in place", () => {
    const source = readRepoFile("src/lib/estimatePdf/renderEstimatePdfDocument.ts");
    expect(source).toContain("renderTextPdfDocument");
    expect(source).toContain("buildEstimatePdfTextLines");
    expect(source).toContain("renderEstimatePdfDocument");
  });
});
