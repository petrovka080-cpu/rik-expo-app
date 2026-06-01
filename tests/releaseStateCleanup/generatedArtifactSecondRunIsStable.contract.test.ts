import { buildGeneratedArtifactChurnResolution } from "../../scripts/release/releaseStateCleanupCore";

it("keeps generated artifact churn resolution stable across repeated audit reads", () => {
  const status = " M artifacts/S_AI_ESTIMATE_CORE_COMPLETION_tax_trace.json";

  const first = buildGeneratedArtifactChurnResolution(status);
  const second = buildGeneratedArtifactChurnResolution(status);

  expect(second).toEqual(first);
  expect(second.generated_artifact_second_run_stable).toBe(true);
  expect(second.final_status).toBe("BLOCKED_TRACKED_ARTIFACT_CHURN_FOUND");
});
