import { PDF_ARCH_AUDIT_WAVE, readAuditJson } from "./pdfArchAuditTestHelpers";

type ComparisonArtifact = {
  wave: string;
  procurement_pdf: Record<string, boolean | string>;
  estimate_pdf_current: Record<string, boolean | string>;
  decision: {
    copyProcurementSemantics: boolean;
    reuseDocumentLayoutPrimitives: boolean;
    unifiedDocumentStandardNeeded: boolean;
  };
};

describe("PDF architecture audit procurement comparison", () => {
  it("compares layout primitives without copying procurement semantics", () => {
    const artifact = readAuditJson<ComparisonArtifact>(
      "S_ESTIMATE_PDF_ARCH_AUDIT_procurement_comparison.json",
    );
    expect(artifact.wave).toBe(PDF_ARCH_AUDIT_WAVE);
    expect(artifact.procurement_pdf).toMatchObject({
      hasHeader: true,
      hasMetadataBlocks: true,
      hasBorderedTable: true,
      hasTotalsRow: true,
      hasSignatureBlocks: true,
      hasServiceId: true,
    });
    expect(artifact.estimate_pdf_current).toMatchObject({
      hasHeader: true,
      hasMetadataBlocks: true,
      hasBorderedTable: false,
      hasTotalsRow: true,
      hasSignatureBlocks: false,
      hasServiceId: true,
      usesProcurementSemantics: false,
    });
    expect(artifact.decision).toEqual({
      copyProcurementSemantics: false,
      reuseDocumentLayoutPrimitives: true,
      unifiedDocumentStandardNeeded: true,
    });
  });
});
