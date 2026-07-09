import type { SharedAiEstimateViewModel } from "./buildSharedAiEstimateViewModel";

export type SharedAiEstimateViewModelValidation = {
  passed: boolean;
  failures: string[];
};

const FORBIDDEN_GENERIC_ROW_NAMES = new Set([
  "строительные работы",
  "материалы",
  "подрядные работы",
  "construction works",
  "materials",
  "subcontract works",
]);

export function validateSharedAiEstimateViewModel(
  viewModel: SharedAiEstimateViewModel,
): SharedAiEstimateViewModelValidation {
  const failures: string[] = [];
  const normalizedNames = viewModel.rows.map((row) => row.visibleName.trim().toLowerCase());

  if (viewModel.source !== "shared_ai_estimate_view_model") failures.push("shared_view_model_source_mismatch");
  if (!viewModel.estimateId) failures.push("estimate_id_missing");
  if (!viewModel.workKey) failures.push("work_key_missing");
  if (!viewModel.payloadFingerprint) failures.push("payload_fingerprint_missing");
  if (viewModel.rows.length === 0) failures.push("rows_missing");
  if (!viewModel.rows.some((row) => row.sectionType === "materials")) failures.push("materials_rows_missing");
  if (!viewModel.rows.some((row) => row.sectionType === "labor" || row.sectionType === "equipment" || row.sectionType === "delivery")) {
    failures.push("work_service_equipment_rows_missing");
  }
  if (normalizedNames.some((name) => FORBIDDEN_GENERIC_ROW_NAMES.has(name))) failures.push("generic_row_visible");
  if (viewModel.selectedWorkInputActive !== true) failures.push("selected_work_input_not_active");
  if (viewModel.usesGlobalEstimatePipeline !== true) failures.push("global_estimate_pipeline_not_used");
  if (viewModel.usesProfessionalBoqSnapshot !== true) failures.push("professional_boq_snapshot_not_used");
  if (viewModel.supportsEditableRevisions !== true) failures.push("editable_revisions_not_supported");
  if (viewModel.supportsPdf !== true) failures.push("pdf_not_supported");
  if (viewModel.supportsBuyerHandoff !== true) failures.push("buyer_handoff_not_supported");
  if (viewModel.fakeGreenClaimed !== false) failures.push("fake_green_claimed");

  return {
    passed: failures.length === 0,
    failures,
  };
}
