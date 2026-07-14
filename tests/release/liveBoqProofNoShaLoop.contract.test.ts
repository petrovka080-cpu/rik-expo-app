import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { classifyProofLineageChangedFiles } from "../../scripts/release/proofLineageVerifier";
import {
  LIVE_BOQ_TRACKED_GREEN_STATUS,
  verifyLiveBoqArtifactFixture,
} from "../../scripts/release/liveBoqProductGate.shared";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const LIVE_BOQ_ARTIFACT_PATHS = [
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/failure_reproduction.json",
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/matrix.json",
];

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function greenArtifact(sourceCodeHead: string, fakeGreenClaimed = false) {
  return {
    final_status: LIVE_BOQ_TRACKED_GREEN_STATUS,
    fake_green_claimed: fakeGreenClaimed,
    source_code_head: sourceCodeHead,
    artifact_only_supersession_allowed: true,
  };
}

describe("live BOQ proof no SHA loop", () => {
  it("records source lineage fields in refresh artifacts", () => {
    const failureRunner = fs.readFileSync(
      path.join(PROJECT_ROOT, "scripts/e2e/runLiveRequestEmbeddedAiPdfBoqCatalogFailureReproduction.ts"),
      "utf8",
    );
    const webSpec = fs.readFileSync(
      path.join(PROJECT_ROOT, "tests/e2e/liveRequestEmbeddedAiProfessionalBoqPdfCatalog.web.spec.ts"),
      "utf8",
    );
    const androidRunner = fs.readFileSync(
      path.join(PROJECT_ROOT, "scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts"),
      "utf8",
    );

    for (const source of [failureRunner, webSpec, androidRunner]) {
      expect(source).toContain("source_code_head");
      expect(source).toContain("artifact_commit_head");
      expect(source).toContain("current_head_at_write_time");
      expect(source).toContain("artifact_only_supersession_allowed");
      expect(source).toContain("fake_green_claimed");
    }

    const matrixRunner = fs.readFileSync(
      path.join(PROJECT_ROOT, "scripts/e2e/runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts"),
      "utf8",
    );
    expect(matrixRunner).toContain("S_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_FIX");
    expect(matrixRunner).toContain('scripts/e2e/proofMarkdownSection.ts');
    expect(matrixRunner).toContain('scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts');
    expect(matrixRunner).toContain('scripts/e2e/runAndroidEmulatorAdbUnblockReplayB2cExpandedEstimateFix.ts');
    expect(matrixRunner).toContain('scripts/e2e/runB2cRequestEmbeddedAiExpandedEstimateFixProof.ts');
    expect(matrixRunner).toContain('scripts/e2e/runEstimateRevisionCloseout.ts');
    expect(matrixRunner).toContain('scripts/e2e/runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts');
    expect(matrixRunner).toContain('scripts/e2e/runLiveRequestEmbeddedAiPdfBoqCatalogFailureReproduction.ts');
    expect(failureRunner).toContain('file === "scripts/e2e/proofMarkdownSection.ts"');
    expect(failureRunner).toContain('file === "scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts"');
    expect(failureRunner).toContain('file === "scripts/e2e/runAndroidEmulatorAdbUnblockReplayB2cExpandedEstimateFix.ts"');
    expect(failureRunner).toContain('file === "scripts/e2e/runB2cRequestEmbeddedAiExpandedEstimateFixProof.ts"');
  });

  it("verifies live BOQ lineage with deterministic fixtures instead of current tracked artifacts", () => {
    const currentHead = git(["rev-parse", "HEAD"]);
    const previousHead = git(["rev-parse", "HEAD~1"]);

    expect(
      verifyLiveBoqArtifactFixture({
        artifact: greenArtifact(currentHead),
        currentHead,
        artifactPaths: LIVE_BOQ_ARTIFACT_PATHS,
      }),
    ).toMatchObject({ passed: true, reason: null });

    expect(
      verifyLiveBoqArtifactFixture({
        artifact: { ...greenArtifact(previousHead), artifact_only_supersession_allowed: false },
        currentHead,
        artifactPaths: LIVE_BOQ_ARTIFACT_PATHS,
      }),
    ).toMatchObject({ passed: false, reason: "SOURCE_CODE_CHANGED_AFTER_PROOF" });

    expect(
      verifyLiveBoqArtifactFixture({
        artifact: greenArtifact("not-a-real-commit-sha"),
        currentHead,
        artifactPaths: LIVE_BOQ_ARTIFACT_PATHS,
      }),
    ).toMatchObject({ passed: false, reason: "PROOF_LINEAGE_DIFF_UNAVAILABLE" });

    expect(
      verifyLiveBoqArtifactFixture({
        artifact: greenArtifact(currentHead, true),
        currentHead,
        artifactPaths: LIVE_BOQ_ARTIFACT_PATHS,
      }),
    ).toMatchObject({ passed: false, reason: "LIVE_BOQ_FAKE_GREEN" });
  });

  it("allows artifact-only supersession only for the exact live BOQ artifact allowlist", () => {
    const artifactOnly = classifyProofLineageChangedFiles({
      changedFiles: ["artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/matrix.json"],
      artifactPaths: LIVE_BOQ_ARTIFACT_PATHS,
    });
    const productSourceChange = classifyProofLineageChangedFiles({
      changedFiles: [
        "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/matrix.json",
        "src/lib/ai/globalEstimate/globalEstimateCalculator.ts",
      ],
      artifactPaths: LIVE_BOQ_ARTIFACT_PATHS,
    });

    expect(artifactOnly.sourceChangesSinceProof).toEqual([]);
    expect(artifactOnly.artifactChangesSinceProof).toEqual([
      "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/matrix.json",
    ]);
    expect(productSourceChange.unapprovedSourceChangesSinceProof).toEqual([
      "src/lib/ai/globalEstimate/globalEstimateCalculator.ts",
    ]);
  });
});
