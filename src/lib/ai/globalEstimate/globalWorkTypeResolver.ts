import type { GlobalEstimateInput, GlobalWorkAlias, GlobalWorkCategory, GlobalWorkTypeDefinition } from "./globalEstimateTypes";

export const GLOBAL_WORK_CATEGORIES: readonly GlobalWorkCategory[] = [
  "flooring",
  "wall_finishing",
  "ceiling",
  "drywall",
  "painting",
  "plastering",
  "putty",
  "tile",
  "doors_windows",
  "electrical",
  "plumbing",
  "heating_hvac",
  "roofing",
  "facade",
  "foundation",
  "concrete",
  "masonry",
  "waterproofing",
  "insulation",
  "demolition",
  "landscaping",
  "roadworks",
  "metalworks",
  "carpentry",
  "documents_design",
  "cleaning",
  "delivery_equipment",
  "other",
];

export const GLOBAL_WORK_TYPE_DEFINITIONS: readonly GlobalWorkTypeDefinition[] = [
  { workKey: "laminate_laying", category: "flooring", names: { ru: "Укладка ламината", en: "Laminate installation", de: "Laminat verlegen" }, defaultMeasureUnit: "sq_m" },
  { workKey: "parquet_laying", category: "flooring", names: { ru: "Укладка паркета", en: "Parquet installation" }, defaultMeasureUnit: "sq_m" },
  { workKey: "vinyl_flooring", category: "flooring", names: { ru: "Укладка винилового пола", en: "Vinyl flooring installation" }, defaultMeasureUnit: "sq_m" },
  { workKey: "floor_screed", category: "concrete", names: { ru: "Стяжка пола", en: "Floor screed" }, defaultMeasureUnit: "sq_m" },
  { workKey: "self_leveling_floor", category: "flooring", names: { ru: "Наливной пол", en: "Self-leveling floor" }, defaultMeasureUnit: "sq_m" },
  { workKey: "ceramic_tile_laying", category: "tile", names: { ru: "Укладка керамической плитки", en: "Ceramic tile installation" }, defaultMeasureUnit: "sq_m" },
  { workKey: "porcelain_tile_laying", category: "tile", names: { ru: "Укладка керамогранита", en: "Porcelain tile installation" }, defaultMeasureUnit: "sq_m" },
  { workKey: "bathroom_tile_full", category: "tile", names: { ru: "Плитка в ванной под ключ", en: "Full bathroom tiling" }, defaultMeasureUnit: "sq_m" },
  { workKey: "wall_painting", category: "painting", names: { ru: "Покраска стен", en: "Wall painting", fr: "Peinture des murs" }, defaultMeasureUnit: "sq_m" },
  { workKey: "wall_plastering", category: "plastering", names: { ru: "Штукатурка стен", en: "Wall plastering" }, defaultMeasureUnit: "sq_m" },
  { workKey: "wall_putty", category: "putty", names: { ru: "Шпаклевка стен", en: "Wall putty" }, defaultMeasureUnit: "sq_m" },
  { workKey: "wallpaper_installation", category: "wall_finishing", names: { ru: "Поклейка обоев", en: "Wallpaper installation" }, defaultMeasureUnit: "sq_m" },
  { workKey: "drywall_partition", category: "drywall", names: { ru: "Перегородка из гипсокартона", en: "Drywall partition" }, defaultMeasureUnit: "sq_m" },
  { workKey: "drywall_ceiling", category: "drywall", names: { ru: "Потолок из гипсокартона", en: "Drywall ceiling" }, defaultMeasureUnit: "sq_m" },
  { workKey: "door_installation", category: "doors_windows", names: { ru: "Установка двери", en: "Door installation" }, defaultMeasureUnit: "pcs" },
  { workKey: "window_installation", category: "doors_windows", names: { ru: "Установка окна", en: "Window installation" }, defaultMeasureUnit: "pcs" },
  { workKey: "electrical_basic", category: "electrical", names: { ru: "Электромонтажные работы", en: "Basic electrical work" }, defaultMeasureUnit: "set", dangerous: true, safetyReviewRequired: true },
  { workKey: "socket_installation", category: "electrical", names: { ru: "Установка розеток", en: "Socket installation" }, defaultMeasureUnit: "pcs", dangerous: true, safetyReviewRequired: true },
  { workKey: "lighting_installation", category: "electrical", names: { ru: "Монтаж освещения", en: "Lighting installation" }, defaultMeasureUnit: "pcs", dangerous: true, safetyReviewRequired: true },
  { workKey: "panel_replacement", category: "electrical", names: { ru: "Замена электрощита", en: "Electrical panel replacement" }, defaultMeasureUnit: "set", dangerous: true, safetyReviewRequired: true },
  { workKey: "plumbing_basic", category: "plumbing", names: { ru: "Сантехнические работы", en: "Basic plumbing work" }, defaultMeasureUnit: "set", safetyReviewRequired: true },
  { workKey: "faucet_replacement", category: "plumbing", names: { ru: "Замена смесителя", en: "Faucet replacement" }, defaultMeasureUnit: "pcs" },
  { workKey: "toilet_installation", category: "plumbing", names: { ru: "Установка унитаза", en: "Toilet installation" }, defaultMeasureUnit: "pcs" },
  { workKey: "pipe_replacement", category: "plumbing", names: { ru: "Замена труб", en: "Pipe replacement" }, defaultMeasureUnit: "linear_m", safetyReviewRequired: true },
  { workKey: "waterproofing_bathroom", category: "waterproofing", names: { ru: "Гидроизоляция ванной", en: "Bathroom waterproofing" }, defaultMeasureUnit: "sq_m" },
  { workKey: "waterproofing_foundation", category: "waterproofing", names: { ru: "Гидроизоляция фундамента", en: "Foundation waterproofing" }, defaultMeasureUnit: "sq_m" },
  { workKey: "roof_repair", category: "roofing", names: { ru: "Ремонт кровли", en: "Roof repair" }, defaultMeasureUnit: "sq_m", safetyReviewRequired: true },
  { workKey: "metal_roofing", category: "roofing", names: { ru: "Металлочерепица", en: "Metal roofing" }, defaultMeasureUnit: "sq_m", safetyReviewRequired: true },
  { workKey: "soft_roofing", category: "roofing", names: { ru: "Мягкая кровля", en: "Soft roofing" }, defaultMeasureUnit: "sq_m", safetyReviewRequired: true },
  { workKey: "facade_plaster", category: "facade", names: { ru: "Штукатурка фасада", en: "Facade plaster" }, defaultMeasureUnit: "sq_m" },
  { workKey: "facade_insulation", category: "facade", names: { ru: "Утепление фасада", en: "Facade insulation" }, defaultMeasureUnit: "sq_m" },
  { workKey: "facade_painting", category: "facade", names: { ru: "Покраска фасада", en: "Facade painting" }, defaultMeasureUnit: "sq_m" },
  { workKey: "foundation_concrete", category: "foundation", names: { ru: "Бетонирование фундамента", en: "Foundation concrete" }, defaultMeasureUnit: "m3" },
  { workKey: "concrete_slab", category: "concrete", names: { ru: "Бетонная плита", en: "Concrete slab" }, defaultMeasureUnit: "m3" },
  { workKey: "rebar_installation", category: "concrete", names: { ru: "Монтаж арматуры", en: "Rebar installation" }, defaultMeasureUnit: "kg" },
  { workKey: "brick_masonry", category: "masonry", names: { ru: "Кирпичная кладка", en: "Brick masonry" }, defaultMeasureUnit: "sq_m" },
  { workKey: "block_masonry", category: "masonry", names: { ru: "Блочная кладка", en: "Block masonry" }, defaultMeasureUnit: "sq_m" },
  { workKey: "aerated_block_masonry", category: "masonry", names: { ru: "Кладка газоблока", en: "Aerated block masonry" }, defaultMeasureUnit: "sq_m" },
  { workKey: "demolition_flooring", category: "demolition", names: { ru: "Демонтаж пола", en: "Flooring demolition" }, defaultMeasureUnit: "sq_m" },
  { workKey: "demolition_walls", category: "demolition", names: { ru: "Демонтаж стен", en: "Wall demolition" }, defaultMeasureUnit: "sq_m", safetyReviewRequired: true },
  { workKey: "demolition_tiles", category: "demolition", names: { ru: "Демонтаж плитки", en: "Tile demolition" }, defaultMeasureUnit: "sq_m" },
  { workKey: "asphalt_paving", category: "roadworks", names: { ru: "Асфальтирование", en: "Asphalt paving" }, defaultMeasureUnit: "sq_m" },
  { workKey: "paving_slabs", category: "landscaping", names: { ru: "Тротуарная плитка", en: "Paving slabs" }, defaultMeasureUnit: "sq_m" },
  { workKey: "landscaping_basic", category: "landscaping", names: { ru: "Благоустройство", en: "Basic landscaping" }, defaultMeasureUnit: "sq_m" },
  { workKey: "other_construction_work", category: "other", names: { ru: "Строительные работы", en: "Construction work" }, defaultMeasureUnit: "sq_m" },
];

