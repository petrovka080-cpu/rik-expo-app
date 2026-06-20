import { expectFileToContain } from "./releasePipelineContractUtils";

describe("live BOQ source-head mismatch", () => {
  it("fails closed when runtime evidence is not for the frozen source head", () => {
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "LIVE_BOQ_SOURCE_HEAD_MISMATCH");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "LIVE_BOQ_EVIDENCE_SOURCE_HEAD_MISMATCH");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "sourceHead");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "candidate.source_commit");
  });
});
