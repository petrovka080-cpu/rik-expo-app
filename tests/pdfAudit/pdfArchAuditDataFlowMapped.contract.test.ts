import { PDF_ARCH_AUDIT_WAVE, readAuditJson } from "./pdfArchAuditTestHelpers";

type FlowStage = {
  stage: string;
  module: string;
  object: string;
  sourceKnown: boolean;
};

type DataFlowArtifact = {
  wave: string;
  chain: FlowStage[];
  answers: Record<string, boolean>;
  hardFailSourceObjectUnknown: boolean;
};

describe("PDF architecture audit data flow", () => {
  it("documents the real GlobalEstimateResult to viewer chain", () => {
    const artifact = readAuditJson<DataFlowArtifact>("S_ESTIMATE_PDF_ARCH_AUDIT_data_flow.json");
    expect(artifact.wave).toBe(PDF_ARCH_AUDIT_WAVE);
    expect(artifact.chain.map((item) => item.stage)).toEqual([
      "AI estimate response",
      "action builder",
      "PDF payload",
      "PDF input",
      "renderer",
      "PDF binary/base64/data URI",
      "web viewer",
      "Android viewer",
    ]);
    expect(artifact.chain.every((item) => item.sourceKnown && item.module && item.object)).toBe(true);
    expect(artifact.hardFailSourceObjectUnknown).toBe(false);
    expect(artifact.answers).toMatchObject({
      doesPdfUseGlobalEstimateResult: true,
      doesPdfUseEstimatePdfViewModel: true,
      doesPdfUseMarkdownAnswer: false,
      doesPdfUsePlainTextDump: true,
      doesPdfBuildRealTableCells: false,
      doesPdfReuseProcurementRenderer: false,
      doesPdfHaveSeparateVisualContract: false,
    });
  });
});
