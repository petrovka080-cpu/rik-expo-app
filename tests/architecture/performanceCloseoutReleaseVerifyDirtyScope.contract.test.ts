import { read } from "./performanceGuardTestHelpers";

describe("performance closeout release verify dirty scope", () => {
  it("reports strict dirty scope paths inside release verify", () => {
    const auditSource = read("scripts/audit/runAiEstimatePerformanceCloseoutAudit.ts");
    const scopeSource = read("scripts/release/releaseVerifyDirtyScope.ts");

    expect(auditSource).toContain("releaseVerifyAllowedDirtyFiles");
    expect(auditSource).toContain("releaseVerifyBlockingDirtyFiles");
    expect(auditSource).toContain("release_verify_allowed_dirty_paths");
    expect(auditSource).toContain("release_verify_blocking_dirty_paths");
    expect(auditSource).toContain("worktree_dirty");
    expect(scopeSource).toContain("releaseVerifyAllowedDirtyFile");
    expect(scopeSource).toContain('process.env.RELEASE_GUARD_IN_PROGRESS === "1"');
    expect(scopeSource).toContain("isOwnerQualityValidatedCanonicalApi34ChangedFile");
    expect(scopeSource).toContain("return false");
    expect(scopeSource).not.toContain("proofArtifactAllowlist");
  });

  it("does not broadly allow product source changes", () => {
    const source = read("scripts/release/releaseVerifyDirtyScope.ts");

    expect(source).not.toContain('file.startsWith("src/")');
    expect(source).not.toContain('file.startsWith("src/lib/ai/")');
  });
});
