import type { ProfessionalEstimateTableViewModel } from "./buildProfessionalEstimateTableViewModel";

export function validateProfessionalEstimateTableViewModel(viewModel: ProfessionalEstimateTableViewModel): {
  passed: boolean;
  failures: string[];
} {
  const failures: string[] = [];
  if (viewModel.rows.length === 0) failures.push("rows_missing");
  if (!viewModel.columns.includes("Источник / уверенность")) failures.push("source_confidence_column_missing");
  if (!viewModel.localContext.displayLine) failures.push("local_context_missing");
  if (viewModel.assumptions.length === 0) failures.push("assumptions_missing");
  if (viewModel.costIncreaseFactors.length === 0) failures.push("cost_increase_factors_missing");
  if (viewModel.clarifyingQuestions.length === 0) failures.push("clarifying_questions_missing");
  if (!viewModel.actions.some((action) => action.id === "make_estimate_pdf" && action.visible)) failures.push("pdf_action_missing");
  if (!viewModel.actions.some((action) => action.id === "save_estimate" && action.visible)) failures.push("save_action_missing");
  if (!viewModel.actions.some((action) => action.id === "create_request" && action.visible)) failures.push("create_request_action_missing");
  return { passed: failures.length === 0, failures };
}
