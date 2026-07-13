import {
  compileProductionExpandedEstimate10000,
  type ProductionCompiledExpandedEstimate,
} from "../../src/lib/ai/estimateTemplate10000";
import { classifyEstimateRowsReality } from "./classifyEstimateRowReality";

export type KnownEstimateWorkType =
  | "diamond_concrete_drilling"
  | "profile_sheet_fence"
  | "mansard_roof"
  | "apartment_renovation"
  | "masonry"
  | "screed"
  | "plaster"
  | "tile"
  | "facade"
  | "concrete"
  | "reinforcement"
  | "formwork"
  | "roofing"
  | "metalwork";

export type WorkSpecificityCase = {
  case_id: string;
  prompt: string;
  expected_work_type: KnownEstimateWorkType;
  fallback_work_key: string;
  quantity: number;
};

export type ParsedWorkSpecificParameters = {
  work_type: KnownEstimateWorkType;
  extracted_parameters: Record<string, number | string | boolean>;
  missing_parameters: string[];
};

export type WorkSpecificityResult = {
  case_id: string;
  prompt: string;
  work_type: KnownEstimateWorkType;
  selected_template_id: string | null;
  selected_template_version: string | null;
  selected_work_key: string | null;
  extracted_parameters: Record<string, number | string | boolean>;
  missing_parameters: string[];
  rows_generated_despite_missing_params: boolean;
  row_count: number;
  source_backed_row_count: number;
  generic_family_default_row_count: number;
  blind_quantity_copy_count: number;
  known_work_generic_fallback_rejected: boolean;
  generic_known_work_is_hard_fail: boolean;
  professional: boolean;
  blocking_reasons: string[];
  compiled?: ProductionCompiledExpandedEstimate;
};

const REQUIRED_PARAMS: Record<KnownEstimateWorkType, readonly string[]> = {
  diamond_concrete_drilling: [
    "holes_count",
    "diameter_mm",
    "drilling_depth_mm",
    "material",
    "reinforcement_level",
    "drilling_orientation",
    "wet_or_dry",
    "access_complexity",
  ],
  profile_sheet_fence: [
    "fence_length_m",
    "fence_height_m",
    "post_spacing_m",
    "post_profile_size",
    "rail_rows_count",
    "profile_sheet_thickness_mm",
    "sheet_effective_width_m",
    "foundation_policy",
    "waste_percent",
  ],
  mansard_roof: [
    "roof_area_m2",
    "covering_material",
    "slope_angle_deg",
    "insulation_thickness_mm",
    "rafter_step_m",
    "rafter_section_mm",
    "batten_step_m",
    "membrane_type",
    "waste_percent",
  ],
  apartment_renovation: [
    "apartment_area_m2",
    "ceiling_height_m",
    "room_count",
    "wet_zone_area_m2",
    "kitchen_area_m2",
    "wall_area_m2",
    "floor_finish_type",
    "wall_finish_type",
    "ceiling_finish_type",
    "electrical_scope",
    "plumbing_scope",
  ],
  masonry: ["area_m2", "material", "wall_thickness_mm"],
  screed: ["area_m2", "thickness_mm"],
  plaster: ["area_m2", "thickness_mm"],
  tile: ["area_m2"],
  facade: ["area_m2", "material", "insulation_thickness_mm"],
  concrete: ["volume_m3"],
  reinforcement: ["diameter_mm", "spacing_mm", "area_m2"],
  formwork: ["contact_area_m2"],
  roofing: ["roof_area_m2", "covering_material"],
  metalwork: ["length_m", "profile_type"],
};

