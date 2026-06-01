import { buildReleaseGuardTripletResolution } from "../../scripts/release/releaseStateCleanupCore";
import { tempReleaseRoot, writeJson, writeText } from "./releaseStateCleanupTestHelpers";

it("rejects a green matrix when the recorded source fingerprint is stale", () => {
  const root = tempReleaseRoot();
  writeText(root, "src/proof-source.ts", "current source");
  writeJson(root, "artifacts/S_GREEN/matrix.json", {
    final_status: "GREEN_READY",
    source_fingerprint_algorithm: "sha256:v1",
    source_fingerprint: "not-current",
    source_fingerprint_files: ["src/proof-source.ts"],
  });
  writeJson(root, "artifacts/S_GREEN/failures.json", []);
  writeText(root, "artifacts/S_GREEN/proof.md", "proof");

  const report = buildReleaseGuardTripletResolution(root);

  expect(report.final_status).toBe("BLOCKED_RELEASE_GUARD_STALE_MATRIX");
  expect(report.stale_green_matrix_found).toBe(true);
  expect(report.checks[0].blocker).toBe("BLOCKED_SOURCE_FINGERPRINT_MISMATCH");
});
