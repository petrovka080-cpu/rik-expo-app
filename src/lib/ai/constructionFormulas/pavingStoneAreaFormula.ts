import type { ConstructionQuantity } from "../constructionInterpreter/constructionSemanticTypes";
import { parseFirstAreaSqM, round2 } from "./resolveConstructionQuantityFormula";

export function pavingStoneAreaFormula(text: string): ConstructionQuantity {
  const area = parseFirstAreaSqM(text) ?? 1;
  return {
    volume: round2(area),
    unit: "sq_m",
    formulaId: "paving_stone_area_from_surface_area",
    inputVolume: area,
    inputUnit: "sq_m",
    dimensions: { areaSqM: area },
  };
}
