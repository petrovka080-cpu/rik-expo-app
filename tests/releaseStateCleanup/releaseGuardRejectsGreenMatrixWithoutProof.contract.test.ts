import { buildReleaseGuardTripletResolution } from "../../scripts/release/releaseStateCleanupCore";
import { tempReleaseRoot, writeJson } from "./releaseStateCleanupTestHelpers";

it("rejects a green matrix when proof.md is missing", () => {
  const root = tempReleaseRoot();
  writeJson(root, "artifacts/S_GREEN/matrix.json", { final_status: "GREEN_READY" });
  writeJson(root, "artifacts/S_GREEN/failures.json", []);

  const report = buildReleaseGuardTripletResolution(root);

  expect(report.final_status).toBe("BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_PROOF");
  expect(report.green_matrix_without_proof_found).toBe(true);
  expect(report.checks[0].blocker).toBe("BLOCKED_GREEN_MATRIX_WITHOUT_PROOF");
});
