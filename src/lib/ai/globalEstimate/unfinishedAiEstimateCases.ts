import { BUILT_IN_AI_1000_CONSTRUCTION_CASES } from "../builtInAi1000/builtInAi1000ConstructionCases";

export type UnfinishedAiEstimateCase = {
  id: string;
  priority: "P0" | "P1" | "P2";
  routeCoverage: ("chat" | "ai_foreman" | "request" | "web" | "android")[];
  promptRu: string;
  expectedIntent: "estimate" | "product_search";
  expectedWorkKey: string;
  expectedCategory: string;
  expectedTool: "calculate_global_estimate" | "search_material_products";
  volume: number;
  unit: string;
  expectedRowsContain: string[];
  forbiddenRowsContain: string[];
  requiresPdfAction: boolean;
  requiresSourceEvidence: boolean;
  requiresTaxStatusOrWarning: boolean;
  dangerousWorkSafetyRequired?: boolean;
};

const FORBIDDEN_KNOWN_WORK_ROWS = [
  "Строительные работы",
  "Основной материал: Строительные работы",
  "Подготовка: Строительные работы",
  "Материалы: Строительные работы",
  "Работы: Строительные работы",
  "Ремонтные работы после согласования",
  "Осмотр и уточнение объёма работ",
];

const catalogByWorkKey = new Map(BUILT_IN_AI_1000_CONSTRUCTION_CASES.map((item) => [item.workKey, item]));

type CaseSeed = {
  id: string;
  priority: "P1" | "P2";
  workKey: string;
  category: string;
  volume: number;
  unit?: string;
  promptRu?: string;
  expectedRowsContain?: string[];
  routeCoverage?: UnfinishedAiEstimateCase["routeCoverage"];
  dangerousWorkSafetyRequired?: boolean;
};

function unitText(unit: string): string {
  if (unit === "sq_m") return "м²";
  if (unit === "linear_m") return "пог. м";
  if (unit === "m3") return "м³";
  if (unit === "pcs") return "шт";
  if (unit === "kg") return "кг";
  return "комплект";
}

function makeCase(seed: CaseSeed): UnfinishedAiEstimateCase {
  const catalog = catalogByWorkKey.get(seed.workKey);
  const unit = seed.unit ?? catalog?.unit ?? "sq_m";
  const promptRu = seed.promptRu ?? catalog?.promptRu ?? `смета на ${seed.workKey} ${seed.volume} ${unitText(unit)}`;
  return {
    id: seed.id,
    priority: seed.priority,
    routeCoverage: seed.routeCoverage ?? ["chat"],
    promptRu,
    expectedIntent: "estimate",
    expectedWorkKey: seed.workKey,
    expectedCategory: seed.category,
    expectedTool: "calculate_global_estimate",
    volume: seed.volume,
    unit,
    expectedRowsContain: seed.expectedRowsContain ?? [],
    forbiddenRowsContain: FORBIDDEN_KNOWN_WORK_ROWS,
    requiresPdfAction: true,
    requiresSourceEvidence: true,
    requiresTaxStatusOrWarning: true,
    dangerousWorkSafetyRequired: seed.dangerousWorkSafetyRequired,
  };
}

