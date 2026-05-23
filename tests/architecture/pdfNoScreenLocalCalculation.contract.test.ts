import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("PDF no screen-local calculation", () => {
  it("keeps PDF calculation out of AI and request screens", () => {
    const aiScreen = readRepoFile("src/features/ai/AIAssistantEstimatePdfActions.tsx");
    const requestScreen = readRepoFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");

    expect(aiScreen).not.toMatch(/unitPrice\s*\*|quantity\s*\*|grandTotal\s*=|materialsTotal\s*=/);
    expect(requestScreen).not.toMatch(/unitPrice\s*\*|quantity\s*\*|grandTotal\s*=|materialsTotal\s*=/);
    expect(aiScreen).toContain("generateAiEstimatePdf");
  });
});