const RAW_ALIASES: Omit<GlobalWorkAlias, "normalizedAlias">[] = [
  { workKey: "laminate_laying", language: "ru", alias: "укладка ламината" },
  { workKey: "laminate_laying", language: "ru", alias: "ламинат" },
  { workKey: "laminate_laying", language: "en", alias: "laminate installation" },
  { workKey: "laminate_laying", language: "en", alias: "laminate flooring" },
  { workKey: "laminate_laying", language: "de", alias: "laminat verlegen" },
  { workKey: "ceramic_tile_laying", language: "ru", alias: "плитка" },
  { workKey: "bathroom_tile_full", language: "ru", alias: "плитка в ванной" },
  { workKey: "ceramic_tile_laying", language: "en", alias: "tile installation" },
  { workKey: "ceramic_tile_laying", language: "de", alias: "fliesen" },
  { workKey: "wall_plastering", language: "ru", alias: "штукатурка стен" },
  { workKey: "wall_plastering", language: "en", alias: "wall plastering" },
  { workKey: "wall_painting", language: "ru", alias: "покраска стен" },
  { workKey: "wall_painting", language: "en", alias: "paint walls" },
  { workKey: "wall_painting", language: "fr", alias: "peinture murs" },
  { workKey: "drywall_partition", language: "en", alias: "drywall installation" },
  { workKey: "drywall_partition", language: "ru", alias: "гипсокартон" },
  { workKey: "foundation_concrete", language: "ru", alias: "фундамент бетон" },
  { workKey: "foundation_concrete", language: "en", alias: "foundation concrete" },
  { workKey: "waterproofing_bathroom", language: "en", alias: "bathroom waterproofing" },
  { workKey: "waterproofing_bathroom", language: "ru", alias: "гидроизоляция ванной" },
  { workKey: "socket_installation", language: "en", alias: "socket installation" },
  { workKey: "electrical_basic", language: "en", alias: "electrical" },
  { workKey: "plumbing_basic", language: "en", alias: "plumbing repair" },
  { workKey: "plumbing_basic", language: "ru", alias: "сантехника" },
  { workKey: "roof_repair", language: "en", alias: "roof repair" },
];

