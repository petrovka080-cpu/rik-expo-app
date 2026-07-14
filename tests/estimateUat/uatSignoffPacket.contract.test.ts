import { existsSync, rmSync } from "node:fs";
import path from "node:path";

import { buildRoleBasedUatDashboard } from "../../scripts/estimate/buildRoleBasedUatDashboard";

const greenWeb = {
  final_status: "GREEN_AI_ESTIMATE_ROLE_BASED_UAT_WEB_BROWSER_SMOKE_NO_BUILDS",
  source_sha: "test",
  branch: "release/ios-after-build48-integration",
  target: "web" as const,
  cases_total: 60,
  cases_passed: 60,
  cases_failed: 0,
  failed_cases: [],
  actual_web_browser_role_based_uat_passed: true,
  route_equivalent_not_reported_as_real_browser: true,
  env_browser_green_rejected: true,
  console_error_count: 0,
  support_packages_exported_count: 60,
  pdf_pass_rate: 1,
  procurement_pass_rate: 1,
  role_permission_pass_rate: 1,
  average_prompt_to_snapshot_ms: 0,
  average_pdf_generation_ms: 0,
  blockers: [],
};

const greenAndroid = {
  final_status: "GREEN_AI_ESTIMATE_ROLE_BASED_UAT_ANDROID_CHROME_SMOKE_NO_BUILDS",
  source_sha: "test",
  branch: "release/ios-after-build48-integration",
  target: "android-chrome" as const,
  cases_total: 60,
  cases_passed: 60,
  cases_failed: 0,
  failed_cases: [],
  actual_android_emulator_role_based_uat_passed: true,
  route_equivalent_not_reported_as_real_browser: true,
  env_browser_green_rejected: true,
  android_console_error_count: 0,
  support_packages_exported_count: 60,
  pdf_pass_rate: 1,
  procurement_pass_rate: 1,
  role_permission_pass_rate: 1,
  average_prompt_to_snapshot_ms: 0,
  average_pdf_generation_ms: 0,
  blockers: [],
};

describe("role based UAT signoff packet", () => {
  it("creates runtime signoff packet without faking owner approval", () => {
    const summary = buildRoleBasedUatDashboard({
      webSummary: greenWeb,
      androidSummary: greenAndroid,
      requireRuntimeEvidence: true,
      requireLayeredPrecondition: false,
      requireGitClean: false,
      writeRuntime: true,
    });
    const summaryPath = summary.runtime_summary_path;
    expect(summary.uat_signoff_packet_created).toBe(true);
    expect(summary.human_signoff_status).toBe("PENDING_OWNER_REVIEW");
    expect(summary.human_signoff_not_faked).toBe(true);
    expect(summary.go_no_go_report_created).toBe(true);
    expect(summaryPath).toBeTruthy();
    expect(existsSync(path.join(path.dirname(String(summaryPath)), "signoff", "go-no-go.md"))).toBe(true);
    rmSync(path.dirname(String(summaryPath)), { recursive: true, force: true });
  });
});
