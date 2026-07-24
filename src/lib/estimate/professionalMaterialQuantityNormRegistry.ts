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
  const patternScore =
    (matchesPattern(norm.rowIdPattern, input.row.rowId) ? 20 : 0) +
    (matchesPattern(norm.materialKeyPattern, input.row.materialKey ?? "") ? 16 : 0) +
    (matchesPattern(norm.materialNamePattern, rowText) ? 12 : 0);
  const unitScore = norm.unit && norm.unit === input.row.unit ? 4 : 0;
  // A family match identifies the search domain; it is not sufficient evidence
  // that a pipe/asphalt/geotextile norm applies to every material row in that
  // family. Require the row/material pattern or the declared unit to match.
  if (patternScore === 0 && unitScore === 0) return -1;
  score += patternScore + unitScore;
  return score;
}

export function listProfessionalMaterialQuantityNorms(): ProfessionalMaterialQuantityNorm[] {
  return [...ALL_NORMS];
}

export function findProfessionalMaterialQuantityNorm(input: {
  row: ProfessionalBoqRow;
  family: string;
}): ProfessionalMaterialQuantityNorm | null {
  if (input.row.rowType !== "material") return null;
  const scored = ALL_NORMS
    .map((norm) => ({ norm, score: scoreNorm(norm, input) }))
    .filter((item) => item.score >= 0)
    .sort((left, right) => right.score - left.score);
  return scored[0]?.norm ?? null;
}
