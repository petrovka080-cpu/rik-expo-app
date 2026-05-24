import { readAuditJson, readRepoFile } from "../pdfAudit/pdfArchAuditTestHelpers";

describe("PDF architecture audit no markdown as truth", () => {
  it("keeps estimate PDF sourced from structured estimate objects", () => {
    const dataFlow = readAuditJson<{ answers: Record<string, boolean> }>(
      "S_ESTIMATE_PDF_ARCH_AUDIT_data_flow.json",
    );
    const actionService = readRepoFile("src/lib/ai/estimatePdf/estimatePdfActionService.ts");
    const creator = readRepoFile("src/lib/estimatePdf/createEstimatePdf.ts");

    expect(dataFlow.answers.doesPdfUseMarkdownAnswer).toBe(false);
    expect(actionService).toContain("input.source.structuredEstimate");
    expect(actionService).toContain("createEstimatePdf");
    expect(creator).toContain("structured GlobalEstimateResult");
    expect(actionService).not.toMatch(/markdown[^;\n]*createEstimatePdf/i);
  });
});
