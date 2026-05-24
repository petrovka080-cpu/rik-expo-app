import type { GlobalEstimateResult } from "./globalEstimateTypes";
import { minimumRowsForEstimate } from "./estimateBoqDepthPolicy";

export type EstimateBoqDepthValidation = {
  passed: boolean;
  minimumRows: number;
  actualRows: number;
  hasMaterials: boolean;
  hasLabor: boolean;
  hasEquipmentOrDeliveryOrWarning: boolean;
  blockers: string[];
};

export function validateEstimateBoqDepth(result: GlobalEstimateResult): EstimateBoqDepthValidation {
  const rows = result.sections.flatMap((section) => section.rows);
  const minimumRows = minimumRowsForEstimate(result);
  const hasMaterials = result.sections.some((section) => section.type === "materials" && section.rows.length > 0);
  const hasLabor = result.sections.some((section) => section.type === "labor" && section.rows.length > 0);
  const hasEquipmentOrDeliveryOrWarning =
    result.sections.some((section) => (section.type === "equipment" || section.type === "delivery") && section.rows.length > 0) ||
    result.regionalRisks.length > 0 ||
    result.clarifyingQuestions.length > 0;

  const blockers: string[] = [];
  if (rows.length < minimumRows) blockers.push(`BOQ_DEPTH_TOO_SHORT:${rows.length}<${minimumRows}`);
  if (!hasMaterials) blockers.push("BOQ_MATERIALS_GROUP_MISSING");
  if (!hasLabor) blockers.push("BOQ_LABOR_GROUP_MISSING");
  if (!hasEquipmentOrDeliveryOrWarning) blockers.push("BOQ_EQUIPMENT_DELIVERY_OR_WARNING_MISSING");

  return {
    passed: blockers.length === 0,
    minimumRows,
    actualRows: rows.length,
    hasMaterials,
    hasLabor,
    hasEquipmentOrDeliveryOrWarning,
    blockers,
  };
}
