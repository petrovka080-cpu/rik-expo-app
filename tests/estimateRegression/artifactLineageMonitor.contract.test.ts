import { auditEstimateArtifactLineageMutationGates } from "../../scripts/estimate/auditEstimateArtifactLineage";

describe("estimate artifact lineage monitor", () => {
  it("rejects stale or divergent artifacts", () => {
    expect(auditEstimateArtifactLineageMutationGates()).toMatchObject({
      stale_artifact_rejected: true,
      upstream_divergence_rejected: true,
      non_green_artifact_rejected: true,
    });
  });
});
