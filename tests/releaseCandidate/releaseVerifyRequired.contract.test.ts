import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate release verify gate", () => {
  it("keeps release:verify as an explicit required final gate", () => {
    const matrix = getEnterpriseReleaseCandidateReport().matrix;
    expect(matrix.release_verify_passed).toBe(false);
    expect(matrix.fake_green_claimed).toBe(false);
    expect(matrix.proof_runners_passed).toBe(true);
  });
});

