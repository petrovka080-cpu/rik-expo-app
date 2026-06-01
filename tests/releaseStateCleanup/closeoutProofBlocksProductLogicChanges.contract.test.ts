import { buildReleaseStateCleanupCommitBuckets } from "../../scripts/release/releaseStateCleanupCore";

it("does not allow product logic files into the closeout commit bucket", () => {
  const report = buildReleaseStateCleanupCommitBuckets(
    " M src/lib/ai/professionalBoq/compileDynamicProfessionalBoq.ts",
  );

  expect(report.items[0]).toMatchObject({
    detectedWave: "PRODUCT_ESTIMATE_WAVE",
    bucket: "PRODUCT_ESTIMATE_WAVE_PARKED_BLOCKED",
    mayCommitInThisWave: false,
  });
  expect(report.current_wave_commit_scope_contains_product_logic).toBe(false);
});
