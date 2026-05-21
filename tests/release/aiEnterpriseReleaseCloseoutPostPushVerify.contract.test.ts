import { buildAiEnterpriseReleaseCloseoutReport } from "../../scripts/release/runAiEnterpriseReleaseCloseoutChangeControl";

describe("AI enterprise release closeout post-push verify", () => {
  it("does not claim final green before commit, push, clean worktree, and post-push verify", () => {
    const report = buildAiEnterpriseReleaseCloseoutReport({
      precommit: {
        tsc: true,
        lint: true,
        diffCheck: true,
        fullJest: true,
        architectureGuardrails: true,
        contractRuntime: true,
        androidRuntime: true,
        releaseVerify: true,
      },
      postpush: {
        commitCreated: false,
        pushCompleted: false,
        releaseVerifyPassed: false,
      },
    });

    expect(report.matrix.final_status).toBe("BLOCKED_AI_ENTERPRISE_RELEASE_CLOSEOUT_CHANGE_CONTROL");
    expect(report.matrix.commit_created).toBe(false);
    expect(report.matrix.push_completed).toBe(false);
    expect(report.matrix.postpush_release_verify_passed).toBe(false);
  });
});
