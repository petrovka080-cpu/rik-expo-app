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

const PATTERN_CACHE = new Map<string, RegExp>();

function matchesPattern(pattern: string | null | undefined, value: string): boolean {
  const normalizedPattern = pattern?.trim();
  if (!normalizedPattern) return false;
  let compiled = PATTERN_CACHE.get(normalizedPattern);
  if (!compiled) {
    compiled = new RegExp(normalizedPattern, "i");
    PATTERN_CACHE.set(normalizedPattern, compiled);
  }
  return compiled.test(value);
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
  let bestNorm: ProfessionalMaterialQuantityNorm | null = null;
  let bestScore = -1;
  for (const norm of ALL_NORMS) {
    const score = scoreNorm(norm, input);
    if (score > bestScore) {
      bestNorm = norm;
      bestScore = score;
    }
  }
  return bestNorm;
}
