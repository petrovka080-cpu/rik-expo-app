import { buildReleaseVerifyMobileReport } from "../../scripts/release/releaseStateCleanupCore";

it("keeps mobile blocked without starting build or store acceptance", () => {
  const report = buildReleaseVerifyMobileReport(false);

  expect(report.final_status).toBe("BLOCKED_MOBILE_RELEASE_BASELINE_NOT_READY");
  expect(report.mobile_build_started).toBe(false);
  expect(report.testflight_started).toBe(false);
  expect(report.android_adb_install_started).toBe(false);
  expect(report.app_review_submitted).toBe(false);
  expect(report.production_rollout_enabled).toBe(false);
  expect(report.public_beta_enabled).toBe(false);
});
