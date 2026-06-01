import { buildReleaseGuardTripletResolution } from "../../scripts/release/releaseStateCleanupCore";
import { tempReleaseRoot, writeJson, writeText } from "./releaseStateCleanupTestHelpers";

it("rejects a green matrix when failures.json is missing", () => {
  const root = tempReleaseRoot();
  writeJson(root, "artifacts/S_GREEN/matrix.json", { final_status: "GREEN_READY" });
  writeText(root, "artifacts/S_GREEN/proof.md", "proof");

  const report = buildReleaseGuardTripletResolution(root);

  expect(report.final_status).toBe("BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_FAILURES");
  expect(report.green_matrix_without_failures_json_found).toBe(true);
  expect(report.checks[0].blocker).toBe("BLOCKED_GREEN_MATRIX_WITHOUT_FAILURES_JSON");
});
