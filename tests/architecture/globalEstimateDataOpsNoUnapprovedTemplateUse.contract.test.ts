import { buildGlobalEstimateDataOpsAdminGovernanceProof } from "../../scripts/e2e/runGlobalEstimateDataOpsAdminGovernanceProof";

describe("architecture: Global Estimate Data Ops no unapproved template use", () => {
  it("marks live estimates as approved-reference-only in the production proof matrix", async () => {
    const proof = await buildGlobalEstimateDataOpsAdminGovernanceProof();

    expect(proof.matrix.only_approved_templates_used).toBe(true);
    expect(proof.matrix.publish_requires_approved_change).toBe(true);
    expect(proof.matrix.backend_service_apply_required).toBe(true);
  });
});
