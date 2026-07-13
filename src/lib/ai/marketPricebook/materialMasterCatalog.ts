import {
  PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG,
} from "../professionalEstimateTemplates/workSpecificTemplateCatalog";
import type {
  ProfessionalEstimateRecipeRow,
  ProfessionalEstimateUnit,
  ProfessionalGroupKey,
} from "../professionalEstimateTemplates/professionalEstimateTypes";
import type {
  MarketMaterialCategory,
  MarketMaterialMasterItem,
} from "./marketPricebookTypes";

const ALL_WORK_GROUPS: readonly ProfessionalGroupKey[] = [
  "demolition",
  "earthworks",
  "foundation_concrete",
  "reinforcement_formwork",
  "masonry",
  "waterproofing",
  "roofing",
  "insulation",
  "facade",
  "plaster_putty_paint",
  "drywall_ceiling",
  "tile_stone",
  "flooring",
  "doors_windows",
  "electrical_power",
  "low_voltage_security",
  "plumbing_sewerage",
  "heating_hvac",
  "ventilation_ac",
  "paving_landscape",
  "special_repair",
];

type MandatoryFamilySeed = {
  material_key: string;
  visible_name_ru: string;
  category: MarketMaterialCategory;
  base_unit: ProfessionalEstimateUnit;
  compatible_work_groups: ProfessionalGroupKey[];
};

