import { existsSync, rmSync } from "node:fs";
import path from "node:path";

import { buildPilotLaunchReadinessSummary, loadPilotLaunchCases } from "../../scripts/estimate/buildPilotDefectBurndown";

function smoke(target: "web" | "android-chrome") {
  const total = loadPilotLaunchCases().length;
  return {
    final_status: `GREEN_${target}`,
    source_sha: "test",
    branch: "release/ios-after-build48-integration",
    target,
    cases_total: total,
    cases_passed: total,
    cases_failed: 0,
    failed_cases: [],
    actual_web_browser_pilot_launch_smoke_passed: target === "web" ? true : undefined,
    actual_android_emulator_pilot_launch_smoke_passed: target === "android-chrome" ? true : undefined,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    console_error_count: 0,
    android_console_error_count: 0,
    pdf_snapshot_mismatch_count: 0,
    buyer_work_rows_count: 0,
    raw_dump_ui_count: 0,
    empty_positions_after_prompt_count: 0,
    fake_final_total_count: 0,
    procurement_package_passed: true,
    support_package_exported: true,
    telemetry_events_recorded: true,
    blockers: [],
    case_results: loadPilotLaunchCases().map((item) => ({ case_id: item.case_id })),
  };
}

describe("pilot launch owner review packet", () => {
  it("creates runtime-only owner review files without faking approval", () => {
    const summary = buildPilotLaunchReadinessSummary({
      webSummary: smoke("web"),
      androidSummary: smoke("android-chrome"),
      killSwitchSummary: { kill_switch_rehearsal_passed: true },
      rollbackSummary: { rollback_rehearsal_passed: true },
      requirePreconditions: false,
      requireGitClean: false,
      writeRuntime: true,
    });
    const runtimeDir = path.dirname(String(summary.runtime_summary_path));
    const ownerDir = path.join(runtimeDir, "owner-review");

    expect(summary.owner_review_packet_created).toBe(true);
    expect(summary.owner_go_no_go_status).toBe("PENDING_OWNER_REVIEW");
    expect(summary.owner_approval_not_faked).toBe(true);
    for (const name of [
      "go-no-go.md",
      "pilot-scope.md",
      "defect-burndown.md",
      "web-smoke-report.md",
      "android-smoke-report.md",
      "kill-switch-rehearsal.md",
      "rollback-rehearsal.md",
      "support-package-samples.md",
      "pdf-samples-index.json",
      "procurement-samples-index.json",
      "known-limitations.md",
      "owner-decision-template.md",
    ]) {
      expect(existsSync(path.join(ownerDir, name))).toBe(true);
    }
    rmSync(runtimeDir, { recursive: true, force: true });
  });
});
