import type { ConstructionQuantity } from "../constructionInterpreter/constructionSemanticTypes";
import { parseFirstAreaSqM, round2 } from "./resolveConstructionQuantityFormula";

function parseRidgeHeightM(text: string): number | null {
  const normalized = text.toLocaleLowerCase("ru-RU").replace(/,/g, ".");
  const match = normalized.match(/(?:высот\w*\s+коньк\w*|конек|конька)\s*(\d+(?:\.\d+)?)\s*(?:м|метр\w*)?/);
  return match ? Number(match[1]) : null;
}

export function gableRoofAreaFormula(text: string): ConstructionQuantity {
  const baseArea = parseFirstAreaSqM(text) ?? 1;
  const ridgeHeight = parseRidgeHeightM(text);
  const slopeFactor = ridgeHeight ? Math.min(1.28, Math.max(1.08, 1 + ridgeHeight / (Math.sqrt(baseArea) * 2))) : 1.15;
  const roofArea = round2(baseArea * slopeFactor);
  return {
    volume: roofArea,
    unit: "sq_m",
    formulaId: "gable_roof_area_from_base_area_and_ridge_height",
    inputVolume: baseArea,
    inputUnit: "sq_m",
    dimensions: {
      baseAreaSqM: baseArea,
      ridgeHeightM: ridgeHeight ?? undefined,
      roofAreaSqM: roofArea,
    },
  };
}
