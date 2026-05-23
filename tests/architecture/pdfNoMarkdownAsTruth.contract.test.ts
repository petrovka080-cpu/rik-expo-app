import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("PDF architecture no markdown as truth", () => {
  it("routes estimate PDF through GlobalEstimateResult view model and renderer", () => {
    const actionService = readRepoFile("src/lib/ai/estimatePdf/estimatePdfActionService.ts");
    const creator = readRepoFile("src/lib/estimatePdf/createEstimatePdf.ts");

    expect(actionService).toContain("createEstimatePdf");
    expect(actionService).toContain("structuredEstimate");
    expect(creator).toContain("structured GlobalEstimateResult");
    expect(creator).not.toMatch(/parseMarkdown|markdownTable|answerTextRu/);
  });
});
