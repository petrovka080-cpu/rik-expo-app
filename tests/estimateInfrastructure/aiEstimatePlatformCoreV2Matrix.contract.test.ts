import {
  GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX,
  runAiEstimatePlatformCoreV2Matrix,
} from "../../scripts/estimate/runAiEstimatePlatformCoreV2Matrix";

describe("AI estimate platform core v2 matrix", () => {
  it("separates client compatibility from backend-only routing and passes artifact, history and harness cases", () => {
    const { summary } = runAiEstimatePlatformCoreV2Matrix({ writeSummary: false });

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX);
    expect(summary.catalog_coverage).toBe("11610/11610");
    expect(summary.random_create_draft_cases_passed).toBe("1000/1000");
    expect(summary.random_client_compile_cases_passed).toBe("793/793");
    expect(summary.random_backend_only_honestly_blocked_cases_passed).toBe("207/207");
    expect(summary.critical_client_compile_cases_passed).toBe("154/154");
    expect(summary.critical_backend_only_honestly_blocked_cases_passed).toBe("46/46");
    expect(summary.parameter_override_cases_passed).toBe("200/200");
    expect(summary.parameter_override_executed_cases_passed).toBe("154/154");
    expect(summary.parameter_override_backend_only_honestly_blocked_cases_passed).toBe("46/46");
    expect(summary.random_create_draft_failures).toEqual([]);
    expect(summary.parameter_override_failures).toEqual([]);
    expect(summary.web_smoke_cases_passed).toBe("100/100");
    expect(summary.android_smoke_cases_passed).toBe("100/100");
  }, 600_000);
});
