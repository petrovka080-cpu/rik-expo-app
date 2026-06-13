import {
  CONSTRUCTION_WORK_ONTOLOGY,
  normalizeWorkOntologyText,
} from "./constructionWorkOntologyCatalog";
import type { ConstructionWorkOntologyEntry, WorkOntologyCategory, WorkOntologyUnit } from "./constructionWorkOntologyTypes";
import type { NoHintConfusionCase, NoHintRealUserWorkCase } from "./noHintSemanticAuditTypes";

export const NO_HINT_TARGET_CATEGORY_COUNTS: Readonly<Record<WorkOntologyCategory, number>> = {
  demolition: 106,
  earthworks: 159,
  concrete_foundation: 195,
  masonry: 150,
  waterproofing: 159,
  roofing: 150,
  insulation: 115,
  facade: 150,
  plaster_paint: 195,
  drywall_ceiling: 133,
  tile_stone: 159,
  flooring: 177,
  doors_windows: 106,
  carpentry_metal: 106,
  electrical: 231,
  plumbing: 205,
  heating_hvac: 159,
  ventilation: 89,
  paving_roads_landscape: 168,
  special_repair: 88,
};

const UNIT_TEXT: Readonly<Record<WorkOntologyUnit, string>> = {
  m2: "м2",
  m3: "кубов",
  linear_m: "метров",
  piece: "штук",
  set: "комплект",
  kg: "кг",
  ton: "тонн",
};

const PREFIXES = ["сделать", "посчитать", "нужно выполнить", "требуется", "надо сделать"];

function cleanUserInput(value: string): string {
  return normalizeWorkOntologyText(value)
    .replace(/_/g, " ")
    .replace(/\bтип\b/gu, "вид")
    .replace(/\s+/g, " ")
    .trim();
}

function visiblePhrase(entry: ConstructionWorkOntologyEntry, index: number): string {
  const visible = cleanUserInput(entry.visible_name_ru);
  if (visible.length >= 4 && !/^[a-z0-9 -]+$/i.test(visible) && !visible.includes("_")) return visible;
  const candidates = [entry.visible_name_ru, ...entry.synonyms_ru]
    .map(cleanUserInput)
    .filter((item) => item.length >= 4 && !/^[a-z0-9 -]+$/i.test(item) && !item.includes("_"));
  return candidates[index % Math.max(1, candidates.length)] ?? cleanUserInput(entry.visible_name_ru);
}

function deterministicQuantity(index: number, unit: WorkOntologyUnit): number {
  const base = (index * 17) % 91;
  if (unit === "m3") return 10 + (base % 80);
  if (unit === "linear_m") return 12 + (base % 160);
  if (unit === "piece") return 1 + (base % 60);
  if (unit === "set") return 1 + (base % 12);
  if (unit === "kg") return 25 + base * 5;
  if (unit === "ton") return 1 + (base % 20);
  return 8 + base * 3;
}

function resolvedCase(input: {
  id: string;
  userInput: string;
  entry: ConstructionWorkOntologyEntry;
  quantity?: number | null;
  unit?: WorkOntologyUnit | null;
  mustNotMatch?: string[];
  acceptableKeys?: string[];
}): NoHintRealUserWorkCase {
  return {
    id: input.id,
    user_input_ru: cleanUserInput(input.userInput),
    expected_status: "RESOLVED",
    expected_canonical_work_key: input.entry.canonical_work_key,
    acceptable_canonical_work_keys: input.acceptableKeys,
    must_not_match: input.mustNotMatch,
    expected_category: input.entry.category,
    expected_quantity: input.quantity ?? null,
    expected_unit: input.unit ?? null,
    expected_recipe_scope_required: true,
    expected_material_recipe_scope_required: true,
    expected_pricebook_scope_required: true,
    country: "KG",
    region: "Bishkek",
  };
}

