import { buildReleaseStateCleanupCommitBuckets } from "../../scripts/release/releaseStateCleanupCore";

it("blocks a closeout commit while non-current dirty waves are present", () => {
  const report = buildReleaseStateCleanupCommitBuckets(
    [
      "?? scripts/release/planReleaseStateCleanupCommitBuckets.ts",
      "?? scripts/e2e/runOwnerAccountLiveEstimateQualityLockProof.ts",
    ].join("\n"),
  );

  expect(report.final_status).toBe("BLOCKED_MIXED_WAVE_COMMIT_ATTEMPT");
  expect(report.mixed_wave_commit_attempt_found).toBe(true);
  expect(report.items.find((item) => item.detectedWave === "OWNER_ACCOUNT_WIP")?.mayCommitInThisWave).toBe(false);
});
