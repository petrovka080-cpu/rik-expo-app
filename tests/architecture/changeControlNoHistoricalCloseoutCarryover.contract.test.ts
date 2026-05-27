import { changeControlSource } from "./changeControlArchitectureTestHelpers";

describe("change control architecture - no historical closeout carryover", () => {
  it("uses current source fingerprint and current git state for release closeout truth", () => {
    const source = changeControlSource();

    expect(source).toContain("currentChangeControlProofFingerprint");
    expect(source).toContain("evidenceFlagForCurrentSource");
    expect(source).toContain("stale_previous_evidence_ignored");
    expect(source).toContain("const commitCreated = git.commitCreated");
    expect(source).toContain("const branchPushed = git.branchPushed");
    expect(source).toContain("const finalWorktreeClean = git.finalWorktreeClean");
    expect(source).not.toContain('evidenceFlag(previousMatrix, "final_worktree_clean"');
    expect(source).not.toContain('evidenceFlag(previousMatrix, "branch_pushed"');
    expect(source).not.toContain('evidenceFlag(previousMatrix, "commit_created"');
  });
});
