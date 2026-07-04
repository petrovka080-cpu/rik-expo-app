import fs from "node:fs";
import path from "node:path";

import {
  buildControlledPilotHealthDashboard,
  controlledPilotSloBlockers,
  type ControlledPilotMetrics,
} from "../../scripts/estimate/buildControlledPilotHealthDashboard";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function json<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8")) as T;
}

function greenMetrics(): ControlledPilotMetrics {
  return {
    web_cases_total: 50,
    web_cases_passed: 50,
    web_cases_failed: 0,
    android_cases_total: 50,
    android_cases_passed: 50,
    android_cases_failed: 0,
    prompt_to_draft_success_rate: 1,
    draft_to_snapshot_success_rate: 1,
    snapshot_to_pdf_success_rate: 1,
    snapshot_to_buyer_handoff_success_rate: 1,
    positions_empty_after_prompt_count: 0,
    raw_dump_ui_count: 0,
    debug_formula_main_ui_count: 0,
    price_debug_visible_count: 0,
    fake_final_total_count: 0,
    pdf_snapshot_mismatch_count: 0,
    buyer_work_rows_count: 0,
    console_error_count: 0,
    android_console_error_count: 0,
    emulator_unavailable_count: 0,
  };
}

describe("controlled pilot health dashboard", () => {
  it("defines all required metrics and detects SLO violations", () => {
    const schema = json<any>("data/estimate-pilot/pilot-health-dashboard.schema.json");
    expect(schema.acceptance.controlled_pilot_health_dashboard_created).toBe(true);
    expect(schema.required_metrics).toEqual(expect.arrayContaining([
      "web_cases_total",
      "android_cases_total",
      "positions_empty_after_prompt_count",
      "pdf_snapshot_mismatch_count",
      "buyer_work_rows_count",
      "android_console_error_count",
    ]));
    expect(controlledPilotSloBlockers(greenMetrics())).toEqual([]);
    expect(controlledPilotSloBlockers({ ...greenMetrics(), positions_empty_after_prompt_count: 1 })).toContain("positions_empty_after_prompt");
    expect(controlledPilotSloBlockers({ ...greenMetrics(), pdf_snapshot_mismatch_count: 1 })).toContain("pdf_snapshot_mismatch");
    expect(controlledPilotSloBlockers({ ...greenMetrics(), buyer_work_rows_count: 1 })).toContain("buyer_work_rows");
  });

  it("can build the policy-only dashboard without counting it as browser green", () => {
    const dashboard = buildControlledPilotHealthDashboard({ policyOnly: true });
    expect(dashboard.controlled_pilot_health_dashboard_created).toBe(true);
    expect(dashboard.policy_only).toBe(true);
    expect(dashboard.metrics.web_cases_passed).toBe(0);
    expect(dashboard.metrics.android_cases_passed).toBe(0);
  });
});
