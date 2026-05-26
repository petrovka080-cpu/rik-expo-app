import { assertNoGenericKnownWorkRows } from "./assertNoGenericKnownWorkRows";
import type { EstimatePresentationViewModel } from "./estimatePresentationTypes";

export type EstimatePresentationValidationReport = {
  passed: boolean;
  failures: string[];
};

export function validateEstimatePresentationViewModel(
  viewModel: EstimatePresentationViewModel,
): EstimatePresentationValidationReport {
  const failures: string[] = [];

  if (!viewModel.estimateId) failures.push("estimate_id_missing");
  if (!viewModel.workKey) failures.push("work_key_missing");
  if (!viewModel.workTitle) failures.push("work_title_missing");
  if (viewModel.sections.length === 0) failures.push("sections_missing");
  if (viewModel.rows.length === 0) failures.push("rows_missing");
  if (!viewModel.rows.some((row) => row.sectionType === "materials")) failures.push("materials_rows_missing");
  if (!viewModel.rows.some((row) => row.sectionType === "labor" || row.sectionType === "equipment")) {
    failures.push("labor_or_equipment_rows_missing");
  }
  if (!viewModel.sourceConfidence) failures.push("source_confidence_missing");
  if (viewModel.sourceLabels.length === 0) failures.push("source_labels_missing");
  if (!viewModel.tax.taxLabel && !viewModel.tax.warning) failures.push("tax_or_warning_missing");
  if (!viewModel.actions.some((action) => action.id === "make_estimate_pdf" && action.visible)) {
    failures.push("pdf_action_missing");
  }

  try {
    assertNoGenericKnownWorkRows({ workKey: viewModel.workKey, rows: viewModel.rows });
  } catch (error) {
    failures.push(error instanceof Error ? error.message : "generic_known_work_row_found");
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}
