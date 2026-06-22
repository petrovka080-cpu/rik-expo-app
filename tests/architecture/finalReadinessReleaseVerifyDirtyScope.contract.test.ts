import fs from "node:fs";
import path from "node:path";

describe("final readiness release verify dirty scope", () => {
  it("uses the shared governed dirty scope for final worktree clean", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/audit/runAiEstimateEnterpriseFinalReadinessGoNoGo.ts"),
      "utf8",
    );

    expect(source).toContain("releaseVerifyAllowedDirtyFiles");
    expect(source).toContain("releaseVerifyBlockingDirtyFiles");
    expect(source).toContain("releaseVerifyBlockingDirty.length > 0");
    expect(source).toContain("WORKTREE_NOT_CLEAN");
    expect(source).toContain("release_verify_allowed_dirty_paths");
    expect(source).toContain("release_verify_blocking_dirty_paths");
    expect(source).toContain("final_worktree_clean: verification.finalWorktreeClean && releaseVerifyBlockingDirty.length === 0");
  });

  it("keeps the shared scope strict and blocks all verify-time mutation", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts/release/releaseVerifyDirtyScope.ts"), "utf8");

    expect(source).toContain("isOwnerQualityValidatedCanonicalApi34ChangedFile");
    expect(source).toContain("return false");
    expect(source).not.toContain("proofArtifactAllowlist");
    expect(source).not.toContain('file.startsWith("src/")');
    expect(source).not.toContain('file.startsWith("src/lib/ai/")');
  });
});
