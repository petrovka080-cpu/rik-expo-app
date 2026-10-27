import type { ProfessionalBoqRow } from "./estimateDraftRevisionContract";
import {
  calculateProfessionalMaterialQuantityLine,
  isProfessionalMaterialQuantityRow,
} from "./professionalMaterialQuantityCalculator";
import type {
  ProfessionalMaterialQuantityAccuracyValidation,
  ProfessionalMaterialQuantityBlockingReason,
  ProfessionalMaterialQuantityLine,
} from "./professionalMaterialQuantityContract";

function lineFor(row: ProfessionalBoqRow, templateId: string, family: string): ProfessionalMaterialQuantityLine {
  return row.materialQuantity ?? calculateProfessionalMaterialQuantityLine({ row, templateId, family });
}

function staticQuantityAllowed(line: ProfessionalMaterialQuantityLine): boolean {
  return line.materialType === "transport_service" ||
    line.materialType === "service" ||
    line.materialType === "equipment_rental" ||
    line.materialType === "set_material" ||
    (/^1(?:\.0+)?$/.test(line.formula.trim()) && line.procurementPackageSize === 1);
}

function rowReasons(row: ProfessionalBoqRow, line: ProfessionalMaterialQuantityLine): ProfessionalMaterialQuantityBlockingReason[] {
  return [
    line.formula.trim() ? null : "procurement_row_without_formula",
    line.baseQuantity > 0 ? null : "base_quantity_not_positive",
    line.sourceId.trim() && line.citationLabel.trim() ? null : "procurement_row_without_source_citation",
    line.wastePercent >= 0 && line.lossPercent >= 0 ? null : "waste_or_loss_negative",
    line.grossQuantity + 1e-9 >= line.netQuantity ? null : "gross_quantity_less_than_net",
    line.procurementQuantity + 1e-9 >= line.grossQuantity ? null : "procurement_quantity_less_than_gross",
    line.procurementPackageSize > 0 && line.procurementUnit.trim() ? null : "procurement_rounding_invalid",
    line.quantityDependsOnParams.length > 0 || staticQuantityAllowed(line) ? null : "procurement_row_without_formula_inputs",
    isProfessionalMaterialQuantityRow(row) && !row.materialQuantity ? "procurement_row_without_quantity_line" : null,
  ].filter(Boolean) as ProfessionalMaterialQuantityBlockingReason[];
}

function detectStaticNoise(lines: readonly ProfessionalMaterialQuantityLine[]): string[] {
  const buckets = new Map<string, ProfessionalMaterialQuantityLine[]>();
  for (const line of lines) {
    const staticFormula = line.quantityDependsOnParams.length === 0 || /^1(?:\.0+)?$/.test(line.formula.trim());
    if (!staticFormula || staticQuantityAllowed(line)) continue;
    const key = `${line.unit}:${line.baseQuantity}:${line.formula}`;
    buckets.set(key, [...(buckets.get(key) ?? []), line]);
  }
  return [...buckets.values()]
    .filter((bucket) => bucket.length >= 6 && new Set(bucket.map((line) => line.materialName)).size >= 4)
    .flatMap((bucket) => bucket.map((line) => line.rowId));
}

export function validateProfessionalMaterialQuantityAccuracy(input: {
  templateId: string;
  family: string;
  rows: readonly ProfessionalBoqRow[];
  buyerHandoffItems?: readonly {
    rowId: string;
    procurementQuantity?: number | null;
    procurementUnit?: string | null;
  }[];
}): ProfessionalMaterialQuantityAccuracyValidation {
  const procurementRows = input.rows.filter(isProfessionalMaterialQuantityRow);
  const lines = procurementRows.map((row) => lineFor(row, input.templateId, input.family));
  const handoffByRowId = new Map((input.buyerHandoffItems ?? []).map((item) => [item.rowId, item]));
  const staticNoiseRowIds = new Set(detectStaticNoise(lines));
  const blockedRows = procurementRows.map((row) => {
    const line = lineFor(row, input.templateId, input.family);
    const handoff = handoffByRowId.get(row.rowId);
    const handoffMismatch = handoff && (
      Math.abs(Number(handoff.procurementQuantity ?? line.procurementQuantity) - line.procurementQuantity) > 1e-6 ||
      (handoff.procurementUnit ?? line.procurementUnit) !== line.procurementUnit
    );
    const reasons = [
      ...rowReasons(row, line),
      staticNoiseRowIds.has(row.rowId) ? "static_quantity_noise_detected" : null,
      handoffMismatch ? "buyer_handoff_quantity_mismatch" : null,
    ].filter(Boolean) as ProfessionalMaterialQuantityBlockingReason[];
    return { rowId: row.rowId, materialName: row.titleRu, reasons };
  }).filter((item) => item.reasons.length > 0);
  const blockingReasons = [...new Set(blockedRows.flatMap((item) => item.reasons))];

  return {
    passed: blockingReasons.length === 0,
    templateId: input.templateId,
    family: input.family,
    procurementRowsCount: procurementRows.length,
    materialQuantityLinesCount: lines.length,
    formulaBackedLinesCount: lines.filter((line) => line.formula.trim()).length,
    sourceBackedLinesCount: lines.filter((line) => line.sourceId.trim() && line.citationLabel.trim()).length,
    roundingBackedLinesCount: lines.filter((line) => line.procurementPackageSize > 0 && line.procurementQuantity >= line.grossQuantity).length,
    wasteBackedLinesCount: lines.filter((line) => line.wastePercent >= 0 && line.lossPercent >= 0).length,
    dynamicParamBackedLinesCount: lines.filter((line) => line.quantityDependsOnParams.length > 0 || staticQuantityAllowed(line)).length,
    blockedRows,
    blockingReasons,
  };
}
