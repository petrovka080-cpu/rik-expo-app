import { expectFileNotToContain, expectFileToContain } from "./releasePipelineContractUtils";

describe("full Jest live BOQ proof boundary", () => {
  it("tests verifier logic without executing the current tracked live BOQ proof", () => {
    expectFileToContain("tests/release/liveBoqProofNoShaLoop.contract.test.ts", "verifyLiveBoqArtifactFixture");
    expectFileToContain("tests/release/liveBoqProofNoShaLoop.contract.test.ts", "classifyProofLineageChangedFiles");
    expectFileNotToContain("tests/release/liveBoqProofNoShaLoop.contract.test.ts", "spawnSync");
    expectFileNotToContain("tests/release/liveBoqProofNoShaLoop.contract.test.ts", "--mode=verify");
  });
});
