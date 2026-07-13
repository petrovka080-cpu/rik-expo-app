import { expectFileToContain } from "./releasePipelineContractUtils";

describe("live BOQ frozen-candidate binding", () => {
  it("binds evidence to the frozen candidate hash, source head and fingerprints", () => {
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "assertSourceFrozen");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "assertFrozenCandidateCurrent");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "computeReleaseFingerprints");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "candidate.candidateHash");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "candidate.source_commit");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "productSourceHash");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "proofHarnessHash");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "nativeBuildHash");
  });
});