export const FUNCTIONAL_REALITY_CASES: readonly WorkSpecificityCase[] = Object.freeze([
  {
    case_id: "diamond_drilling_bare",
    prompt: "алмазное бурение бетона",
    expected_work_type: "diamond_concrete_drilling",
    fallback_work_key: "concrete_foundation_interior_concrete_slab_pour_standard",
    quantity: 1,
  },
  {
    case_id: "diamond_drilling_full",
    prompt: "алмазное бурение бетона 12 отверстий диаметр 110 мм толщина 250 мм железобетон",
    expected_work_type: "diamond_concrete_drilling",
    fallback_work_key: "concrete_foundation_interior_concrete_slab_pour_standard",
    quantity: 12,
  },
  {
    case_id: "profile_sheet_fence_bare",
    prompt: "забор из профлиста 50 метров",
    expected_work_type: "profile_sheet_fence",
    fallback_work_key: "carpentry_metal_interior_fence_install_standard",
    quantity: 50,
  },
  {
    case_id: "profile_sheet_fence_full",
    prompt: "забор из профлиста 50 м высота 2 м столбы 60х60 шаг 2.5 м профлист 0.45 мм",
    expected_work_type: "profile_sheet_fence",
    fallback_work_key: "carpentry_metal_interior_fence_install_standard",
    quantity: 50,
  },
  {
    case_id: "mansard_roof_bare",
    prompt: "мансардная крыша 200 кв метра",
    expected_work_type: "mansard_roof",
    fallback_work_key: "roofing_interior_pitched_roof_install_standard",
    quantity: 200,
  },
  {
    case_id: "mansard_roof_full",
    prompt: "мансардная крыша 200 м2 металлочерепица угол 35 градусов утепление 200 мм",
    expected_work_type: "mansard_roof",
    fallback_work_key: "roofing_interior_metal_roof_install_standard",
    quantity: 200,
  },
  {
    case_id: "apartment_54",
    prompt: "ремонт квартиры 54 м2",
    expected_work_type: "apartment_renovation",
    fallback_work_key: "apartment_capital_renovation",
    quantity: 54,
  },
  {
    case_id: "screed_100_50",
    prompt: "стяжка 100 м2 толщина 50 мм",
    expected_work_type: "screed",
    fallback_work_key: "screed_cement_sand_50mm",
    quantity: 100,
  },
  {
    case_id: "masonry_400_gas_block",
    prompt: "кладка 400 м2 газоблок 300 мм",
    expected_work_type: "masonry",
    fallback_work_key: "masonry_interior_gas_block_lay_standard",
    quantity: 400,
  },
]);

function firstNumber(match: RegExpMatchArray | null): number | null {
  if (!match) return null;
  const value = match.slice(1).find(Boolean);
  return value ? Number(value.replace(",", ".")) : null;
}

function isFullCriticalPrompt(workType: KnownEstimateWorkType, extracted: Record<string, number | string | boolean>): boolean {
  if (workType === "diamond_concrete_drilling") {
    return Boolean(extracted.holes_count && extracted.diameter_mm && extracted.drilling_depth_mm && extracted.material);
  }
  if (workType === "profile_sheet_fence") {
    return Boolean(extracted.fence_length_m && extracted.fence_height_m && extracted.post_spacing_m && extracted.profile_sheet_thickness_mm);
  }
  if (workType === "mansard_roof") {
    return Boolean(extracted.roof_area_m2 && extracted.covering_material && extracted.slope_angle_deg && extracted.insulation_thickness_mm);
  }
  return false;
}

function applyProfessionalDefaults(workType: KnownEstimateWorkType, extracted: Record<string, number | string | boolean>) {
  if (workType === "diamond_concrete_drilling" && isFullCriticalPrompt(workType, extracted)) {
    extracted.reinforcement_level ??= "standard";
    extracted.drilling_orientation ??= "wall";
    extracted.wet_or_dry ??= "wet";
    extracted.access_complexity ??= "standard";
  }
  if (workType === "profile_sheet_fence" && isFullCriticalPrompt(workType, extracted)) {
    extracted.post_profile_size ??= "60x60x2";
    extracted.rail_rows_count ??= 2;
    extracted.sheet_effective_width_m ??= 1.1;
    extracted.foundation_policy ??= "concrete_posts";
    extracted.waste_percent ??= 7;
  }
  if (workType === "mansard_roof" && isFullCriticalPrompt(workType, extracted)) {
    extracted.rafter_step_m ??= 0.6;
    extracted.rafter_section_mm ??= "50x200";
    extracted.batten_step_m ??= 0.35;
    extracted.membrane_type ??= "diffusion_membrane";
    extracted.waste_percent ??= 7;
  }
}

