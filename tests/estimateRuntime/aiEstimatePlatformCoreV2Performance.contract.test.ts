import {
  auditAiEstimatePlatformCoreV2Performance,
  GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_PERFORMANCE,
} from "../../scripts/estimate/auditAiEstimatePlatformCoreV2Performance";

describe("AI estimate platform core v2 performance", () => {
  it("keeps core runtime operations within SLO", () => {
    const { summary } = auditAiEstimatePlatformCoreV2Performance({ writeSummary: false });

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_PERFORMANCE);
    expect(summary.all_core_operations_within_slo).toBe(true);
    expect(summary.memory_budget_violations_count).toBe(0);
  }, 300_000);
});