function ambiguousCase(input: {
  id: string;
  userInput: string;
  category: WorkOntologyCategory;
  min?: number;
  max?: number;
}): NoHintRealUserWorkCase {
  return {
    id: input.id,
    user_input_ru: cleanUserInput(input.userInput),
    expected_status: "AMBIGUOUS_WORK_INPUT",
    expected_category: input.category,
    expected_quantity: null,
    expected_unit: null,
    expected_top_candidates_min: input.min ?? 3,
    expected_top_candidates_max: input.max ?? 8,
    expected_recipe_scope_required: false,
    expected_material_recipe_scope_required: false,
    expected_pricebook_scope_required: false,
    country: "KG",
    region: "Bishkek",
  };
}

function byKey(workKey: string): ConstructionWorkOntologyEntry {
  const entry = CONSTRUCTION_WORK_ONTOLOGY.find((item) => item.canonical_work_key === workKey);
  if (!entry) throw new Error(`NO_HINT_CORPUS_WORK_KEY_MISSING:${workKey}`);
  return entry;
}

const CURATED_GENERATOR_KEYS: Readonly<Record<WorkOntologyCategory, readonly string[]>> = {
  demolition: ["brick_wall_demolition", "demolition_tiles"],
  earthworks: ["foundation_excavation"],
  concrete_foundation: [
    "foundation_concrete",
    "strip_foundation",
    "slab_foundation",
    "foundation_rebar",
    "foundation_formwork",
  ],
  masonry: ["brick_masonry", "aerated_block_masonry"],
  waterproofing: [
    "roof_waterproofing",
    "foundation_waterproofing",
    "bathroom_waterproofing",
    "basement_waterproofing",
  ],
  roofing: ["metal_roofing", "soft_roofing", "corrugated_roofing"],
  insulation: ["roof_insulation", "internal_wall_insulation", "wall_soundproofing"],
  facade: ["facade_insulation", "facade_thermal_panels", "facade_painting"],
  plaster_paint: ["wall_plastering", "wall_putty", "wall_painting", "wallpaper_installation"],
  drywall_ceiling: ["drywall_partition", "suspended_ceiling", "drywall_ceiling"],
  tile_stone: [
    "bathroom_tile_full",
    "ceramic_tile_floor_laying",
    "ceramic_tile_wall_laying",
    "kitchen_backsplash_tile",
  ],
  flooring: ["floor_screed", "self_leveling_floor", "laminate_laying", "linoleum_laying"],
  doors_windows: ["interior_door_installation", "pvc_window_turnkey", "balcony_glazing"],
  carpentry_metal: ["canopy_installation", "greenhouse_installation"],
  electrical: [
    "electrical_wiring",
    "socket_installation",
    "distribution_panel_installation",
    "lighting_installation",
    "low_voltage_network",
  ],
  plumbing: [
    "water_pipe_installation",
    "sewer_pipe_installation",
    "toilet_installation",
    "sink_installation",
    "shower_cabin_installation",
  ],
  heating_hvac: [
    "heating_radiator_installation",
    "water_underfloor_heating",
    "gas_boiler_installation",
    "boiler_installation",
    "air_conditioner_installation",
  ],
  ventilation: ["ventilation_installation"],
  paving_roads_landscape: ["asphalt_paving", "paving_stone_laying", "curb_installation"],
  special_repair: ["debris_removal", "construction_cleaning"],
};

