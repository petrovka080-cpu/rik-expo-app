import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("entrypoint fix PDF renderer boundary", () => {
  it("continues to use the existing estimate PDF lifecycle", () => {
    const actions = readRepoFile("src/features/ai/AIAssistantEstimatePdfActions.tsx");
    const requestScreen = readRepoFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    expect(actions).toContain("generateAiEstimatePdf");
    expect(requestScreen).toContain("generateConsumerRepairRequestPdfForDraft");
    expect(actions).not.toMatch(/new jsPDF|pdf-lib|PDFDocument/);
  });
});