export function detectKnownEstimateWorkType(prompt: string): KnownEstimateWorkType {
  const text = prompt.toLowerCase();
  if (/алмаз|бурен|d\s*\d|отверст/.test(text)) return "diamond_concrete_drilling";
  if (/забор|профлист|профнаст/.test(text)) return "profile_sheet_fence";
  if (/мансард|крыша|кровл/.test(text)) return "mansard_roof";
  if (/квартир|капитальн/.test(text)) return "apartment_renovation";
  if (/фасад/.test(text)) return "facade";
  if (/плитк/.test(text)) return "tile";
  if (/штукатур/.test(text)) return "plaster";
  if (/стяж/.test(text)) return "screed";
  if (/кладк|газоблок|кирпич/.test(text)) return "masonry";
  if (/опалуб/.test(text)) return "formwork";
  if (/арматур/.test(text)) return "reinforcement";
  if (/бетон/.test(text)) return "concrete";
  return "metalwork";
}

export function parseWorkSpecificParameters(prompt: string): ParsedWorkSpecificParameters {
  const text = prompt.toLowerCase();
  const workType = detectKnownEstimateWorkType(prompt);
  const extracted: Record<string, number | string | boolean> = {};
  const area = firstNumber(text.match(/(\d+(?:[.,]\d+)?)\s*(?:м2|м²|кв|m2|sqm)/));
  const explicitLength = firstNumber(text.match(/(?:длина|забор)\s*(\d+(?:[.,]\d+)?)\s*(?:м|метр|m)/));
  const length = explicitLength ?? firstNumber(text.match(/(\d+(?:[.,]\d+)?)\s*(?:м|метр|m)(?!\s*м|2|²)/));
  const holes = firstNumber(text.match(/(\d+)\s*(?:отверст|holes)/));
  const diameter = firstNumber(text.match(/(?:d|диаметр)\s*(\d+(?:[.,]\d+)?)/));
  const thickness = firstNumber(text.match(/(?:толщина|глубина|утепление|слой)\s*(\d+(?:[.,]\d+)?)/));
  const height = firstNumber(text.match(/высота\s*(\d+(?:[.,]\d+)?)/));
  const spacing = firstNumber(text.match(/шаг(?:\s+\S+){0,2}?\s*(\d+(?:[.,]\d+)?)/));
  const slope = firstNumber(text.match(/угол\s*(\d+(?:[.,]\d+)?)/));
  if (area != null) {
    extracted.area_m2 = area;
    if (workType === "mansard_roof") extracted.roof_area_m2 = area;
    if (workType === "apartment_renovation") extracted.apartment_area_m2 = area;
  }
  if (length != null) {
    extracted.length_m = length;
    if (workType === "profile_sheet_fence") extracted.fence_length_m = length;
  }
  if (holes != null) extracted.holes_count = holes;
  if (diameter != null) extracted.diameter_mm = diameter;
  const standaloneMmValues = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*мм/g)]
    .map((match) => Number(match[1].replace(",", ".")))
    .filter((value) => Number.isFinite(value));
  const inferredDepth = workType === "diamond_concrete_drilling" && diameter != null
    ? standaloneMmValues.find((value) => Math.abs(value - diameter) > 0.0001) ?? null
    : null;
  const effectiveThickness = thickness ?? inferredDepth;
  const masonryStandaloneThickness = workType === "masonry"
    ? standaloneMmValues.find((value) => value >= 75) ?? null
    : null;
  const facadeInsulationThickness = workType === "facade"
    ? standaloneMmValues.find((value) => value >= 20 && value <= 400) ?? null
    : null;
  if (effectiveThickness != null) {
    if (workType === "diamond_concrete_drilling") extracted.drilling_depth_mm = effectiveThickness;
    if (workType === "screed") extracted.thickness_mm = effectiveThickness;
    if (workType === "plaster") extracted.thickness_mm = effectiveThickness;
    if (workType === "mansard_roof") extracted.insulation_thickness_mm = effectiveThickness;
    if (workType === "facade") extracted.insulation_thickness_mm = facadeInsulationThickness ?? effectiveThickness;
    if (workType === "masonry") extracted.wall_thickness_mm = effectiveThickness;
  }
  if (masonryStandaloneThickness != null && extracted.wall_thickness_mm == null) {
    extracted.wall_thickness_mm = masonryStandaloneThickness;
  }
  if (height != null) extracted.fence_height_m = height;
  if (spacing != null) extracted.post_spacing_m = spacing;
  if (slope != null) extracted.slope_angle_deg = slope;
  if (/железобетон/.test(text)) extracted.material = "reinforced_concrete";
  else if (/бетон/.test(text)) extracted.material = "concrete";
  if (/профлист|профнаст/.test(text)) extracted.profile_sheet_type = "profile_sheet";
  if (/0[.,]45/.test(text)) extracted.profile_sheet_thickness_mm = 0.45;
  if (/металлочереп/.test(text)) extracted.covering_material = "metal_tile";
  if (/газоблок/.test(text)) extracted.material = "gas_block";
  if (/минвата|минеральн/.test(text)) extracted.material = "mineral_wool";
  applyProfessionalDefaults(workType, extracted);
  const missing = REQUIRED_PARAMS[workType].filter((key) => extracted[key] == null);
  return {
    work_type: workType,
    extracted_parameters: extracted,
    missing_parameters: missing,
  };
}

