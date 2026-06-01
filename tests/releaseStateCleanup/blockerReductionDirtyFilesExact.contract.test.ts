import { buildBlockerReductionDirtyFilesReport } from "../../scripts/release/releaseStateCleanupCore";

it("prints exact current-wave ownership and parks non-current wave files", () => {
  const report = buildBlockerReductionDirtyFilesReport(
    [
      "?? tests/releaseStateCleanup/blockerReductionDirtyFilesExact.contract.test.ts",
      "?? tests/liveQuality/ownerReplay.contract.test.ts",
    ].join("\n"),
    "",
    "",
  );

  expect(report.final_status).toBe("BLOCKED_MIXED_WAVE_DIRTY_WORKTREE");
  expect(report.unknown_dirty_files_found).toBe(false);
  expect(report.dirty_files).toEqual([
    {
      path: "tests/releaseStateCleanup/blockerReductionDirtyFilesExact.contract.test.ts",
      status: "??",
      owner_wave: "RELEASE_HARNESS_WIP",
      allowed_in_current_wave: true,
      action: "KEEP_FOR_CURRENT_WAVE",
    },
    {
      path: "tests/liveQuality/ownerReplay.contract.test.ts",
      status: "??",
      owner_wave: "OWNER_ACCOUNT_WIP",
      allowed_in_current_wave: false,
      action: "PARK_AS_BLOCKED",
    },
  ]);
});
