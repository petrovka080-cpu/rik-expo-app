import { statusIgnoringReleaseArtifacts } from "../../scripts/release/runRequestEstimateCatalogBoqLiveReleaseGate";

describe("request estimate release gate rejects dirty worktree", () => {
  it("does not count dirty non-artifact files as clean", () => {
    expect(statusIgnoringReleaseArtifacts(" M src/features/consumerRepair/ConsumerRepairRequestScreen.tsx")).toHaveLength(1);
    expect(statusIgnoringReleaseArtifacts(" M artifacts/S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE_matrix.json")).toEqual([]);
  });
});