export const MANDATORY_MARKET_MATERIAL_FAMILIES: readonly MandatoryFamilySeed[] = [
  { material_key: "market_carpet_roll", visible_name_ru: "Ковролин рулонный", category: "flooring", base_unit: "m2", compatible_work_groups: ["flooring"] },
  { material_key: "market_carpet_adhesive", visible_name_ru: "Клей для ковролина", category: "flooring", base_unit: "bucket", compatible_work_groups: ["flooring"] },
  { material_key: "market_carpet_underlay", visible_name_ru: "Подложка под ковролин", category: "flooring", base_unit: "m2", compatible_work_groups: ["flooring"] },
  { material_key: "market_floor_baseboard", visible_name_ru: "Плинтус напольный", category: "flooring", base_unit: "linear_m", compatible_work_groups: ["flooring"] },
  { material_key: "market_transition_profile", visible_name_ru: "Порожки", category: "flooring", base_unit: "piece", compatible_work_groups: ["flooring"] },
  { material_key: "market_joint_tape", visible_name_ru: "Стыковочная лента", category: "flooring", base_unit: "roll", compatible_work_groups: ["flooring"] },
  { material_key: "market_carpet_tile", visible_name_ru: "Ковровая плитка", category: "flooring", base_unit: "m2", compatible_work_groups: ["flooring"] },
  { material_key: "market_laminate", visible_name_ru: "Ламинат", category: "flooring", base_unit: "m2", compatible_work_groups: ["flooring"] },
  { material_key: "market_laminate_underlay", visible_name_ru: "Подложка под ламинат", category: "flooring", base_unit: "m2", compatible_work_groups: ["flooring"] },
  { material_key: "market_commercial_linoleum", visible_name_ru: "Линолеум коммерческий", category: "flooring", base_unit: "m2", compatible_work_groups: ["flooring"] },
  { material_key: "market_linoleum_adhesive", visible_name_ru: "Клей для линолеума", category: "flooring", base_unit: "bucket", compatible_work_groups: ["flooring"] },
  { material_key: "market_linoleum_welding", visible_name_ru: "Холодная сварка линолеума", category: "flooring", base_unit: "set", compatible_work_groups: ["flooring"] },
  { material_key: "market_parquet_board", visible_name_ru: "Паркетная доска", category: "flooring", base_unit: "m2", compatible_work_groups: ["flooring"] },
  { material_key: "market_parquet_plywood", visible_name_ru: "Фанера под паркет", category: "flooring", base_unit: "m2", compatible_work_groups: ["flooring"] },
  { material_key: "market_ceramic_tile", visible_name_ru: "Плитка керамическая", category: "tile", base_unit: "m2", compatible_work_groups: ["tile_stone"] },
  { material_key: "market_porcelain_tile", visible_name_ru: "Керамогранит", category: "tile", base_unit: "m2", compatible_work_groups: ["tile_stone"] },
  { material_key: "market_c2te_adhesive", visible_name_ru: "Клей C2TE", category: "tile", base_unit: "bag", compatible_work_groups: ["tile_stone"] },
  { material_key: "market_cement_grout", visible_name_ru: "Затирка цементная", category: "tile", base_unit: "kg", compatible_work_groups: ["tile_stone"] },
  { material_key: "market_epoxy_grout", visible_name_ru: "Затирка эпоксидная", category: "tile", base_unit: "kg", compatible_work_groups: ["tile_stone"] },
  { material_key: "market_tile_leveling_system", visible_name_ru: "СВП", category: "tile", base_unit: "set", compatible_work_groups: ["tile_stone"] },
  { material_key: "market_primer", visible_name_ru: "Грунтовка", category: "paint", base_unit: "bucket", compatible_work_groups: ["tile_stone", "plaster_putty_paint", "facade", "flooring"] },
  { material_key: "market_waterproofing_tape", visible_name_ru: "Гидроизоляционная лента", category: "waterproofing", base_unit: "roll", compatible_work_groups: ["waterproofing", "tile_stone"] },
  { material_key: "market_concrete_b25", visible_name_ru: "Бетон B25", category: "concrete", base_unit: "m3", compatible_work_groups: ["foundation_concrete"] },
  { material_key: "market_concrete_b20", visible_name_ru: "Бетон B20", category: "concrete", base_unit: "m3", compatible_work_groups: ["foundation_concrete"] },
  { material_key: "market_rebar_a500c_d12", visible_name_ru: "Арматура A500C Ø12", category: "reinforcement", base_unit: "kg", compatible_work_groups: ["foundation_concrete", "reinforcement_formwork"] },
  { material_key: "market_rebar_a500c_d8", visible_name_ru: "Арматура A500C Ø8", category: "reinforcement", base_unit: "kg", compatible_work_groups: ["foundation_concrete", "reinforcement_formwork"] },
  { material_key: "market_binding_wire", visible_name_ru: "Вязальная проволока", category: "reinforcement", base_unit: "kg", compatible_work_groups: ["foundation_concrete", "reinforcement_formwork"] },
  { material_key: "market_cover_spacers", visible_name_ru: "Фиксаторы защитного слоя", category: "reinforcement", base_unit: "piece", compatible_work_groups: ["foundation_concrete", "reinforcement_formwork"] },
  { material_key: "market_formwork_plywood", visible_name_ru: "Опалубочная фанера", category: "concrete", base_unit: "m2", compatible_work_groups: ["foundation_concrete", "reinforcement_formwork"] },
  { material_key: "market_sand", visible_name_ru: "Песок", category: "earthworks", base_unit: "m3", compatible_work_groups: ["earthworks", "foundation_concrete", "paving_landscape"] },
  { material_key: "market_crushed_stone_5_20", visible_name_ru: "Щебень 5-20", category: "earthworks", base_unit: "m3", compatible_work_groups: ["earthworks", "foundation_concrete", "paving_landscape"] },
  { material_key: "market_crushed_stone_20_40", visible_name_ru: "Щебень 20-40", category: "earthworks", base_unit: "m3", compatible_work_groups: ["earthworks", "foundation_concrete", "paving_landscape"] },
  { material_key: "market_geotextile", visible_name_ru: "Геотекстиль", category: "earthworks", base_unit: "m2", compatible_work_groups: ["earthworks", "paving_landscape"] },
  { material_key: "market_concrete_paver", visible_name_ru: "Брусчатка бетонная", category: "paving", base_unit: "m2", compatible_work_groups: ["paving_landscape"] },
  { material_key: "market_border_stone", visible_name_ru: "Бордюр", category: "paving", base_unit: "linear_m", compatible_work_groups: ["paving_landscape"] },
  { material_key: "market_cement_sand_mix", visible_name_ru: "Песчано-цементная смесь", category: "paving", base_unit: "bag", compatible_work_groups: ["paving_landscape"] },
  { material_key: "market_bitumen_primer", visible_name_ru: "Битумный праймер", category: "waterproofing", base_unit: "bucket", compatible_work_groups: ["waterproofing", "roofing"] },
  { material_key: "market_bitumen_mastic", visible_name_ru: "Битумная мастика", category: "waterproofing", base_unit: "bucket", compatible_work_groups: ["waterproofing", "roofing"] },
  { material_key: "market_roll_waterproofing", visible_name_ru: "Рулонная гидроизоляция", category: "waterproofing", base_unit: "roll", compatible_work_groups: ["waterproofing", "roofing"] },
  { material_key: "market_pvc_membrane", visible_name_ru: "ПВХ мембрана", category: "waterproofing", base_unit: "m2", compatible_work_groups: ["roofing", "waterproofing"] },
  { material_key: "market_roof_membrane", visible_name_ru: "Кровельная мембрана", category: "roofing", base_unit: "m2", compatible_work_groups: ["roofing"] },
  { material_key: "market_metal_tile", visible_name_ru: "Металлочерепица", category: "roofing", base_unit: "m2", compatible_work_groups: ["roofing"] },
  { material_key: "market_profile_sheet", visible_name_ru: "Профнастил", category: "roofing", base_unit: "m2", compatible_work_groups: ["roofing"] },
  { material_key: "market_flexible_shingle", visible_name_ru: "Гибкая черепица", category: "roofing", base_unit: "m2", compatible_work_groups: ["roofing"] },
  { material_key: "market_osb_roof", visible_name_ru: "OSB под кровлю", category: "roofing", base_unit: "m2", compatible_work_groups: ["roofing"] },
  { material_key: "market_vapor_barrier", visible_name_ru: "Пароизоляция", category: "roofing", base_unit: "roll", compatible_work_groups: ["roofing", "insulation"] },
  { material_key: "market_mineral_wool", visible_name_ru: "Минеральная вата", category: "roofing", base_unit: "m2", compatible_work_groups: ["insulation", "roofing", "facade"] },
  { material_key: "market_eps", visible_name_ru: "Пенополистирол", category: "facade", base_unit: "m2", compatible_work_groups: ["facade", "insulation"] },
  { material_key: "market_facade_mesh", visible_name_ru: "Фасадная сетка", category: "facade", base_unit: "m2", compatible_work_groups: ["facade"] },
  { material_key: "market_facade_adhesive", visible_name_ru: "Фасадный клей", category: "facade", base_unit: "bag", compatible_work_groups: ["facade"] },
  { material_key: "market_decorative_plaster", visible_name_ru: "Декоративная штукатурка", category: "facade", base_unit: "bucket", compatible_work_groups: ["facade"] },
  { material_key: "market_plaster_mix", visible_name_ru: "Штукатурная смесь", category: "paint", base_unit: "bag", compatible_work_groups: ["plaster_putty_paint"] },
  { material_key: "market_start_putty", visible_name_ru: "Шпаклевка стартовая", category: "paint", base_unit: "bag", compatible_work_groups: ["plaster_putty_paint"] },
  { material_key: "market_finish_putty", visible_name_ru: "Шпаклевка финишная", category: "paint", base_unit: "bag", compatible_work_groups: ["plaster_putty_paint"] },
  { material_key: "market_interior_paint", visible_name_ru: "Краска интерьерная", category: "paint", base_unit: "bucket", compatible_work_groups: ["plaster_putty_paint"] },
  { material_key: "market_facade_paint", visible_name_ru: "Краска фасадная", category: "paint", base_unit: "bucket", compatible_work_groups: ["facade", "plaster_putty_paint"] },
  { material_key: "market_gypsum_board", visible_name_ru: "Гипсокартон", category: "drywall", base_unit: "m2", compatible_work_groups: ["drywall_ceiling"] },
  { material_key: "market_profile_cw", visible_name_ru: "Профиль CW", category: "drywall", base_unit: "linear_m", compatible_work_groups: ["drywall_ceiling"] },
  { material_key: "market_profile_uw", visible_name_ru: "Профиль UW", category: "drywall", base_unit: "linear_m", compatible_work_groups: ["drywall_ceiling"] },
  { material_key: "market_profile_cd", visible_name_ru: "Профиль CD", category: "drywall", base_unit: "linear_m", compatible_work_groups: ["drywall_ceiling"] },
  { material_key: "market_profile_ud", visible_name_ru: "Профиль UD", category: "drywall", base_unit: "linear_m", compatible_work_groups: ["drywall_ceiling"] },
  { material_key: "market_drywall_screws", visible_name_ru: "Саморезы ГКЛ", category: "drywall", base_unit: "set", compatible_work_groups: ["drywall_ceiling"] },
  { material_key: "market_vvgng_3x25", visible_name_ru: "Кабель ВВГнг-LS 3x2.5", category: "electrical", base_unit: "linear_m", compatible_work_groups: ["electrical_power"] },
  { material_key: "market_vvgng_3x15", visible_name_ru: "Кабель ВВГнг-LS 3x1.5", category: "electrical", base_unit: "linear_m", compatible_work_groups: ["electrical_power"] },
  { material_key: "market_socket_box", visible_name_ru: "Подрозетник", category: "electrical", base_unit: "piece", compatible_work_groups: ["electrical_power"] },
  { material_key: "market_socket_unit", visible_name_ru: "Розетка", category: "electrical", base_unit: "piece", compatible_work_groups: ["electrical_power"] },
  { material_key: "market_switch_unit", visible_name_ru: "Выключатель", category: "electrical", base_unit: "piece", compatible_work_groups: ["electrical_power"] },
  { material_key: "market_pvc_corrugation", visible_name_ru: "Гофра ПВХ", category: "electrical", base_unit: "linear_m", compatible_work_groups: ["electrical_power"] },
  { material_key: "market_terminals", visible_name_ru: "Клеммы", category: "electrical", base_unit: "set", compatible_work_groups: ["electrical_power"] },
  { material_key: "market_junction_box", visible_name_ru: "Распределительная коробка", category: "electrical", base_unit: "piece", compatible_work_groups: ["electrical_power"] },
  { material_key: "market_breaker", visible_name_ru: "Автомат", category: "electrical", base_unit: "piece", compatible_work_groups: ["electrical_power"] },
  { material_key: "market_rcd", visible_name_ru: "УЗО", category: "electrical", base_unit: "piece", compatible_work_groups: ["electrical_power"] },
  { material_key: "market_light_fixture", visible_name_ru: "Светильник", category: "electrical", base_unit: "piece", compatible_work_groups: ["electrical_power"] },
  { material_key: "market_twisted_pair", visible_name_ru: "Кабель витая пара", category: "low_voltage", base_unit: "linear_m", compatible_work_groups: ["low_voltage_security"] },
  { material_key: "market_cctv_camera", visible_name_ru: "Камера видеонаблюдения", category: "low_voltage", base_unit: "piece", compatible_work_groups: ["low_voltage_security"] },
  { material_key: "market_patch_panel", visible_name_ru: "Патч-панель", category: "low_voltage", base_unit: "piece", compatible_work_groups: ["low_voltage_security"] },
  { material_key: "market_wifi_ap", visible_name_ru: "Wi-Fi точка", category: "low_voltage", base_unit: "piece", compatible_work_groups: ["low_voltage_security"] },
  { material_key: "market_ppr_pipe", visible_name_ru: "Труба ППР", category: "plumbing", base_unit: "linear_m", compatible_work_groups: ["plumbing_sewerage"] },
  { material_key: "market_pnd_pipe", visible_name_ru: "Труба ПНД", category: "plumbing", base_unit: "linear_m", compatible_work_groups: ["plumbing_sewerage"] },
  { material_key: "market_sewer_pipe", visible_name_ru: "Труба канализационная ПВХ", category: "plumbing", base_unit: "linear_m", compatible_work_groups: ["plumbing_sewerage"] },
  { material_key: "market_ppr_fittings", visible_name_ru: "Фитинги ППР", category: "plumbing", base_unit: "set", compatible_work_groups: ["plumbing_sewerage"] },
  { material_key: "market_sewer_fittings", visible_name_ru: "Фитинги канализации", category: "plumbing", base_unit: "set", compatible_work_groups: ["plumbing_sewerage"] },
  { material_key: "market_toilet", visible_name_ru: "Унитаз", category: "plumbing", base_unit: "piece", compatible_work_groups: ["plumbing_sewerage"] },
  { material_key: "market_sink", visible_name_ru: "Раковина", category: "plumbing", base_unit: "piece", compatible_work_groups: ["plumbing_sewerage"] },
  { material_key: "market_mixer_tap", visible_name_ru: "Смеситель", category: "plumbing", base_unit: "piece", compatible_work_groups: ["plumbing_sewerage"] },
  { material_key: "market_shower_trap", visible_name_ru: "Душевой трап", category: "plumbing", base_unit: "piece", compatible_work_groups: ["plumbing_sewerage"] },
  { material_key: "market_radiator", visible_name_ru: "Радиатор", category: "heating", base_unit: "piece", compatible_work_groups: ["heating_hvac"] },
  { material_key: "market_heating_pipe", visible_name_ru: "Труба отопления", category: "heating", base_unit: "linear_m", compatible_work_groups: ["heating_hvac"] },
  { material_key: "market_heating_collector", visible_name_ru: "Коллектор отопления", category: "heating", base_unit: "piece", compatible_work_groups: ["heating_hvac"] },
  { material_key: "market_boiler", visible_name_ru: "Котел", category: "heating", base_unit: "piece", compatible_work_groups: ["heating_hvac"] },
  { material_key: "market_heating_pump", visible_name_ru: "Насос отопления", category: "heating", base_unit: "piece", compatible_work_groups: ["heating_hvac"] },
  { material_key: "market_floor_heating_pipe", visible_name_ru: "Труба теплого пола", category: "heating", base_unit: "linear_m", compatible_work_groups: ["heating_hvac"] },
  { material_key: "market_air_duct", visible_name_ru: "Воздуховод", category: "ventilation", base_unit: "linear_m", compatible_work_groups: ["ventilation_ac"] },
  { material_key: "market_vent_grille", visible_name_ru: "Вентиляционная решетка", category: "ventilation", base_unit: "piece", compatible_work_groups: ["ventilation_ac"] },
  { material_key: "market_exhaust_fan", visible_name_ru: "Вытяжной вентилятор", category: "ventilation", base_unit: "piece", compatible_work_groups: ["ventilation_ac"] },
  { material_key: "market_split_system", visible_name_ru: "Сплит-система", category: "ventilation", base_unit: "piece", compatible_work_groups: ["ventilation_ac"] },
];

