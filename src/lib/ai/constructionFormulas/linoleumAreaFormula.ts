import type { ConstructionQuantity } from "../constructionInterpreter/constructionSemanticTypes";
import { parseFirstAreaSqM, round2 } from "./resolveConstructionQuantityFormula";

export function linoleumAreaFormula(text: string): ConstructionQuantity {
  const area = parseFirstAreaSqM(text) ?? 1;
  return {
    volume: round2(area),
    unit: "sq_m",
    formulaId: "linoleum_area_from_floor_area",
    inputVolume: area,
    inputUnit: "sq_m",
    dimensions: { areaSqM: area },
  };
}
