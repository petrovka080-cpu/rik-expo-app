import { createHash } from "node:crypto";
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

const canonicalMatrices = [
  "artifacts/S_SECURITY_PRIVACY_matrix.json",
  "artifacts/S_OBSERVABILITY_matrix.json",
  "artifacts/S_RELEASE_PIPELINE_matrix.json",
] as const;

const sha256 = (filePath: string): string =>
  createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

describe("preflight canonical evidence immutability", () => {
  it("keeps canonical matrices byte-identical and writes completed run-scoped diagnostics", () => {
    const before = Object.fromEntries(
      canonicalMatrices.map((relativePath) => [
        relativePath,
        sha256(path.join(process.cwd(), relativePath)),
      ]),
    );

    const security = writeSecurityPrivacyRunArtifacts(
      buildSecurityPrivacyReport(),
    );
    const observability = writeObservabilityOpsRunArtifacts(
      buildObservabilityOpsReport(),
    );
    const release =
      writeReleasePipelineNoTimeoutMobileRuntimeRunArtifacts(
        buildReleasePipelineNoTimeoutMobileRuntimeReport(),
      ).run;

    expect(
      Object.fromEntries(
        canonicalMatrices.map((relativePath) => [
          relativePath,
          sha256(path.join(process.cwd(), relativePath)),
        ]),
      ),
    ).toEqual(before);

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
