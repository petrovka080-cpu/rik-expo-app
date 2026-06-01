import { buildGeneratedArtifactChurnDiagnosis } from "../../scripts/release/releaseStateCleanupCore";

it("names the runner and action required for tracked generated artifact churn", () => {
  const report = buildGeneratedArtifactChurnDiagnosis(
    [
      " M artifacts/S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_ai_pdf_manifest.json",
      " M artifacts/pdf/ai-estimate-pdf-tabular-regression/roof_waterproofing.pdf",
    ].join("\n"),
  );

  expect(report.final_status).toBe("TRACKED_ARTIFACT_CHURN_FOUND");
  expect(report.changed_artifacts).toEqual([
    {
      path: "artifacts/pdf/ai-estimate-pdf-tabular-regression/roof_waterproofing.pdf",
      status: "M",
      tracked: true,
      reason: "NONDETERMINISTIC_RUNNER_OUTPUT",
      action: "REGENERATE_STABLE",
      runner: "scripts/e2e/runAiEstimatePdfTabularRegressionProof.ts",
    },
    {
      path: "artifacts/S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_ai_pdf_manifest.json",
      status: "M",
      tracked: true,
      reason: "NONDETERMINISTIC_RUNNER_OUTPUT",
      action: "REGENERATE_STABLE",
      runner: "scripts/e2e/runAiEstimatePdfSafeIntegrationProof.ts",
    },
  ]);
});
