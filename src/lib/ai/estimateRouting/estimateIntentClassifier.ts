import type { GlobalWorkCategory } from "../globalEstimate/globalEstimateTypes";
import { extractEstimatePrompt } from "./estimatePromptExtractor";
import type { EstimateIntentRoute } from "./estimateRoutingTypes";

const ESTIMATE_TRIGGERS = [
  "смет",
  "посчитай",
  "рассчитай",
  "сколько стоит",
  "стоимость",
  "цена",
  "расценк",
  "под ключ",
  "estimate",
  "cost",
  "price",
  "quote",
  "boq",
];

const CONSTRUCTION_VERBS = [
  "уложить",
  "установить",
  "заменить",
  "покрасить",
  "залить",
  "заасфальтировать",
  "проложить",
  "смонтировать",
  "демонтировать",
  "отремонтировать",
  "устройство",
  "устроить",
  "устраивать",
  "штукатур",
  "шпаклев",
  "шпатлев",
  "монтаж",
  "ремонт",
  "построить",
  "install",
  "replace",
  "paint",
  "pave",
  "repair",
  "demolish",
];

const CATEGORY_KEYWORDS: Record<GlobalWorkCategory, string[]> = {
  flooring: ["пол", "ламинат", "паркет", "линолеум", "ковролин", "стяжка", "наливной"],
  wall_finishing: ["стены", "обои", "отделка стен", "акустическ", "акустические панели"],
  ceiling: ["потолок", "потолки"],
  drywall: ["гипсокартон", "гкл", "перегород"],
  painting: ["покрас", "краска", "painting"],
  plastering: ["штукатур"],
  putty: ["шпаклев", "шпатлев"],
  tile: ["плитк", "кафель", "bathroom"],
  doors_windows: ["двер", "окн", "window", "door"],
  electrical: ["электрик", "розет", "кабель", "щит", "свет", "пожарн", "апс", "bms", "автоматик", "electrical"],
  plumbing: ["сантех", "труб", "смесител", "канализац", "plumbing"],
  heating_hvac: ["отоплен", "вентиляц", "кондиционер", "кондиционир", "холодильн", "дымоудал", "hvac"],
  roofing: ["кровл", "крыша", "крыш", "двускат", "roof"],
  facade: ["фасад", "входн"],
  foundation: ["фундамент"],
  concrete: ["бетон", "монолит", "плита", "арматур"],
  masonry: ["кладк", "кирпич", "газоблок", "блок"],
  waterproofing: ["гидроизоляц"],
  insulation: ["утеплен", "insulation"],
  demolition: ["демонтаж", "снос", "demolition"],
  landscaping: ["благоустрой", "тротуар", "бордюр", "плитка тротуар", "брусчат", "мощени"],
  roadworks: ["асфальт", "дорог", "парковк", "road", "asphalt", "paving"],
  metalworks: ["металл", "сварк", "навес"],
  carpentry: ["столяр", "дерев", "carpentry"],
  documents_design: ["проект", "дизайн", "проектирован"],
  cleaning: ["уборк", "вывоз мусора", "cleaning"],
  delivery_equipment: ["доставк", "техника", "экскаватор", "кран", "доклевеллер", "промышленн"],
  other: ["ремонт", "строительн"],
};

const EXTRA_CATEGORY_KEYWORDS: Partial<Record<GlobalWorkCategory, string[]>> = {
  flooring: ["floor", "flooring"],
  wall_finishing: ["wall finishing", "wallcovering", "wall panel", "acoustic panel"],
  ceiling: ["ceiling"],
  plastering: ["plaster"],
  putty: ["putty"],
  tile: ["tile", "porcelain", "ceramic"],
  heating_hvac: ["heating", "ventilation", "air conditioning", "boiler", "cold room", "smoke extraction"],
  facade: ["facade", "cladding", "exterior"],
  foundation: ["foundation"],
  masonry: ["masonry", "brick", "block", "stone"],
  waterproofing: ["waterproof"],
  landscaping: ["landscaping", "garden", "lawn", "playground"],
  metalworks: ["metal", "steel", "welding"],
  carpentry: ["timber", "wood", "deck"],
  documents_design: ["design", "project", "survey", "documentation", "permit"],
  cleaning: ["cleanup", "restoration"],
  delivery_equipment: ["delivery", "crane", "equipment", "rental", "temporary", "dock leveler", "industrial equipment"],
};

const ESTIMATE_INTENT_CATEGORIES = Object.keys(CATEGORY_KEYWORDS) as GlobalWorkCategory[];

function includesAny(text: string, values: readonly string[]): boolean {
  return values.some((value) => text.includes(value));
}

function categoryKeywords(category: GlobalWorkCategory): string[] {
  return [...(CATEGORY_KEYWORDS[category] ?? []), ...(EXTRA_CATEGORY_KEYWORDS[category] ?? [])];
}

export function resolveEstimateCategory(text: string): GlobalWorkCategory {
  let best: { category: GlobalWorkCategory; specificity: number } | null = null;
  for (const category of ESTIMATE_INTENT_CATEGORIES) {
    // "other" contains generic words such as "ремонт" and is a fallback,
    // not a competing domain. Otherwise a longer generic token can erase a
    // real signal such as "входная группа" -> facade.
    if (category === "other") continue;
    const specificity = categoryKeywords(category)
      .filter((keyword) => text.includes(keyword))
      .reduce((maximum, keyword) => Math.max(maximum, keyword.length), 0);
    if (specificity > (best?.specificity ?? 0)) best = { category, specificity };
  }
  return best?.category ?? "other";
}

export function classifyEstimateIntent(originalText: string): EstimateIntentRoute {
  const extracted = extractEstimatePrompt(originalText);
  const normalized = extracted.normalizedText;
  const triggerHit = includesAny(normalized, ESTIMATE_TRIGGERS);
  const constructionHit = includesAny(normalized, CONSTRUCTION_VERBS) || ESTIMATE_INTENT_CATEGORIES.some((category) => includesAny(normalized, categoryKeywords(category)));
  const isEstimateIntent = triggerHit || (constructionHit && extracted.volume !== undefined);
  const category = resolveEstimateCategory(normalized);
  const confidence: EstimateIntentRoute["confidence"] =
    triggerHit && constructionHit ? "high" :
      triggerHit || constructionHit ? "medium" :
        "low";

  return {
    isEstimateIntent,
    confidence,
    originalText,
    language: extracted.language,
    resolvedCategory: category,
    volume: extracted.volume,
    unit: extracted.unit,
    location: extracted.location,
    shouldCallEstimateTool: isEstimateIntent && confidence !== "low",
    forbiddenFallbackToRoleQa: isEstimateIntent && confidence !== "low",
  };
}
