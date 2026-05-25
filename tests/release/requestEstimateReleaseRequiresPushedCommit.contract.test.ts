import { isPushedCommitEvidenceValid } from "../../scripts/release/runRequestEstimateCatalogBoqLiveReleaseGate";

const SHA = "0123456789abcdef0123456789abcdef01234567";

describe("request estimate release gate requires pushed commit", () => {
  it("accepts only exact remote containment evidence", () => {
    expect(isPushedCommitEvidenceValid({ headSha: SHA, remoteSha: SHA })).toBe(true);
    expect(isPushedCommitEvidenceValid({ headSha: SHA, remoteSha: "fedcba9876543210fedcba9876543210fedcba98" })).toBe(false);
    expect(isPushedCommitEvidenceValid({ headSha: "not-a-sha", remoteSha: "not-a-sha" })).toBe(false);
  });
});