const P0_CASES: readonly UnfinishedAiEstimateCase[] = [
  {
    id: "001",
    priority: "P0",
    routeCoverage: ["chat", "ai_foreman", "request", "web", "android"],
    promptRu: "сделай мне смету на асфальтирование на 1000 кв м",
    expectedIntent: "estimate",
    expectedWorkKey: "asphalt_paving",
    expectedCategory: "roadworks",
    expectedTool: "calculate_global_estimate",
    volume: 1000,
    unit: "sq_m",
    expectedRowsContain: ["пес", "щеб", "битум", "асфальтобетон", "техник", "уклад", "уплотнен"],
    forbiddenRowsContain: FORBIDDEN_KNOWN_WORK_ROWS,
    requiresPdfAction: true,
    requiresSourceEvidence: true,
    requiresTaxStatusOrWarning: true,
  },
  {
    id: "002",
    priority: "P0",
    routeCoverage: ["chat", "request", "web", "android"],
    promptRu: "хочу уложить ковролин на 100 кв м",
    expectedIntent: "estimate",
    expectedWorkKey: "carpet_laying",
    expectedCategory: "flooring",
    expectedTool: "calculate_global_estimate",
    volume: 100,
    unit: "sq_m",
    expectedRowsContain: ["ковролин", "подлож", "клей", "подготовка основания", "укладка ковролина", "подрез"],
    forbiddenRowsContain: FORBIDDEN_KNOWN_WORK_ROWS,
    requiresPdfAction: true,
    requiresSourceEvidence: true,
    requiresTaxStatusOrWarning: true,
  },
  {
    id: "003",
    priority: "P0",
    routeCoverage: ["chat", "ai_foreman", "web"],
    promptRu: "смета на перегородку из ГКЛ 60 м²",
    expectedIntent: "estimate",
    expectedWorkKey: "drywall_partition",
    expectedCategory: "drywall",
    expectedTool: "calculate_global_estimate",
    volume: 60,
    unit: "sq_m",
    expectedRowsContain: ["листы гкл", "направляющий профиль", "стоечный профиль", "креп", "лента", "шпакл", "монтаж каркаса", "обшивка"],
    forbiddenRowsContain: FORBIDDEN_KNOWN_WORK_ROWS,
    requiresPdfAction: true,
    requiresSourceEvidence: true,
    requiresTaxStatusOrWarning: true,
  },
  {
    id: "004",
    priority: "P0",
    routeCoverage: ["chat", "ai_foreman", "web"],
    promptRu: "смету на установку ГКЛ на стены 352 кв м",
    expectedIntent: "estimate",
    expectedWorkKey: "drywall_wall_cladding",
    expectedCategory: "ceiling_drywall",
    expectedTool: "calculate_global_estimate",
    volume: 352,
    unit: "sq_m",
    expectedRowsContain: ["каркас", "лист", "креп", "монтаж"],
    forbiddenRowsContain: FORBIDDEN_KNOWN_WORK_ROWS,
    requiresPdfAction: true,
    requiresSourceEvidence: true,
    requiresTaxStatusOrWarning: true,
  },
  {
    id: "005",
    priority: "P0",
    routeCoverage: ["chat", "web", "android"],
    promptRu: "дай смету на устройство двускатной крыши основание 100 кв метров",
    expectedIntent: "estimate",
    expectedWorkKey: "gable_roof_installation",
    expectedCategory: "roofing",
    expectedTool: "calculate_global_estimate",
    volume: 100,
    unit: "sq_m",
    expectedRowsContain: ["стропил", "мауэрлат", "гидроизоляц", "обреш", "кровельное покрытие", "добор", "монтаж стропильной", "монтаж кровли"],
    forbiddenRowsContain: FORBIDDEN_KNOWN_WORK_ROWS,
    requiresPdfAction: true,
    requiresSourceEvidence: true,
    requiresTaxStatusOrWarning: true,
    dangerousWorkSafetyRequired: true,
  },
  {
    id: "006",
    priority: "P0",
    routeCoverage: ["chat", "web", "android"],
    promptRu: "дай смету на кладку кирпича 74 кв метров",
    expectedIntent: "estimate",
    expectedWorkKey: "brick_masonry",
    expectedCategory: "masonry",
    expectedTool: "calculate_global_estimate",
    volume: 74,
    unit: "sq_m",
    expectedRowsContain: ["кирпич", "раствор", "кладочная", "армирован", "кладка", "расшив"],
    forbiddenRowsContain: FORBIDDEN_KNOWN_WORK_ROWS,
    requiresPdfAction: true,
    requiresSourceEvidence: true,
    requiresTaxStatusOrWarning: true,
  },
  {
    id: "007",
    priority: "P0",
    routeCoverage: ["chat", "web", "android"],
    promptRu: "смета на укладку кафельной плитки на пол 174 кв м",
    expectedIntent: "estimate",
    expectedWorkKey: "ceramic_tile_floor_laying",
    expectedCategory: "tile",
    expectedTool: "calculate_global_estimate",
    volume: 174,
    unit: "sq_m",
    expectedRowsContain: ["плит", "клей", "затир", "грунтов", "уклад"],
    forbiddenRowsContain: FORBIDDEN_KNOWN_WORK_ROWS,
    requiresPdfAction: true,
    requiresSourceEvidence: true,
    requiresTaxStatusOrWarning: true,
  },
  {
    id: "008",
    priority: "P0",
    routeCoverage: ["chat", "web"],
    promptRu: "дай смету на укладку ламината 100 м²",
    expectedIntent: "estimate",
    expectedWorkKey: "laminate_laying",
    expectedCategory: "flooring",
    expectedTool: "calculate_global_estimate",
    volume: 100,
    unit: "sq_m",
    expectedRowsContain: ["ламинат", "подлож", "плинтус", "грунтование", "настил", "укладка ламината"],
    forbiddenRowsContain: FORBIDDEN_KNOWN_WORK_ROWS,
    requiresPdfAction: true,
    requiresSourceEvidence: true,
    requiresTaxStatusOrWarning: true,
  },
];

