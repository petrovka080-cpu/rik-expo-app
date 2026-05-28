import type { ConstructionComplexity, ConstructionWorkKey } from "./constructionSemanticTypes";

export function resolveConstructionComplexity(workKey: ConstructionWorkKey): ConstructionComplexity {
  if (workKey === "apartment_capital_renovation") return "complex";
  if (workKey === "metal_canopy_installation" || workKey === "gable_roof_installation" || workKey === "paving_stone_laying") {
    return "medium";
  }
  return "simple";
}
