import type { ConstructionQuantity } from "../constructionInterpreter/constructionSemanticTypes";
import { parseFirstAreaSqM, round2 } from "./resolveConstructionQuantityFormula";

export function apartmentRenovationApproximationFormula(text: string): ConstructionQuantity {
  const area = parseFirstAreaSqM(text) ?? 1;
  return {
    volume: round2(area),
    unit: "sq_m",
    formulaId: "apartment_capital_renovation_area_approximation",
    inputVolume: area,
    inputUnit: "sq_m",
    dimensions: { areaSqM: area },
  };
}
