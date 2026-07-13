import type { ProfessionalBoqRow } from "../../lib/estimate/estimateDraftRevisionContract";
import { professionalBoqSectionForRowType } from "../../lib/estimate/professionalBoqSectionPolicy";

function rowLine(row: ProfessionalBoqRow): string {
  return [
    "boq-full-row",
    row.rowId,
    professionalBoqSectionForRowType(row.rowType).titleRu,
    row.titleRu,
    row.quantity,
    row.unit,
    `formula=${row.quantityFormula ?? ""}`,
    `source=${row.normSourceTitle ?? row.sourceLabel ?? ""}`,
  ].join(";");
}

export function renderProfessionalBoqFullMaterialComposition(input: {
  rows: readonly ProfessionalBoqRow[];
}): string {
  const rowsBySection = new Map<string, ProfessionalBoqRow[]>();
  for (const row of input.rows) {
    const section = professionalBoqSectionForRowType(row.rowType).titleRu;
    rowsBySection.set(section, [...(rowsBySection.get(section) ?? []), row]);
  }
  const lines = [
    "professional_boq_full_material_composition=true",
    `professional_boq_full_rows_count=${input.rows.length}`,
  ];
  for (const [section, rows] of rowsBySection) {
    lines.push(`section=${section};rows=${rows.length}`);
    lines.push(...rows.map(rowLine));
  }
  return lines.join("\n");
}

export function countProfessionalBoqFullMaterialCompositionRows(body: string): number {
  return body.split(/\r?\n/).filter((line) => line.startsWith("boq-full-row;")).length;
}
