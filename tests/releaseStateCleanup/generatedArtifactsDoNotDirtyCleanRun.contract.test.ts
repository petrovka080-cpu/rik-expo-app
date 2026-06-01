import { evaluateGeneratedArtifactHygiene } from "../../scripts/release/releaseStateCleanupCore";

it("accepts a clean run with no tracked generated artifact churn", () => {
  const report = evaluateGeneratedArtifactHygiene("");

  expect(report.final_status).toBe("GREEN_GENERATED_ARTIFACT_HYGIENE_READY");
  expect(report.tracked_artifact_churn_found).toBe(false);
  expect(report.matrix_repaint_without_proof).toBe(false);
});

it("accepts staged current cleanup proof artifacts as owned proof", () => {
  const report = evaluateGeneratedArtifactHygiene(
    [
      "A  artifacts/S_PRODUCTION_RELEASE_STATE_CLEANUP/generated_artifact_hygiene.json",
      "A  artifacts/S_PRODUCTION_RELEASE_STATE_CLEANUP_BLOCKER_REDUCTION/generated_artifact_churn_diagnosis.json",
      "A  artifacts/S_PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT/generated_artifact_churn_resolution.json",
      "A  artifacts/S_PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT/matrix.json",
      "A  artifacts/S_PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT/failures.json",
    ].join("\n"),
  );

  expect(report.final_status).toBe("GREEN_GENERATED_ARTIFACT_HYGIENE_READY");
  expect(report.tracked_artifact_churn_found).toBe(false);
  expect(report.matrix_repaint_without_proof).toBe(false);
});
