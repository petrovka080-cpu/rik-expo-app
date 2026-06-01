import { buildReleaseGuardGreenWithoutFailuresDiagnosis } from "../../scripts/release/releaseStateCleanupCore";
import { tempReleaseRoot, writeJson, writeText } from "./releaseStateCleanupTestHelpers";

it("diagnoses green matrices that do not have failures as an empty array", () => {
  const root = tempReleaseRoot();
  writeJson(root, "artifacts/S_WORLD_CONSTRUCTION_50000_PLUS_REALITY/matrix.json", {
    final_status: "GREEN_WORLD_CONSTRUCTION_50000_PLUS_SHARDED_LIVE_REALITY_READY",
  });
  writeText(root, "artifacts/S_WORLD_CONSTRUCTION_50000_PLUS_REALITY/proof.md", "proof");
  writeJson(root, "artifacts/S_WORLD_CONSTRUCTION_ESTIMATE_ENGINE/matrix.json", {
    final_status: "GREEN_AI_ASSISTANT_WORLD_CONSTRUCTION_ESTIMATE_ENGINE_READY",
  });
  writeJson(root, "artifacts/S_WORLD_CONSTRUCTION_ESTIMATE_ENGINE/failures.json", {
    blockers: [],
  });
  writeText(root, "artifacts/S_WORLD_CONSTRUCTION_ESTIMATE_ENGINE/proof.md", "proof");

  const report = buildReleaseGuardGreenWithoutFailuresDiagnosis(root);

  expect(report.final_status).toBe("BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_FAILURES");
  expect(report.artifact_diagnoses[0].statuses).toContain("BLOCKED_GREEN_MATRIX_WITHOUT_FAILURES_JSON");
  expect(report.artifact_diagnoses[1].statuses).toContain("BLOCKED_GREEN_MATRIX_WITH_NONEMPTY_FAILURES");
  expect(report.fake_green_claimed).toBe(false);
});
