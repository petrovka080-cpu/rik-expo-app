import { resolveConstructionQuantityFormula } from "../constructionFormulas/resolveConstructionQuantityFormula";
import type { GlobalWorkCategory } from "../globalEstimate/globalEstimateTypes";
import type {
  ConstructionObject,
  ConstructionOperation,
  ConstructionWorkKey,
  ConstructionWorkPlan,
} from "./constructionSemanticTypes";
import { resolveConstructionComplexity } from "./resolveConstructionComplexity";
import { resolveConstructionDomain } from "./resolveConstructionDomain";
import { resolveConstructionMethod } from "./resolveConstructionMethod";
import { resolveConstructionObject } from "./resolveConstructionObject";
import { resolveConstructionOperation } from "./resolveConstructionOperation";
import { validateConstructionWorkPlan } from "./validateConstructionWorkPlan";

export function normalizeConstructionSemanticText(value: string): string {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[«»"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasEstimateIntent(normalized: string): boolean {
  return /смет|рассчит|расчет|посчита|стоимост|сколько стоит|цена|boq|estimate|cost/.test(normalized)
    || (/(кв\.?\s*м|м2|м²|sqm|шт|пог\.?\s*м|м3|кг|тонн?)/.test(normalized)
      && /(улож|уклад|установ|монтаж|устройств|ремонт|гидроизоляц|навес|крыш|кровл|брусчат|линолеум|квартир)/.test(normalized));
}

function workKeyFor(input: {
  normalized: string;
  object: ConstructionObject;
  operation: ConstructionOperation;
}): ConstructionWorkKey | null {
  if (input.object === "paving_stone_surface") return "paving_stone_laying";
  if (input.object === "brick_wall") return "brick_masonry";
  if (input.object === "linoleum_floor") return "linoleum_laying";
  if (input.object === "metal_canopy") {
    if (!/металл|сталь|стальн|сварн|ферм/.test(input.normalized)) return null;
    return "metal_canopy_installation";
  }
  if (input.object === "gable_roof") return "gable_roof_installation";
  if (input.object === "roof" && input.operation === "waterproofing") {
    if (!/гидроизоляц/.test(input.normalized)) return null;
    if (/мембран|мастик|плоск/.test(input.normalized)) return null;
    return "roof_waterproofing";
  }
  if (input.object === "bathroom" && input.operation === "waterproofing") return "bathroom_waterproofing";
  if (input.object === "apartment") {
    if (!/капитальн|капремонт/.test(input.normalized)) return null;
    return "apartment_capital_renovation";
  }
  if (input.object === "tile_surface") return "tile_laying";
  return null;
}

function categoryFor(workKey: ConstructionWorkKey): GlobalWorkCategory {
  if (workKey === "linoleum_laying") return "flooring";
  if (workKey === "paving_stone_laying") return "landscaping";
  if (workKey === "brick_masonry") return "masonry";
  if (workKey === "metal_canopy_installation") return "metalworks";
  if (workKey === "gable_roof_installation" || workKey === "roof_waterproofing") return "roofing";
  if (workKey === "bathroom_waterproofing") return "waterproofing";
  if (workKey === "apartment_capital_renovation") return "other";
  return "tile";
}

function titleFor(workKey: ConstructionWorkKey): string {
  const titles: Record<ConstructionWorkKey, string> = {
    linoleum_laying: "Профессиональная смета на укладку линолеума",
    paving_stone_laying: "Профессиональная смета на укладку брусчатки",
    brick_masonry: "Профессиональная смета на кирпичную кладку",
    metal_canopy_installation: "Профессиональная смета на металлический навес",
    apartment_capital_renovation: "Профессиональная смета на капитальный ремонт квартиры",
    gable_roof_installation: "Профессиональная смета на устройство двускатной крыши",
    roof_waterproofing: "Профессиональная смета на гидроизоляцию крыши",
    bathroom_waterproofing: "Профессиональная смета на гидроизоляцию ванной",
    tile_laying: "Профессиональная смета на укладку плитки",
  };
  return titles[workKey];
}

export function buildConstructionWorkPlan(text: string): ConstructionWorkPlan | null {
  const normalized = normalizeConstructionSemanticText(text);
  const estimateIntentDetected = hasEstimateIntent(normalized);
  const domain = resolveConstructionDomain(text);
  const object = resolveConstructionObject({ text, domain });
  const operation = resolveConstructionOperation({ text, domain, object });
  const method = resolveConstructionMethod({ domain, object, operation });
  const workKey = workKeyFor({ normalized, object, operation });
  if (!workKey || !estimateIntentDetected) return null;

  const quantity = resolveConstructionQuantityFormula({ text, workKey });
  const plan: ConstructionWorkPlan = {
    originalText: text,
    normalizedText: normalized,
    estimateIntentDetected,
    workKey,
    workFamily: categoryFor(workKey),
    domain,
    object,
    operation,
    method,
    complexity: resolveConstructionComplexity(workKey),
    titleRu: titleFor(workKey),
    quantity,
    formulaId: quantity.formulaId,
    templateId: `${workKey}_professional_boq_v1`,
    confidence: "high",
  };
  const validation = validateConstructionWorkPlan(plan);
  if (!validation.passed) {
    return null;
  }
  return plan;
}
