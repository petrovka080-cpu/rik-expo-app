import {
  AI_ESTIMATE_PERFORMANCE_OPERATIONS,
  AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS,
  type AiEstimatePerformanceSlo,
  type AiEstimatePerformanceSloValidation,
} from "./aiEstimatePerformanceSloContract";

export function validateAiEstimatePerformanceSlo(
  records: readonly AiEstimatePerformanceSlo[],
): AiEstimatePerformanceSloValidation {
  const byOperation = new Map(records.map((record) => [record.operation, record]));
  const missing = AI_ESTIMATE_PERFORMANCE_OPERATIONS.filter((operation) => !byOperation.has(operation));
  const p95Missing = AI_ESTIMATE_PERFORMANCE_OPERATIONS.some((operation) =>
    !Number.isFinite(AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS[operation].p95Ms)
  );
  const memoryMissing = AI_ESTIMATE_PERFORMANCE_OPERATIONS.some((operation) =>
    !Number.isFinite(AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS[operation].maxMemoryMb)
  );
  const noSample = records.some((record) =>
    record.sampleSize < AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS[record.operation].minSampleSize
  );
  const failures = [
    missing.length === 0 ? "" : `performance_slo_missing:${missing.join(",")}`,
    p95Missing ? "p95_budget_missing" : "",
    memoryMissing ? "memory_budget_missing" : "",
    noSample ? "performance_green_without_sample_size" : "",
    ...records
      .filter((record) => record.p95Ms > AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS[record.operation].p95Ms)
      .map((record) => `p95_slo_exceeded:${record.operation}`),
    ...records
      .filter((record) => record.maxMemoryMb > AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS[record.operation].maxMemoryMb)
      .map((record) => `memory_slo_exceeded:${record.operation}`),
  ].filter(Boolean);
  return {
    performance_slo_contract_created: true,
    performance_budgets_created: true,
    performance_validator_created: true,
    all_critical_operations_have_slo: missing.length === 0,
    p95_budget_missing: p95Missing,
    memory_budget_missing: memoryMissing,
    performance_green_without_sample_size: noSample,
    passed: failures.length === 0,
    failures,
  };
}