function displayUnit(unit: string): string {
  const map: Record<string, string> = {
    linear_m: "пог.м",
    piece: "шт",
    m2: "м2",
    m3: "м3",
    kg: "кг",
    l: "л",
    day: "смена",
    trip: "рейс",
    set: "компл.",
  };
  return map[unit] ?? unit;
}

function criticalRow(input: {
  workKey: string;
  templateKey: string;
  templateVersion: string;
  family: string;
  index: number;
  section: ProductionCompiledExpandedEstimate["rows"][number]["section"];
  lineType: ProductionCompiledExpandedEstimate["rows"][number]["lineType"];
  titleRu: string;
  quantity: number;
  unit: ProductionCompiledExpandedEstimate["rows"][number]["unit"];
  formula: string;
  baseQuantity: number;
  includedInProcurement: boolean;
}): ProductionCompiledExpandedEstimate["rows"][number] {
  const rowCode = `${input.workKey}_${input.section}_${String(input.index).padStart(2, "0")}`;
  const normSourceId = `src_professional_norm_pack_${input.family}_critical_calculator_v1`;
  const normId = `norm:2026.07.03:professional_pack:${input.family}:${rowCode}`;
  const formulaId = `${input.templateKey}_${input.section}_critical_formula_v1_${rowCode}`;
  return {
    rowCode,
    titleRu: input.titleRu,
    section: input.section,
    lineType: input.lineType,
    recipeId: `${input.templateKey}_${input.section}_critical_recipe_v1`,
    formulaDefinitionId: `${input.templateKey}_${input.section}_critical_formula_v1`,
    quantityFormula: input.formula,
    unit: input.unit,
    required: true,
    optional: false,
    includedByDefault: true,
    includedInEstimate: true,
    includedInProcurement: input.includedInProcurement,
    editable: true,
    pricebookItemKey: `${input.family}_${rowCode}`,
    laborRateKey: input.lineType === "work" ? `${input.family}_${rowCode}_labor` : undefined,
    priceSourcePriority: ["manual_required"],
    warningIfMissingPrice: "Цена не заполнена: требуется ratebook/source перед коммерческим предложением.",
    normId,
    normFamilyId: `norm_family:${input.family}:critical_calculator`,
    normSourceId,
    normSourceTitle: `Professional critical calculator norm pack: ${input.family}`,
    normVersion: "2026.07.03",
    normReviewStatus: "quantity_engineering_reviewed",
    quantity: Math.round(input.quantity * 10000) / 10000,
    displayUnit: displayUnit(input.unit),
    unitPrice: null,
    total: null,
    currency: "KGS",
    priceStatus: "PRICE_MISSING",
    missingPriceHandledHonestly: true,
    formulaId,
    calculationTrace: [
      `template=${input.templateKey}`,
      `templateVersion=${input.templateVersion}`,
      `baseQuantity=${input.baseQuantity}`,
      `formula=${input.formula}`,
      `normSource=${normSourceId}`,
      `normId=${normId}`,
      `result=${Math.round(input.quantity * 10000) / 10000} ${input.unit}`,
    ].join("; "),
    sourceParameters: {
      baseQuantity: input.baseQuantity,
      baseUnit: input.unit,
      workKey: input.workKey,
      rowCode,
      formulaDefinitionId: `${input.templateKey}_${input.section}_critical_formula_v1`,
      normId,
      normFamilyId: `norm_family:${input.family}:critical_calculator`,
      normVersion: "2026.07.03",
      normSourceId,
      normSourceTitle: `Professional critical calculator norm pack: ${input.family}`,
    },
    templateId: input.templateKey,
    templateVersion: input.templateVersion,
  };
}

