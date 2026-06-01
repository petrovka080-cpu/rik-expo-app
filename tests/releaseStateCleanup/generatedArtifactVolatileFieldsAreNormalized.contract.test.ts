import { buildGeneratedArtifactChurnResolution } from "../../scripts/release/releaseStateCleanupCore";

it("requires volatile tracked generated artifacts to be normalized by their runner", () => {
  const report = buildGeneratedArtifactChurnResolution(
    " M artifacts/pdf/ai-estimate-pdf-safe-integration/gable_roof_installation_100sqm.pdf",
  );

  expect(report.resolutions[0]).toMatchObject({
    action: "NORMALIZE_VOLATILE_FIELDS",
    deterministic: false,
    runner: "scripts/e2e/runAiEstimatePdfSafeIntegrationProof.ts",
  });
  expect(report.resolutions[0].volatileFields).toContain("creation_date");
});
