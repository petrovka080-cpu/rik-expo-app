import { classifyDirtyFiles } from "../../scripts/release/releaseStateCleanupCore";

it("allows closeout commit only when all dirty files are release harness scope", () => {
  const report = classifyDirtyFiles([
    "scripts/release/releaseWaveDirtyScope.ts",
    "scripts/audit/runProductionReleaseWaveInventory.ts",
    "tests/releaseStateCleanup/dirtyScopeAllowsOnlyCurrentWave.contract.test.ts",
  ]);

  expect(report.final_status).toBe("READY_FOR_CLOSEOUT_COMMIT");
  expect(report.can_be_committed).toBe(true);
  expect(report.active_waves).toEqual(["RELEASE_HARNESS_WIP"]);
});

it("classifies Android route bootstrap harness changes with the live B2C proof wave", () => {
  const report = classifyDirtyFiles([
    "scripts/e2e/androidRouteBootstrapHarness.ts",
    "scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts",
  ]);

  expect(report.final_status).toBe("READY_FOR_CLOSEOUT_COMMIT");
  expect(report.unknown_dirty_files).toEqual([]);
  expect(report.active_waves).toEqual(["LIVE_B2C_BINDING_WIP"]);
});
