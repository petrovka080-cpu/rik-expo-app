import {
  ESTIMATOR_DOMAIN_LEXICON,
  type EstimatorDomainLexiconEntry,
} from "../constructionDomainLexicon";
import { REAL_DIVERSE_500_CONSTRUCTION_WORKS } from "./realDiverse500ConstructionWorks";

export type Real10000MacroDomain =
  | "residential_construction"
  | "non_residential_construction"
  | "fit_out_furnishing"
  | "engineering_communications"
  | "infrastructure"
  | "landscaping"
  | "agricultural_structures"
  | "industrial_facilities"
  | "regulated_high_risk";

export type Real10000ConstructionWorkCase = {
  caseId: string;
  promptRu: string;
  route: "/request" | "/ai?context=foreman" | "/ai?context=request";
  macroDomain: Real10000MacroDomain;
  domain: string;
  expectedResolvedDomain: string;
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
    thicknessMm?: number;
    count?: number;
    powerKw?: number;
    floorCount?: number;
    volumeM3?: number;
    massTon?: number;
  };
  expectedMinimumRows: number;
  requiredRowTokens: string[];
  forbiddenRowTokens: string[];
  unitRules: string[];
  pdfRequired: boolean;
  catalogBindingRequired: boolean;
  sourceEvidenceRequired: boolean;
  regulatedSafetyRequired: boolean;
};

type AcceptanceDomainDefinition = {
  macroDomain: Real10000MacroDomain;
  domain: string;
  lexiconDomain: string;
  regulated?: boolean;
  infrastructure?: boolean;
  promptSuffix?: string;
};

const lexiconByDomain = new Map(ESTIMATOR_DOMAIN_LEXICON.map((entry) => [entry.domain, entry]));
const real500ByDomain = REAL_DIVERSE_500_CONSTRUCTION_WORKS.reduce(
  (map, item) => (map.has(item.domain) ? map : map.set(item.domain, item)),
  new Map<string, (typeof REAL_DIVERSE_500_CONSTRUCTION_WORKS)[number]>(),
);
const forbiddenWeakRows = [...(REAL_DIVERSE_500_CONSTRUCTION_WORKS[0]?.forbiddenRowTokens ?? [])];

