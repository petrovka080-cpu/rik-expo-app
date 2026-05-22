import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate redaction", () => {
  it("blocks secrets, raw payloads, storage keys, and private document content", () => {
    const redaction = getEnterpriseReleaseCandidateReport().redaction;
    expect(redaction.redaction_passed).toBe(true);
    expect(redaction.secrets_printed).toBe(false);
    expect(redaction.forbidden_keys).toEqual(expect.arrayContaining(["privileged_db_secret", "private_storage_object_key"]));
  });
});
