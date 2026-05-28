import type { ConstructionQuantity } from "../constructionInterpreter/constructionSemanticTypes";
import { parseFirstAreaSqM, round2 } from "./resolveConstructionQuantityFormula";

export function roofWaterproofingAreaFormula(text: string): ConstructionQuantity {
  const area = parseFirstAreaSqM(text) ?? 1;
  return {
    volume: round2(area),
    unit: "sq_m",
    formulaId: "roof_waterproofing_area_from_roof_surface",
    inputVolume: area,
    inputUnit: "sq_m",
    dimensions: { areaSqM: area },
  };
}