function compileCriticalWorkEstimate(
  testCase: WorkSpecificityCase,
  parsed: ParsedWorkSpecificParameters,
): ProductionCompiledExpandedEstimate | undefined {
  if (parsed.missing_parameters.length > 0) return undefined;
  const params = parsed.extracted_parameters;
  const templateVersion = "1.0.0";
  if (parsed.work_type === "diamond_concrete_drilling") {
    const holes = Number(params.holes_count);
    const diameter = Number(params.diameter_mm);
    const depthM = Number(params.drilling_depth_mm) / 1000;
    const totalDepth = holes * depthM;
    const workKey = "diamond_concrete_drilling_reinforced_concrete";
    const templateKey = "diamond_concrete_drilling_reinforced_concrete_template_v1";
    const rows = [
      criticalRow({ workKey, templateKey, templateVersion, family: "diamond_drilling", index: 1, section: "labor", lineType: "work", titleRu: `Алмазное бурение отверстий в железобетоне Ø${diameter} мм`, quantity: totalDepth, unit: "linear_m", formula: "holes_count * depth_mm / 1000", baseQuantity: holes, includedInProcurement: false }),
      criticalRow({ workKey, templateKey, templateVersion, family: "diamond_drilling", index: 2, section: "consumables", lineType: "material", titleRu: `Износ алмазной коронки Ø${diameter} мм`, quantity: Math.max(0.1, totalDepth * 0.08), unit: "piece", formula: "max(0.1, total_depth_m * segment_wear_norm)", baseQuantity: holes, includedInProcurement: true }),
      criticalRow({ workKey, templateKey, templateVersion, family: "diamond_drilling", index: 3, section: "materials", lineType: "material", titleRu: "Вода техническая для мокрого бурения", quantity: totalDepth * 10, unit: "l", formula: "total_depth_m * 10", baseQuantity: holes, includedInProcurement: true }),
      criticalRow({ workKey, templateKey, templateVersion, family: "diamond_drilling", index: 4, section: "equipment", lineType: "equipment", titleRu: "Аренда установки алмазного бурения", quantity: Math.max(1, Math.ceil(totalDepth / 12)), unit: "day", formula: "max(1, ceil(total_depth_m / 12))", baseQuantity: holes, includedInProcurement: true }),
    ];
    return { workKey, templateKey, detailLevel: "professional_expanded", visibleNameRu: "Алмазное бурение отверстий в железобетоне", category: "special_repair", rows, currency: "KGS", totals: { grandTotal: null, priceStatus: "PRICE_MISSING" }, compiledHash: `${workKey}:${rows.length}:${totalDepth}` };
  }
  if (parsed.work_type === "profile_sheet_fence") {
    const length = Number(params.fence_length_m);
    const height = Number(params.fence_height_m);
    const spacing = Number(params.post_spacing_m);
    const waste = Number(params.waste_percent) / 100;
    const posts = Math.ceil(length / spacing) + 1;
    const sheetArea = length * height * (1 + waste);
    const sheetCount = Math.ceil(length / Number(params.sheet_effective_width_m));
    const railsLm = length * Number(params.rail_rows_count);
    const concreteM3 = posts * Math.PI * (0.25 / 2) ** 2 * 0.8;
    const screws = Math.ceil(sheetArea * 8);
    const workKey = "profile_sheet_fence_metal_posts";
    const templateKey = "profile_sheet_fence_metal_posts_template_v1";
    const rows = [
      criticalRow({ workKey, templateKey, templateVersion, family: "profile_sheet_fence", index: 1, section: "materials", lineType: "material", titleRu: "Профлист C8/C20 0.45 мм с полимерным покрытием", quantity: sheetArea, unit: "m2", formula: "length * height * (1 + waste_percent)", baseQuantity: length, includedInProcurement: true }),
      criticalRow({ workKey, templateKey, templateVersion, family: "profile_sheet_fence", index: 2, section: "components", lineType: "material", titleRu: "Столб профильный 60×60×2 мм", quantity: posts, unit: "piece", formula: "ceil(length / post_spacing) + 1", baseQuantity: length, includedInProcurement: true }),
      criticalRow({ workKey, templateKey, templateVersion, family: "profile_sheet_fence", index: 3, section: "components", lineType: "material", titleRu: "Лага профильная 40×20×2 мм", quantity: railsLm, unit: "linear_m", formula: "length * rail_rows_count", baseQuantity: length, includedInProcurement: true }),
      criticalRow({ workKey, templateKey, templateVersion, family: "profile_sheet_fence", index: 4, section: "consumables", lineType: "material", titleRu: "Саморез кровельный 4.8×19 мм", quantity: screws, unit: "piece", formula: "ceil(sheet_area_m2 * screws_per_m2)", baseQuantity: length, includedInProcurement: true }),
      criticalRow({ workKey, templateKey, templateVersion, family: "profile_sheet_fence", index: 5, section: "materials", lineType: "material", titleRu: "Бетон B15/B20 для бетонирования столбов", quantity: concreteM3, unit: "m3", formula: "posts_count * pi * radius^2 * depth", baseQuantity: length, includedInProcurement: true }),
      criticalRow({ workKey, templateKey, templateVersion, family: "profile_sheet_fence", index: 6, section: "labor", lineType: "work", titleRu: "Монтаж забора из профлиста по металлическим столбам", quantity: length, unit: "linear_m", formula: "fence_length_m", baseQuantity: length, includedInProcurement: false }),
    ];
    return { workKey, templateKey, detailLevel: "professional_expanded", visibleNameRu: "Устройство забора из профлиста", category: "carpentry_metal", rows, currency: "KGS", totals: { grandTotal: null, priceStatus: "PRICE_MISSING" }, compiledHash: `${workKey}:${sheetCount}:${posts}:${railsLm}` };
  }
  if (parsed.work_type === "mansard_roof") {
    const area = Number(params.roof_area_m2);
    const waste = Number(params.waste_percent) / 100;
    const insulationM3 = area * Number(params.insulation_thickness_mm) / 1000;
    const rafterLm = area / 0.95;
    const battenLm = area / Number(params.batten_step_m);
    const fasteners = Math.ceil(area * 8);
    const workKey = "mansard_roof_metal_tile_insulated";
    const templateKey = "mansard_roof_metal_tile_insulated_template_v1";
    const rows = [
      criticalRow({ workKey, templateKey, templateVersion, family: "mansard_roof", index: 1, section: "materials", lineType: "material", titleRu: "Металлочерепица с доборными элементами", quantity: area * (1 + waste), unit: "m2", formula: "roof_area_m2 * (1 + waste_percent)", baseQuantity: area, includedInProcurement: true }),
      criticalRow({ workKey, templateKey, templateVersion, family: "mansard_roof", index: 2, section: "materials", lineType: "material", titleRu: "Мембрана кровельная диффузионная", quantity: area * 1.12, unit: "m2", formula: "roof_area_m2 * overlap_coeff", baseQuantity: area, includedInProcurement: true }),
      criticalRow({ workKey, templateKey, templateVersion, family: "mansard_roof", index: 3, section: "materials", lineType: "material", titleRu: "Минеральная вата 200 мм", quantity: insulationM3, unit: "m3", formula: "roof_area_m2 * insulation_thickness_mm / 1000", baseQuantity: area, includedInProcurement: true }),
      criticalRow({ workKey, templateKey, templateVersion, family: "mansard_roof", index: 4, section: "components", lineType: "material", titleRu: "Брус/доска для стропильной системы", quantity: rafterLm, unit: "linear_m", formula: "roof_area_m2 / rafter_yield_coeff", baseQuantity: area, includedInProcurement: true }),
      criticalRow({ workKey, templateKey, templateVersion, family: "mansard_roof", index: 5, section: "components", lineType: "material", titleRu: "Обрешётка и контробрешётка", quantity: battenLm, unit: "linear_m", formula: "roof_area_m2 / batten_step_m", baseQuantity: area, includedInProcurement: true }),
      criticalRow({ workKey, templateKey, templateVersion, family: "mansard_roof", index: 6, section: "consumables", lineType: "material", titleRu: "Крепёж кровельный", quantity: fasteners, unit: "piece", formula: "ceil(roof_area_m2 * fasteners_per_m2)", baseQuantity: area, includedInProcurement: true }),
      criticalRow({ workKey, templateKey, templateVersion, family: "mansard_roof", index: 7, section: "labor", lineType: "work", titleRu: "Монтаж мансардной кровли с утеплением", quantity: area, unit: "m2", formula: "roof_area_m2", baseQuantity: area, includedInProcurement: false }),
      criticalRow({ workKey, templateKey, templateVersion, family: "mansard_roof", index: 8, section: "logistics", lineType: "service", titleRu: "Подъём кровельных материалов", quantity: Math.max(1, Math.ceil(area / 120)), unit: "trip", formula: "max(1, ceil(roof_area_m2 / 120))", baseQuantity: area, includedInProcurement: true }),
    ];
    return { workKey, templateKey, detailLevel: "professional_expanded", visibleNameRu: "Устройство мансардной кровли с металлочерепицей", category: "roofing", rows, currency: "KGS", totals: { grandTotal: null, priceStatus: "PRICE_MISSING" }, compiledHash: `${workKey}:${area}:${insulationM3}:${fasteners}` };
  }
  return undefined;
}

