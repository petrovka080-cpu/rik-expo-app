import type { ProfessionalBoqMaterialCompletenessValidation } from "../../lib/estimate/professionalBoqMaterialCompletenessContract";

export function renderProfessionalBoqCompletenessSection(input: {
  validation: ProfessionalBoqMaterialCompletenessValidation;
}): string {
  const { completeness } = input.validation;
  return [
    "professional_boq_material_completeness=true",
    `template=${completeness.templateId}`,
    `family=${completeness.family}`,
    `full_rows=${completeness.fullBoqRowsCount}`,
    `visible_main_rows=${completeness.visibleMainRowsCount}`,
    `required_material_slots=${completeness.requiredMaterialSlots.length}`,
    `missing_required_material_slots=${completeness.missingRequiredSlots.length}`,
    `snapshot_rows=${completeness.fullSnapshotRowsCount}`,
    `pdf_rows=${completeness.pdfRowsCount}`,
    `buyer_handoff_rows=${completeness.buyerHandoffRowsCount}`,
    `row_cap_detected=${completeness.rowCapDetected}`,
    `backend_truncation_detected=${completeness.backendTruncationDetected}`,
    `pdf_truncation_detected=${completeness.pdfTruncationDetected}`,
    `buyer_truncation_detected=${completeness.buyerTruncationDetected}`,
  ].join("\n");
}
