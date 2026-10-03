import { execFileSync } from "node:child_process";
import path from "node:path";

import { GREEN_AI_ESTIMATE_PARAMETER_RUNTIME_MATRIX_READY } from "../../scripts/estimate/aiEstimateParameterRuntimeMatrixContract";

function runRuntimeMatrixCli(): Record<string, unknown> {
  const output = execFileSync(process.execPath, [
    "--max-old-space-size=896",
    "--import",
    "tsx",
    path.join(process.cwd(), "scripts", "estimate", "runAiEstimateParameterRuntimeMatrix.ts"),
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
    timeout: 240_000,
    maxBuffer: 1024 * 1024,
  });
  return JSON.parse(output);
}

describe("AI estimate parameter runtime matrix", () => {
  it("recalculates editable parameters across random, critical, infrastructure, repair and foreman cases", () => {
    const summary = runRuntimeMatrixCli();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PARAMETER_RUNTIME_MATRIX_READY);
    expect(summary.random_parameter_cases_passed).toBe("500/500");
    expect(summary.random_client_compatible_cases_passed).toBe("372/372");
    expect(summary.random_registered_backend_only_honestly_blocked_cases_passed).toBe("128/128");
    expect(summary.critical_parameter_cases_passed).toBe("100/100");
    expect(summary.critical_client_compatible_cases_passed).toBe("86/86");
    expect(summary.critical_registered_backend_only_honestly_blocked_cases_passed).toBe("14/14");
    expect(summary.infrastructure_parameter_cases_passed).toBe("50/50");
    expect(summary.infrastructure_client_compatible_cases_passed).toBe("47/47");
    expect(summary.infrastructure_registered_backend_only_honestly_blocked_cases_passed).toBe("3/3");
    expect(summary.repair_parameter_cases_passed).toBe("50/50");
    expect(summary.repair_client_compatible_cases_passed).toBe("47/47");
    expect(summary.repair_registered_backend_only_honestly_blocked_cases_passed).toBe("3/3");
    expect(summary.foreman_parameter_cases_passed).toBe("50/50");
    expect(summary.foreman_client_compatible_cases_passed).toBe("46/46");
    expect(summary.foreman_registered_backend_only_honestly_blocked_cases_passed).toBe("4/4");
    expect(summary.affected_rows_change_after_parameter_edit).toBe(true);
    expect(summary.rejected_geometry_parameters_never_used_for_successful_edits).toBe(true);
    expect(summary.rejected_geometry_probes).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "ROAD_GEOMETRY_CONFLICT", raw_value: expect.any(String) }),
    ]));
    for (const probe of summary.rejected_geometry_probes as Array<{ param_key: string; edited_param_key: string | null }>) {
      expect(probe.edited_param_key).not.toBe(probe.param_key);
    }
    expect(summary.failures).toEqual([]);
  }, 300_000);
});
