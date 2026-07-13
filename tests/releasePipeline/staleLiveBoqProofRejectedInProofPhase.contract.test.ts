import { expectFileNotToContain, expectFileToContain } from "./releasePipelineContractUtils";

describe("live BOQ proof phase gate", () => {
  it("creates current-candidate live BOQ evidence only as ignored runtime", () => {
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "assertSourceFrozen");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "product-gates");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "live_boq.json");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "--output-dir=");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "--product-gate-runtime");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "tracked_artifacts_read: false");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "BLOCKED_LIVE_BOQ_PRODUCT_GATE");
    expectFileNotToContain("scripts/release/runLiveBoqProductGate.ts", "artifacts/S_RELEASE_PIPELINE_RECOVERY");
  });

  it("keeps general release verify on the runtime product gate instead of stale tracked live BOQ artifacts", () => {
    expectFileToContain("scripts/release/releaseGuard.shared.ts", "runLiveBoqProductGate.ts --mode=verify-runtime");
    expectFileNotToContain("scripts/release/releaseGuard.shared.ts", "runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts --mode=verify");
  });
});
