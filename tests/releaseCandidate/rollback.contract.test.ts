import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate rollback", () => {
  it("keeps old screens and PDF history readable after flag rollback", () => {
    const rollback = getEnterpriseReleaseCandidateReport().rollback;
    expect(rollback.rollback_proof_passed).toBe(true);
    expect(rollback.history_pdfs_still_open).toBe(true);
    expect(rollback.marketplace_add_still_opens).toBe(true);
    expect(rollback.no_crash_after_rollback).toBe(true);
  });
});

