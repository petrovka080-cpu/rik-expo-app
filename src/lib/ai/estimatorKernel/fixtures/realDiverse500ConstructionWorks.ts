import {
  ESTIMATOR_DOMAIN_LEXICON,
  type EstimatorDomainLexiconEntry,
} from "../constructionDomainLexicon";

export type RealDiverseConstructionWorkCase = {
  caseId: string;
  promptRu: string;
  route: "/request" | "/ai?context=foreman" | "/ai?context=request";
  domain: string;
  expectedObject: string;
  expectedOperation: string;
  expectedMethod?: string;
  complexity: "simple" | "medium" | "complex" | "infrastructure" | "regulated";
  quantityExpectation: {
    areaM2?: number;
    lengthM?: number;
    widthM?: number;
    heightM?: number;
    depthM?: number;
    count?: number;
    powerKw?: number;
    floorCount?: number;
    volumeM3?: number;
  };
  expectedMinimumRows: number;
  requiredRowTokens: string[];
  forbiddenRowTokens: string[];
  unitRules: string[];
  pdfRequired: boolean;
  catalogBindingRequired: boolean;
  regulatedSafetyRequired: boolean;
};

const FORBIDDEN_WEAK_ROWS = [
  "Строительные работы",
  "материал",
  "работы",
  "монтаж",
  "крепёж",
  "прочее",
  "дополнительные материалы",
  "дополнительные работы",
  "ремонт кровли",
  "бетонные работы",
] as const;

const REAL_500_DOMAIN_ENTRIES = ESTIMATOR_DOMAIN_LEXICON
  .filter((entry) => entry.domain !== "landscaping")
  .slice(0, 50);

const areaValues = [36, 48, 55, 67, 80, 100, 120, 180, 300, 647];
const lengthValues = [24, 36, 48, 60, 80, 100, 120, 180, 240, 320];
const countValues = [2, 4, 6, 8, 10, 12, 14, 18, 24, 30];
const powerValues = [10, 15, 20, 30, 50, 75, 100, 150, 250, 500];
const locations = ["в Бишкеке", "в Алматы", "в Оше", "на объекте", "в частном доме", "в офисе", "на участке", "в кафе", "в магазине", "на производстве"];
const lengthDomains = new Set(["fencing", "well_drilling", "sewerage", "drainage", "retaining_walls", "irrigation", "water_supply", "gas_regulated"]);
const countDomains = new Set(["doors", "windows", "security_systems", "industrial_equipment", "staircases", "boilers_regulated", "cranes_regulated"]);

function routeFor(index: number): RealDiverseConstructionWorkCase["route"] {
  if (index < 250) return "/request";
  if (index < 400) return "/ai?context=foreman";
  return "/ai?context=request";
}

function minimumRows(complexity: RealDiverseConstructionWorkCase["complexity"]): number {
  if (complexity === "infrastructure") return 45;
  if (complexity === "regulated") return 30;
  if (complexity === "complex") return 30;
  if (complexity === "medium") return 18;
  return 12;
}

function quantityFor(entry: EstimatorDomainLexiconEntry, variant: number): {
  prompt: string;
  expectation: RealDiverseConstructionWorkCase["quantityExpectation"];
} {
  if (entry.domain === "concrete" && variant === 0) {
    return {
      prompt: "ширина 0,4 высота 5 метров длина 0,5 метров и надо 10 штук",
      expectation: { widthM: 0.4, lengthM: 0.5, heightM: 5, count: 10, volumeM3: 10 },
    };
  }
  if (entry.domain === "elevators_regulated") {
    const floorCount = variant === 0 ? 14 : 6 + variant;
    return { prompt: `на ${floorCount} этажей`, expectation: { floorCount } };
  }
  if (entry.domain === "hydropower") {
    const powerKw = variant === 0 ? 100 : powerValues[variant];
    return { prompt: `${powerKw} кВт`, expectation: { powerKw } };
  }
  if (entry.domain === "solar") {
    const powerKw = variant === 0 ? 30 : powerValues[variant];
    return { prompt: `${powerKw} кВт`, expectation: { powerKw } };
  }
  if (lengthDomains.has(entry.domain)) {
    const lengthM = entry.domain === "drainage" && variant === 0 ? 120 : lengthValues[variant];
    return { prompt: `${lengthM} метров`, expectation: { lengthM } };
  }
  if (countDomains.has(entry.domain)) {
    const count = countValues[variant];
    return { prompt: `${count} шт`, expectation: { count } };
  }
  const areaM2 =
    entry.domain === "flooring" && variant === 0 ? 100 :
      entry.domain === "paving_landscaping" && variant === 0 ? 587 :
        entry.domain === "canopies" && variant === 0 ? 647 :
          entry.domain === "roofing" && variant === 0 ? 67 :
            entry.domain === "waterproofing" && variant === 0 ? 100 :
              areaValues[variant];
  return { prompt: `${areaM2} кв м`, expectation: { areaM2 } };
}

