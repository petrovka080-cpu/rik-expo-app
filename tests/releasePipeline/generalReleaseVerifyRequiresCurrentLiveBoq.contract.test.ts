import { expectFileNotToContain, expectFileToContain } from "./releasePipelineContractUtils";

describe("general release verify current live BOQ requirement", () => {
  it("requires the current candidate runtime live BOQ gate and only reads it during release verify", () => {
    expectFileToContain("scripts/release/releaseGuard.shared.ts", "runLiveBoqProductGate.ts --mode=verify-runtime");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "verifyLiveBoqEvidence");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "LIVE_BOQ_PRODUCT_GATE_GREEN_STATUS");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "LIVE_BOQ_CANDIDATE_HASH_MISMATCH");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "LIVE_BOQ_SOURCE_COMMIT_MISMATCH");
    expectFileNotToContain("scripts/release/releaseGuard.shared.ts", "runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts --mode=verify");
  });
});
