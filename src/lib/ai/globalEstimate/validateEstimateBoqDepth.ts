import type { GlobalEstimateResult } from "./globalEstimateTypes";
import { minimumRowsForEstimate } from "./estimateBoqDepthPolicy";

export type EstimateBoqDepthValidation = {
  passed: boolean;
  minimumRows: number;
  actualRows: number;
  hasMaterials: boolean;
  hasLabor: boolean;
  hasEquipmentOrDeliveryOrWarning: boolean;
  hasAssumptions: boolean;
  hasCostFactors: boolean;
  hasClarifyingQuestions: boolean;
  hasSourceEvidence: boolean;
  hasTaxStatusOrWarning: boolean;
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
  const hasAssumptions = result.assumptions.length > 0;
  const hasCostFactors = result.costIncreaseFactors.length > 0;
  const hasClarifyingQuestions = result.clarifyingQuestions.length > 0;
  const hasSourceEvidence = rows.every((row) => row.priceStatus !== "priced" || row.sourceEvidence.length > 0);
  const hasTaxStatusOrWarning = Boolean(result.tax.taxType || result.tax.warning);

  const blockers: string[] = [];
  if (rows.length < minimumRows) blockers.push(`BOQ_DEPTH_TOO_SHORT:${rows.length}<${minimumRows}`);
  if (!hasMaterials) blockers.push("BOQ_MATERIALS_GROUP_MISSING");
  if (!hasLabor) blockers.push("BOQ_LABOR_GROUP_MISSING");
  if (!hasEquipmentOrDeliveryOrWarning) blockers.push("BOQ_EQUIPMENT_DELIVERY_OR_WARNING_MISSING");
  if (!hasAssumptions) blockers.push("BOQ_ASSUMPTIONS_MISSING");
  if (!hasCostFactors) blockers.push("BOQ_COST_FACTORS_MISSING");
  if (!hasClarifyingQuestions) blockers.push("BOQ_CLARIFYING_QUESTIONS_MISSING");
  if (!hasSourceEvidence) blockers.push("BOQ_SOURCE_EVIDENCE_MISSING");
  if (!hasTaxStatusOrWarning) blockers.push("BOQ_TAX_STATUS_OR_WARNING_MISSING");

  return {
    passed: blockers.length === 0,
    minimumRows,
    actualRows: rows.length,
    hasMaterials,
    hasLabor,
    hasEquipmentOrDeliveryOrWarning,
    hasAssumptions,
    hasCostFactors,
    hasClarifyingQuestions,
    hasSourceEvidence,
    hasTaxStatusOrWarning,
    blockers,
  };
}
