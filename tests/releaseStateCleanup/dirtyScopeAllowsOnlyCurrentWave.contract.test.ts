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
