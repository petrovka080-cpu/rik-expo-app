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
});