const domainGroups: readonly {
  macroDomain: Real10000MacroDomain;
  domains: readonly [domain: string, lexiconDomain: string, flags?: Omit<AcceptanceDomainDefinition, "macroDomain" | "domain" | "lexiconDomain">][];
}[] = [
  {
    macroDomain: "residential_construction",
    domains: [
      ["apartment_renovation", "apartment_renovation"],
      ["house_renovation", "house_renovation"],
      ["bathroom_renovation", "bathroom_renovation"],
      ["kitchen_renovation", "kitchen_renovation"],
      ["residential_flooring", "flooring"],
      ["residential_tiling", "tiling"],
      ["residential_drywall", "drywall"],
      ["gable_roofs", "roofing"],
      ["roof_waterproofing", "waterproofing"],
      ["residential_windows", "windows"],
    ],
  },
  {
    macroDomain: "non_residential_construction",
    domains: [
      ["office_fit_out", "commercial_fit_out"],
      ["retail_fit_out", "commercial_fit_out"],
      ["cafe_restaurant_fit_out", "commercial_fit_out"],
      ["warehouse_fit_out", "commercial_fit_out"],
      ["clinic_fit_out", "commercial_fit_out"],
      ["metal_canopies", "canopies"],
      ["concrete_pedestals", "concrete"],
      ["commercial_partitions", "drywall"],
      ["non_residential_industrial_floors", "concrete"],
      ["fire_rated_doors", "doors", { regulated: true, promptSuffix: " fire safety" }],
    ],
  },
  {
    macroDomain: "fit_out_furnishing",
    domains: [
      ["built_in_furniture", "commercial_fit_out"],
      ["kitchen_cabinets", "kitchen_renovation"],
      ["wardrobes", "commercial_fit_out"],
      ["countertops", "kitchen_renovation"],
      ["reception_desks", "commercial_fit_out"],
      ["warehouse_racks", "metal_structures"],
      ["laboratory_furniture", "commercial_fit_out"],
      ["office_furniture_installation", "commercial_fit_out"],
    ],
  },
  {
    macroDomain: "engineering_communications",
    domains: [
      ["electrical_installation", "electrical"],
      ["low_voltage_networks", "low_voltage"],
      ["fire_alarm_systems", "fire_alarm", { regulated: true, promptSuffix: " fire safety" }],
      ["security_alarm_systems", "security_systems"],
      ["cctv_systems", "security_systems"],
      ["access_control_systems", "security_systems"],
      ["structured_cabling", "low_voltage"],
      ["plumbing_systems", "plumbing"],
      ["water_supply_networks", "water_supply"],
      ["sewerage_networks", "sewerage"],
      ["heating_systems", "heating"],
      ["gas_systems_regulated", "gas_regulated", { regulated: true }],
      ["ventilation_systems", "ventilation"],
      ["air_conditioning_systems", "air_conditioning"],
      ["bms_automation", "low_voltage"],
    ],
  },
  {
    macroDomain: "infrastructure",
    domains: [
      ["road_asphalt", "asphalt_roadworks", { infrastructure: true }],
      ["paving_stone_paths", "paving_landscaping"],
      ["road_curbs", "paving_landscaping"],
      ["stormwater_channels", "drainage"],
      ["drainage_channels", "drainage"],
      ["culverts", "sewerage", { infrastructure: true }],
      ["retaining_walls", "retaining_walls", { infrastructure: true }],
      ["small_bridge_works", "concrete", { infrastructure: true }],
      ["street_lighting", "electrical"],
      ["external_water_supply", "water_supply", { infrastructure: true }],
      ["external_sewerage", "sewerage", { infrastructure: true }],
      ["power_lines", "electrical", { regulated: true, promptSuffix: " high voltage" }],
      ["substations", "industrial_equipment", { regulated: true, infrastructure: true, promptSuffix: " high voltage" }],
      ["telecom_ducting", "low_voltage"],
      ["site_roads", "site_preparation"],
      ["parking_lots", "asphalt_roadworks"],
      ["hydropower_turbines", "hydropower", { regulated: true, infrastructure: true }],
      ["solar_power_plants", "solar", { infrastructure: true }],
      ["diesel_generators", "industrial_equipment"],
    ],
  },
  {
    macroDomain: "landscaping",
    domains: [
      ["landscape_paving_stone", "paving_landscaping"],
      ["sidewalks", "paving_landscaping"],
      ["landscape_curbs", "paving_landscaping"],
      ["lawns", "landscaping"],
      ["irrigation_systems", "irrigation"],
      ["fencing_and_gates", "fencing"],
      ["playgrounds", "landscaping"],
      ["sports_grounds", "landscaping"],
    ],
  },
  {
    macroDomain: "agricultural_structures",
    domains: [
      ["barns", "metal_structures"],
      ["sheds", "metal_structures"],
      ["greenhouses", "metal_structures"],
      ["cowsheds", "metal_structures"],
      ["poultry_houses", "metal_structures"],
      ["grain_storage", "metal_structures"],
      ["agricultural_hangars", "metal_structures"],
    ],
  },
  {
    macroDomain: "industrial_facilities",
    domains: [
      ["industrial_buildings", "metal_structures", { infrastructure: true }],
      ["steel_frames", "metal_structures", { infrastructure: true }],
      ["sandwich_panels", "facade"],
      ["crane_beams", "metal_structures", { regulated: true, promptSuffix: " industrial crane" }],
      ["industrial_floors", "concrete", { infrastructure: true }],
      ["equipment_foundations", "foundation", { infrastructure: true }],
      ["equipment_installation", "industrial_equipment", { infrastructure: true }],
      ["production_lines", "industrial_equipment", { infrastructure: true }],
      ["conveyor_systems", "industrial_equipment", { infrastructure: true }],
      ["boiler_rooms", "boilers_regulated", { regulated: true, promptSuffix: " boiler" }],
      ["compressor_rooms", "industrial_equipment", { infrastructure: true }],
      ["pump_stations", "water_supply", { infrastructure: true }],
      ["industrial_ventilation", "ventilation"],
      ["industrial_electrical", "electrical", { regulated: true, promptSuffix: " high voltage" }],
      ["industrial_automation", "low_voltage"],
    ],
  },
  {
    macroDomain: "regulated_high_risk",
    domains: [
      ["passenger_elevators", "elevators_regulated", { regulated: true }],
      ["freight_elevators", "elevators_regulated", { regulated: true }],
      ["escalators", "elevators_regulated", { regulated: true, promptSuffix: " escalator" }],
      ["high_voltage", "electrical", { regulated: true, promptSuffix: " high voltage" }],
      ["industrial_cranes", "cranes_regulated", { regulated: true }],
      ["fire_protection", "fire_alarm", { regulated: true, promptSuffix: " fire safety" }],
      ["structural_demolition", "demolition", { regulated: true, promptSuffix: " structural demolition" }],
      ["hazardous_materials", "site_preparation", { regulated: true, promptSuffix: " hazardous materials" }],
    ],
  },
];

