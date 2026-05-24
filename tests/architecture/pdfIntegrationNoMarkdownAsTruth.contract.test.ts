import { readRepoFile } from "../aiEstimatePdf/aiEstimatePdfSafeIntegrationTestHelpers";

describe("PDF integration no markdown as truth", () => {
  it("routes AI estimate PDF through structuredEstimate and never markdown parsing", () => {
    const action = readRepoFile("src/lib/ai/estimatePdf/estimatePdfActionService.ts");
    const builder = readRepoFile("src/lib/aiEstimatePdf/buildAiEstimatePdfViewModel.ts");
    expect(action).toContain("input.source.structuredEstimate");
    expect(builder).toContain("professional_boq");
    expect(`${action}\n${builder}`).not.toMatch(/parseMarkdown|markdownTable|answerTextRu/);
  });
});
