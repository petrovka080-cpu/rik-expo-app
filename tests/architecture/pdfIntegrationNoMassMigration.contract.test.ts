import { readJsonArtifact, readRepoFile } from "../aiEstimatePdf/aiEstimatePdfSafeIntegrationTestHelpers";

describe("PDF integration no mass migration", () => {
  it("adds only an isolated AI estimate path and does not globally enable a new engine", () => {
    const matrix = readJsonArtifact<{ mass_pdf_migration_performed: boolean }>(
      "S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_matrix.json",
    );
    const action = readRepoFile("src/lib/ai/estimatePdf/estimatePdfActionService.ts");
    expect(matrix.mass_pdf_migration_performed).toBe(false);
    expect(action).toContain("createAiEstimatePdf");
    expect(action).toContain("generateConsumerRepairRequestPdf");
  });
});