export function normalizeGlobalWorkAlias(value: string): string {
  return value
    .toLowerCase()
    .replace(/[«»"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const GLOBAL_WORK_ALIASES: readonly GlobalWorkAlias[] = RAW_ALIASES.map((alias) => ({
  ...alias,
  normalizedAlias: normalizeGlobalWorkAlias(alias.alias),
}));

export type GlobalResolvedWorkType = {
  workKey: string;
  category: GlobalWorkCategory;
  title: string;
  confidence: "high" | "medium" | "low";
  dangerous: boolean;
  safetyReviewRequired: boolean;
};

export function getGlobalWorkTypeDefinition(workKey: string): GlobalWorkTypeDefinition {
  return GLOBAL_WORK_TYPE_DEFINITIONS.find((definition) => definition.workKey === workKey) ?? GLOBAL_WORK_TYPE_DEFINITIONS[GLOBAL_WORK_TYPE_DEFINITIONS.length - 1];
}

function titleFor(definition: GlobalWorkTypeDefinition, language: string): string {
  return definition.names[language] ?? definition.names.en ?? definition.names.ru ?? definition.workKey;
}

function resolveByText(text: string | undefined): { workKey: string; confidence: GlobalResolvedWorkType["confidence"] } | null {
  const normalized = normalizeGlobalWorkAlias(text ?? "");
  if (!normalized) return null;

  const exact = GLOBAL_WORK_ALIASES.find((alias) => normalized.includes(alias.normalizedAlias));
  if (exact) return { workKey: exact.workKey, confidence: "high" };

  const patternMatch: [RegExp, string][] = [
    [/laminat|laminate|ламинат/i, "laminate_laying"],
    [/tile|плитк|fliesen/i, "ceramic_tile_laying"],
    [/paint|покрас|краск|peinture/i, "wall_painting"],
    [/plaster|штукатур/i, "wall_plastering"],
    [/drywall|гипсокартон|gkl/i, "drywall_partition"],
    [/waterproof|гидроизоля/i, "waterproofing_bathroom"],
    [/foundation|фундамент/i, "foundation_concrete"],
    [/concrete|бетон/i, "concrete_slab"],
    [/socket|electrical|розет|электр/i, "socket_installation"],
    [/plumbing|pipe|faucet|сантех|труб|смесител/i, "plumbing_basic"],
    [/roof|кровл/i, "roof_repair"],
    [/asphalt|асфальт/i, "asphalt_paving"],
  ];
  const match = patternMatch.find(([pattern]) => pattern.test(normalized));
  return match ? { workKey: match[1], confidence: "medium" } : null;
}

export function resolveGlobalWorkType(input: Pick<GlobalEstimateInput, "text" | "explicitWorkKey" | "photoAnalysis" | "language">): GlobalResolvedWorkType {
  const explicit = input.explicitWorkKey ? getGlobalWorkTypeDefinition(input.explicitWorkKey) : null;
  const textResolved = resolveByText(input.text);
  const photoResolved = resolveByText(input.photoAnalysis?.detectedWorkType ?? input.photoAnalysis?.detectedProblem);
  const fallback = explicit
    ? { workKey: explicit.workKey, confidence: "high" as const }
    : textResolved ?? photoResolved ?? { workKey: "other_construction_work", confidence: "low" as const };
  const definition = getGlobalWorkTypeDefinition(fallback.workKey);

  return {
    workKey: definition.workKey,
    category: definition.category,
    title: titleFor(definition, input.language ?? "en"),
    confidence: fallback.confidence,
    dangerous: definition.dangerous === true,
    safetyReviewRequired: definition.safetyReviewRequired === true,
  };
}
