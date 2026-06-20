import { expectFileNotToContain } from "./releasePipelineContractUtils";

describe("pipeline verify live BOQ boundary", () => {
  it("keeps pipeline-only verify independent of product live BOQ gates", () => {
    expectFileNotToContain("scripts/release/runReleasePipelineVerify.ts", "live_boq.json");
    expectFileNotToContain("scripts/release/runReleasePipelineVerify.ts", "runLiveBoqProductGate");
    expectFileNotToContain("scripts/release/runReleasePipelineVerify.ts", "LIVE_BOQ");
  });
});
