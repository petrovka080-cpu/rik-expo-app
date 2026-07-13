import type { GlobalUnitInput, GlobalWorkCategory, GlobalWorkTypeDefinition } from "../globalEstimate/globalEstimateTypes";
import {
  GLOBAL_WORK_ALIASES,
  GLOBAL_WORK_TYPE_DEFINITIONS,
} from "../globalEstimate/globalWorkTypeResolver";
import { normalizeRuText } from "../../text/encoding";
import type {
  ConstructionWorkOntologyEntry,
  WorkOntologyCategory,
  WorkOntologyCountry,
  WorkOntologyCurrency,
  WorkOntologyUnit,
} from "./constructionWorkOntologyTypes";

const GENERIC_WORK_KEYS = new Set(["other_construction_work", "generic_repair"]);

export const WORK_ONTOLOGY_COUNTRY_REGIONS: readonly {
  country: WorkOntologyCountry;
  region: string;
  currency: WorkOntologyCurrency;
}[] = [
  { country: "KG", region: "Bishkek", currency: "KGS" },
  { country: "KG", region: "Osh", currency: "KGS" },
  { country: "KZ", region: "Almaty", currency: "KZT" },
  { country: "RU", region: "Moscow", currency: "RUB" },
  { country: "UZ", region: "Tashkent", currency: "UZS" },
];

export const WORK_ONTOLOGY_TARGET_CATEGORY_COUNTS: Readonly<Record<WorkOntologyCategory, number>> = {
  demolition: 350,
  earthworks: 550,
  concrete_foundation: 650,
  masonry: 500,
  waterproofing: 450,
  roofing: 500,
  insulation: 400,
  facade: 550,
  plaster_paint: 650,
  drywall_ceiling: 500,
  tile_stone: 500,
  flooring: 600,
  doors_windows: 400,
  carpentry_metal: 400,
  electrical: 750,
  plumbing: 650,
  heating_hvac: 550,
  ventilation: 300,
  paving_roads_landscape: 550,
  special_repair: 200,
};

export const WORK_ONTOLOGY_REQUIRED_CATEGORIES = Object.keys(
  WORK_ONTOLOGY_TARGET_CATEGORY_COUNTS,
) as WorkOntologyCategory[];

const CATEGORY_TERMS: Readonly<Record<WorkOntologyCategory, readonly string[]>> = {
  demolition: ["демонтаж", "снос", "разборка", "вывоз"],
  earthworks: ["земляные работы", "котлован", "траншея", "грунт", "планировка"],
  concrete_foundation: ["бетон", "фундамент", "стяжка", "плита", "армирование", "опалубка"],
  masonry: ["кладка", "кирпич", "газоблок", "пеноблок", "блок", "стена"],
  waterproofing: ["гидроизоляция", "мембрана", "мастика", "праймер", "жидкая резина"],
  roofing: ["кровля", "крыша", "стропила", "обрешетка", "металлочерепица", "водосток"],
  insulation: ["утепление", "теплоизоляция", "минвата", "пенопласт"],
  facade: ["фасад", "наружные стены", "облицовка фасада"],
  plaster_paint: ["штукатурка", "шпаклевка", "покраска", "обои", "грунтовка"],
  drywall_ceiling: ["гипсокартон", "гкл", "потолок", "армстронг", "каркас"],
  tile_stone: ["плитка", "кафель", "керамогранит", "мозаика", "камень"],
  flooring: ["пол", "ламинат", "паркет", "линолеум", "плинтус", "ковролин"],
  doors_windows: ["окно", "дверь", "откос", "подоконник", "фурнитура"],
  carpentry_metal: ["металл", "сварка", "каркас", "дерево", "лестница", "навес"],
  electrical: ["электрика", "кабель", "розетка", "розетк", "щит", "освещение", "автомат"],
  plumbing: ["сантехника", "водопровод", "канализация", "унитаз", "смеситель", "трубы"],
  heating_hvac: ["отопление", "радиатор", "котел", "теплый пол", "кондиционер"],
  ventilation: ["вентиляция", "воздуховод", "вытяжка", "приточка"],
  paving_roads_landscape: ["асфальт", "брусчатка", "бордюр", "газон", "дорога", "тротуар"],
  special_repair: ["проект", "уборка", "доставка", "подъем", "обследование"],
};

