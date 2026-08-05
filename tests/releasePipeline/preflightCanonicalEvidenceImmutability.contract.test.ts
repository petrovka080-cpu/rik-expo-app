import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  buildObservabilityOpsReport,
  writeObservabilityOpsRunArtifacts,
} from "../../scripts/audit/observabilityOps.shared";
import {
  buildSecurityPrivacyReport,
  writeSecurityPrivacyRunArtifacts,
} from "../../scripts/audit/securityPrivacyHardening.shared";
import {
  buildReleasePipelineNoTimeoutMobileRuntimeReport,
  writeReleasePipelineNoTimeoutMobileRuntimeRunArtifacts,
} from "../../scripts/release/releasePipelineNoTimeoutMobileRuntime.shared";
import {
  prepareManifestBackedRuntimeSnapshot,
  sha256File,
} from "../../scripts/verification/requiredArtifactPreflight";

const manifestPath = path.join(
  process.cwd(),
  "verification/v1/required-artifacts.manifest.json",
);

describe("preflight canonical evidence immutability", () => {
  const securityArtifactPath = "artifacts/S_SECURITY_PRIVACY_matrix.json";

  it("keeps canonical matrices byte-identical and writes completed run-scoped diagnostics", () => {
    const securityReport = buildSecurityPrivacyReport();
    const observabilityReport = buildObservabilityOpsReport();
    const releaseReport = buildReleasePipelineNoTimeoutMobileRuntimeReport();
    const snapshots = [
      prepareManifestBackedRuntimeSnapshot({
        root: process.cwd(),
        manifestPath,
        artifactPath: "artifacts/S_SECURITY_PRIVACY_matrix.json",
        artifactValue: securityReport.matrix,
      }),
      prepareManifestBackedRuntimeSnapshot({
        root: process.cwd(),
        manifestPath,
        artifactPath: "artifacts/S_OBSERVABILITY_matrix.json",
        artifactValue: observabilityReport.matrix,
      }),
      prepareManifestBackedRuntimeSnapshot({
        root: process.cwd(),
        manifestPath,
        artifactPath: "artifacts/S_RELEASE_PIPELINE_matrix.json",
        artifactValue: releaseReport.matrix,
      }),
    ];
    const before = snapshots.map((snapshot) => sha256File(snapshot.snapshot_path));

    const security = writeSecurityPrivacyRunArtifacts(
      securityReport,
    );
    const observability = writeObservabilityOpsRunArtifacts(
      observabilityReport,
    );
    const release =
      writeReleasePipelineNoTimeoutMobileRuntimeRunArtifacts(
        releaseReport,
      ).run;

    expect(snapshots.map((snapshot) => sha256File(snapshot.snapshot_path))).toEqual(before);
    for (const snapshot of snapshots) {
      expect(snapshot.source_sha).toBe(execFileSync(
        "git", ["rev-parse", "HEAD"], { encoding: "utf8" },
      ).trim());
      expect(snapshot.snapshot_path.replace(/\\/g, "/")).toContain(
        `/.release-runtime/${snapshot.source_sha}/${snapshot.run_id}/${snapshot.worker_id}/${snapshot.artifact_id}/`,
      );
      expect(snapshot.content_sha256).toBe(sha256File(snapshot.snapshot_path));
    }

    for (const result of [security, observability, release]) {
      expect(result.runDirectory.replace(/\\/g, "/")).toContain(
        `/artifacts/runs/${result.subjectSha}/${result.gateId}/`,
      );
      const manifest = JSON.parse(
        fs.readFileSync(result.manifestPath, "utf8"),
      ) as Record<string, unknown>;
      expect(manifest.subject_sha).toBe(result.subjectSha);
      expect(manifest.writer_complete).toBe(true);
      expect(manifest.fake_green_claimed).toBe(false);
      expect(
        fs
          .readdirSync(result.runDirectory)
          .some((fileName) => fileName.endsWith(".tmp")),
      ).toBe(false);
    }
  });

  it("fails closed when the manifest entry is missing", () => {
    expect(() =>
      prepareManifestBackedRuntimeSnapshot({
        root: process.cwd(),
        manifestPath,
        artifactPath: "artifacts/S_UNKNOWN_CANONICAL_matrix.json",
        artifactValue: buildSecurityPrivacyReport().matrix,
      }),
    ).toThrow("required_artifact_manifest_entry_missing");
  });

  it("fails closed for corrupt producer output", () => {
    expect(() =>
      prepareManifestBackedRuntimeSnapshot({
        root: process.cwd(),
        manifestPath,
        artifactPath: securityArtifactPath,
        artifactValue: "corrupt-json-payload",
      }),
    ).toThrow("required_artifact_schema_invalid");
  });

  it("fails closed for wrong source SHA lineage", () => {
    expect(() =>
      prepareManifestBackedRuntimeSnapshot({
        root: process.cwd(),
        manifestPath,
        artifactPath: securityArtifactPath,
        artifactValue: buildSecurityPrivacyReport().matrix,
        subjectSha: "0".repeat(40),
      }),
    ).toThrow("required_artifact_source_sha_mismatch");
  });

  it("fails closed for a wrong producer content hash", () => {
    expect(() =>
      prepareManifestBackedRuntimeSnapshot({
        root: process.cwd(),
        manifestPath,
        artifactPath: securityArtifactPath,
        artifactValue: buildSecurityPrivacyReport().matrix,
        expectedContentSha256: "0".repeat(64),
      }),
    ).toThrow("required_artifact_content_hash_mismatch");
  });

  it("isolates parallel worker snapshots without changing their bytes", () => {
    const matrix = buildSecurityPrivacyReport().matrix;
    const left = prepareManifestBackedRuntimeSnapshot({
      root: process.cwd(),
      manifestPath,
      artifactPath: securityArtifactPath,
      artifactValue: matrix,
      runId: "parallel-contract",
      workerId: "worker-left",
    });
    const right = prepareManifestBackedRuntimeSnapshot({
      root: process.cwd(),
      manifestPath,
      artifactPath: securityArtifactPath,
      artifactValue: matrix,
      runId: "parallel-contract",
      workerId: "worker-right",
    });

    expect(left.snapshot_path).not.toBe(right.snapshot_path);
    expect(left.content_sha256).toBe(right.content_sha256);
    expect(sha256File(left.snapshot_path)).toBe(sha256File(right.snapshot_path));
  });

  it("requires an explicit canonical-write argument in every CLI owner", () => {
    for (const relativePath of [
      "scripts/audit/securityPrivacyHardening.shared.ts",
      "scripts/audit/observabilityOps.shared.ts",
      "scripts/release/runReleasePipelineNoTimeoutMobileRuntimeProof.ts",
      "scripts/release/runIosOtaRuntimeResolutionProof.ts",
    ]) {
      expect(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"))
        .toContain('--write-canonical');
    }
  });

  it("requires cross-worktree evidence copies to carry SHA and hash lineage", () => {
    const runner = fs.readFileSync(
      path.join(
        process.cwd(),
        "scripts/release/runCurrentCoreRemediation153.ts",
      ),
      "utf8",
    );
    expect(runner).toContain("sourceRepositorySha");
    expect(runner).toContain("destinationSubjectSha");
    expect(runner).toContain("diagnostic_cross_sha_supersession");
    expect(runner).toContain(
      "CURRENT_CORE_REMEDIATION_EVIDENCE_OVERRIDE_ROOTS",
    );
    expect(runner).toContain(
      "CURRENT_CORE_REMEDIATION_EVIDENCE_OVERRIDE_PATHS",
    );
    expect(runner).toContain(
      "REMEDIATION_EVIDENCE_OVERRIDE_PATH_UNKNOWN",
    );
    expect(runner).toContain("overridePaths.has(relativePath)");
    expect(runner).toContain("diagnostic_multi_source_supersession");
    expect(runner).toContain("sourceRoot: selectedSource.root");
    expect(runner).toContain(
      "sourceRepositorySha: selectedSource.repositorySha",
    );
    expect(runner).toContain(
      "REMEDIATION_EVIDENCE_SUPERSESSION_HASH_MISMATCH",
    );
    expect(runner).toContain("canonicalFinalEvidence: false");
  });
});
