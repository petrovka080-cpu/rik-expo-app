export const AI_ESTIMATE_PERFORMANCE_OPERATIONS = [
  "prompt_to_template_match",
  "draft_estimate_build",
  "full_boq_build",
  "trusted_costing",
  "material_quantity_calculation",
  "pdf_package_generation",
  "buyer_handoff_generation",
  "approved_history_page_load",
  "approved_history_record_load",
  "foreman_materials_estimate_open",
  "foreman_subcontracts_estimate_open",
] as const;

export type AiEstimatePerformanceOperation = typeof AI_ESTIMATE_PERFORMANCE_OPERATIONS[number];

export type AiEstimatePerformanceSlo = {
  operation: AiEstimatePerformanceOperation;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMemoryMb: number;
  maxRowsProcessed: number;
  sourceSha: string;
  sampleSize: number;
};

export type AiEstimatePerformanceSloBudget = {
  operation: AiEstimatePerformanceOperation;
  p95Ms: number;
  p99Ms: number;
  maxMemoryMb: number;
  maxRowsProcessed: number;
  minSampleSize: number;
};

export const AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS: Record<AiEstimatePerformanceOperation, AiEstimatePerformanceSloBudget> = {
  prompt_to_template_match: {
    operation: "prompt_to_template_match",
    p95Ms: 250,
    p99Ms: 500,
    maxMemoryMb: 64,
    maxRowsProcessed: 1,
    minSampleSize: 5,
  },
  draft_estimate_build: {
    operation: "draft_estimate_build",
    p95Ms: 1500,
    p99Ms: 2500,
    maxMemoryMb: 128,
    maxRowsProcessed: 2500,
    minSampleSize: 5,
  },
  full_boq_build: {
    operation: "full_boq_build",
    p95Ms: 2500,
    p99Ms: 3500,
    maxMemoryMb: 128,
    maxRowsProcessed: 2500,
    minSampleSize: 5,
  },
  trusted_costing: {
    operation: "trusted_costing",
    p95Ms: 2000,
    p99Ms: 3000,
    maxMemoryMb: 128,
    maxRowsProcessed: 2500,
    minSampleSize: 5,
  },
  material_quantity_calculation: {
    operation: "material_quantity_calculation",
    p95Ms: 2000,
    p99Ms: 3000,
    maxMemoryMb: 128,
    maxRowsProcessed: 2500,
    minSampleSize: 5,
  },
  pdf_package_generation: {
    operation: "pdf_package_generation",
    p95Ms: 3000,
    p99Ms: 4500,
    maxMemoryMb: 192,
    maxRowsProcessed: 2500,
    minSampleSize: 5,
  },
  buyer_handoff_generation: {
    operation: "buyer_handoff_generation",
    p95Ms: 1500,
    p99Ms: 2500,
    maxMemoryMb: 128,
    maxRowsProcessed: 1500,
    minSampleSize: 5,
  },
  approved_history_page_load: {
    operation: "approved_history_page_load",
    p95Ms: 300,
    p99Ms: 500,
    maxMemoryMb: 64,
    maxRowsProcessed: 25,
    minSampleSize: 5,
  },
  approved_history_record_load: {
    operation: "approved_history_record_load",
    p95Ms: 250,
    p99Ms: 500,
    maxMemoryMb: 64,
    maxRowsProcessed: 1,
    minSampleSize: 5,
  },
  foreman_materials_estimate_open: {
    operation: "foreman_materials_estimate_open",
    p95Ms: 2000,
    p99Ms: 3000,
    maxMemoryMb: 128,
    maxRowsProcessed: 2500,
    minSampleSize: 5,
  },
  foreman_subcontracts_estimate_open: {
    operation: "foreman_subcontracts_estimate_open",
    p95Ms: 2000,
    p99Ms: 3000,
    maxMemoryMb: 128,
    maxRowsProcessed: 2500,
    minSampleSize: 5,
  },
};

export type AiEstimatePerformanceSloValidation = {
  performance_slo_contract_created: true;
  performance_budgets_created: true;
  performance_validator_created: true;
  all_critical_operations_have_slo: boolean;
  p95_budget_missing: boolean;
  memory_budget_missing: boolean;
  performance_green_without_sample_size: boolean;
  passed: boolean;
  failures: string[];
};
