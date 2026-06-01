import { evaluateReleaseGuardConsistency } from "../../scripts/release/releaseStateCleanupCore";
import { tempReleaseRoot, writeJson, writeText } from "./releaseStateCleanupTestHelpers";

it("rejects stale green matrices as current release truth", () => {
  const root = tempReleaseRoot();
  writeJson(root, "artifacts/S_STALE/matrix.json", {
    final_status: "GREEN_STALE_READY",
    head_sha: "old-head",
    fake_green_claimed: false,
  });
  writeJson(root, "artifacts/S_STALE/failures.json", []);
  writeText(root, "artifacts/S_STALE/proof.md", "proof");

  const report = evaluateReleaseGuardConsistency({
    rootDir: root,
    requiredGates: [],
    ownerOnlyGates: [],
    matrixPathList: ["artifacts/S_STALE/matrix.json"],
    currentHead: "new-head",
  });

  expect(report.final_status).toBe("BLOCKED_RELEASE_GUARD_STALE_MATRIX");
  expect(report.release_guard_stale_matrix_found).toBe(true);
});
