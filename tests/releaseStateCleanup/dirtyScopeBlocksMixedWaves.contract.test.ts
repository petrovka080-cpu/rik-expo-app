import { classifyDirtyFiles } from "../../scripts/release/releaseStateCleanupCore";

it("blocks dirty files owned by multiple waves", () => {
  const report = classifyDirtyFiles([
    "scripts/e2e/runOwnerAccountLiveEstimateQualityReplay.ts",
    "scripts/release/mobileReleaseBuildCore.ts",
  ]);

  expect(report.final_status).toBe("BLOCKED_MIXED_WAVE_DIRTY_WORKTREE");
  expect(report.mixed_wave_dirty_worktree_found).toBe(true);
  expect(report.active_waves).toEqual(["MOBILE_BUILD_WIP", "OWNER_ACCOUNT_WIP"]);
});
