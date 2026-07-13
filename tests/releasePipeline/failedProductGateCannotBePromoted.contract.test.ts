import { expectFileToContain } from "./releasePipelineContractUtils";

describe("failed product gates cannot be promoted", () => {
  it("requires every product proof runtime report to be green before promotion", () => {
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "PRODUCT_PROOF_RUNTIME_GATES");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "PRODUCT_PROOF_RUNTIME_GATE_GREEN_STATUS");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "PRODUCT_PROOF_NOT_GREEN");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "PRODUCT_PROOF_FUNCTIONAL_STATUS_NOT_GREEN");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "BLOCKED_PIPELINE_PROMOTION_NOT_READY");
  });
});