type Override = {
  visible_name_ru?: string;
  synonyms_ru?: string[];
  negative_synonyms_ru?: string[];
  category?: WorkOntologyCategory;
  expected_units?: WorkOntologyUnit[];
  ambiguity_group?: string;
};

const OVERRIDES: Readonly<Record<string, Override>> = {
  plumbing_parts_search: {
    visible_name_ru: "Поиск труб и фитингов",
    category: "special_repair",
    expected_units: ["set"],
    ambiguity_group: "special_repair_general",
    synonyms_ru: ["поиск труб и фитингов", "подбор труб и фитингов", "найти трубы и фитинги"],
  },
  roof_waterproofing: {
    visible_name_ru: "Гидроизоляция кровли",
    category: "waterproofing",
    expected_units: ["m2"],
    ambiguity_group: "waterproofing_surface",
    synonyms_ru: [
      "гидроизоляция крыши",
      "гидроизоляция кровли",
      "кровельная гидроизоляция",
      "гидроизоляция плоской кровли",
      "жидкая резина на крыше",
    ],
    negative_synonyms_ru: ["ванная", "санузел", "фундамент", "плитка", "кладка"],
  },
  roof_membrane_waterproofing: {
    visible_name_ru: "Мембранная гидроизоляция кровли",
    category: "waterproofing",
    expected_units: ["m2"],
    ambiguity_group: "waterproofing_surface",
    synonyms_ru: ["мембранная гидроизоляция кровли", "рулонная гидроизоляция крыши", "пвх мембрана на кровлю"],
    negative_synonyms_ru: ["ванная", "санузел", "фундамент"],
  },
  bathroom_waterproofing: {
    visible_name_ru: "Гидроизоляция ванной",
    category: "waterproofing",
    expected_units: ["m2"],
    ambiguity_group: "waterproofing_surface",
    synonyms_ru: ["гидроизоляция ванной", "гидроизоляция санузла", "обмазочная гидроизоляция ванной", "мокрая зона гидроизоляция"],
    negative_synonyms_ru: ["крыша", "кровля", "фундамент", "подвал"],
  },
  foundation_waterproofing: {
    visible_name_ru: "Гидроизоляция фундамента",
    category: "waterproofing",
    expected_units: ["m2", "linear_m"],
    ambiguity_group: "waterproofing_surface",
    synonyms_ru: ["гидроизоляция фундамента", "битумная мастика фундамент", "наружная гидроизоляция фундамента"],
    negative_synonyms_ru: ["ванная", "санузел", "крыша", "кровля", "плитка"],
  },
  basement_waterproofing: {
    visible_name_ru: "Гидроизоляция подвала",
    category: "waterproofing",
    expected_units: ["m2"],
    ambiguity_group: "waterproofing_surface",
    synonyms_ru: ["гидроизоляция подвала", "гидроизоляция погреба", "инъекционная гидроизоляция подвала"],
    negative_synonyms_ru: ["крыша", "ванная", "кровля"],
  },
  bathroom_tile_full: {
    visible_name_ru: "Плитка в ванной",
    category: "tile_stone",
    expected_units: ["m2"],
    ambiguity_group: "wet_area_tile",
    synonyms_ru: ["плитка в ванной", "кафель в санузле", "облицовка ванной плиткой", "плиточные работы в ванной"],
    negative_synonyms_ru: ["гидроизоляция", "штукатурка", "стяжка"],
  },
  ceramic_tile_floor_laying: {
    visible_name_ru: "Плитка на полу",
    category: "tile_stone",
    expected_units: ["m2"],
    ambiguity_group: "tile_surface",
    synonyms_ru: ["плитка на полу", "укладка кафеля на пол", "керамогранит на пол"],
    negative_synonyms_ru: ["стены", "ванная", "фартук"],
  },
  ceramic_tile_wall_laying: {
    visible_name_ru: "Плитка на стенах",
    category: "tile_stone",
    expected_units: ["m2"],
    ambiguity_group: "tile_surface",
    synonyms_ru: ["плитка на стены", "облицовка стен плиткой", "кафель на стену"],
    negative_synonyms_ru: ["пол", "стяжка"],
  },
  foundation_concrete: {
    visible_name_ru: "Бетонирование фундамента",
    category: "concrete_foundation",
    expected_units: ["m3"],
    ambiguity_group: "concrete_foundation",
    synonyms_ru: ["залить фундамент", "бетонирование фундамента", "фундамент бетон", "заливка фундамента"],
    negative_synonyms_ru: ["стяжка", "плита пола", "кладка", "гидроизоляция"],
  },
  strip_foundation: {
    visible_name_ru: "Ленточный фундамент",
    category: "concrete_foundation",
    expected_units: ["linear_m", "m3"],
    ambiguity_group: "concrete_foundation",
    synonyms_ru: ["ленточный фундамент", "лента фундамента", "заливка ленточного фундамента"],
    negative_synonyms_ru: ["стяжка", "плитка", "гидроизоляция"],
  },
  slab_foundation: {
    visible_name_ru: "Плитный фундамент",
    category: "concrete_foundation",
    expected_units: ["m3", "m2"],
    ambiguity_group: "concrete_foundation",
    synonyms_ru: ["плитный фундамент", "монолитная фундаментная плита", "заливка плиты фундамента"],
    negative_synonyms_ru: ["стяжка пола", "тротуарная плитка"],
  },
  floor_screed: {
    visible_name_ru: "Стяжка пола",
    category: "concrete_foundation",
    expected_units: ["m2"],
    ambiguity_group: "floor_base",
    synonyms_ru: ["стяжка пола", "цементная стяжка", "полусухая стяжка", "залить стяжку"],
    negative_synonyms_ru: ["фундамент", "плитка", "ламинат", "бетонная плита"],
  },
  concrete_slab: {
    visible_name_ru: "Бетонная плита",
    category: "concrete_foundation",
    expected_units: ["m3", "m2"],
    ambiguity_group: "concrete_foundation",
    synonyms_ru: ["бетонная плита", "монолитная плита", "заливка бетонной плиты"],
    negative_synonyms_ru: ["стяжка пола", "фундамент", "плитка"],
  },
  foundation_rebar: {
    visible_name_ru: "Армирование фундамента",
    category: "concrete_foundation",
    expected_units: ["kg", "ton"],
    ambiguity_group: "foundation_components",
    synonyms_ru: ["армирование фундамента", "вязка арматуры фундамента"],
    negative_synonyms_ru: ["опалубка", "заливка бетона"],
  },
  foundation_formwork: {
    visible_name_ru: "Опалубка фундамента",
    category: "concrete_foundation",
    expected_units: ["m2", "linear_m"],
    ambiguity_group: "foundation_components",
    synonyms_ru: ["опалубка фундамента", "сборка опалубки", "щитовая опалубка"],
    negative_synonyms_ru: ["армирование", "бетонирование"],
  },
  brick_masonry: {
    visible_name_ru: "Кирпичная кладка",
    category: "masonry",
    expected_units: ["m2", "m3"],
    ambiguity_group: "masonry_material",
    synonyms_ru: ["кирпичная кладка", "кладка кирпича", "стена из кирпича"],
    negative_synonyms_ru: ["газоблок", "пеноблок", "гипсокартон"],
  },
  block_masonry: {
    visible_name_ru: "Блочная кладка",
    category: "masonry",
    expected_units: ["m2", "m3"],
    ambiguity_group: "masonry_material",
    synonyms_ru: ["кладка блоков", "блочная кладка", "шлакоблок кладка"],
    negative_synonyms_ru: ["кирпич", "гипсокартон"],
  },
  aerated_block_masonry: {
    visible_name_ru: "Кладка газоблока",
    category: "masonry",
    expected_units: ["m2", "m3"],
    ambiguity_group: "masonry_material",
    synonyms_ru: ["газоблок", "кладка газоблока", "газобетонные блоки"],
    negative_synonyms_ru: ["кирпич", "пеноблок"],
  },
  wall_plastering: {
    visible_name_ru: "Штукатурка стен",
    category: "plaster_paint",
    expected_units: ["m2"],
    ambiguity_group: "wall_finishing_layers",
    synonyms_ru: ["штукатурка стен", "оштукатурить стены", "выравнивание стен штукатуркой"],
    negative_synonyms_ru: ["шпаклевка", "покраска", "обои", "плитка"],
  },
  wall_putty: {
    visible_name_ru: "Шпаклевка стен",
    category: "plaster_paint",
    expected_units: ["m2"],
    ambiguity_group: "wall_finishing_layers",
    synonyms_ru: ["шпаклевка стен", "финишная шпаклевка", "зашпаклевать стены"],
    negative_synonyms_ru: ["штукатурка", "покраска", "обои"],
  },
  wall_painting: {
    visible_name_ru: "Покраска стен",
    category: "plaster_paint",
    expected_units: ["m2"],
    ambiguity_group: "wall_finishing_layers",
    synonyms_ru: ["покраска стен", "покрасить стены", "малярные работы стены"],
    negative_synonyms_ru: ["штукатурка", "шпаклевка", "обои"],
  },
  wallpaper_installation: {
    visible_name_ru: "Поклейка обоев",
    category: "plaster_paint",
    expected_units: ["m2"],
    ambiguity_group: "wall_finishing_layers",
    synonyms_ru: ["поклейка обоев", "наклеить обои", "обои на стены"],
    negative_synonyms_ru: ["покраска", "штукатурка", "шпаклевка"],
  },
  laminate_laying: {
    visible_name_ru: "Укладка ламината",
    category: "flooring",
    expected_units: ["m2"],
    ambiguity_group: "floor_finish",
    synonyms_ru: ["укладка ламината", "постелить ламинат", "ламинат на пол"],
    negative_synonyms_ru: ["паркет", "стяжка", "плитка"],
  },
  parquet_laying: {
    visible_name_ru: "Укладка паркета",
    category: "flooring",
    expected_units: ["m2"],
    ambiguity_group: "floor_finish",
    synonyms_ru: ["укладка паркета", "паркетная доска", "паркет на пол"],
    negative_synonyms_ru: ["ламинат", "линолеум"],
  },
  linoleum_laying: {
    visible_name_ru: "Укладка линолеума",
    category: "flooring",
    expected_units: ["m2"],
    ambiguity_group: "floor_finish",
    synonyms_ru: ["укладка линолеума", "постелить линолеум", "линолеум на пол"],
    negative_synonyms_ru: ["ламинат", "паркет", "стяжка"],
  },
  electrical_wiring: {
    visible_name_ru: "Электропроводка",
    category: "electrical",
    expected_units: ["linear_m", "m2", "set"],
    ambiguity_group: "electrical_scope",
    synonyms_ru: ["электропроводка", "разводка кабеля", "проводка в квартире", "электрика под ключ"],
    negative_synonyms_ru: ["слаботочка", "интернет кабель", "розетки"],
  },
  socket_installation: {
    visible_name_ru: "Установка розеток",
    category: "electrical",
    expected_units: ["piece"],
    ambiguity_group: "electrical_scope",
    synonyms_ru: ["установка розеток", "розетки", "перенос розеток"],
    negative_synonyms_ru: ["освещение", "щиток", "слаботочка"],
  },
  lighting_installation: {
    visible_name_ru: "Монтаж освещения",
    category: "electrical",
    expected_units: ["piece", "set"],
    ambiguity_group: "electrical_scope",
    synonyms_ru: ["монтаж освещения", "установка светильников", "люстра", "точки света"],
    negative_synonyms_ru: ["розетки", "щиток", "слаботочка"],
  },
  distribution_panel_installation: {
    visible_name_ru: "Монтаж электрощита",
    category: "electrical",
    expected_units: ["set", "piece"],
    ambiguity_group: "electrical_scope",
    synonyms_ru: ["электрощит", "монтаж щитка", "автоматы и узо", "распределительный щит"],
    negative_synonyms_ru: ["розетки", "освещение", "кабель канал"],
  },
  low_voltage_network: {
    visible_name_ru: "Слаботочные сети",
    category: "electrical",
    expected_units: ["linear_m", "piece", "set"],
    ambiguity_group: "electrical_scope",
    synonyms_ru: ["слаботочка", "интернет кабель", "скс", "домофон", "видеонаблюдение"],
    negative_synonyms_ru: ["силовая проводка", "розетки 220", "электрощит"],
  },
  water_pipe_installation: {
    visible_name_ru: "Водопровод",
    category: "plumbing",
    expected_units: ["linear_m", "set"],
    ambiguity_group: "plumbing_scope",
    synonyms_ru: ["водопровод", "разводка водоснабжения", "трубы ппр", "трубы пнд"],
    negative_synonyms_ru: ["канализация", "радиатор", "котел"],
  },
  sewer_pipe_installation: {
    visible_name_ru: "Канализация",
    category: "plumbing",
    expected_units: ["linear_m", "set"],
    ambiguity_group: "plumbing_scope",
    synonyms_ru: ["канализация", "разводка канализации", "канализационные трубы", "стояк канализации"],
    negative_synonyms_ru: ["водопровод", "отопление"],
  },
  toilet_installation: {
    visible_name_ru: "Установка унитаза",
    category: "plumbing",
    expected_units: ["piece"],
    ambiguity_group: "bathroom_fixture",
    synonyms_ru: ["установка унитаза", "унитаз", "замена унитаза"],
    negative_synonyms_ru: ["бойлер", "радиатор", "водопровод"],
  },
  boiler_installation: {
    visible_name_ru: "Установка бойлера",
    category: "heating_hvac",
    expected_units: ["piece", "set"],
    ambiguity_group: "heating_scope",
    synonyms_ru: ["бойлер", "водонагреватель", "установка бойлера"],
    negative_synonyms_ru: ["унитаз", "раковина", "смеситель"],
  },
  heating_radiator_installation: {
    visible_name_ru: "Монтаж радиаторов отопления",
    category: "heating_hvac",
    expected_units: ["piece", "set"],
    ambiguity_group: "heating_scope",
    synonyms_ru: ["радиатор", "монтаж радиаторов", "батареи отопления"],
    negative_synonyms_ru: ["водопровод", "канализация", "унитаз"],
  },
  roof_insulation: {
    visible_name_ru: "Утепление крыши",
    category: "insulation",
    expected_units: ["m2"],
    ambiguity_group: "insulation_scope",
    synonyms_ru: ["утепление крыши", "утепление кровли", "минвата на крышу"],
    negative_synonyms_ru: ["фасад", "гидроизоляция"],
  },
  facade_insulation: {
    visible_name_ru: "Утепление фасада",
    category: "facade",
    expected_units: ["m2"],
    ambiguity_group: "insulation_scope",
    synonyms_ru: ["утепление фасада", "наружное утепление стен", "пенопласт фасад"],
    negative_synonyms_ru: ["крыша", "кровля"],
  },
  metal_roofing: {
    visible_name_ru: "Металлочерепица",
    category: "roofing",
    expected_units: ["m2"],
    ambiguity_group: "roofing_cover",
    synonyms_ru: ["металлочерепица", "монтаж металлочерепицы", "крыша металлочерепица"],
    negative_synonyms_ru: ["гидроизоляция", "утепление"],
  },
  soft_roofing: {
    visible_name_ru: "Мягкая кровля",
    category: "roofing",
    expected_units: ["m2"],
    ambiguity_group: "roofing_cover",
    synonyms_ru: ["мягкая кровля", "гибкая черепица", "битумная черепица"],
    negative_synonyms_ru: ["гидроизоляция", "утепление"],
  },
  gutter_installation: {
    visible_name_ru: "Водосток",
    category: "roofing",
    expected_units: ["linear_m", "set"],
    ambiguity_group: "roofing_accessory",
    synonyms_ru: ["водосток", "монтаж водосточной системы", "желоба и трубы"],
    negative_synonyms_ru: ["кровельное покрытие", "гидроизоляция"],
  },
};

