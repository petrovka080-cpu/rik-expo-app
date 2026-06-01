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

  it("keeps the shared scope narrow and blocks arbitrary product paths", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts/release/releaseVerifyDirtyScope.ts"), "utf8");

    expect(source).toContain("isCanonicalApi34EvidencePath");
    expect(source).toContain('file.startsWith("scripts/e2e/")');
    expect(source).toContain('file.startsWith("scripts/release/")');
    expect(source).toContain('file.startsWith("tests/architecture/ownerQuality")');
    expect(source).toContain('file.startsWith("tests/architecture/real10000")');
    expect(source).not.toContain('file.startsWith("src/")');
    expect(source).not.toContain('file.startsWith("src/lib/ai/")');
  });
});
