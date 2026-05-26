import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("entrypoint fix no useEffect rewrite", () => {
  it("does not put estimate binding or calculation into useEffect", () => {
    const aiScreen = readRepoFile("src/features/ai/AIAssistantScreen.tsx");
    const requestScreen = readRepoFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    expect(aiScreen).not.toMatch(/useEffect[\s\S]{0,600}(calculateGlobalConstructionEstimate|buildEstimatePresentationViewModel|genericDraft)/);
    expect(requestScreen).not.toMatch(/useEffect[\s\S]{0,600}(calculateGlobalConstructionEstimate|buildEstimatePresentationViewModel|genericDraft)/);
  });
});
