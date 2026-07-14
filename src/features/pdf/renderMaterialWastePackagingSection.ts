import type { ProfessionalBoqRow } from "../../lib/estimate/estimateDraftRevisionContract";
import { renderProfessionalMaterialWastePackagingTraceLines } from "../../lib/estimate/professionalMaterialQuantityTrace";

export function renderMaterialWastePackagingSection(input: {
  rows: readonly ProfessionalBoqRow[];
  templateId: string;
  family: string;
}): string {
  return renderProfessionalMaterialWastePackagingTraceLines(input).join("\n");
}
