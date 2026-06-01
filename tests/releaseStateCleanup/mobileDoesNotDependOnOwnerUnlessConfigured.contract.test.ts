import { buildReleaseVerifyMobileReport } from "../../scripts/release/releaseStateCleanupCore";

it("keeps mobile verify independent from owner unless scoped policy adds that dependency", () => {
  expect(buildReleaseVerifyMobileReport(true)).toMatchObject({
    mobile_build_allowed_without_owner_only_if_scope_exempt: true,
    mobile_blocked_by_owner_gate: false,
    mobile_build_started: false,
    testflight_started: false,
    android_adb_install_started: false,
  });
});