function unique(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const normalized = normalizeWorkOntologyText(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function keyWords(workKey: string): string {
  return workKey.replace(/[_-]+/g, " ").trim();
}

function visibleFromDefinition(definition: GlobalWorkTypeDefinition): string {
  const raw = definition.names.ru ?? definition.names.en ?? keyWords(definition.workKey);
  const normalized = String(normalizeRuText(raw) ?? raw).replace(/\s+/g, " ").trim();
  if (normalized && !/[_]{2,}|^[a-z0-9_ -]+$/i.test(normalized)) return normalized;
  return keyWords(definition.workKey);
}

function unitFromGlobal(unit: GlobalUnitInput["normalizedUnit"]): WorkOntologyUnit {
  if (unit === "m3" || unit === "cu_ft") return "m3";
  if (unit === "linear_m" || unit === "linear_ft") return "linear_m";
  if (unit === "pcs") return "piece";
  if (unit === "set") return "set";
  if (unit === "kg" || unit === "lbs") return "kg";
  if (unit === "ton") return "ton";
  return "m2";
}

function categoryFromGlobal(definition: GlobalWorkTypeDefinition): WorkOntologyCategory {
  const workKey = definition.workKey;
  const name = normalizeWorkOntologyText(visibleFromDefinition(definition));
  const globalCategory: GlobalWorkCategory = definition.category;
  if (/ventilation|вентиляц|воздуховод|вытяж/.test(`${workKey} ${name}`)) return "ventilation";
  if (/earth|excavation|trench|backfill|site_preparation|котлован|транше|грунт/.test(`${workKey} ${name}`)) return "earthworks";
  if (globalCategory === "demolition") return "demolition";
  if (globalCategory === "foundation" || globalCategory === "concrete") return "concrete_foundation";
  if (globalCategory === "masonry") return "masonry";
  if (globalCategory === "waterproofing") return "waterproofing";
  if (globalCategory === "roofing") return "roofing";
  if (globalCategory === "insulation") return "insulation";
  if (globalCategory === "facade") return "facade";
  if (globalCategory === "plastering" || globalCategory === "putty" || globalCategory === "painting" || globalCategory === "wall_finishing") return "plaster_paint";
  if (globalCategory === "drywall" || globalCategory === "ceiling") return "drywall_ceiling";
  if (globalCategory === "tile") return "tile_stone";
  if (globalCategory === "flooring") return "flooring";
  if (globalCategory === "doors_windows") return "doors_windows";
  if (globalCategory === "metalworks" || globalCategory === "carpentry") return "carpentry_metal";
  if (globalCategory === "electrical") return "electrical";
  if (globalCategory === "plumbing") return "plumbing";
  if (globalCategory === "heating_hvac") return "heating_hvac";
  if (globalCategory === "roadworks" || globalCategory === "landscaping") return "paving_roads_landscape";
  return "special_repair";
}

export function normalizeWorkOntologyText(value: string): string {
  const normalized = String(normalizeRuText(value) ?? value)
    .normalize("NFKC")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[«»"']/g, "")
    .replace(/[.,;:!?()[\]{}]/g, " ")
    .replace(/[–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized;
}

function aliasesByWorkKey(): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const alias of GLOBAL_WORK_ALIASES) {
    const current = result.get(alias.workKey) ?? [];
    current.push(alias.alias);
    result.set(alias.workKey, current);
  }
  return result;
}

function priceCategory(category: WorkOntologyCategory): string {
  return category.toUpperCase();
}

function sanitizeRegion(region: string): string {
  return region
    .normalize("NFKD")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase() || "DEFAULT";
}

export function currencyForCountry(country: WorkOntologyCountry): WorkOntologyCurrency {
  if (country === "KZ") return "KZT";
  if (country === "RU") return "RUB";
  if (country === "UZ") return "UZS";
  return "KGS";
}

export function pricebookScopeFor(input: {
  country: WorkOntologyCountry;
  region: string;
  category: WorkOntologyCategory;
}): string {
  return `${input.country}_${sanitizeRegion(input.region)}_${priceCategory(input.category)}_MATERIALS`;
}

function supportStatusFor(entry: Pick<ConstructionWorkOntologyEntry, "recipe_scope" | "pricebook_scope" | "supported">) {
  if (!entry.supported) return "UNSUPPORTED" as const;
  if (!entry.recipe_scope) return "RECIPE_MISSING" as const;
  if (!entry.pricebook_scope) return "PRICEBOOK_SCOPE_MISSING" as const;
  return "SUPPORTED" as const;
}

function baseEntry(definition: GlobalWorkTypeDefinition, rawAliases: readonly string[]): ConstructionWorkOntologyEntry {
  const override = OVERRIDES[definition.workKey];
  const category = override?.category ?? categoryFromGlobal(definition);
  const defaultUnit = override?.expected_units?.[0] ?? unitFromGlobal(definition.defaultMeasureUnit);
  const visible = override?.visible_name_ru ?? visibleFromDefinition(definition);
  const synonyms = unique([
    visible,
    keyWords(definition.workKey),
    definition.names.en ?? "",
    ...rawAliases,
    ...(override?.synonyms_ru ?? []),
    ...CATEGORY_TERMS[category].slice(0, 2).map((term) => `${term} ${visible}`),
  ]);
  const expectedUnits = override?.expected_units ?? [defaultUnit];
  const pricebookScope = pricebookScopeFor({ country: "KG", region: "Bishkek", category });
  const entry: ConstructionWorkOntologyEntry = {
    canonical_work_key: definition.workKey,
    visible_name_ru: visible,
    category,
    synonyms_ru: synonyms,
    negative_synonyms_ru: unique(override?.negative_synonyms_ru ?? []),
    expected_units: [...new Set(expectedUnits)],
    default_unit: defaultUnit,
    recipe_scope: definition.workKey,
    material_recipe_scope: `${definition.workKey}_material_recipe`,
    pricebook_scope: pricebookScope,
    ambiguity_group: override?.ambiguity_group ?? `${category}_general`,
    supported: true,
    support_status: "SUPPORTED",
    confidence_floor: 0.72,
  };
  return { ...entry, support_status: supportStatusFor(entry) };
}

const SYNTHETIC_REPLACEMENT_ENTRIES: readonly GlobalWorkTypeDefinition[] = [
  {
    workKey: "special_repair_scope_review",
    category: "other",
    names: { ru: "Обследование сложного ремонта", en: "Special repair scope review" },
    defaultMeasureUnit: "set",
    safetyReviewRequired: true,
  },
  {
    workKey: "special_repair_defect_mapping",
    category: "other",
    names: { ru: "Карта дефектов ремонта", en: "Special repair defect mapping" },
    defaultMeasureUnit: "set",
    safetyReviewRequired: true,
  },
];

function buildEntries(): ConstructionWorkOntologyEntry[] {
  const aliases = aliasesByWorkKey();
  const uniqueDefinitions = new Map<string, GlobalWorkTypeDefinition>();
  for (const definition of GLOBAL_WORK_TYPE_DEFINITIONS) {
    if (GENERIC_WORK_KEYS.has(definition.workKey)) continue;
    uniqueDefinitions.set(definition.workKey, definition);
  }
  for (const entry of SYNTHETIC_REPLACEMENT_ENTRIES) {
    uniqueDefinitions.set(entry.workKey, entry);
  }

  return [...uniqueDefinitions.values()]
    .map((definition) => baseEntry(definition, aliases.get(definition.workKey) ?? []))
    .sort((left, right) => left.canonical_work_key.localeCompare(right.canonical_work_key));
}

export const CONSTRUCTION_WORK_ONTOLOGY: readonly ConstructionWorkOntologyEntry[] = Object.freeze(buildEntries());

export const CONSTRUCTION_WORK_ONTOLOGY_BY_KEY: ReadonlyMap<string, ConstructionWorkOntologyEntry> = new Map(
  CONSTRUCTION_WORK_ONTOLOGY.map((entry) => [entry.canonical_work_key, entry]),
);

export function getConstructionWorkOntologyEntry(workKey: string): ConstructionWorkOntologyEntry | null {
  return CONSTRUCTION_WORK_ONTOLOGY_BY_KEY.get(workKey) ?? null;
}

export function categoryTerms(category: WorkOntologyCategory): readonly string[] {
  return CATEGORY_TERMS[category];
}

export function relatedNegativeWorkKeys(workKey: string): string[] {
  const entry = getConstructionWorkOntologyEntry(workKey);
  if (!entry?.ambiguity_group) return [];
  return CONSTRUCTION_WORK_ONTOLOGY
    .filter((candidate) =>
      candidate.ambiguity_group === entry.ambiguity_group &&
      candidate.canonical_work_key !== workKey
    )
    .slice(0, 8)
    .map((candidate) => candidate.canonical_work_key);
}
