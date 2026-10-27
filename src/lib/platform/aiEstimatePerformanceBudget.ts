import {
  AI_ESTIMATE_PERFORMANCE_OPERATIONS,
  AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS,
  type AiEstimatePerformanceOperation,
  type AiEstimatePerformanceSlo,
  type AiEstimatePerformanceSloValidation,
} from "./aiEstimatePerformanceSloContract";

export type AiEstimatePerformanceMeasurement = {
  operation: AiEstimatePerformanceOperation;
  durationMs: number;
  memoryMb: number;
  rowsCount: number;
};

function roundMetric(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : 0;
}

export function percentile(values: readonly number[], percentileValue: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return roundMetric(sorted[Math.max(0, index)] ?? 0);
}

export function buildAiEstimatePerformanceSloRecords(input: {
  measurements: readonly AiEstimatePerformanceMeasurement[];
  sourceSha: string;
}): AiEstimatePerformanceSlo[] {
  return AI_ESTIMATE_PERFORMANCE_OPERATIONS.map((operation) => {
    const matching = input.measurements.filter((item) => item.operation === operation);
    const durations = matching.map((item) => item.durationMs);
    const memory = matching.map((item) => item.memoryMb);
    const rows = matching.map((item) => item.rowsCount);
    return {
      operation,
      p50Ms: percentile(durations, 50),
      p95Ms: percentile(durations, 95),
      p99Ms: percentile(durations, 99),
      maxMemoryMb: roundMetric(Math.max(0, ...memory)),
      maxRowsProcessed: Math.max(0, ...rows),
      sourceSha: input.sourceSha,
      sampleSize: matching.length,
    };
  });
}

export function validateAiEstimatePerformanceMeasurements(input: {
  measurements: readonly AiEstimatePerformanceMeasurement[];
  sourceSha: string;
}): AiEstimatePerformanceSloValidation & {
  slow_operation_without_breakdown: boolean;
  slow_operations_count: number;
  memory_budget_violations_count: number;
  row_budget_violations_count: number;
  all_core_operations_within_slo: boolean;
  slo_records: AiEstimatePerformanceSlo[];
} {
  const sloRecords = buildAiEstimatePerformanceSloRecords(input);
  const missingOperations = sloRecords
    .filter((record) => record.sampleSize === 0)
    .map((record) => record.operation);
  const p95Missing = AI_ESTIMATE_PERFORMANCE_OPERATIONS.some((operation) =>
    !Number.isFinite(AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS[operation].p95Ms)
  );
  const memoryMissing = AI_ESTIMATE_PERFORMANCE_OPERATIONS.some((operation) =>
    !Number.isFinite(AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS[operation].maxMemoryMb)
  );
  const noSample = sloRecords.some((record) =>
    record.sampleSize < AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS[record.operation].minSampleSize
  );
  const slowRecords = sloRecords.filter((record) =>
    record.p95Ms > AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS[record.operation].p95Ms
  );
  const memoryViolations = sloRecords.filter((record) =>
    record.maxMemoryMb > AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS[record.operation].maxMemoryMb
  );
  const rowViolations = sloRecords.filter((record) =>
    record.maxRowsProcessed > AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS[record.operation].maxRowsProcessed
  );
  const failures = [
    missingOperations.length === 0 ? "" : `performance_slo_missing:${missingOperations.join(",")}`,
    p95Missing ? "p95_budget_missing" : "",
    memoryMissing ? "memory_budget_missing" : "",
    noSample ? "performance_green_without_sample_size" : "",
    ...slowRecords.map((record) => `p95_slo_exceeded:${record.operation}:${record.p95Ms}`),
    ...memoryViolations.map((record) => `memory_budget_exceeded:${record.operation}:${record.maxMemoryMb}`),
    ...rowViolations.map((record) => `row_budget_exceeded:${record.operation}:${record.maxRowsProcessed}`),
  ].filter(Boolean);
  return {
    performance_slo_contract_created: true,
    performance_budgets_created: true,
    performance_validator_created: true,
    all_critical_operations_have_slo: missingOperations.length === 0,
    p95_budget_missing: p95Missing,
    memory_budget_missing: memoryMissing,
    performance_green_without_sample_size: noSample,
    slow_operation_without_breakdown: slowRecords.some((record) => record.sampleSize === 0),
    slow_operations_count: slowRecords.length,
    memory_budget_violations_count: memoryViolations.length,
    row_budget_violations_count: rowViolations.length,
    all_core_operations_within_slo: slowRecords.length === 0,
    passed: failures.length === 0,
    failures,
    slo_records: sloRecords,
  };
}