function acceptanceDomains(): AcceptanceDomainDefinition[] {
  return domainGroups.flatMap((group) =>
    group.domains.map(([domain, lexiconDomain, flags]) => ({
      macroDomain: group.macroDomain,
      domain,
      lexiconDomain,
      ...flags,
    })),
  );
}

function lexiconEntry(domain: string): EstimatorDomainLexiconEntry {
  const entry = lexiconByDomain.get(domain);
  if (!entry) throw new Error(`REAL_10000_MISSING_LEXICON_DOMAIN:${domain}`);
  return entry;
}

function routeFor(index: number): Real10000ConstructionWorkCase["route"] {
  if (index < 4_000) return "/request";
  if (index < 7_000) return "/ai?context=foreman";
  return "/ai?context=request";
}

function minimumRows(complexity: Real10000ConstructionWorkCase["complexity"]): number {
  if (complexity === "infrastructure") return 45;
  if (complexity === "regulated") return 30;
  if (complexity === "complex") return 30;
  if (complexity === "medium") return 18;
  return 12;
}

const areaValues = [36, 48, 55, 67, 80, 100, 120, 180, 300, 647, 850, 1000, 1500, 2000];
const lengthValues = [24, 36, 48, 60, 80, 100, 120, 180, 240, 320, 500, 750, 1000, 1500];
const countValues = [2, 4, 6, 8, 10, 12, 14, 18, 24, 30, 40, 50, 75, 100];
const powerValues = [10, 15, 20, 30, 50, 75, 100, 150, 250, 500, 630, 1000, 1600, 2000];
const locations = [
  "в Бишкеке",
  "в Алматы",
  "в Оше",
  "на объекте",
  "в частном доме",
  "в офисе",
  "на участке",
  "в кафе",
  "в магазине",
  "на производстве",
];
const lengthDomains = new Set(["fencing", "well_drilling", "sewerage", "drainage", "retaining_walls", "irrigation", "water_supply", "gas_regulated"]);
const countDomains = new Set(["doors", "windows", "security_systems", "industrial_equipment", "staircases", "boilers_regulated", "cranes_regulated", "elevators_regulated"]);

