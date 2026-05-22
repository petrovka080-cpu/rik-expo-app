import { ENTERPRISE_RELEASE_CANDIDATE_FLAGS } from "../../scripts/e2e/enterpriseReleaseCandidatePolicy";
import { getEnterpriseReleaseCandidateReport } from "../releaseCandidate/releaseCandidateTestHarness";

describe("release candidate feature flags required", () => {
  it("locks all required rollout flags", () => {
    const flags = getEnterpriseReleaseCandidateReport().flags;
    expect(flags.flags).toEqual(expect.arrayContaining([...ENTERPRISE_RELEASE_CANDIDATE_FLAGS]));
    expect(flags.feature_flags_default_safe).toBe(true);
  });
});
