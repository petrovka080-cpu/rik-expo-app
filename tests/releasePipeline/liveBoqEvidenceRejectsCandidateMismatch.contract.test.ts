import { expectFileToContain } from "./releasePipelineContractUtils";

describe("live BOQ candidate mismatch", () => {
  it("fails closed when requested or stored evidence belongs to a different candidate", () => {
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "LIVE_BOQ_CANDIDATE_ARG_MISMATCH");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "LIVE_BOQ_EVIDENCE_CANDIDATE_MISMATCH");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "candidateHash");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "candidate.candidateHash");
  });
});
