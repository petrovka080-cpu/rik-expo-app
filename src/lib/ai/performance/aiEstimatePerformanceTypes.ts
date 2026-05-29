export type AiEstimatePerformanceStep =
  | "intent_routing"
  | "semantic_frame_build"
  | "construction_work_plan_build"
  | "parametric_boq_recipe_compiler"
  | "formula_unit_resolver"
  | "template_rate_lookup"
  | "catalog_binding"
  | "local_rate_source_lookup"
  | "tax_local_policy"
  | "estimate_calculation"
  | "presentation_view_model_build"
  | "request_draft_build"
  | "pdf_payload_build"
  | "pdf_file_generation"
  | "full_visible_estimate";

export type AiEstimateLoadScenario =
  | "concurrent_estimate_requests"
  | "concurrent_request_drafts"
  | "concurrent_pdf_generations"
  | "catalog_binding_calls"
  | "local_rate_source_lookups"
  | "product_material_searches"
  | "mixed_workload"
  | "proof_dry_run"
  | "failure_loop_simulation"
  | "source_refresh_simulation";

export type AiEstimatePerformanceMetric = {
  step: AiEstimatePerformanceStep;
  scenario?: AiEstimateLoadScenario;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
  sampleId?: string;
  route?: "/request" | "/ai?context=foreman";
};

export type AiEstimatePerformanceStepBudget = {
  step: AiEstimatePerformanceStep;
  p95BudgetMs: number;
  required: boolean;
};

export type AiEstimatePerformanceBudgetResult = {
  step: AiEstimatePerformanceStep;
  samples: number;
  p95Ms: number;
  maxMs: number;
  budgetMs: number;
  passed: boolean;
};

export type AiEstimatePerformanceBudgetEvaluation = {
  passed: boolean;
  failures: string[];
  results: AiEstimatePerformanceBudgetResult[];
};

export type AiEstimateMemoryReport = {
  heapStartBytes: number;
  heapEndBytes: number;
  heapDeltaBytes: number;
  heapBudgetBytes: number;
  memoryBudgetPassed: boolean;
};
