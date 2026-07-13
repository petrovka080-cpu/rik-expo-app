import {
  GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX,
  runAiEstimatePlatformCoreV2Matrix,
} from "../../scripts/estimate/runAiEstimatePlatformCoreV2Matrix";

describe("AI estimate platform core v2 matrix", () => {
  it("passes catalog, runtime, artifact, history and harness cases", () => {
    const { summary } = runAiEstimatePlatformCoreV2Matrix({ writeSummary: false });

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX);
    expect(summary.catalog_coverage).toBe("11610/11610");
    expect(summary.random_create_draft_cases_passed).toBe("1000/1000");
    expect(summary.parameter_override_cases_passed).toBe("200/200");
    expect(summary.web_smoke_cases_passed).toBe("100/100");
    expect(summary.android_smoke_cases_passed).toBe("100/100");
  }, 600_000);
});
