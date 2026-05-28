import type { ConstructionQuantity } from "../constructionInterpreter/constructionSemanticTypes";
import { parseFirstAreaSqM, round2 } from "./resolveConstructionQuantityFormula";

export function metalCanopyQuantityFormula(text: string): ConstructionQuantity {
  const area = parseFirstAreaSqM(text) ?? 1;
  return {
    volume: round2(area),
    unit: "sq_m",
    formulaId: "metal_canopy_area_with_structural_member_quantities",
    inputVolume: area,
    inputUnit: "sq_m",
    dimensions: { areaSqM: area },
  };
}