function quantityFor(entry: EstimatorDomainLexiconEntry, definition: AcceptanceDomainDefinition, variant: number) {
  const valueIndex = variant % areaValues.length;
  if (definition.domain === "concrete_pedestals") {
    const count = 10 + (variant % 5);
    return {
      prompt: `ширина 0,4 высота 5 метров длина 0,5 метров и надо ${count} штук`,
      expectation: { widthM: 0.4, lengthM: 0.5, heightM: 5, count, volumeM3: count },
    };
  }
  if (entry.domain === "elevators_regulated") {
    const floorCount = variant === 0 ? 14 : 6 + (variant % 25);
    return { prompt: `на ${floorCount} этажей`, expectation: { floorCount } };
  }
  if (entry.domain === "hydropower" || definition.domain === "hydropower_turbines") {
    const powerKw = variant === 0 ? 100 : powerValues[valueIndex];
    return { prompt: `${powerKw} кВт`, expectation: { powerKw } };
  }
  if (entry.domain === "solar") {
    const powerKw = variant === 0 ? 30 : powerValues[valueIndex];
    return { prompt: `${powerKw} кВт`, expectation: { powerKw } };
  }
  if (lengthDomains.has(entry.domain) || /duct|line|channel|road|curb|sewer|water|fencing/.test(definition.domain)) {
    const lengthM = definition.domain === "drainage_channels" && variant === 0 ? 120 : lengthValues[valueIndex];
    return { prompt: `${lengthM} метров`, expectation: { lengthM } };
  }
  if (countDomains.has(entry.domain) || /furniture|racks|equipment|generator|transformer|crane/.test(definition.domain)) {
    const count = definition.domain === "passenger_elevators" && variant === 0 ? 14 : countValues[valueIndex];
    return { prompt: `${count} шт`, expectation: { count } };
  }
  const areaM2 =
    definition.domain === "residential_flooring" && variant === 0 ? 100 :
      definition.domain === "paving_stone_paths" && variant === 0 ? 587 :
        definition.domain === "metal_canopies" && variant === 0 ? 647 :
          definition.domain === "gable_roofs" && variant === 0 ? 67 :
            definition.domain === "roof_waterproofing" && variant === 0 ? 100 :
              definition.domain === "industrial_floors" && variant === 0 ? 2000 :
                definition.domain === "agricultural_hangars" && variant === 0 ? 500 :
                  areaValues[valueIndex];
  return { prompt: `${areaM2} кв м`, expectation: { areaM2 } };
}

function p0Prompt(definition: AcceptanceDomainDefinition, variant: number): string | null {
  if (variant !== 0) return null;
  if (definition.domain === "paving_stone_paths") return real500ByDomain.get("paving_landscaping")?.promptRu ?? null;
  if (definition.domain === "metal_canopies") return real500ByDomain.get("canopies")?.promptRu ?? null;
  if (definition.domain === "gable_roofs") return real500ByDomain.get("roofing")?.promptRu ?? null;
  if (definition.domain === "residential_flooring") return real500ByDomain.get("flooring")?.promptRu ?? null;
  if (definition.domain === "roof_waterproofing") return real500ByDomain.get("waterproofing")?.promptRu ?? null;
  if (definition.domain === "drainage_channels") return real500ByDomain.get("drainage")?.promptRu ?? null;
  if (definition.domain === "passenger_elevators") return real500ByDomain.get("elevators_regulated")?.promptRu ?? null;
  if (definition.domain === "electrical_installation") return real500ByDomain.get("electrical")?.promptRu ?? null;
  if (definition.domain === "hydropower_turbines") return real500ByDomain.get("hydropower")?.promptRu ?? null;
  return null;
}

function keepsExactMandatoryPrompt(definition: AcceptanceDomainDefinition, variant: number): boolean {
  return variant === 0 && new Set([
    "paving_stone_paths",
    "metal_canopies",
    "gable_roofs",
    "residential_flooring",
    "roof_waterproofing",
    "concrete_pedestals",
    "drainage_channels",
    "passenger_elevators",
    "electrical_installation",
    "hydropower_turbines",
    "ventilation_systems",
    "industrial_floors",
    "agricultural_hangars",
    "cowsheds",
  ]).has(definition.domain);
}

function promptFor(definition: AcceptanceDomainDefinition, entry: EstimatorDomainLexiconEntry, variant: number): string {
  const p0 = p0Prompt(definition, variant);
  if (p0) return p0;
  if (definition.domain === "concrete_pedestals" && variant === 0) {
    return real500ByDomain.get("concrete")?.promptRu ?? "";
  }
  const quantity = quantityFor(entry, definition, variant);
  if (definition.domain === "concrete_pedestals") {
    return `смета на заливку тумб ${quantity.prompt} ${locations[variant % locations.length]}`;
  }
  const phrase = entry.casePhrases[variant % entry.casePhrases.length];
  const suffix = definition.promptSuffix ? ` ${definition.promptSuffix}` : "";
  return `смета на ${phrase} ${quantity.prompt} ${locations[variant % locations.length]}${suffix}`;
}

