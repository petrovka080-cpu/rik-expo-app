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

it("allows current visible500 isolation artifacts as release harness proof", () => {
  const report = classifyDirtyFiles([
    {
      code: "M ",
      file: "scripts/e2e/runEnterpriseVisible500RequestDraftRealPath.ts",
      tracked: true,
    },
    {
      code: "A ",
      file: "artifacts/S_CURRENT_AI_ESTIMATE_PDF_VISIBLE500_DIRTY_SCOPE_ISOLATION/matrix.json",
      tracked: true,
    },
  ]);

  expect(report.final_status).toBe("READY_FOR_CLOSEOUT_COMMIT");
  expect(report.can_be_committed).toBe(true);
  expect(report.tracked_artifact_churn_found).toBe(false);
  expect(report.active_waves).toEqual(["LIVE_B2C_BINDING_WIP", "RELEASE_HARNESS_WIP"]);
});
