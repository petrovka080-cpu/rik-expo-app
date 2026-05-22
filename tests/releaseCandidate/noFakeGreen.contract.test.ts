import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate no fake green", () => {
  it("requires previous green, proofs, RLS, 50k, rollback and redaction before candidate readiness", () => {
    const report = getEnterpriseReleaseCandidateReport();
    expect(report.previous.previous_wave_green).toBe(true);
    expect(report.matrix.fake_green_claimed).toBe(false);
    expect(report.matrix.web_runtime_proof_passed).toBe(true);
    expect(report.matrix.android_emulator_proof_passed).toBe(true);
    expect(report.matrix.rls_live_proof_passed).toBe(true);
    expect(report.matrix.fake_50k_green_on_empty_db).toBe(false);
    expect(report.matrix.rollback_proof_passed).toBe(true);
    expect(report.matrix.redaction_passed).toBe(true);
  });
});