const MANDATORY_CASES: readonly NoHintRealUserWorkCase[] = [
  resolvedCase({ id: "mandatory_foundation_concrete_001", userInput: "залить фундамент 30 кубов", entry: byKey("foundation_concrete"), quantity: 30, unit: "m3" }),
  ambiguousCase({ id: "mandatory_foundation_house_size_001", userInput: "фундамент под дом 10 на 12", category: "concrete_foundation" }),
  resolvedCase({ id: "mandatory_slab_foundation_001", userInput: "плитный фундамент 120 квадратов", entry: byKey("slab_foundation"), quantity: 120, unit: "m2" }),
  resolvedCase({ id: "mandatory_strip_foundation_001", userInput: "ленточный фундамент 60 метров", entry: byKey("strip_foundation"), quantity: 60, unit: "linear_m" }),
  resolvedCase({ id: "mandatory_foundation_rebar_001", userInput: "армирование плиты 120 м2", entry: byKey("foundation_rebar"), quantity: 120, unit: "m2" }),
  resolvedCase({ id: "mandatory_foundation_formwork_001", userInput: "опалубка под фундамент", entry: byKey("foundation_formwork") }),
  resolvedCase({ id: "mandatory_floor_screed_001", userInput: "стяжка пола 80 квадратов", entry: byKey("floor_screed"), quantity: 80, unit: "m2" }),
  resolvedCase({ id: "mandatory_self_level_floor_001", userInput: "наливной пол 45 м2", entry: byKey("self_leveling_floor"), quantity: 45, unit: "m2" }),
  resolvedCase({ id: "mandatory_concrete_preparation_001", userInput: "бетонная подготовка 50 м2", entry: byKey("concrete_floor_slab"), quantity: 50, unit: "m2" }),
  resolvedCase({ id: "mandatory_roof_waterproofing_001", userInput: "гидроизоляция крыши 120 м2", entry: byKey("roof_waterproofing"), quantity: 120, unit: "m2" }),
  resolvedCase({ id: "mandatory_bathroom_waterproofing_001", userInput: "гидроизоляция ванной 18 м2", entry: byKey("bathroom_waterproofing"), quantity: 18, unit: "m2" }),
  resolvedCase({ id: "mandatory_foundation_waterproofing_001", userInput: "гидроизоляция фундамента 90 м2", entry: byKey("foundation_waterproofing"), quantity: 90, unit: "m2" }),
  resolvedCase({ id: "mandatory_roof_leak_mastic_001", userInput: "крыша течет надо мастикой пройти", entry: byKey("roof_waterproofing") }),
  resolvedCase({ id: "mandatory_soft_roof_001", userInput: "мягкая кровля 200 квадратов", entry: byKey("soft_roofing"), quantity: 200, unit: "m2" }),
  resolvedCase({ id: "mandatory_metal_roof_001", userInput: "металлочерепица 160 м2", entry: byKey("metal_roofing"), quantity: 160, unit: "m2" }),
  resolvedCase({ id: "mandatory_corrugated_roof_001", userInput: "профнастил на крышу", entry: byKey("corrugated_roofing") }),
  resolvedCase({ id: "mandatory_roof_insulation_001", userInput: "утепление крыши", entry: byKey("roof_insulation") }),
  resolvedCase({ id: "mandatory_facade_insulation_001", userInput: "утепление фасада", entry: byKey("facade_insulation") }),
  resolvedCase({ id: "mandatory_facade_panels_001", userInput: "фасадные панели 250 м2", entry: byKey("facade_thermal_panels"), quantity: 250, unit: "m2" }),
  resolvedCase({ id: "mandatory_wall_plaster_001", userInput: "штукатурка стен 140 м2", entry: byKey("wall_plastering"), quantity: 140, unit: "m2" }),
  resolvedCase({ id: "mandatory_wall_putty_001", userInput: "шпаклевка стен 100 м2", entry: byKey("wall_putty"), quantity: 100, unit: "m2" }),
  resolvedCase({ id: "mandatory_wall_paint_001", userInput: "покраска стен 120 м2", entry: byKey("wall_painting"), quantity: 120, unit: "m2" }),
  resolvedCase({ id: "mandatory_facade_paint_001", userInput: "покраска фасада 300 м2", entry: byKey("facade_painting"), quantity: 300, unit: "m2" }),
  resolvedCase({ id: "mandatory_wallpaper_001", userInput: "обои 80 квадратов", entry: byKey("wallpaper_installation"), quantity: 80, unit: "m2" }),
  resolvedCase({ id: "mandatory_drywall_partition_001", userInput: "гипсокартон перегородка 45 м2", entry: byKey("drywall_partition"), quantity: 45, unit: "m2" }),
  resolvedCase({ id: "mandatory_suspended_ceiling_001", userInput: "потолок армстронг 70 м2", entry: byKey("suspended_ceiling"), quantity: 70, unit: "m2" }),
  resolvedCase({ id: "mandatory_bathroom_tile_001", userInput: "плитка в ванной 28 м2", entry: byKey("bathroom_tile_full"), quantity: 28, unit: "m2", mustNotMatch: ["bathroom_waterproofing", "floor_screed", "wall_plastering"] }),
  resolvedCase({ id: "mandatory_porcelain_floor_001", userInput: "керамогранит на пол 60 м2", entry: byKey("ceramic_tile_floor_laying"), quantity: 60, unit: "m2" }),
  resolvedCase({ id: "mandatory_brick_masonry_001", userInput: "кладка кирпича 74 м2", entry: byKey("brick_masonry"), quantity: 74, unit: "m2" }),
  resolvedCase({ id: "mandatory_block_masonry_001", userInput: "кладка газоблока 120 м2", entry: byKey("aerated_block_masonry"), quantity: 120, unit: "m2" }),
  resolvedCase({ id: "mandatory_brick_wall_demolition_001", userInput: "разобрать кирпичную стену", entry: byKey("brick_wall_demolition") }),
  resolvedCase({ id: "mandatory_tile_demolition_001", userInput: "демонтаж плитки", entry: byKey("demolition_tiles") }),
  resolvedCase({ id: "mandatory_wiring_001", userInput: "электропроводка в квартире 90 м2", entry: byKey("electrical_wiring"), quantity: 90, unit: "m2" }),
  resolvedCase({ id: "mandatory_sockets_001", userInput: "розетки 40 точек", entry: byKey("socket_installation"), quantity: 40, unit: "piece" }),
  resolvedCase({ id: "mandatory_distribution_panel_001", userInput: "щиток собрать", entry: byKey("distribution_panel_installation") }),
  resolvedCase({ id: "mandatory_breakers_001", userInput: "автоматы и узо поставить", entry: byKey("distribution_panel_installation") }),
  resolvedCase({ id: "mandatory_lighting_001", userInput: "светильники 30 штук", entry: byKey("lighting_installation"), quantity: 30, unit: "piece" }),
  resolvedCase({ id: "mandatory_internet_cable_001", userInput: "интернет кабель 20 точек", entry: byKey("low_voltage_network"), quantity: 20, unit: "piece" }),
  resolvedCase({ id: "mandatory_cctv_001", userInput: "видеонаблюдение 8 камер", entry: byKey("low_voltage_network"), quantity: 8, unit: "piece" }),
  resolvedCase({ id: "mandatory_water_pipe_001", userInput: "водопровод 45 метров", entry: byKey("water_pipe_installation"), quantity: 45, unit: "linear_m" }),
  resolvedCase({ id: "mandatory_sewer_001", userInput: "канализация 32 метра", entry: byKey("sewer_pipe_installation"), quantity: 32, unit: "linear_m" }),
  resolvedCase({ id: "mandatory_toilet_001", userInput: "унитаз поставить", entry: byKey("toilet_installation") }),
  resolvedCase({ id: "mandatory_sink_001", userInput: "раковина поставить", entry: byKey("sink_installation") }),
  resolvedCase({ id: "mandatory_shower_001", userInput: "душевая кабина", entry: byKey("shower_cabin_installation") }),
  resolvedCase({ id: "mandatory_radiators_001", userInput: "радиаторы 12 штук", entry: byKey("heating_radiator_installation"), quantity: 12, unit: "piece" }),
  resolvedCase({ id: "mandatory_underfloor_heating_001", userInput: "теплый пол 40 м2", entry: byKey("water_underfloor_heating"), quantity: 40, unit: "m2" }),
  resolvedCase({ id: "mandatory_boiler_001", userInput: "котел поставить", entry: byKey("gas_boiler_installation") }),
  resolvedCase({ id: "mandatory_ventilation_001", userInput: "вентиляция кафе 120 м2", entry: byKey("ventilation_installation"), quantity: 120, unit: "m2" }),
  resolvedCase({ id: "mandatory_air_conditioner_001", userInput: "кондиционер поставить", entry: byKey("air_conditioner_installation") }),
  resolvedCase({ id: "mandatory_asphalt_001", userInput: "асфальтирование двора 300 м2", entry: byKey("asphalt_paving"), quantity: 300, unit: "m2" }),
  resolvedCase({ id: "mandatory_paving_001", userInput: "брусчатка 587 м2", entry: byKey("paving_stone_laying"), quantity: 587, unit: "m2" }),
  resolvedCase({ id: "mandatory_curb_001", userInput: "бордюр 120 метров", entry: byKey("curb_installation"), quantity: 120, unit: "linear_m" }),
  resolvedCase({ id: "mandatory_trench_001", userInput: "траншея 80 метров", entry: byKey("foundation_excavation"), quantity: 80, unit: "linear_m" }),
  resolvedCase({ id: "mandatory_pit_001", userInput: "котлован 300 кубов", entry: byKey("foundation_excavation"), quantity: 300, unit: "m3" }),
  resolvedCase({ id: "mandatory_debris_001", userInput: "вывоз мусора", entry: byKey("debris_removal") }),
  ambiguousCase({ id: "mandatory_broad_waterproofing_001", userInput: "гидроизоляция 100 м2", category: "waterproofing" }),
  ambiguousCase({ id: "mandatory_broad_electrical_001", userInput: "электрика", category: "electrical" }),
  ambiguousCase({ id: "mandatory_broad_plumbing_001", userInput: "сантехника", category: "plumbing" }),
];

