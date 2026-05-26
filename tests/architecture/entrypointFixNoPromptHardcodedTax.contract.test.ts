import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("entrypoint fix no prompt-hardcoded tax", () => {
  it("does not hardcode tax rates in entrypoint or presentation binding", () => {
    const source = [
      readRepoFile("src/features/consumerRepair/consumerRepairAiAdapter.ts"),
      readRepoFile("src/features/ai/assistantAnswerPipeline.ts"),
      readRepoFile("src/lib/ai/estimatePresentation/buildEstimatePresentationViewModel.ts"),
      readRepoFile("src/lib/ai/estimatePresentation/validateEstimatePresentationViewModel.ts"),
    ].join("\n");
    expect(source).not.toMatch(/taxRate\s*:|0\.12|12%|НДС\s*12/);
  });
});
