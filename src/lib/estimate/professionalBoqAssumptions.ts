import type { ProfessionalBoqAssumptions, ProfessionalBoqRiskPolicy } from "./professionalBoqContract";
import { buildProfessionalAssumptionEngineResult } from "./professionalAssumptionEngine";
import { safeJsonParseValue } from "../format";

function unique(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

export function buildProfessionalBoqAssumptions(input: {
  prompt: string;
  rowCount: number;
  hasAnySourceBackedPrice: boolean;
  riskPolicy: ProfessionalBoqRiskPolicy;
}): ProfessionalBoqAssumptions {
  return buildProfessionalAssumptionEngineResult(input);
}

export function professionalBoqRiskRowsFromSourceParameters(
  sourceParameters: Record<string, unknown> | null | undefined,
): { label: string; value: string }[] {
  const level = typeof sourceParameters?.professionalBoqRiskLevel === "string"
    ? sourceParameters.professionalBoqRiskLevel
    : "";
  const notes = Array.isArray(sourceParameters?.professionalBoqRiskNotesRu)
    ? sourceParameters.professionalBoqRiskNotesRu.filter((item): item is string => typeof item === "string")
    : [];
  const assumptions = Array.isArray(sourceParameters?.professionalBoqAssumptionsRu)
    ? sourceParameters.professionalBoqAssumptionsRu.filter((item): item is string => typeof item === "string")
    : [];
  const missingInputs = Array.isArray(sourceParameters?.professionalBoqMissingInputsRu)
    ? sourceParameters.professionalBoqMissingInputsRu.filter((item): item is string => typeof item === "string")
    : [];
  const drawingsPolicy = typeof sourceParameters?.professionalBoqDrawingsPolicyRu === "string"
    ? sourceParameters.professionalBoqDrawingsPolicyRu
    : "";
  const pricePolicy = typeof sourceParameters?.professionalBoqPricePolicyRu === "string"
    ? sourceParameters.professionalBoqPricePolicyRu
    : "";
  return unique([
    level && notes.length > 0 ? JSON.stringify({
      label: "Риск/допуск",
      value: notes[0],
    }) : "",
    assumptions.length > 0 ? JSON.stringify({
      label: "Допущения",
      value: assumptions.slice(0, 4).join("; "),
    }) : "",
    missingInputs.length > 0 ? JSON.stringify({
      label: "Недостающие вводные",
      value: missingInputs.slice(0, 6).join("; "),
    }) : "",
    drawingsPolicy ? JSON.stringify({
      label: "Чертежи",
      value: drawingsPolicy,
    }) : "",
    pricePolicy ? JSON.stringify({
      label: "Цены",
      value: pricePolicy,
    }) : "",
  ]).map((item) => safeJsonParseValue<{ label: string; value: string }>(item, {
    label: "",
    value: "",
  }));
}
