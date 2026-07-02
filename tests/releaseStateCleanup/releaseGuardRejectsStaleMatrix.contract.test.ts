import fs from "node:fs";
import path from "node:path";

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

it("does not let archived unregistered matrices block the current release guard", () => {
  const root = tempReleaseRoot();
  writeJson(root, "artifacts/S_ARCHIVED/matrix.json", {
    final_status: "GREEN_ARCHIVED_READY",
    head_sha: "old-head",
    fake_green_claimed: false,
  });
  writeText(root, "artifacts/S_ARCHIVED/proof.md", "proof");
  writeJson(root, "artifacts/S_ARCHIVED/failures.json", []);

  const report = evaluateReleaseGuardConsistency({
    rootDir: root,
    requiredGates: [],
    ownerOnlyGates: [],
    currentHead: "new-head",
  });

  expect(report.final_status).toBe("GREEN_RELEASE_GUARD_CONSISTENCY_READY");
  expect(report.stale_green_matrices).toEqual([]);
});

it("still rejects stale matrices that are managed by a release gate", () => {
  const root = tempReleaseRoot();
  writeText(root, "scripts/release/verifyExistingProofArtifact.ts", "export {};");
  writeJson(root, "artifacts/S_REQUIRED/matrix.json", {
    final_status: "GREEN_REQUIRED_READY",
    head_sha: "old-head",
    fake_green_claimed: false,
  });
  writeText(root, "artifacts/S_REQUIRED/proof.md", "proof");
  writeJson(root, "artifacts/S_REQUIRED/failures.json", []);

  const report = evaluateReleaseGuardConsistency({
    rootDir: root,
    requiredGates: [
      {
        name: "tsc",
        command:
          "npx tsx scripts/release/verifyExistingProofArtifact.ts --artifact artifacts/S_REQUIRED/matrix.json --expect-status GREEN_REQUIRED_READY --expect-fake-green false",
      },
    ],
    ownerOnlyGates: [],
    currentHead: "new-head",
  });

  expect(report.final_status).toBe("BLOCKED_RELEASE_GUARD_STALE_MATRIX");
  expect(report.stale_green_matrices).toEqual(["artifacts/S_REQUIRED/matrix.json"]);
});

it("uses proof lineage verification instead of raw head equality for artifact-only supersession", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts/release/releaseStateCleanupCore.ts"),
    "utf8",
  );

  expect(source).toContain("verifyProofLineage");
  expect(source).toContain("artifact_only_supersession_allowed");
  expect(source).toContain("artifactPaths: [`${artifactDir}/`]");
  expect(source).not.toContain("matrixHead && currentHead && matrixHead !== currentHead");
});
