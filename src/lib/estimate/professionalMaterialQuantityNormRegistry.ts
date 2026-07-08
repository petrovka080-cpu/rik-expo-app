import familyMaterialConsumptionJson from "../../../data/estimate/material-quantity-norms/family-material-consumption.json";
import materialWasteCoefficientsJson from "../../../data/estimate/material-quantity-norms/material-waste-coefficients.json";
import procurementPackagingJson from "../../../data/estimate/material-quantity-norms/procurement-packaging.json";
import priorityFamilyQuantityNormsJson from "../../../data/estimate/material-quantity-norms/priority-family-quantity-norms.json";
import type { ProfessionalBoqRow } from "./estimateDraftRevisionContract";
import type { ProfessionalMaterialQuantityNorm } from "./professionalMaterialQuantityContract";

const ALL_NORMS: ProfessionalMaterialQuantityNorm[] = [
  ...(familyMaterialConsumptionJson as ProfessionalMaterialQuantityNorm[]),
  ...(materialWasteCoefficientsJson as ProfessionalMaterialQuantityNorm[]),
  ...(procurementPackagingJson as ProfessionalMaterialQuantityNorm[]),
  ...(priorityFamilyQuantityNormsJson as ProfessionalMaterialQuantityNorm[]),
];

function matchesPattern(pattern: string | null | undefined, value: string): boolean {
  if (!pattern?.trim()) return false;
  return new RegExp(pattern, "i").test(value);
}

function familyMatches(normFamily: string, family: string): boolean {
  return normFamily === "*" || normFamily === family || family.includes(normFamily) || normFamily.includes(family);
}

function scoreNorm(norm: ProfessionalMaterialQuantityNorm, input: {
  row: ProfessionalBoqRow;
  family: string;
}): number {
  if (!familyMatches(norm.family, input.family)) return -1;
  const rowText = `${input.row.rowId} ${input.row.materialKey ?? ""} ${input.row.rateKey ?? ""} ${input.row.titleRu}`;
  let score = norm.family === input.family ? 20 : 1;
  if (matchesPattern(norm.rowIdPattern, input.row.rowId)) score += 20;
  if (matchesPattern(norm.materialKeyPattern, input.row.materialKey ?? "")) score += 16;
  if (matchesPattern(norm.materialNamePattern, rowText)) score += 12;
  if (norm.unit && norm.unit === input.row.unit) score += 4;
  return score;
}

export function listProfessionalMaterialQuantityNorms(): ProfessionalMaterialQuantityNorm[] {
  return [...ALL_NORMS];
}

export function findProfessionalMaterialQuantityNorm(input: {
  row: ProfessionalBoqRow;
  family: string;
}): ProfessionalMaterialQuantityNorm | null {
  const scored = ALL_NORMS
    .map((norm) => ({ norm, score: scoreNorm(norm, input) }))
    .filter((item) => item.score >= 0)
    .sort((left, right) => right.score - left.score);
  return scored[0]?.norm ?? null;
}
