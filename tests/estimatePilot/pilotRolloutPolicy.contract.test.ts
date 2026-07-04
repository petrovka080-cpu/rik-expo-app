import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function json<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8")) as T;
}

describe("controlled pilot rollout policy", () => {
  it("stops on P0/web/android/PDF/buyer violations and requires 7 green daily runs to expand", () => {
    const rollout = json<any>("data/estimate-pilot/pilot-rollout-policy.json");
    expect(rollout.acceptance.pilot_stop_rules_created).toBe(true);
    expect(rollout.acceptance.pilot_expansion_rules_created).toBe(true);
    expect(rollout.acceptance.p0_blocks_expansion).toBe(true);
    expect(rollout.acceptance.web_android_green_required_for_expansion).toBe(true);
    expect(rollout.stop_pilot_if).toEqual(expect.arrayContaining([
      "any P0 defect occurs",
      "web smoke fails",
      "Android emulator smoke fails",
      "PDF mismatch count > 0",
      "buyer work rows count > 0",
    ]));
    expect(rollout.numeric_gates.consecutive_green_daily_runs_required).toBe(7);
    expect(rollout.numeric_gates.p0_defects_allowed).toBe(0);
    expect(rollout.numeric_gates.pdf_snapshot_mismatch_count).toBe(0);
    expect(rollout.numeric_gates.buyer_work_rows_count).toBe(0);
  });
});
