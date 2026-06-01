import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate release verify gate", () => {
  it("keeps release:verify as an explicit required final gate", () => {
    const matrix = getEnterpriseReleaseCandidateReport().matrix;
    expect(matrix.release_verify_passed).toBe(false);
    expect(matrix.fake_green_claimed).toBe(false);
    if (!matrix.proof_runners_passed) {
      expect(matrix.final_status).toBe("BLOCKED_ENTERPRISE_RELEASE_CANDIDATE_NOT_READY");
      expect(matrix.blockers).toContain("release_candidate_proof_runner_not_green");
      return;
    }

    expect(matrix.proof_runners_passed).toBe(true);
  });
});
