import { readAuditJson, readRepoFile } from "../pdfAudit/pdfArchAuditTestHelpers";

describe("PDF architecture audit renderer rebuild guard", () => {
  it("keeps the existing estimate renderer in place for audit-only wave", () => {
    const matrix = readAuditJson<Record<string, unknown>>("S_ESTIMATE_PDF_ARCH_AUDIT_matrix.json");
    const renderer = readRepoFile("src/lib/estimatePdf/renderEstimatePdfDocument.ts");

    expect(matrix.audit_only_wave).toBe(true);
    expect(matrix.renderer_rebuild_performed).toBe(false);
    expect(renderer).toContain("renderTextPdfDocument");
    expect(renderer).toContain("buildEstimatePdfTextLines");
    expect(renderer).not.toContain("DocumentEngineV2");
    expect(renderer).not.toContain("EstimateDocumentTemplate");
  });
});
