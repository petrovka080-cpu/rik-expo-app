import { expectFileNotToContain, expectFileToContain } from "./releasePipelineContractUtils";

describe("live BOQ proof phase gate", () => {
  it("runs live BOQ verification only as a runtime product gate", () => {
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "assertSourceFrozen");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "product-gates");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "live_boq.json");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "--mode=verify");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "BLOCKED_LIVE_BOQ_PRODUCT_GATE");
    expectFileNotToContain("scripts/release/runLiveBoqProductGate.ts", "artifacts/S_RELEASE_PIPELINE_RECOVERY");
  });
});
