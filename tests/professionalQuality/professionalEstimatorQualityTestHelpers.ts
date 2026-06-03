import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate/globalEstimateCalculator";

export const QUALITY_PROMPTS = {
  canopy: "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u043c\u0435\u0442\u0430\u043b\u043b\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043d\u0430\u0432\u0435\u0441 \u043d\u0430 \u043f\u043b\u043e\u0449\u0430\u0434\u0438 647 \u043a\u0432 \u043c\u0435\u0442\u0440\u043e\u0432",
  paving: "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u0443\u043a\u043b\u0430\u0434\u043a\u0443 \u0431\u0440\u0443\u0441\u0447\u0430\u0442\u043a\u0438 \u043d\u0430 587 \u043a\u0432 \u043c",
  elevator: "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u043f\u0430\u0441\u0441\u0430\u0436\u0438\u0440\u0441\u043a\u0438\u0439 \u043b\u0438\u0444\u0442 1 \u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442",
  roofWaterproofing: "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044e \u043a\u0440\u044b\u0448\u0438 100 \u043c\u00b2",
} as const;

export function qualityEstimate(prompt: string = QUALITY_PROMPTS.canopy): GlobalEstimateResult {
  return calculateGlobalConstructionEstimateSync({
    text: prompt,
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    currency: "KGS",
  });
}

export function cloneEstimate(result: GlobalEstimateResult): GlobalEstimateResult {
  return JSON.parse(JSON.stringify(result)) as GlobalEstimateResult;
}

export function weakCanopyEstimate(): GlobalEstimateResult {
  const result = cloneEstimate(qualityEstimate(QUALITY_PROMPTS.canopy));
  const rows = result.sections.flatMap((section) => section.rows);
  rows[0].name = "\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b";
  rows[1].name = "\u043c\u043e\u043d\u0442\u0430\u0436";
  rows[2].name = "\u0440\u0430\u0431\u043e\u0442\u044b";
  rows[3].name = "\u043a\u0440\u0435\u043f\u0451\u0436";
  return result;
}

export function shortComplexEstimate(): GlobalEstimateResult {
  const result = cloneEstimate(qualityEstimate(QUALITY_PROMPTS.canopy));
  for (const section of result.sections) {
    section.rows = section.rows.slice(0, section.type === "materials" ? 2 : section.type === "labor" ? 1 : 0);
  }
  result.sections = result.sections.filter((section) => section.rows.length > 0);
  result.totals.materialsTotal = result.sections.filter((section) => section.type === "materials").flatMap((section) => section.rows).reduce((sum, row) => sum + row.total, 0);
  result.totals.laborTotal = result.sections.filter((section) => section.type === "labor").flatMap((section) => section.rows).reduce((sum, row) => sum + row.total, 0);
  result.totals.equipmentTotal = 0;
  result.totals.deliveryTotal = 0;
  result.totals.taxTotal = 0;
  result.totals.grandTotal = result.totals.materialsTotal + result.totals.laborTotal;
  return result;
}

export function allRowNames(result: GlobalEstimateResult): string[] {
  return result.sections.flatMap((section) => section.rows.map((row) => row.name));
}
