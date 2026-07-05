import { buildRoleBasedUatDashboard } from "../../scripts/estimate/buildRoleBasedUatDashboard";

describe("role based UAT dashboard", () => {
  it("tracks web/android, defects, roles, PDF and procurement metrics", () => {
    const summary = buildRoleBasedUatDashboard({
      webSummary: {
        final_status: "GREEN_AI_ESTIMATE_ROLE_BASED_UAT_WEB_BROWSER_SMOKE_NO_BUILDS",
        source_sha: "test",
        branch: "release/ios-after-build48-integration",
        target: "web",
        cases_total: 60,
        cases_passed: 60,
        cases_failed: 0,
        failed_cases: [],
        actual_web_browser_role_based_uat_passed: true,
        route_equivalent_not_reported_as_real_browser: true,
        env_browser_green_rejected: true,
        console_error_count: 0,
        support_packages_exported_count: 5,
        pdf_pass_rate: 1,
        procurement_pass_rate: 1,
        role_permission_pass_rate: 1,
        average_prompt_to_snapshot_ms: 0,
        average_pdf_generation_ms: 0,
        blockers: [],
      },
      androidSummary: {
        final_status: "GREEN_AI_ESTIMATE_ROLE_BASED_UAT_ANDROID_CHROME_SMOKE_NO_BUILDS",
        source_sha: "test",
        branch: "release/ios-after-build48-integration",
        target: "android-chrome",
        cases_total: 60,
        cases_passed: 60,
        cases_failed: 0,
        failed_cases: [],
        actual_android_emulator_role_based_uat_passed: true,
        route_equivalent_not_reported_as_real_browser: true,
        env_browser_green_rejected: true,
        android_console_error_count: 0,
        support_packages_exported_count: 3,
        pdf_pass_rate: 1,
        procurement_pass_rate: 1,
        role_permission_pass_rate: 1,
        average_prompt_to_snapshot_ms: 0,
        average_pdf_generation_ms: 0,
        blockers: [],
      },
      requireRuntimeEvidence: true,
      requireLayeredPrecondition: false,
      requireGitClean: false,
    });

    expect(summary.uat_dashboard_created).toBe(true);
    expect(summary.uat_dashboard_tracks_web_android).toBe(true);
    expect(summary.uat_dashboard_tracks_defects).toBe(true);
    expect(summary.uat_dashboard_tracks_role_permissions).toBe(true);
    expect(summary.uat_dashboard_tracks_pdf_procurement).toBe(true);
    expect(summary.metrics.web_cases_total).toBe(60);
    expect(summary.metrics.android_cases_passed).toBe(60);
    expect(summary.p0_defects_count).toBe(0);
    expect(summary.p1_defects_count).toBe(0);
  });
});
