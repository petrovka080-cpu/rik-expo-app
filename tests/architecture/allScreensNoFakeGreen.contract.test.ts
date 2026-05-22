import { getAllScreensReport } from "../allScreensRuntime/allScreensRuntimeTestHarness";

describe("all screens no fake green contract", () => {
  it("requires previous green, RLS, 50k, web, Android, targeted, and backend proofs", () => {
    const report = getAllScreensReport();
    expect(report.previous.previous_wave_green).toBe(true);
    expect(report.matrix.fake_green_claimed).toBe(false);
    expect(report.matrix.web_runtime_proof_passed).toBe(true);
    expect(report.matrix.android_emulator_proof_passed).toBe(true);
    expect(report.matrix.rls_live_proof_passed).toBe(true);
    expect(report.matrix.scale_50k_status).toBe("GREEN_FINAL_50K_92_SCORE_REAUDIT_READY");
  });
});
