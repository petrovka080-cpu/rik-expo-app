import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("entrypoint fix no prompt-hardcoded prices", () => {
  it("keeps prices in ratebook/templates rather than prompt adapters or presentation", () => {
    const source = [
      readRepoFile("src/features/consumerRepair/consumerRepairAiAdapter.ts"),
      readRepoFile("src/features/ai/assistantAnswerPipeline.ts"),
      readRepoFile("src/lib/ai/estimatePresentation/buildEstimatePresentationViewModel.ts"),
      readRepoFile("src/lib/ai/estimatePresentation/validateEstimatePresentationViewModel.ts"),
    ].join("\n");
    expect(source).not.toMatch(/priceDefault\s*:|unitPrice\s*:\s*\d|KGS\s*\d|\d+\s*KGS/);
  });
});