function categoryForGroup(groupKey: ProfessionalGroupKey): MarketMaterialCategory {
  if (groupKey === "tile_stone") return "tile";
  if (groupKey === "masonry") return "masonry";
  if (groupKey === "foundation_concrete") return "concrete";
  if (groupKey === "reinforcement_formwork") return "reinforcement";
  if (groupKey === "waterproofing") return "waterproofing";
  if (groupKey === "roofing" || groupKey === "insulation") return "roofing";
  if (groupKey === "electrical_power") return "electrical";
  if (groupKey === "low_voltage_security") return "low_voltage";
  if (groupKey === "plumbing_sewerage") return "plumbing";
  if (groupKey === "heating_hvac") return "heating";
  if (groupKey === "ventilation_ac") return "ventilation";
  if (groupKey === "plaster_putty_paint") return "paint";
  if (groupKey === "drywall_ceiling") return "drywall";
  if (groupKey === "facade") return "facade";
  if (groupKey === "earthworks") return "earthworks";
  if (groupKey === "paving_landscape") return "paving";
  return "flooring";
}

export function marketMaterialKeyForRecipeRow(row: ProfessionalEstimateRecipeRow): string {
  return row.material_key ?? row.row_key;
}

export function marketCategoryForRecipeRow(row: ProfessionalEstimateRecipeRow): MarketMaterialCategory {
  if (row.row_kind === "labor") return "labor";
  if (row.row_kind === "equipment") return "equipment";
  if (row.row_kind === "delivery") return "delivery";
  return categoryForGroup(row.row_domain);
}