const P1_SEEDS: readonly CaseSeed[] = [
  { id: "009", priority: "P1", workKey: "wall_plastering", category: "plastering", volume: 120 },
  { id: "010", priority: "P1", workKey: "wall_putty", category: "putty", volume: 120 },
  { id: "011", priority: "P1", workKey: "wall_painting", category: "painting", volume: 120 },
  { id: "012", priority: "P1", workKey: "wallpaper_installation", category: "wall_finishing", volume: 80 },
  { id: "013", priority: "P1", workKey: "floor_screed", category: "concrete", volume: 90 },
  { id: "014", priority: "P1", workKey: "self_leveling_floor", category: "flooring", volume: 90 },
  { id: "015", priority: "P1", workKey: "bathroom_waterproofing", category: "waterproofing", volume: 30, promptRu: "смета на bathroom_waterproofing 30 м²" },
  { id: "016", priority: "P1", workKey: "foundation_waterproofing", category: "waterproofing", volume: 70, promptRu: "смета на foundation_waterproofing 70 м²" },
  { id: "017", priority: "P1", workKey: "roof_repair", category: "roofing", volume: 120, dangerousWorkSafetyRequired: true },
  { id: "018", priority: "P1", workKey: "metal_roofing", category: "roofing", volume: 120, dangerousWorkSafetyRequired: true },
  { id: "019", priority: "P1", workKey: "soft_roofing", category: "roofing", volume: 120, dangerousWorkSafetyRequired: true },
  { id: "020", priority: "P1", workKey: "facade_insulation", category: "facade", volume: 200 },
  { id: "021", priority: "P1", workKey: "facade_plaster", category: "facade", volume: 200 },
  { id: "022", priority: "P1", workKey: "block_masonry", category: "masonry", volume: 80 },
  { id: "023", priority: "P1", workKey: "aerated_block_masonry", category: "masonry", volume: 80 },
  { id: "024", priority: "P1", workKey: "concrete_slab", category: "concrete", volume: 20, unit: "m3" },
  { id: "025", priority: "P1", workKey: "strip_foundation", category: "foundation", volume: 30, unit: "m3", dangerousWorkSafetyRequired: true },
  { id: "026", priority: "P1", workKey: "rebar_installation", category: "concrete", volume: 1200, unit: "kg" },
  { id: "027", priority: "P1", workKey: "concrete_columns", category: "concrete", volume: 12, unit: "m3" },
  { id: "028", priority: "P1", workKey: "pipe_replacement", category: "plumbing", volume: 40, unit: "linear_m", dangerousWorkSafetyRequired: true },
  { id: "029", priority: "P1", workKey: "plumbing_rough_in", category: "plumbing", volume: 1, unit: "set", dangerousWorkSafetyRequired: true },
  { id: "030", priority: "P1", workKey: "toilet_installation", category: "plumbing", volume: 2, unit: "pcs" },
  { id: "031", priority: "P1", workKey: "electrical_wiring", category: "electrical", volume: 80, dangerousWorkSafetyRequired: true },
  { id: "032", priority: "P1", workKey: "socket_installation", category: "electrical", volume: 20, unit: "pcs", dangerousWorkSafetyRequired: true },
  { id: "033", priority: "P1", workKey: "distribution_panel_installation", category: "electrical", volume: 1, unit: "set", dangerousWorkSafetyRequired: true },
  { id: "034", priority: "P1", workKey: "ventilation_installation", category: "heating_hvac", volume: 1, unit: "set" },
  { id: "035", priority: "P1", workKey: "air_conditioner_installation", category: "heating_hvac", volume: 3, unit: "pcs" },
  { id: "036", priority: "P1", workKey: "window_installation", category: "doors_windows", volume: 8, unit: "pcs" },
  { id: "037", priority: "P1", workKey: "interior_door_installation", category: "doors_windows", volume: 6, unit: "pcs" },
  { id: "038", priority: "P1", workKey: "demolition_tiles", category: "demolition", volume: 50 },
  { id: "039", priority: "P1", workKey: "flooring_demolition", category: "demolition", volume: 80 },
  { id: "040", priority: "P1", workKey: "debris_removal", category: "delivery_equipment", volume: 1, unit: "set" },
];