function entriesByCategory(category: WorkOntologyCategory): ConstructionWorkOntologyEntry[] {
  return CURATED_GENERATOR_KEYS[category]
    .map(byKey)
    .filter((entry) =>
      entry.category === category &&
      entry.supported &&
      entry.support_status === "SUPPORTED" &&
      Boolean(entry.recipe_scope) &&
      Boolean(entry.material_recipe_scope) &&
      Boolean(entry.pricebook_scope)
    )
    .sort((left, right) => left.canonical_work_key.localeCompare(right.canonical_work_key));
}

function generatedResolvedCase(category: WorkOntologyCategory, index: number): NoHintRealUserWorkCase {
  const entries = entriesByCategory(category);
  if (entries.length === 0) throw new Error(`NO_HINT_CATEGORY_EMPTY:${category}`);
  const entry = entries[index % entries.length];
  const unit = entry.expected_units[index % entry.expected_units.length] ?? entry.default_unit;
  const quantity = deterministicQuantity(index, unit);
  const prefix = PREFIXES[index % PREFIXES.length];
  const phrase = visiblePhrase(entry, index);
  return resolvedCase({
    id: `generated_${category}_${String(index + 1).padStart(4, "0")}`,
    userInput: `${prefix} ${phrase} ${quantity} ${UNIT_TEXT[unit]}`,
    entry,
    quantity,
    unit,
  });
}