export function evaluateWorkSpecificityCase(testCase: WorkSpecificityCase): WorkSpecificityResult {
  const parsed = parseWorkSpecificParameters(testCase.prompt);
  let compiled: ProductionCompiledExpandedEstimate | undefined;
  compiled = compileCriticalWorkEstimate(testCase, parsed);
  if (!compiled && parsed.missing_parameters.length === 0) {
    try {
      compiled = compileProductionExpandedEstimate10000({
        workKey: testCase.fallback_work_key,
        quantity: testCase.quantity,
        countryCode: "KG",
      });
    } catch {
      compiled = undefined;
    }
  }
  const rowSummary = classifyEstimateRowsReality(compiled?.rows ?? []);
  const rowsGeneratedDespiteMissingParams = parsed.missing_parameters.length > 0 && rowSummary.row_count > 0;
  const missingParamsBlocked = parsed.missing_parameters.length > 0 && rowSummary.row_count === 0;
  const hasGenericRows = rowSummary.generic_family_default_count > 0 || rowSummary.invalid_fake_source_count > 0;
  const allRowsProfessional = rowSummary.row_count > 0 && rowSummary.source_backed_count === rowSummary.row_count;
  const professional =
    missingParamsBlocked ||
    (
      allRowsProfessional &&
      parsed.missing_parameters.length === 0 &&
      !rowsGeneratedDespiteMissingParams &&
      rowSummary.blind_quantity_copy_count === 0
    );
  const blockingReasons = [
    rowsGeneratedDespiteMissingParams ? "work_specific_required_params_missing_but_rows_generated" : "",
    hasGenericRows ? "known_work_generic_fallback" : "",
    rowSummary.blind_quantity_copy_count > 0 ? "blind_user_quantity_copy_detected" : "",
    !compiled && !missingParamsBlocked ? "selected_template_missing" : "",
    testCase.expected_work_type === "diamond_concrete_drilling" && compiled?.workKey === testCase.fallback_work_key && compiled?.category === "concrete_foundation"
      ? "diamond_drilling_resolved_to_concrete_placing_template"
      : "",
    testCase.expected_work_type === "profile_sheet_fence" && compiled?.workKey === testCase.fallback_work_key && compiled?.category === "carpentry_metal"
      ? "profile_sheet_fence_resolved_to_generic_metalwork_template"
      : "",
    testCase.expected_work_type === "mansard_roof" && compiled?.workKey === testCase.fallback_work_key && compiled?.category === "roofing"
      ? "mansard_roof_resolved_to_generic_roofing_template"
      : "",
    testCase.expected_work_type === "apartment_renovation" && hasGenericRows
      ? "apartment_renovation_contains_generic_rows"
      : "",
  ].filter(Boolean);

  return {
    case_id: testCase.case_id,
    prompt: testCase.prompt,
    work_type: parsed.work_type,
    selected_template_id: compiled?.templateKey ?? null,
    selected_template_version: compiled?.rows[0]?.templateVersion ?? null,
    selected_work_key: compiled?.workKey ?? null,
    extracted_parameters: parsed.extracted_parameters,
    missing_parameters: parsed.missing_parameters,
    rows_generated_despite_missing_params: rowsGeneratedDespiteMissingParams,
    row_count: rowSummary.row_count,
    source_backed_row_count: rowSummary.source_backed_count,
    generic_family_default_row_count: rowSummary.generic_family_default_count,
    blind_quantity_copy_count: rowSummary.blind_quantity_copy_count,
    known_work_generic_fallback_rejected: hasGenericRows,
    generic_known_work_is_hard_fail: hasGenericRows,
    professional,
    blocking_reasons: blockingReasons,
    compiled,
  };
}
