import type { ConstructionQuantity, ConstructionWorkKey } from "../constructionInterpreter/constructionSemanticTypes";
import { apartmentRenovationApproximationFormula } from "./apartmentRenovationApproximationFormula";
import { gableRoofAreaFormula } from "./gableRoofAreaFormula";
import { linoleumAreaFormula } from "./linoleumAreaFormula";
import { metalCanopyQuantityFormula } from "./metalCanopyQuantityFormula";
import { pavingStoneAreaFormula } from "./pavingStoneAreaFormula";
import { roofWaterproofingAreaFormula } from "./roofWaterproofingAreaFormula";

export function parseFirstAreaSqM(text: string): number | null {
  const normalized = text.toLocaleLowerCase("ru-RU").replace(/,/g, ".");
  const areaMatches = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(?:кв\.?\s*м|м2|м²|квадрат\w*\s+метр\w*|sqm|sq\s*m)/g)];
  const first = areaMatches[0]?.[1];
  return first ? Number(first) : null;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function resolveConstructionQuantityFormula(input: {
  text: string;
  workKey: ConstructionWorkKey;
}): ConstructionQuantity {
  if (input.workKey === "gable_roof_installation") return gableRoofAreaFormula(input.text);
  if (input.workKey === "paving_stone_laying") return pavingStoneAreaFormula(input.text);
  if (input.workKey === "metal_canopy_installation") return metalCanopyQuantityFormula(input.text);
  if (input.workKey === "apartment_capital_renovation") return apartmentRenovationApproximationFormula(input.text);
  if (input.workKey === "roof_waterproofing") return roofWaterproofingAreaFormula(input.text);
  if (input.workKey === "linoleum_laying") return linoleumAreaFormula(input.text);

  const area = parseFirstAreaSqM(input.text) ?? 1;
  return {
    volume: area,
    unit: "sq_m",
    formulaId: "construction_area_default",
    inputVolume: area,
    inputUnit: "sq_m",
    dimensions: { areaSqM: area },
  };
}
