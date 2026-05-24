import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("PDF architecture no markdown as truth", () => {
  it("routes estimate PDF through GlobalEstimateResult view model and renderer", () => {
    const actionService = readRepoFile("src/lib/ai/estimatePdf/estimatePdfActionService.ts");
    const creator = readRepoFile("src/lib/aiEstimatePdf/createAiEstimatePdf.ts");

    expect(actionService).toContain("createAiEstimatePdf");
    expect(actionService).toContain("structuredEstimate");
    expect(creator).toContain("buildAiEstimatePdfViewModel");
    expect(creator).not.toMatch(/parseMarkdown|markdownTable|answerTextRu/);
  });
});