function requiredTokens(entry: EstimatorDomainLexiconEntry): string[] {
  const real500 = real500ByDomain.get(entry.domain);
  if (real500?.requiredRowTokens.length) return [...real500.requiredRowTokens];
  return [
    ...entry.requiredMaterials.slice(0, 2),
    ...entry.requiredLabor.slice(0, 2),
    entry.requiredEquipmentOrWarnings[0],
  ].filter(Boolean);
}

function caseFor(definition: AcceptanceDomainDefinition, variant: number, globalIndex: number): Real10000ConstructionWorkCase {
  const entry = lexiconEntry(definition.lexiconDomain);
  const rawPromptRu = promptFor(definition, entry, variant);
  const promptRu = keepsExactMandatoryPrompt(definition, variant)
    ? rawPromptRu
    : `${rawPromptRu} пакет работ ${globalIndex + 1}`;
  const quantity = quantityFor(entry, definition, variant);
  const forceConcretePedestal = entry.domain === "concrete" && /тумб|С‚СѓРјР±/.test(promptRu.toLocaleLowerCase("ru-RU"));
  const regulated = definition.regulated === true || entry.regulatedSafetyRequired === true;
  const complexity = regulated ? "regulated" : entry.complexity;
  const expectedResolvedDomain =
    entry.domain === "elevators_regulated" ? "vertical_transport" :
      forceConcretePedestal ? "concrete" :
        entry.domain;
  return {
    caseId: `real10000_${String(globalIndex + 1).padStart(5, "0")}_${definition.domain}_${String(variant + 1).padStart(3, "0")}`,
    promptRu,
    route: routeFor(globalIndex),
    macroDomain: definition.macroDomain,
    domain: definition.domain,
    expectedResolvedDomain,
    expectedObject: forceConcretePedestal ? "concrete_pedestal" : entry.domain === "elevators_regulated" ? "passenger_elevator" : entry.object,
    expectedOperation: forceConcretePedestal ? "concrete_pour" : entry.operation,
    expectedMethod: forceConcretePedestal ? "rectangular_concrete_element" : entry.domain === "elevators_regulated" ? "licensed_elevator_installation" : entry.method,
    complexity,
    quantityExpectation: quantity.expectation,
    expectedMinimumRows: minimumRows(complexity),
    requiredRowTokens: requiredTokens(entry),
    forbiddenRowTokens: forbiddenWeakRows,
    unitRules: [...entry.unitRules],
    pdfRequired: variant < 10,
    catalogBindingRequired: true,
    sourceEvidenceRequired: true,
    regulatedSafetyRequired: regulated,
  };
}

export const REAL_10000_ACCEPTANCE_DOMAINS: readonly AcceptanceDomainDefinition[] = acceptanceDomains();

const allCases = REAL_10000_ACCEPTANCE_DOMAINS.flatMap((definition, domainIndex) =>
  Array.from({ length: 100 }, (_value, variant) => caseFor(definition, variant, domainIndex * 100 + variant)),
);

export const REAL_DIVERSE_10000_CONSTRUCTION_WORKS: readonly Real10000ConstructionWorkCase[] = allCases;

export const REAL_10000_ACCEPTANCE_CONTRACT = {
  wave: "S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_ACCEPTANCE_POINT_OF_NO_RETURN",
  requiredCases: 10_000,
  requiredDomains: 100,
  requiredMacroDomains: 9,
  requiredShards: 100,
  requiredCasesPerShard: 100,
  requiredWebPrompts: 1_000,
  requiredAndroidApi34Prompts: 300,
  requiredPdfExtractions: 1_000,
  routeSplit: {
    request: 4_000,
    aiForeman: 3_000,
    aiRequest: 3_000,
  },
  webRouteSplit: {
    request: 400,
    aiForeman: 300,
    aiRequest: 300,
  },
  androidRouteSplit: {
    request: 100,
    aiForeman: 100,
    aiRequest: 100,
  },
} as const;
