import { buildAiEnterpriseReleaseCloseoutReport } from "../../scripts/release/runAiEnterpriseReleaseCloseoutChangeControl";

it("does not claim closeout green while post-push verify is absent", () => {
  const report = buildAiEnterpriseReleaseCloseoutReport();
  expect(report.matrix.fake_green_claimed).toBe(false);
  if (!report.matrix.postpush_release_verify_passed) {
    expect(report.matrix.final_status).not.toBe("GREEN_AI_ENTERPRISE_RELEASE_CLOSEOUT_CHANGE_CONTROL_READY");
  }
});
