import { PDF_ARCH_AUDIT_WAVE, readAuditJson } from "./pdfArchAuditTestHelpers";

type Renderer = {
  module: string;
  role: string;
  usedBy: string[];
  layoutCapabilities: {
    documentHeader: boolean;
    borderedTable: boolean;
    tableHeader: boolean;
    rowGrid: boolean;
    totalsBlock: boolean;
    signatureBlock: boolean;
  };
  canBeRefactored: boolean;
  mustBeReplaced: boolean;
  risk: string;
};

describe("PDF architecture audit renderer map", () => {
  it("maps estimate renderer and procurement reference capabilities honestly", () => {
    const artifact = readAuditJson<{ wave: string; renderers: Renderer[] }>(
      "S_ESTIMATE_PDF_ARCH_AUDIT_renderer_map.json",
    );
    expect(artifact.wave).toBe(PDF_ARCH_AUDIT_WAVE);
    const estimateRenderer = artifact.renderers.find((item) =>
      item.module === "src/lib/estimatePdf/renderEstimatePdfDocument.ts"
    );
    expect(estimateRenderer).toBeTruthy();
    expect(estimateRenderer?.role).toBe("renderer");
    expect(estimateRenderer?.layoutCapabilities).toMatchObject({
      documentHeader: true,
      borderedTable: false,
      tableHeader: true,
      rowGrid: false,
      totalsBlock: true,
      signatureBlock: false,
    });
    expect(estimateRenderer?.risk).toBe("must_refactor");

    const proposalRenderer = artifact.renderers.find((item) =>
      item.module === "src/lib/pdf/pdf.proposal.ts"
    );
    expect(proposalRenderer?.layoutCapabilities).toMatchObject({
      borderedTable: true,
      rowGrid: true,
      signatureBlock: true,
    });
    expect(artifact.renderers.every((item) => Array.isArray(item.usedBy))).toBe(true);
  });
});
