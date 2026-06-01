import { buildReleaseStateCleanupCommitBuckets } from "../../scripts/release/releaseStateCleanupCore";

it("only marks current release cleanup paths as committable", () => {
  const report = buildReleaseStateCleanupCommitBuckets(
    [
      "?? scripts/release/runProductionReleaseStateCleanupCloseoutProof.ts",
      " M src/lib/ai/estimatorKernel/buildEstimatorReasoningPlan.ts",
    ].join("\n"),
  );

  const closeoutScript = report.items.find((item) => item.path.endsWith("CloseoutProof.ts"));
  const productPath = report.items.find((item) => item.path.startsWith("src/lib/ai/"));

  expect(closeoutScript?.bucket).toBe("CURRENT_RELEASE_CLEANUP_COMMIT");
  expect(closeoutScript?.mayCommitInThisWave).toBe(true);
  expect(productPath?.detectedWave).toBe("PRODUCT_ESTIMATE_WAVE");
  expect(productPath?.mayCommitInThisWave).toBe(false);
});
