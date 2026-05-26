import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("entrypoint fix shared view model required", () => {
  it("binds /request and embedded AI through the shared estimate presentation module", () => {
    const requestBinding = readRepoFile("src/lib/consumerRequests/consumerRequestGlobalEstimateIntegration.ts");
    const aiPipeline = readRepoFile("src/features/ai/assistantAnswerPipeline.ts");
    const aiTable = readRepoFile("src/features/ai/AIAssistantEstimatePdfActions.tsx");
    expect(requestBinding).toContain("buildEstimatePresentationViewModel");
    expect(aiPipeline).toContain("buildEstimatePresentationViewModel");
    expect(aiTable).toContain("buildEstimatePresentationViewModel");
  });
});
