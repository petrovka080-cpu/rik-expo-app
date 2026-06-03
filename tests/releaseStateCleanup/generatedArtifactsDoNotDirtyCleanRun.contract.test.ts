import { evaluateGeneratedArtifactHygiene } from "../../scripts/release/releaseStateCleanupCore";

it("accepts a clean run with no tracked generated artifact churn", () => {
  const report = evaluateGeneratedArtifactHygiene("");

  expect(report.final_status).toBe("GREEN_GENERATED_ARTIFACT_HYGIENE_READY");
  expect(report.tracked_artifact_churn_found).toBe(false);
  expect(report.matrix_repaint_without_proof).toBe(false);
});
