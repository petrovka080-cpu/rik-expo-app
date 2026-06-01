import { read } from "./performanceGuardTestHelpers";

describe("performance closeout release verify dirty scope", () => {
  it("allows only governed proof and owner-quality runtime changes inside release verify", () => {
    const auditSource = read("scripts/audit/runAiEstimatePerformanceCloseoutAudit.ts");
    const scopeSource = read("scripts/release/releaseVerifyDirtyScope.ts");

    expect(auditSource).toContain("releaseVerifyAllowedDirtyFiles");
    expect(auditSource).toContain("releaseVerifyBlockingDirtyFiles");
    expect(auditSource).toContain("release_verify_allowed_dirty_paths");
    expect(auditSource).toContain("release_verify_blocking_dirty_paths");
    expect(auditSource).toContain("worktree_dirty");
    expect(scopeSource).toContain("releaseVerifyAllowedDirtyFile");
    expect(scopeSource).toContain('process.env.RELEASE_GUARD_IN_PROGRESS === "1"');
    expect(scopeSource).toContain("isCanonicalApi34EvidencePath");
    expect(scopeSource).toContain('file.startsWith("scripts/e2e/")');
    expect(scopeSource).toContain('file.startsWith("scripts/release/")');
    expect(scopeSource).toContain('file.startsWith("tests/architecture/real10000")');
    expect(scopeSource).toContain("tests/architecture/worldConstructionReleaseReusePolicy.contract.test.ts");
  });

  it("does not broadly allow product source changes", () => {
    const source = read("scripts/release/releaseVerifyDirtyScope.ts");

    expect(source).not.toContain('file.startsWith("src/")');
    expect(source).not.toContain('file.startsWith("src/lib/ai/")');
  });
});
