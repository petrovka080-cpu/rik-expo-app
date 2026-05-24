import { buildBuiltInAi50000Phase4CanaryPlan } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 4 observability", () => {
  it("defines enough redacted events, metrics, and stop conditions for canary", () => {
    const plan = buildBuiltInAi50000Phase4CanaryPlan();
    expect(plan.observabilityEvents.length).toBeGreaterThanOrEqual(12);
    expect(plan.observabilityMetrics.length).toBeGreaterThanOrEqual(10);
    expect(plan.stopConditions).toEqual(expect.arrayContaining([
      "source_evidence_missing_for_priced_row",
      "pdf_mojibake_detected",
      "dangerous_diy_instruction_detected",
      "production_rollout_flag_enabled",
    ]));
  });
});
