import { expectFileNotToContain, expectFileToContain } from "./releasePipelineContractUtils";

describe("live BOQ product gate legacy-proof boundary", () => {
  it("does not read or verify the historical tracked live BOQ proof for the current candidate", () => {
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "generateLiveBoqEvidence");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "--product-gate-runtime");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "--output-dir=");
    expectFileNotToContain("scripts/release/runLiveBoqProductGate.ts", "runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof");
    expectFileNotToContain("scripts/release/runLiveBoqProductGate.ts", "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG");
  });
});
