import fs from "node:fs";
import path from "node:path";

describe("live B2C release closeout generated artifacts", () => {
  it("does not let release-generated artifacts self-block the closeout gate inside release verify", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/runLiveB2cEstimateRealityReleaseCloseoutProof.ts"),
      "utf8",
    );

    expect(source).toContain("releaseGeneratedArtifactOnlyChanges");
    expect(source).toContain('startsWith("artifacts/")');
    expect(source).toContain('process.env.RELEASE_GUARD_IN_PROGRESS === "1"');
    expect(source).toContain("worktreeClean(insideReleaseVerify)");
  });

  it("records real release evidence flags instead of hardcoded false placeholders", () => {
    const proofSource = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/runLiveB2cEstimateRealityReleaseCloseoutProof.ts"),
      "utf8",
    );
    const guardSource = fs.readFileSync(path.join(process.cwd(), "scripts/release/run-release-guard.ts"), "utf8");

    expect(proofSource).toContain('boolEnv("LIVE_B2C_CLOSEOUT_TYPECHECK_PASSED")');
    expect(proofSource).toContain('boolEnv("LIVE_B2C_CLOSEOUT_ARCHITECTURE_TESTS_PASSED")');
    expect(guardSource).toContain("LIVE_B2C_CLOSEOUT_TYPECHECK_PASSED");
    expect(guardSource).toContain("LIVE_B2C_CLOSEOUT_RELEASE_VERIFY_PASSED");
    expect(proofSource).not.toContain("typecheck_passed: false");
  });

  it("reuses canonical API34 evidence only through the owner-quality guarded policy", () => {
    const proofSource = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/runLiveB2cEstimateRealityReleaseCloseoutProof.ts"),
      "utf8",
    );

    expect(proofSource).toContain("OWNER_QUALITY_CANONICAL_REUSE_REASON");
    expect(proofSource).toContain("isOwnerQualityValidatedCanonicalApi34ChangedFile");
    expect(proofSource).toContain("allowChangedFile: isOwnerQualityValidatedCanonicalApi34ChangedFile");
    expect(proofSource).toContain("allowedRuntimeReuseReason: OWNER_QUALITY_CANONICAL_REUSE_REASON");
    expect(proofSource).toContain("BLOCKED_PRODUCT_LOGIC_CHANGED");
    expect(proofSource).toContain("old_android_gates_consume_canonical_api34_evidence");
    expect(proofSource).toContain('file.startsWith("tests/architecture/real10000")');
    expect(proofSource).toContain('tests/architecture/worldConstructionReleaseReusePolicy.contract.test.ts');
  });

  it("marks the target live reality matrix as resolved by the closeout after release passes", () => {
    const proofSource = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/runLiveB2cEstimateRealityReleaseCloseoutProof.ts"),
      "utf8",
    );

    expect(proofSource).toContain("writeTargetWaveMatrix");
    expect(proofSource).toContain("resolved_by: LIVE_B2C_RELEASE_CLOSEOUT_WAVE");
    expect(proofSource).toContain('previous_blocker: "RELEASE_VERIFY_TIMEOUT"');
    expect(proofSource).toContain("targetMatrix?.resolved_by === LIVE_B2C_RELEASE_CLOSEOUT_WAVE");
  });

  it("requires the current branch upstream to be synced before green", () => {
    const proofSource = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/runLiveB2cEstimateRealityReleaseCloseoutProof.ts"),
      "utf8",
    );

    expect(proofSource).toContain('"--symbolic-full-name", "@{u}"');
    expect(proofSource).toContain("HEAD...${upstream}");
    expect(proofSource).toContain("Number(ahead) === 0 && Number(behind) === 0");
    expect(proofSource).not.toContain('["rev-parse", "origin/main"]');
  });

  it("keeps live BOQ PDF catalog artifacts stable across release-only supersession", () => {
    const proofSource = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/runLiveRequestEmbeddedAiPdfBoqCatalogFailureReproduction.ts"),
      "utf8",
    );

    expect(proofSource).toContain("isReleaseProofOnlySuperseded");
    expect(proofSource).toContain('file === "scripts/e2e/runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts"');
    expect(proofSource).toContain('file === "scripts/e2e/runLiveRequestEmbeddedAiPdfBoqCatalogFailureReproduction.ts"');
    expect(proofSource).toContain('file === "scripts/e2e/runSourceGovernanceProof.ts"');
    expect(proofSource).toContain('file === "scripts/e2e/runRequestEstimateStateMachineProof.ts"');
    expect(proofSource).toContain('file === "scripts/e2e/runRequestEstimateDraftStatePayloadProof.ts"');
    expect(proofSource).toContain('file.startsWith("scripts/release/")');
    expect(proofSource).toContain('file.startsWith("tests/release/")');
    expect(proofSource).toContain("previousStillRepresentsRuntime");
    expect(proofSource).toContain("JSON.stringify(previous.cases) === JSON.stringify(cases)");
    expect(proofSource).not.toContain('file.startsWith("scripts/e2e/")');
    expect(proofSource).not.toContain('file.startsWith("src/")');
  });
});
