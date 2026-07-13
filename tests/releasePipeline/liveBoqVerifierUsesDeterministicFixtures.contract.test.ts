import { expectFileNotToContain, expectFileToContain } from "./releasePipelineContractUtils";

describe("live BOQ verifier fixture contract", () => {
  it("keeps full Jest on deterministic lineage fixtures", () => {
    expectFileToContain("tests/release/liveBoqProofNoShaLoop.contract.test.ts", "greenArtifact");
    expectFileToContain("tests/release/liveBoqProofNoShaLoop.contract.test.ts", "LIVE_BOQ_ARTIFACT_PATHS");
    expectFileToContain("tests/release/liveBoqProofNoShaLoop.contract.test.ts", "not-a-real-commit-sha");
    expectFileNotToContain("tests/release/liveBoqProofNoShaLoop.contract.test.ts", "runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts\", \"--mode=verify\"");
  });
});
