import { readRepoFile } from "../pdfAudit/pdfArchAuditTestHelpers";

describe("PDF architecture audit no screen-local PDF layout", () => {
  it("keeps PDF rendering out of React screen components", () => {
    const aiActions = readRepoFile("src/features/ai/AIAssistantEstimatePdfActions.tsx");
    const requestScreen = readRepoFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const combined = `${aiActions}\n${requestScreen}`;

    expect(aiActions).toContain("generateAiEstimatePdf");
    expect(requestScreen).toContain("generateConsumerRepairRequestPdfForDraft");
    expect(combined).not.toContain("renderTextPdfDocument");
    expect(combined).not.toContain("renderEstimatePdfDocument");
    expect(combined).not.toContain("buildEstimatePdfTextLines");
  });
});
