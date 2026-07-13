import { validateAiEstimatePerformanceMeasurements } from "../../src/lib/platform/aiEstimatePerformanceBudget";
import { AI_ESTIMATE_PERFORMANCE_OPERATIONS } from "../../src/lib/platform/aiEstimatePerformanceSloContract";

describe("AI estimate performance SLO contract", () => {
  it("requires SLO, p95, memory and sample coverage for every critical operation", () => {
    const measurements = AI_ESTIMATE_PERFORMANCE_OPERATIONS.flatMap((operation) =>
      Array.from({ length: 5 }, () => ({
        operation,
        durationMs: 1,
        memoryMb: 0,
        rowsCount: operation === "prompt_to_template_match" || operation === "approved_history_record_load" ? 1 : 5,
      }))
    );
    const validation = validateAiEstimatePerformanceMeasurements({
      measurements,
      sourceSha: "test-source-sha",
    });

    expect(validation.performance_slo_contract_created).toBe(true);
    expect(validation.performance_budgets_created).toBe(true);
    expect(validation.performance_validator_created).toBe(true);
    expect(validation.all_critical_operations_have_slo).toBe(true);
    expect(validation.p95_budget_missing).toBe(false);
    expect(validation.memory_budget_missing).toBe(false);
    expect(validation.performance_green_without_sample_size).toBe(false);
    expect(validation.passed).toBe(true);
  });
});
