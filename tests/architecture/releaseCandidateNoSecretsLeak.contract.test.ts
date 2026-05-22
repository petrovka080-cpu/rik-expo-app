import { getEnterpriseReleaseCandidateReport } from "../releaseCandidate/releaseCandidateTestHarness";

describe("release candidate secret redaction", () => {
  it("does not allow service-role, DB URL, signed-token or raw payload leaks", () => {
    const redaction = getEnterpriseReleaseCandidateReport().redaction;
    expect(redaction.secrets_printed).toBe(false);
    expect(redaction.debug_payload_leak_found).toBe(false);
    expect(redaction.forbidden_literal_leaks).toEqual([]);
  });
});

