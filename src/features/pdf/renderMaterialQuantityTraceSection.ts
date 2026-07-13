import type { ProfessionalBoqRow } from "../../lib/estimate/estimateDraftRevisionContract";
import { renderProfessionalMaterialQuantityTraceLines } from "../../lib/estimate/professionalMaterialQuantityTrace";

export function renderMaterialQuantityTraceSection(input: {
  rows: readonly ProfessionalBoqRow[];
  templateId: string;
  family: string;
}): string {
  return renderProfessionalMaterialQuantityTraceLines(input).join("\n");
}
