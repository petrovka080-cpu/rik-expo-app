import { expectFileToContain } from "./releasePipelineContractUtils";

describe("promotion live BOQ precondition", () => {
  it("fails closed unless the current candidate live BOQ product gate passed", () => {
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "product-gates");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "live_boq.json");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "LIVE_BOQ_PRODUCT_GATE_NOT_GREEN");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "LIVE_BOQ_CANDIDATE_HASH_MISMATCH");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "LIVE_BOQ_SOURCE_COMMIT_MISMATCH");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "LIVE_BOQ_TRACKED_ARTIFACT_READ");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "LIVE_BOQ_NOT_RUNTIME_ONLY");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "LIVE_BOQ_FAKE_GREEN");
  });
});
