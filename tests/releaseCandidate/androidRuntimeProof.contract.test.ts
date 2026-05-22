import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate Android proof", () => {
  it("requires emulator proof without fatal, ANR, or ReactNativeJS fatal", () => {
    const android = getEnterpriseReleaseCandidateReport().android;
    expect(android.android_emulator_proof_passed).toBe(true);
    expect(android.maestro_proof_passed).toBe(true);
    expect(android.logcat_fatal_found).toBe(false);
    expect(android.anr_found).toBe(false);
    expect(android.react_native_js_fatal_found).toBe(false);
  });
});

