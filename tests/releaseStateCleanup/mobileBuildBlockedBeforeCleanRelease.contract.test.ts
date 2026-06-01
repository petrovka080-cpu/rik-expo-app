import { mobileBuildBlockedDecision } from "../../scripts/release/releaseStateCleanupCore";

it("keeps mobile build blocked before a clean release baseline", () => {
  expect(mobileBuildBlockedDecision()).toMatchObject({
    final_status: "BLOCKED_MOBILE_BUILD_DIRTY_WORKTREE",
    eas_build_started: false,
    ios_submit_started: false,
    android_apk_build_started: false,
    app_review_submitted: false,
    production_rollout_enabled: false,
    public_beta_enabled: false,
    fake_green_claimed: false,
  });
});