export function buildNoHintRealUserWorkCorpus(): NoHintRealUserWorkCase[] {
  const byCategory = new Map<WorkOntologyCategory, NoHintRealUserWorkCase[]>();
  for (const category of Object.keys(NO_HINT_TARGET_CATEGORY_COUNTS) as WorkOntologyCategory[]) {
    byCategory.set(category, []);
  }
  for (const item of MANDATORY_CASES) {
    const category = item.expected_category;
    if (!category) continue;
    const bucket = byCategory.get(category);
    if (!bucket) continue;
    bucket.push(item);
  }
  for (const category of Object.keys(NO_HINT_TARGET_CATEGORY_COUNTS) as WorkOntologyCategory[]) {
    const target = NO_HINT_TARGET_CATEGORY_COUNTS[category];
    const bucket = byCategory.get(category) ?? [];
    let index = 0;
    while (bucket.length < target) {
      bucket.push(generatedResolvedCase(category, index));
      index += 1;
    }
    byCategory.set(category, bucket.slice(0, target));
  }
  return [...byCategory.entries()]
    .flatMap(([, cases]) => cases)
    .map((testCase, index) => ({
      ...testCase,
      id: `${String(index + 1).padStart(4, "0")}_${testCase.id}`,
    }));
}

const CONFUSION_BASE: readonly Omit<NoHintConfusionCase, "id">[] = [
  { ...resolvedCase({ id: "x", userInput: "гидроизоляция крыши 120 м2", entry: byKey("roof_waterproofing"), quantity: 120, unit: "m2", mustNotMatch: ["metal_roofing", "soft_roofing"] }), confusion_pair: "roof_waterproofing_vs_roofing_installation" },
  { ...resolvedCase({ id: "x", userInput: "металлочерепица 160 м2", entry: byKey("metal_roofing"), quantity: 160, unit: "m2", mustNotMatch: ["roof_waterproofing"] }), confusion_pair: "roof_waterproofing_vs_roofing_installation" },
  { ...resolvedCase({ id: "x", userInput: "гидроизоляция ванной 18 м2", entry: byKey("bathroom_waterproofing"), quantity: 18, unit: "m2", mustNotMatch: ["bathroom_tile_full"] }), confusion_pair: "bathroom_waterproofing_vs_tile_installation" },
  { ...resolvedCase({ id: "x", userInput: "плитка в ванной 28 м2", entry: byKey("bathroom_tile_full"), quantity: 28, unit: "m2", mustNotMatch: ["bathroom_waterproofing"] }), confusion_pair: "bathroom_waterproofing_vs_tile_installation" },
  { ...resolvedCase({ id: "x", userInput: "гидроизоляция фундамента 90 м2", entry: byKey("foundation_waterproofing"), quantity: 90, unit: "m2", mustNotMatch: ["foundation_concrete"] }), confusion_pair: "foundation_waterproofing_vs_foundation_concrete" },
  { ...resolvedCase({ id: "x", userInput: "залить фундамент 30 кубов", entry: byKey("foundation_concrete"), quantity: 30, unit: "m3", mustNotMatch: ["foundation_waterproofing"] }), confusion_pair: "foundation_waterproofing_vs_foundation_concrete" },
  { ...resolvedCase({ id: "x", userInput: "стяжка пола 80 квадратов", entry: byKey("floor_screed"), quantity: 80, unit: "m2", mustNotMatch: ["slab_foundation"] }), confusion_pair: "floor_screed_vs_slab_foundation" },
  { ...resolvedCase({ id: "x", userInput: "плитный фундамент 120 квадратов", entry: byKey("slab_foundation"), quantity: 120, unit: "m2", mustNotMatch: ["floor_screed"] }), confusion_pair: "floor_screed_vs_slab_foundation" },
  { ...resolvedCase({ id: "x", userInput: "кладка кирпича 74 м2", entry: byKey("brick_masonry"), quantity: 74, unit: "m2", mustNotMatch: ["block_masonry", "aerated_block_masonry"] }), confusion_pair: "brick_masonry_vs_block_masonry" },
  { ...resolvedCase({ id: "x", userInput: "кладка газоблока 120 м2", entry: byKey("aerated_block_masonry"), quantity: 120, unit: "m2", mustNotMatch: ["brick_masonry"] }), confusion_pair: "brick_masonry_vs_block_masonry" },
  { ...resolvedCase({ id: "x", userInput: "штукатурка стен 140 м2", entry: byKey("wall_plastering"), quantity: 140, unit: "m2", mustNotMatch: ["wall_putty"] }), confusion_pair: "plaster_vs_putty" },
  { ...resolvedCase({ id: "x", userInput: "шпаклевка стен 100 м2", entry: byKey("wall_putty"), quantity: 100, unit: "m2", mustNotMatch: ["wall_plastering", "wall_painting"] }), confusion_pair: "putty_vs_paint" },
  { ...resolvedCase({ id: "x", userInput: "покраска стен 120 м2", entry: byKey("wall_painting"), quantity: 120, unit: "m2", mustNotMatch: ["wall_putty", "wallpaper_installation"] }), confusion_pair: "paint_vs_wallpaper" },
  { ...resolvedCase({ id: "x", userInput: "обои 80 квадратов", entry: byKey("wallpaper_installation"), quantity: 80, unit: "m2", mustNotMatch: ["wall_painting"] }), confusion_pair: "paint_vs_wallpaper" },
  { ...resolvedCase({ id: "x", userInput: "интернет кабель 20 точек", entry: byKey("low_voltage_network"), quantity: 20, unit: "piece", mustNotMatch: ["electrical_wiring"] }), confusion_pair: "low_voltage_vs_power_wiring" },
  { ...resolvedCase({ id: "x", userInput: "проводка в квартире 90 м2", entry: byKey("electrical_wiring"), quantity: 90, unit: "m2", mustNotMatch: ["low_voltage_network"] }), confusion_pair: "low_voltage_vs_power_wiring" },
  { ...resolvedCase({ id: "x", userInput: "светильники 30 штук", entry: byKey("lighting_installation"), quantity: 30, unit: "piece", mustNotMatch: ["socket_installation"] }), confusion_pair: "lighting_vs_socket_installation" },
  { ...resolvedCase({ id: "x", userInput: "розетки 40 точек", entry: byKey("socket_installation"), quantity: 40, unit: "piece", mustNotMatch: ["lighting_installation"] }), confusion_pair: "lighting_vs_socket_installation" },
  { ...resolvedCase({ id: "x", userInput: "водопровод 45 метров", entry: byKey("water_pipe_installation"), quantity: 45, unit: "linear_m", mustNotMatch: ["sewer_pipe_installation"] }), confusion_pair: "water_supply_vs_sewerage" },
  { ...resolvedCase({ id: "x", userInput: "канализация 32 метра", entry: byKey("sewer_pipe_installation"), quantity: 32, unit: "linear_m", mustNotMatch: ["water_pipe_installation"] }), confusion_pair: "water_supply_vs_sewerage" },
  { ...resolvedCase({ id: "x", userInput: "радиаторы 12 штук", entry: byKey("heating_radiator_installation"), quantity: 12, unit: "piece", mustNotMatch: ["water_pipe_installation"] }), confusion_pair: "heating_radiator_vs_plumbing_pipe" },
  { ...resolvedCase({ id: "x", userInput: "утепление крыши", entry: byKey("roof_insulation"), mustNotMatch: ["facade_insulation"] }), confusion_pair: "roof_insulation_vs_facade_insulation" },
  { ...resolvedCase({ id: "x", userInput: "утепление фасада", entry: byKey("facade_insulation"), mustNotMatch: ["roof_insulation"] }), confusion_pair: "roof_insulation_vs_facade_insulation" },
  { ...resolvedCase({ id: "x", userInput: "демонтаж плитки", entry: byKey("demolition_tiles"), mustNotMatch: ["bathroom_tile_full"] }), confusion_pair: "demolition_tile_vs_tile_installation" },
  { ...resolvedCase({ id: "x", userInput: "плитка в ванной 28 м2", entry: byKey("bathroom_tile_full"), quantity: 28, unit: "m2", mustNotMatch: ["demolition_tiles"] }), confusion_pair: "demolition_tile_vs_tile_installation" },
];

export function buildNoHintConfusionHardSet(): NoHintConfusionCase[] {
  const result: NoHintConfusionCase[] = [];
  for (let index = 0; index < 700; index += 1) {
    const base = CONFUSION_BASE[index % CONFUSION_BASE.length];
    const quantity = base.expected_quantity ?? deterministicQuantity(index, base.expected_unit ?? "m2");
    const unit = base.expected_unit ?? "m2";
    const suffix = base.expected_quantity === null || base.expected_quantity === undefined
      ? ` ${quantity} ${UNIT_TEXT[unit]}`
      : "";
    result.push({
      ...base,
      id: `confusion_${String(index + 1).padStart(4, "0")}_${base.confusion_pair}`,
      user_input_ru: cleanUserInput(`${base.user_input_ru}${suffix}`),
      expected_quantity: base.expected_quantity ?? quantity,
      expected_unit: base.expected_unit ?? unit,
    });
  }
  return result;
}