function aliasesFor(seed: {
  material_key: string;
  visible_name_ru: string;
  base_unit: ProfessionalEstimateUnit;
}): string[] {
  const readableKey = seed.material_key.replace(/^market_/, "").replace(/_/g, " ");
  return [
    seed.visible_name_ru,
    readableKey,
    `${seed.visible_name_ru} ${seed.base_unit}`,
    `${readableKey} ${seed.base_unit}`,
  ];
}

function forbiddenGroups(compatible: readonly ProfessionalGroupKey[]): ProfessionalGroupKey[] {
  return ALL_WORK_GROUPS.filter((group) => !compatible.includes(group));
}

function itemFromTemplateRow(row: ProfessionalEstimateRecipeRow): MarketMaterialMasterItem {
  const materialKey = marketMaterialKeyForRecipeRow(row);
  return {
    material_key: materialKey,
    visible_name_ru: row.visible_name_ru,
    category: marketCategoryForRecipeRow(row),
    base_unit: row.unit,
    aliases_ru: aliasesFor({
      material_key: materialKey,
      visible_name_ru: row.visible_name_ru,
      base_unit: row.unit,
    }),
    compatible_work_groups: [row.row_domain],
    forbidden_work_groups: forbiddenGroups([row.row_domain]),
    active: true,
    source: "professional_template",
    fake_green_claimed: false,
  };
}

