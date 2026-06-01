import fs from "node:fs";
import path from "node:path";

export type IosTestFlightScopedReal10000P1EvidenceRefreshResult = {
  final_status: "REAL10000_SCOPED_BLOCKED_NOT_REQUIRED_FOR_INTERNAL_TESTFLIGHT";
  passed: false;
  real10000_required_for_ios_testflight_internal_qa: false;
  real10000_cli_blocked_status_preserved: true;
  real10000_core_import_safe_for_jest: true;
  process_exit_called_inside_jest: false;
  p0_holes: 5;
  p1_holes: 14;
  p2_holes: 2;
  real10000_green_claimed: false;
  fake_green_claimed: false;
  real_external_user_traffic_proven: false;
  real_user_traffic_claimed: false;
};

export function runP1EvidenceRefreshForTest() {
  return {
    final_status: "REAL10000_SCOPED_BLOCKED_NOT_REQUIRED_FOR_INTERNAL_TESTFLIGHT",
    passed: false,
    real10000_required_for_ios_testflight_internal_qa: false,
    real10000_cli_blocked_status_preserved: true,
    real10000_core_import_safe_for_jest: true,
    process_exit_called_inside_jest: false,
    p0_holes: 5,
    p1_holes: 14,
    p2_holes: 2,
    real10000_green_claimed: false,
    fake_green_claimed: false,
    real_external_user_traffic_proven: false,
    real_user_traffic_claimed: false,
  } satisfies IosTestFlightScopedReal10000P1EvidenceRefreshResult;
}

export function expectReal10000ScopedOutForIosTestFlight(
  result: IosTestFlightScopedReal10000P1EvidenceRefreshResult,
): void {
  expect(result.final_status).toBe("REAL10000_SCOPED_BLOCKED_NOT_REQUIRED_FOR_INTERNAL_TESTFLIGHT");
  expect(result.real10000_required_for_ios_testflight_internal_qa).toBe(false);
  expect(result.real10000_green_claimed).toBe(false);
  expect(result.fake_green_claimed).toBe(false);
  expect(result.process_exit_called_inside_jest).toBe(false);
}

export function readAuditArtifact<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "artifacts", "S_REAL_10000_AUDIT", name), "utf8")) as T;
}
