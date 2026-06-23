import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate Android proof", () => {
  it("requires emulator proof without fatal, ANR, or ReactNativeJS fatal", () => {
    const report = getEnterpriseReleaseCandidateReport();
    const android = report.android;
    if (!android.android_emulator_proof_passed || !android.maestro_proof_passed) {
      expect(report.matrix.final_status).toBe("BLOCKED_ENTERPRISE_RELEASE_CANDIDATE_NOT_READY");
      expect(report.matrix.blockers).toContain("release_candidate_proof_runner_not_green");
      expect(report.matrix.fake_green_claimed).toBe(false);
      return;
    }

    expect(android.android_emulator_proof_passed).toBe(true);
    expect(android.maestro_proof_passed).toBe(true);
    expect(android.logcat_fatal_found).toBe(false);
    expect(android.anr_found).toBe(false);
    expect(android.react_native_js_fatal_found).toBe(false);
  });
});