const P2_SEEDS: readonly CaseSeed[] = [
  { id: "041", priority: "P2", workKey: "paving_slabs", category: "landscaping", volume: 100 },
  { id: "042", priority: "P2", workKey: "curb_installation", category: "roadworks", volume: 80, unit: "linear_m" },
  { id: "043", priority: "P2", workKey: "drainage_lot", category: "roadworks", volume: 1, unit: "set" },
  { id: "044", priority: "P2", workKey: "landscaping_leveling", category: "landscaping", volume: 200 },
  { id: "045", priority: "P2", workKey: "lawn_installation", category: "landscaping", volume: 150 },
  { id: "046", priority: "P2", workKey: "fence_installation", category: "metalworks", volume: 60, unit: "linear_m" },
  { id: "047", priority: "P2", workKey: "welded_frame", category: "metalworks", volume: 1, unit: "set", dangerousWorkSafetyRequired: true },
  { id: "048", priority: "P2", workKey: "metal_stairs", category: "metalworks", volume: 1, unit: "set", dangerousWorkSafetyRequired: true },
  { id: "049", priority: "P2", workKey: "canopy_installation", category: "metalworks", volume: 20 },
  { id: "050", priority: "P2", workKey: "timber_deck", category: "carpentry", volume: 35 },
  { id: "051", priority: "P2", workKey: "terrace_board", category: "carpentry", volume: 35 },
  { id: "052", priority: "P2", workKey: "construction_cleaning", category: "cleaning", volume: 120 },
  { id: "053", priority: "P2", workKey: "delivery_lifting", category: "delivery_equipment", volume: 1, unit: "set" },
  { id: "054", priority: "P2", workKey: "design_project", category: "documents_design", volume: 100 },
  { id: "055", priority: "P2", workKey: "procurement_list", category: "documents_design", volume: 1, unit: "set" },
  { id: "056", priority: "P2", workKey: "material_takeoff", category: "documents_design", volume: 1, unit: "set" },
  { id: "057", priority: "P2", workKey: "estimate_documentation", category: "documents_design", volume: 1, unit: "set" },
  { id: "058", priority: "P2", workKey: "roof_project", category: "documents_design", volume: 1, unit: "set" },
  { id: "059", priority: "P2", workKey: "foundation_project", category: "documents_design", volume: 1, unit: "set" },
  { id: "060", priority: "P2", workKey: "electrical_project", category: "documents_design", volume: 1, unit: "set" },
  { id: "061", priority: "P2", workKey: "hvac_project", category: "documents_design", volume: 1, unit: "set" },
  { id: "062", priority: "P2", workKey: "bathroom_turnkey", category: "tile", volume: 30 },
  { id: "063", priority: "P2", workKey: "apartment_turnkey_renovation", category: "wall_finishing", volume: 80 },
  { id: "064", priority: "P2", workKey: "house_turnkey_renovation", category: "wall_finishing", volume: 160 },
  { id: "065", priority: "P2", workKey: "office_fitout", category: "wall_finishing", volume: 120 },
  { id: "066", priority: "P2", workKey: "restaurant_fitout", category: "wall_finishing", volume: 120 },
  { id: "067", priority: "P2", workKey: "server_room_fitout", category: "electrical", volume: 1, unit: "set", dangerousWorkSafetyRequired: true },
  { id: "068", priority: "P2", workKey: "solar_panel_installation", category: "electrical", volume: 1, unit: "set", expectedRowsContain: ["солнечных панелей"], dangerousWorkSafetyRequired: true },
  { id: "069", priority: "P2", workKey: "battery_storage_installation", category: "electrical", volume: 1, unit: "set", expectedRowsContain: ["аккумуляторного накопителя"], dangerousWorkSafetyRequired: true },
  { id: "070", priority: "P2", workKey: "generator_connection", category: "electrical", volume: 1, unit: "set", dangerousWorkSafetyRequired: true },
  { id: "071", priority: "P2", workKey: "boiler_room_piping", category: "heating_hvac", volume: 1, unit: "set", dangerousWorkSafetyRequired: true },
  { id: "072", priority: "P2", workKey: "mini_chp_preparation", category: "heating_hvac", volume: 1, unit: "set", expectedRowsContain: ["мини-тэц"], dangerousWorkSafetyRequired: true },
  { id: "073", priority: "P2", workKey: "micro_hydro_preparation", category: "concrete", volume: 1, unit: "set", expectedRowsContain: ["микро-гэс"], dangerousWorkSafetyRequired: true },
  { id: "074", priority: "P2", workKey: "greenhouse_installation", category: "metalworks", volume: 60, expectedRowsContain: ["теплицы"] },
  { id: "075", priority: "P2", workKey: "garden_irrigation", category: "landscaping", volume: 1, unit: "set", expectedRowsContain: ["садовый полив"] },
  { id: "076", priority: "P2", workKey: "furniture_assembly", category: "carpentry", volume: 1, unit: "set", expectedRowsContain: ["сборка мебели"] },
  { id: "077", priority: "P2", workKey: "built_in_wardrobe", category: "carpentry", volume: 1, unit: "set" },
  { id: "078", priority: "P2", workKey: "kitchen_cabinet_install", category: "carpentry", volume: 1, unit: "set" },
  { id: "079", priority: "P2", workKey: "smart_home_basic", category: "electrical", volume: 1, unit: "set", dangerousWorkSafetyRequired: true },
  { id: "080", priority: "P2", workKey: "estimate_to_pdf", category: "documents_design", volume: 1, unit: "set", promptRu: "смета на estimate_to_pdf 1 комплект" },
];

export const UNFINISHED_AI_ESTIMATE_CASES: readonly UnfinishedAiEstimateCase[] = [
  ...P0_CASES,
  ...P1_SEEDS.map(makeCase),
  ...P2_SEEDS.map(makeCase),
];

if (UNFINISHED_AI_ESTIMATE_CASES.length !== 80) {
  throw new Error(`UNFINISHED_AI_ESTIMATE_CASES_COUNT_INVALID:${UNFINISHED_AI_ESTIMATE_CASES.length}`);
}

export const P0_UNFINISHED_AI_ESTIMATE_CASES = UNFINISHED_AI_ESTIMATE_CASES.filter((item) => item.priority === "P0");
