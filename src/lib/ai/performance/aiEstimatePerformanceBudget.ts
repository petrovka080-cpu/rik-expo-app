import type {
  AiEstimateLoadScenario,
  AiEstimatePerformanceStep,
  AiEstimatePerformanceStepBudget,
} from "./aiEstimatePerformanceTypes";

export const AI_ESTIMATE_PERFORMANCE_WAVE =
  "S_AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD_POINT_OF_NO_RETURN";

export const AI_ESTIMATE_PERFORMANCE_GREEN_STATUS =
  "GREEN_AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD_READY";

export const AI_ESTIMATE_PERFORMANCE_ARTIFACT_DIR =
  "artifacts/S_AI_ESTIMATE_PERFORMANCE";

export const AI_ESTIMATE_STEP_BUDGETS_MS: Record<AiEstimatePerformanceStep, number> = {
  intent_routing: 100,
  semantic_frame_build: 150,
  construction_work_plan_build: 200,
  parametric_boq_recipe_compiler: 400,
  formula_unit_resolver: 150,
  template_rate_lookup: 250,
  catalog_binding: 400,
  local_rate_source_lookup: 500,
  tax_local_policy: 150,
  estimate_calculation: 1000,
  presentation_view_model_build: 300,
  request_draft_build: 500,
  pdf_payload_build: 500,
  pdf_file_generation: 2500,
  full_visible_estimate: 3000,
};

export const AI_ESTIMATE_REQUIRED_STEP_BUDGETS: AiEstimatePerformanceStepBudget[] =
  Object.entries(AI_ESTIMATE_STEP_BUDGETS_MS).map(([step, p95BudgetMs]) => ({
    step: step as AiEstimatePerformanceStep,
    p95BudgetMs,
    required: true,
  }));

export const AI_ESTIMATE_LOAD_SCENARIO_MINIMUMS: Record<AiEstimateLoadScenario, number> = {
  concurrent_estimate_requests: 100,
  concurrent_request_drafts: 50,
  concurrent_pdf_generations: 25,
  catalog_binding_calls: 100,
  local_rate_source_lookups: 100,
  product_material_searches: 100,
  mixed_workload: 100,
  proof_dry_run: 300,
  failure_loop_simulation: 8,
  source_refresh_simulation: 8,
};

export const AI_ESTIMATE_MEMORY_BUDGET_BYTES = 256 * 1024 * 1024;

export const AI_ESTIMATE_MAX_PDF_BYTES = 750_000;

export const AI_ESTIMATE_MAX_ANSWER_CHARS = 16_000;