function itemFromMandatoryFamily(seed: MandatoryFamilySeed): MarketMaterialMasterItem {
  return {
    material_key: seed.material_key,
    visible_name_ru: seed.visible_name_ru,
    category: seed.category,
    base_unit: seed.base_unit,
    aliases_ru: aliasesFor(seed),
    compatible_work_groups: [...seed.compatible_work_groups],
    forbidden_work_groups: forbiddenGroups(seed.compatible_work_groups),
    active: true,
    source: "mandatory_family",
    fake_green_claimed: false,
  };
}

function templateRows(): ProfessionalEstimateRecipeRow[] {
  return PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG.flatMap((template) => [
    ...template.material_recipe_rows,
    ...template.labor_rows,
    ...template.equipment_rows,
    ...template.delivery_rows,
    ...template.overhead_rows,
  ]);
}

function buildMaterialMasterCatalog(): MarketMaterialMasterItem[] {
  const byKey = new Map<string, MarketMaterialMasterItem>();
  for (const row of templateRows()) {
    const item = itemFromTemplateRow(row);
    byKey.set(item.material_key, item);
  }
  for (const seed of MANDATORY_MARKET_MATERIAL_FAMILIES) {
    if (!byKey.has(seed.material_key)) byKey.set(seed.material_key, itemFromMandatoryFamily(seed));
  }
  return [...byKey.values()].sort((left, right) => left.material_key.localeCompare(right.material_key));
}

export const MARKET_MATERIAL_MASTER_CATALOG: readonly MarketMaterialMasterItem[] =
  Object.freeze(buildMaterialMasterCatalog());

export const MARKET_MATERIAL_MASTER_BY_KEY: ReadonlyMap<string, MarketMaterialMasterItem> =
  new Map(MARKET_MATERIAL_MASTER_CATALOG.map((item) => [item.material_key, item]));

export function getMarketMaterialMasterItem(materialKey: string): MarketMaterialMasterItem | null {
  return MARKET_MATERIAL_MASTER_BY_KEY.get(materialKey) ?? null;
}

export function requiredMarketMaterialFamilyNames(): string[] {
  return MANDATORY_MARKET_MATERIAL_FAMILIES.map((item) => item.visible_name_ru);
}