function mandatoryPrompt(entry: EstimatorDomainLexiconEntry, variant: number): string | null {
  if (variant !== 0) return null;
  if (entry.domain === "paving_landscaping") return "смета на укладку брусчатки на 587 кв м";
  if (entry.domain === "canopies") return "смета на металлический навес на площади 647 кв метров";
  if (entry.domain === "roofing") return "дай смету на установку двухскатной крыши высота конька 2,5 метра и основание 67 кв м";
  if (entry.domain === "flooring") return "Хочу уложить линолеум на 100 кв м";
  if (entry.domain === "waterproofing") return "смета на гидроизоляцию крыши 100 кв м";
  if (entry.domain === "concrete") return "смета на заливку тумб ширина 0,4 высота 5 метров длина 0,5 метров и надо 10 штук";
  if (entry.domain === "drainage") return "смета на дренажные каналы 120 метров";
  if (entry.domain === "elevators_regulated") return "смета на установку лифта пассажирского на 14 этажей";
  if (entry.domain === "electrical") return "смета на электромонтаж 100 м2";
  if (entry.domain === "hydropower") return "смета на установку турбины на ГЭС 100 кВт";
  return null;
}

function requiredTokens(entry: EstimatorDomainLexiconEntry): string[] {
  if (entry.domain === "paving_landscaping") return ["геотекстиль", "щебень", "брусчатка", "укладка брусчатки", "заполнение швов"];
  if (entry.domain === "canopies") return ["стойки металлические", "фермы / балки", "прогоны", "кровельное покрытие", "кран / автовышка"];
  if (entry.domain === "concrete") return ["бетон", "арматура", "опалубка", "заливка бетона", "вибр"];
  if (entry.domain === "elevators_regulated") return ["обследование шахты", "пассажирская кабина", "двери шахты", "ПНР", "инспекция"];
  if (entry.domain === "drainage") return ["разметка трассы", "дренажные лотки", "реш", "проверка проливом"];
  return [
    ...entry.requiredMaterials.slice(0, 2),
    ...entry.requiredLabor.slice(0, 2),
    entry.requiredEquipmentOrWarnings[0],
  ].filter(Boolean);
}

function caseFor(entry: EstimatorDomainLexiconEntry, variant: number, globalIndex: number): RealDiverseConstructionWorkCase {
  const quantity = quantityFor(entry, variant);
  const prompt = mandatoryPrompt(entry, variant) ??
    `смета на ${entry.casePhrases[variant % entry.casePhrases.length]} ${quantity.prompt} ${locations[variant % locations.length]}`;
  const complexity = entry.regulatedSafetyRequired ? "regulated" : entry.complexity;
  const concretePedestalPrompt = entry.domain === "concrete" && /тумб/.test(prompt.toLocaleLowerCase("ru-RU"));
  return {
    caseId: `real500_${entry.domain}_${String(variant + 1).padStart(2, "0")}`,
    promptRu: prompt,
    route: routeFor(globalIndex),
    domain: entry.domain,
    expectedObject: concretePedestalPrompt ? "concrete_pedestal" : entry.object,
    expectedOperation: entry.operation,
    expectedMethod: concretePedestalPrompt ? "rectangular_concrete_element" : entry.method,
    complexity,
    quantityExpectation: quantity.expectation,
    expectedMinimumRows: minimumRows(complexity),
    requiredRowTokens: requiredTokens(entry),
    forbiddenRowTokens: [...FORBIDDEN_WEAK_ROWS],
    unitRules: [...entry.unitRules],
    pdfRequired: false,
    catalogBindingRequired: true,
    regulatedSafetyRequired: entry.regulatedSafetyRequired === true,
  };
}

const baseCases = REAL_500_DOMAIN_ENTRIES.flatMap((entry, domainIndex) =>
  Array.from({ length: 10 }, (_value, variant) => caseFor(entry, variant, domainIndex * 10 + variant)),
);

const requiredPdfDomains = new Set([
  "paving_landscaping",
  "canopies",
  "concrete",
  "elevators_regulated",
  "drainage",
  "waterproofing",
  "roofing",
  "flooring",
  "electrical",
  "hydropower",
  "foundation",
  "ventilation",
  "asphalt_roadworks",
  "well_drilling",
  "solar",
]);
const requiredPdfIds = new Set(
  baseCases
    .filter((item) => item.caseId.endsWith("_01") && requiredPdfDomains.has(item.domain))
    .map((item) => item.caseId),
);
for (const item of baseCases) {
  if (requiredPdfIds.size >= 75) break;
  requiredPdfIds.add(item.caseId);
}

export const REAL_DIVERSE_500_CONSTRUCTION_WORKS: readonly RealDiverseConstructionWorkCase[] =
  baseCases.map((item) => ({
    ...item,
    pdfRequired: requiredPdfIds.has(item.caseId),
  }));

export const REAL_500_ACCEPTANCE_CONTRACT = {
  wave: "S_REAL_500_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_ACCEPTANCE_POINT_OF_NO_RETURN",
  requiredCases: 500,
  requiredDomains: 50,
  requiredWebPrompts: 500,
  requiredAndroidApi34Prompts: 60,
  requiredPdfExtractions: 75,
  routeSplit: {
    request: 250,
    aiForeman: 150,
    aiRequest: 100,
  },
} as const;
