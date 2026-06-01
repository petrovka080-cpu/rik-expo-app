import { installedArtifactBlockedDecision } from "../../scripts/release/releaseStateCleanupCore";

it("blocks installed artifact acceptance until mobile build is green", () => {
  expect(installedArtifactBlockedDecision(false)).toMatchObject({
    final_status: "BLOCKED_MOBILE_ARTIFACT_ACCEPTANCE_BUILD_WAVE_NOT_GREEN",
    previous_mobile_build_green: false,
    ios_testflight_started: false,
    android_apk_install_started: false,
    app_review_submitted: false,
    production_rollout_enabled: false,
    public_beta_enabled: false,
    fake_green_claimed: false,
  });
});
