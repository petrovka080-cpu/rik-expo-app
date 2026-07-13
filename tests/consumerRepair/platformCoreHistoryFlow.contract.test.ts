import { AI_ESTIMATE_PLATFORM_CORE_REGISTRY } from "../../src/lib/estimate/platformCoreRegistry";
import { validateEstimateLineage } from "../../src/lib/estimate/validateEstimateLineage";

describe("platform core approved history flow", () => {
  it("keeps history reopen/edit bound to the shared snapshot lineage", () => {
    const entry = AI_ESTIMATE_PLATFORM_CORE_REGISTRY.find((item) => item.entryId === "approved_history_reopen_edit");
    const lineage = validateEstimateLineage();

    expect(entry?.usesSharedSnapshotModel).toBe(true);
    expect(entry?.usesSharedRevisionModel).toBe(true);
    expect(lineage.history_snapshot_binding_passed).toBe(true);
    expect(lineage.stale_artifact_policy_passed).toBe(true);
  });
});
