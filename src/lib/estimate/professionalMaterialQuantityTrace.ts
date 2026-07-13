import type { ProfessionalBoqRow } from "./estimateDraftRevisionContract";
import {
  calculateProfessionalMaterialQuantityLine,
  isProfessionalMaterialQuantityRow,
} from "./professionalMaterialQuantityCalculator";
import type { ProfessionalMaterialQuantityLine } from "./professionalMaterialQuantityContract";

function fmt(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return String(Number(value.toFixed(4)));
}

export function materialQuantityLinesFromRows(input: {
  rows: readonly ProfessionalBoqRow[];
  templateId: string;
  family: string;
}): ProfessionalMaterialQuantityLine[] {
  return input.rows
    .filter(isProfessionalMaterialQuantityRow)
    .map((row) => row.materialQuantity ?? calculateProfessionalMaterialQuantityLine({
      row,
      templateId: input.templateId,
      family: input.family,
    }));
}

export function renderProfessionalMaterialQuantityTraceLines(input: {
  rows: readonly ProfessionalBoqRow[];
  templateId: string;
  family: string;
}): string[] {
  const lines = materialQuantityLinesFromRows(input);
  return [
    "professional_material_quantity_trace=true",
    `professional_material_quantity_rows_count=${lines.length}`,
    ...lines.map((line) => [
      "material-quantity-row",
      line.rowId,
      line.materialName,
      `net=${fmt(line.netQuantity)} ${line.unit}`,
      `waste=${fmt(line.wastePercent)}%`,
      `loss=${fmt(line.lossPercent)}%`,
      `gross=${fmt(line.grossQuantity)} ${line.unit}`,
      `buy=${fmt(line.procurementQuantity)} ${line.procurementUnit}`,
      `pack=${fmt(line.procurementPackageSize)}`,
      `formula=${line.formula}`,
      `source=${line.citationLabel}`,
    ].join(";")),
  ];
}

export function renderProfessionalMaterialWastePackagingTraceLines(input: {
  rows: readonly ProfessionalBoqRow[];
  templateId: string;
  family: string;
}): string[] {
  const lines = materialQuantityLinesFromRows(input);
  return [
    "professional_material_waste_packaging=true",
    ...lines.map((line) => [
      "material-waste-packaging-row",
      line.rowId,
      `type=${line.materialType}`,
      `base=${fmt(line.baseQuantity)} ${line.unit}`,
      `gross=${fmt(line.grossQuantity)} ${line.unit}`,
      `procurement=${fmt(line.procurementQuantity)} ${line.procurementUnit}`,
      `package=${fmt(line.procurementPackageSize)}`,
      `state=${line.quantityState}`,
    ].join(";")),
  ];
}

export function countProfessionalMaterialQuantityTraceRows(body: string): number {
  return body.split(/\r?\n/).filter((line) => line.startsWith("material-quantity-row;")).length;
}
