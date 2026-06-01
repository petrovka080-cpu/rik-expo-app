import {
  buildParkedWaveState,
  buildReleaseStateCleanupCommitBuckets,
} from "../../scripts/release/releaseStateCleanupCore";

it("parks non-current waves without marking them committed", () => {
  const buckets = buildReleaseStateCleanupCommitBuckets(
    [
      "?? scripts/e2e/runOwnerAccountLiveEstimateQualityReplay.ts",
      " M eas.json",
      " M src/lib/ai/professionalBoq/compileDynamicProfessionalBoq.ts",
    ].join("\n"),
  );
  const parked = buildParkedWaveState(buckets);

  expect(parked.final_status).toBe("GREEN_NON_CURRENT_WAVES_PARKED");
  expect(parked.parked_waves.map((wave) => wave.wave).sort()).toEqual([
    "MOBILE_BUILD_WIP",
    "OWNER_ACCOUNT_WIP",
    "PRODUCT_ESTIMATE_WAVE",
  ]);
  expect(parked.parked_waves.every((wave) => wave.committedInThisWave === false)).toBe(true);
  expect(parked.fake_green_claimed).toBe(false);
});
