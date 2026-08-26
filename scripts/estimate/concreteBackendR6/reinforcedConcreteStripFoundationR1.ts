import {
  compileFormulaGraph,
  evaluateFormulaGraph,
  type CompiledFormulaGraph,
} from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  evaluateInclusionGraph,
  type InclusionGraphAst,
} from "../../../src/lib/estimate/backendPlatform/inclusionGraph";

export const REAL_PROFESSIONAL_ESTIMATES_R1_SPEC_SHA256 =
  "558f7391033f1fbc30d844cd4d151c680f8d625a1f108ef828450d16e3fc5b30" as const;
export const REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256 =
  "b9373689e495a8d7e0883818371022eb792800baf10d19340f50c1aace08d986" as const;

export type StripFoundationScope = "full_reinforced_structure" | "placement_only";
export type StripFoundationCategory = "material" | "construction_work" | "machine_equipment" | "delivery";
export type StripFoundationInputValue = string | number | boolean;

export type StripFoundationNormSource = {
  sourceKey: string;
  documentCode: string;
  officialUrl: string;
  artifactSha256: string | null;
  tableCode: string | null;
  rateCode: string | null;
  meter: string;
  pdfPage: number | null;
  locator: string;
};

export type StripFoundationInput = {
  parameterId: string;
  titleRu: string;
  valueType: "decimal" | "boolean" | "enum";
  unitId: string | null;
  visibilityRole: "USER_INPUT" | "INTERNAL_ONLY";
  required: boolean;
  defaultValue: StripFoundationInputValue | null;
  requiredWhen?: InclusionGraphAst;
  choices?: readonly string[];
  guideRu: string;
  sourceRole: "PROJECT_DOCUMENTATION" | "SELECTED_EQUIPMENT_PASSPORT" | "OFFICIAL_NORM";
};

export type StripFoundationBoqRow = {
  rowId: string;
  rateItemId: string;
  semanticOwnerId: string;
  resourceId: string;
  category: StripFoundationCategory;
  canonicalRuName: string;
  normalizedUom: string;
  formulaId: string;
  applicabilityExpression: InclusionGraphAst;
  normSource: StripFoundationNormSource;
  costOwner: "rate_item" | "resource";
  includedInParentRate: boolean;
  visibility: "customer" | "expanded_resource";
  procurementMode: "buy" | "rent" | "transport" | "none";
  cargo?: {
    cargoRu: string;
    vehicleRu: string;
    physicalQuantityFormulaId: string;
    physicalQuantityUom: "m3" | "t";
    distanceParameterId: string;
  };
};

export type StripFoundationCompiledRow = StripFoundationBoqRow & {
  evaluatedQuantity: string;
  canonicalRuName: string;
  cargoQuantity?: string;
  distanceKm?: string;
};

type Formula = CompiledFormulaGraph & { formulaId: string; outputUnitId: string };

const KRER6_SHA256 = "45c065fb0e35586948fdb06cd21fe331358e2c454c25a4dc83d4a686bf9f3e4b";
const KRER6_URL = "https://minstroy.gov.kg/ru/kyzmat/422/show";
const KRER_GUIDE_URL = "https://minstroy.gov.kg/ru/kyzmat/359/show";
const SN52_URL = "https://cbd.minjust.gov.kg/52-1632/edition/12062/ru";

const trueAst: InclusionGraphAst = Object.freeze({ kind: "literal", value: true });
const eq = (parameterId: string, value: StripFoundationInputValue): InclusionGraphAst => ({ kind: "equals", parameterId, value });
const gt = (parameterId: string, value: number): InclusionGraphAst => ({ kind: "greater_than", parameterId, value });
const and = (...operands: InclusionGraphAst[]): InclusionGraphAst => ({ kind: "and", operands });

const fullScope = eq("scope_variant", "full_reinforced_structure");
const readyMix = eq("concrete_supply", "ready_mix");
const preparation = and(fullScope, eq("preparation_included", true));
const pump = eq("placement_method", "pump");
const craneBucket = eq("placement_method", "crane_bucket");
const membraneCuring = eq("curing_method", "membrane");
const winter = eq("winter_mode", true);
const siteFabricatedRebar = and(fullScope, eq("reinforcement_fabrication", "site_fabricated"));
const separateDelivery = eq("delivery_separately_priced", true);

const KRER_060100109: StripFoundationNormSource = Object.freeze({
  sourceKey: "krer_06_2015",
  documentCode: "КРЕР 81-02-06-2015",
  officialUrl: KRER6_URL,
  artifactSha256: KRER6_SHA256,
  tableCode: "06-01-001",
  rateCode: "06-01-001-09",
  meter: "100 м³ железобетона в деле",
  pdfPage: 18,
  locator: "таблица 06-01-001, железобетонные фундаменты общего назначения объёмом более 25 м³, графа 09",
});

const KRER_GUIDE: StripFoundationNormSource = Object.freeze({
  sourceKey: "krer_application_guide_2015",
  documentCode: "Указания по применению КРЕР",
  officialUrl: KRER_GUIDE_URL,
  artifactSha256: null,
  tableCode: null,
  rateCode: null,
  meter: "применимость расценки",
  pdfPage: null,
  locator: "официальные указания по применению КРЕР",
});

const SN52: StripFoundationNormSource = Object.freeze({
  sourceKey: "sn_kr_52_02_2024",
  documentCode: "СН КР 52-02:2024",
  officialUrl: SN52_URL,
  artifactSha256: null,
  tableCode: null,
  rateCode: null,
  meter: "проектная конструкция",
  pdfPage: null,
  locator: "бетонные и железобетонные конструкции",
});

const projectSource = (locator: string): StripFoundationNormSource => ({
  sourceKey: "project_documentation",
  documentCode: "Рабочая документация",
  officialUrl: "",
  artifactSha256: null,
  tableCode: null,
  rateCode: null,
  meter: "проектная величина",
  pdfPage: null,
  locator,
});

const equipmentSource = (locator: string): StripFoundationNormSource => ({
  sourceKey: "selected_equipment_passport",
  documentCode: "Паспорт выбранной машины",
  officialUrl: "",
  artifactSha256: null,
  tableCode: null,
  rateCode: null,
  meter: "паспортная производительность",
  pdfPage: null,
  locator,
});

function input(
  parameterId: string,
  titleRu: string,
  unitId: string | null,
  guideRu: string,
  options: Partial<Pick<StripFoundationInput, "valueType" | "visibilityRole" | "required" | "defaultValue" | "requiredWhen" | "choices" | "sourceRole">> = {},
): StripFoundationInput {
  return {
    parameterId,
    titleRu,
    valueType: options.valueType ?? "decimal",
    unitId,
    visibilityRole: options.visibilityRole ?? "USER_INPUT",
    required: options.required ?? true,
    defaultValue: options.defaultValue ?? null,
    ...(options.requiredWhen ? { requiredWhen: options.requiredWhen } : {}),
    ...(options.choices ? { choices: options.choices } : {}),
    guideRu,
    sourceRole: options.sourceRole ?? "PROJECT_DOCUMENTATION",
  };
}

export const STRIP_FOUNDATION_INPUTS: readonly StripFoundationInput[] = Object.freeze([
  input("scope_variant", "Состав сметы", null, "Выберите полный конструктив или только укладку бетонной смеси.", { valueType: "enum", defaultValue: "full_reinforced_structure", choices: ["full_reinforced_structure", "placement_only"] }),
  input("total_axis_length_m", "Длина ленты", "m", "Общая длина по оси ленты, а не периметр здания с двойным учётом пересечений."),
  input("strip_width_m", "Ширина ленты", "m", "Укажите ширину ленты по проекту; не ширину здания."),
  input("strip_height_m", "Высота ленты", "m", "Укажите высоту бетонной части ленты по проекту."),
  input("preparation_included", "Бетонная подготовка", null, "Включите только если подготовка входит в выбранный scope.", { valueType: "boolean", defaultValue: true }),
  input("preparation_thickness_m", "Толщина подготовки", "m", "Укажите проектную толщину подготовки.", { requiredWhen: preparation }),
  input("concrete_class", "Класс бетона", null, "Укажите класс бетона по рабочей документации.", { valueType: "enum", defaultValue: "B25", choices: ["B15", "B20", "B25", "B30", "B35", "B40"] }),
  input("watertightness", "Водонепроницаемость", null, "Укажите марку W по проекту.", { valueType: "enum", defaultValue: "W6", choices: ["W2", "W4", "W6", "W8", "W10", "W12"] }),
  input("frost_resistance", "Морозостойкость", null, "Укажите марку F по проекту.", { valueType: "enum", defaultValue: "F150", choices: ["F50", "F75", "F100", "F150", "F200", "F300"] }),
  input("mobility", "Подвижность смеси", null, "Укажите подвижность бетонной смеси по проекту и способу подачи.", { valueType: "enum", defaultValue: "P4", choices: ["P2", "P3", "P4", "P5"] }),
  input("concrete_order_allowance_percent", "Запас бетонной смеси", "percent", "Явное допущение конкретного расчёта; не универсальная норма.", { defaultValue: 0 }),
  input("reinforcement_mass_t", "Масса арматуры", "t", "Итоговая масса по проектной ведомости расхода стали.", { requiredWhen: fullScope }),
  input("binding_wire_mass_kg", "Масса вязальной проволоки", "kg", "По ведомости армирования или принятой норме конкретной расценки.", { requiredWhen: fullScope }),
  input("reinforcement_fabrication", "Подготовка арматуры", null, "Готовые каркасы и изготовление на объекте взаимоисключающие.", { valueType: "enum", defaultValue: "ready_cages", choices: ["ready_cages", "site_fabricated"] }),
  input("formwork_sides", "Стороны опалубки", null, "Для обычной ленты укажите число опалубливаемых боковых сторон.", { defaultValue: 2 }),
  input("formwork_transport_mass_t", "Транспортная масса опалубки", "t", "Масса выбранной щитовой системы по комплектовочной ведомости.", { requiredWhen: fullScope }),
  input("concrete_supply", "Источник бетонной смеси", null, "Товарный бетон и приготовление на площадке взаимоисключающие.", { valueType: "enum", defaultValue: "ready_mix", choices: ["ready_mix"] }),
  input("placement_method", "Способ подачи бетона", null, "Насос и кран с бадьёй взаимоисключающие.", { valueType: "enum", defaultValue: "pump", choices: ["pump", "crane_bucket", "direct_chute"] }),
  input("curing_method", "Способ ухода за бетоном", null, "В расчёт входит только выбранный способ ухода.", { valueType: "enum", defaultValue: "membrane", choices: ["membrane", "water"] }),
  input("winter_mode", "Зимний режим", null, "Зимний модуль включается только при подтверждённой технологии прогрева.", { valueType: "boolean", defaultValue: false }),
  input("winter_heating_cable_length_m", "Длина прогревочного кабеля", "m", "Укажите по утверждённой схеме электропрогрева.", { requiredWhen: winter }),
  input("pump_productivity_m3_h", "Производительность бетононасоса", "m3_per_hour", "Берётся из паспорта выбранного бетононасоса и не показывается как пользовательский вопрос.", { visibilityRole: "INTERNAL_ONLY", requiredWhen: pump, sourceRole: "SELECTED_EQUIPMENT_PASSPORT" }),
  input("crane_bucket_productivity_m3_h", "Производительность крана с бадьёй", "m3_per_hour", "Берётся из технологической карты и паспорта выбранного крана.", { visibilityRole: "INTERNAL_ONLY", requiredWhen: craneBucket, sourceRole: "SELECTED_EQUIPMENT_PASSPORT" }),
  input("rebar_cutting_productivity_t_h", "Производительность станка резки", "t_per_hour", "Берётся из паспорта выбранного станка резки и не показывается как пользовательский вопрос.", { visibilityRole: "INTERNAL_ONLY", requiredWhen: siteFabricatedRebar, sourceRole: "SELECTED_EQUIPMENT_PASSPORT" }),
  input("rebar_bending_productivity_t_h", "Производительность станка гибки", "t_per_hour", "Берётся из паспорта выбранного станка гибки и не показывается как пользовательский вопрос.", { visibilityRole: "INTERNAL_ONLY", requiredWhen: siteFabricatedRebar, sourceRole: "SELECTED_EQUIPMENT_PASSPORT" }),
  input("heating_transformer_productivity_m3_h", "Производительность комплекта прогрева", "m3_per_hour", "Берётся из утверждённой схемы прогрева и паспорта оборудования.", { visibilityRole: "INTERNAL_ONLY", requiredWhen: winter, sourceRole: "SELECTED_EQUIPMENT_PASSPORT" }),
  input("delivery_separately_priced", "Доставка отдельной строкой", null, "Отключите, если доставка уже включена в цену материала.", { valueType: "boolean", defaultValue: true }),
  input("concrete_delivery_distance_km", "Доставка бетонной смеси", "km", "Маршрут автобетоносмесителя от РБУ до объекта.", { defaultValue: 0 }),
  input("reinforcement_delivery_distance_km", "Доставка арматуры", "km", "Маршрут бортового автомобиля от поставщика до объекта.", { defaultValue: 0 }),
  input("formwork_delivery_distance_km", "Доставка опалубки", "km", "Маршрут бортового автомобиля с выбранной опалубочной системой.", { defaultValue: 0 }),
]);

function formula(formulaId: string, outputUnitId: string, source: string): Formula {
  return { formulaId, outputUnitId, ...compileFormulaGraph(source) };
}

export const STRIP_FOUNDATION_FORMULAS: readonly Formula[] = Object.freeze([
  formula("foundation_plan_area", "m2", "total_axis_length_m * strip_width_m"),
  formula("concrete_net", "m3", "total_axis_length_m * strip_width_m * strip_height_m"),
  formula("concrete_order", "m3", "total_axis_length_m * strip_width_m * strip_height_m * (1 + concrete_order_allowance_percent / 100)"),
  formula("preparation_volume", "m3", "total_axis_length_m * strip_width_m * preparation_thickness_m"),
  formula("formwork_contact_area", "m2", "total_axis_length_m * strip_height_m * formwork_sides"),
  formula("curing_top_area", "m2", "total_axis_length_m * strip_width_m"),
  formula("reinforcement_mass", "t", "reinforcement_mass_t"),
  formula("binding_wire_mass", "kg", "binding_wire_mass_kg"),
  formula("formwork_transport_mass", "t", "formwork_transport_mass_t"),
  formula("pump_machine_hours", "machine_hour", "total_axis_length_m * strip_width_m * strip_height_m / pump_productivity_m3_h"),
  formula("crane_bucket_machine_hours", "machine_hour", "total_axis_length_m * strip_width_m * strip_height_m / crane_bucket_productivity_m3_h"),
  formula("vibrator_machine_hours", "machine_hour", "total_axis_length_m * strip_width_m * strip_height_m * 0.266"),
  formula("rebar_cutting_machine_hours", "machine_hour", "reinforcement_mass_t / rebar_cutting_productivity_t_h"),
  formula("rebar_bending_machine_hours", "machine_hour", "reinforcement_mass_t / rebar_bending_productivity_t_h"),
  formula("winter_heating_cable", "m", "winter_heating_cable_length_m"),
  formula("winter_heating_machine_hours", "machine_hour", "total_axis_length_m * strip_width_m * strip_height_m / heating_transformer_productivity_m3_h"),
  formula("concrete_delivery", "m3_km", "total_axis_length_m * strip_width_m * strip_height_m * (1 + concrete_order_allowance_percent / 100) * concrete_delivery_distance_km"),
  formula("reinforcement_delivery", "t_km", "reinforcement_mass_t * reinforcement_delivery_distance_km"),
  formula("formwork_delivery", "t_km", "formwork_transport_mass_t * formwork_delivery_distance_km"),
]);

function row(
  rowId: string,
  category: StripFoundationCategory,
  canonicalRuName: string,
  normalizedUom: string,
  formulaId: string,
  applicabilityExpression: InclusionGraphAst,
  normSource: StripFoundationNormSource,
  options: Partial<Pick<StripFoundationBoqRow, "rateItemId" | "costOwner" | "includedInParentRate" | "visibility" | "procurementMode" | "cargo">> = {},
): StripFoundationBoqRow {
  return {
    rowId,
    rateItemId: options.rateItemId ?? KRER_060100109.rateCode!,
    semanticOwnerId: `r6-concrete:strip-foundation:${rowId}`,
    resourceId: `r6-resource:${rowId}`,
    category,
    canonicalRuName,
    normalizedUom,
    formulaId,
    applicabilityExpression,
    normSource,
    costOwner: options.costOwner ?? "resource",
    includedInParentRate: options.includedInParentRate ?? false,
    visibility: options.visibility ?? "customer",
    procurementMode: options.procurementMode ?? (category === "construction_work" ? "none" : category === "machine_equipment" ? "rent" : category === "delivery" ? "transport" : "buy"),
    ...(options.cargo ? { cargo: options.cargo } : {}),
  };
}

export const STRIP_FOUNDATION_ROWS: readonly StripFoundationBoqRow[] = Object.freeze([
  row("main_concrete", "material", "Бетонная смесь проектного класса", "m3", "concrete_order", and(fullScope, readyMix), projectSource("класс, W/F, подвижность и объём заказа")),
  row("preparation_concrete", "material", "Бетонная смесь для подготовки", "m3", "preparation_volume", preparation, projectSource("бетонная подготовка и её класс")),
  row("reinforcement", "material", "Арматурная сталь по проектной ведомости", "t", "reinforcement_mass", fullScope, projectSource("ведомость расхода стали")),
  row("binding_wire", "material", "Проволока вязальная отожжённая", "kg", "binding_wire_mass", fullScope, projectSource("ведомость армирования")),
  row("formwork_system", "material", "Щитовая опалубочная система", "m2", "formwork_contact_area", fullScope, projectSource("выбранная опалубочная система")),
  row("curing_membrane", "material", "Плёнка для ухода за бетоном", "m2", "curing_top_area", membraneCuring, SN52),
  row("winter_heating_cable", "material", "Прогревочный кабель для бетона", "m", "winter_heating_cable", winter, projectSource("утверждённая схема электропрогрева")),

  row("preparation_work", "construction_work", "Устройство бетонной подготовки", "m3", "preparation_volume", preparation, KRER_060100109),
  row("formwork_install", "construction_work", "Монтаж щитовой опалубки", "m2", "formwork_contact_area", fullScope, KRER_060100109),
  row("reinforcement_install", "construction_work", "Монтаж арматурного каркаса", "t", "reinforcement_mass", fullScope, KRER_060100109),
  row("reinforcement_fabrication", "construction_work", "Изготовление арматурных каркасов на объекте", "t", "reinforcement_mass", siteFabricatedRebar, projectSource("ведомость армирования и технологическая карта")),
  row("concrete_placement", "construction_work", "Укладка и уплотнение бетонной смеси", "m3", "concrete_net", trueAst, KRER_060100109),
  row("surface_finish", "construction_work", "Обработка верхней поверхности бетона", "m2", "curing_top_area", trueAst, SN52),
  row("curing_work", "construction_work", "Уход за бетоном", "m2", "curing_top_area", trueAst, SN52),
  row("formwork_remove", "construction_work", "Распалубка щитовой опалубки", "m2", "formwork_contact_area", fullScope, KRER_GUIDE),
  row("winter_heating_work", "construction_work", "Электропрогрев бетона", "m3", "concrete_net", winter, projectSource("утверждённая схема зимнего бетонирования")),

  row("concrete_pump", "machine_equipment", "Автобетононасос", "machine_hour", "pump_machine_hours", pump, equipmentSource("производительность и требуемый вылет стрелы"), { costOwner: "rate_item", includedInParentRate: true, visibility: "expanded_resource" }),
  row("crane_bucket", "machine_equipment", "Автомобильный кран с бадьёй", "machine_hour", "crane_bucket_machine_hours", craneBucket, equipmentSource("грузоподъёмность крана, объём бадьи и цикл подачи"), { costOwner: "rate_item", includedInParentRate: true, visibility: "expanded_resource" }),
  row("deep_vibrator", "machine_equipment", "Глубинный вибратор", "machine_hour", "vibrator_machine_hours", trueAst, KRER_060100109, { costOwner: "rate_item", includedInParentRate: true, visibility: "expanded_resource" }),
  row("rebar_cutting_machine", "machine_equipment", "Станок резки арматуры", "machine_hour", "rebar_cutting_machine_hours", siteFabricatedRebar, equipmentSource("производительность станка резки")),
  row("rebar_bending_machine", "machine_equipment", "Станок гибки арматуры", "machine_hour", "rebar_bending_machine_hours", siteFabricatedRebar, equipmentSource("производительность станка гибки")),
  row("heating_transformer", "machine_equipment", "Трансформатор для электропрогрева бетона", "machine_hour", "winter_heating_machine_hours", winter, equipmentSource("мощность и схема подключения прогревочного комплекта")),

  row("concrete_delivery", "delivery", "Доставка бетонной смеси автобетоносмесителями", "m3_km", "concrete_delivery", and(separateDelivery, fullScope, readyMix, gt("concrete_delivery_distance_km", 0)), projectSource("поставщик РБУ, маршрут и транспортная схема"), {
    cargo: { cargoRu: "бетонная смесь", vehicleRu: "автобетоносмеситель", physicalQuantityFormulaId: "concrete_order", physicalQuantityUom: "m3", distanceParameterId: "concrete_delivery_distance_km" },
  }),
  row("reinforcement_delivery", "delivery", "Доставка арматурной стали бортовым автомобилем", "t_km", "reinforcement_delivery", and(separateDelivery, fullScope, gt("reinforcement_delivery_distance_km", 0)), projectSource("поставщик арматуры, маршрут и транспортная схема"), {
    cargo: { cargoRu: "арматурная сталь", vehicleRu: "бортовой автомобиль", physicalQuantityFormulaId: "reinforcement_mass", physicalQuantityUom: "t", distanceParameterId: "reinforcement_delivery_distance_km" },
  }),
  row("formwork_delivery", "delivery", "Доставка щитовой опалубки бортовым автомобилем", "t_km", "formwork_delivery", and(separateDelivery, fullScope, gt("formwork_delivery_distance_km", 0), gt("formwork_transport_mass_t", 0)), projectSource("комплектовочная ведомость опалубки, маршрут и транспортная схема"), {
    cargo: { cargoRu: "щитовая опалубка", vehicleRu: "бортовой автомобиль", physicalQuantityFormulaId: "formwork_transport_mass", physicalQuantityUom: "t", distanceParameterId: "formwork_delivery_distance_km" },
  }),
]);

export const REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT = Object.freeze({
  definitionId: "r6-concrete:reinforced-concrete-strip-foundation",
  domainId: "concrete",
  canonicalRuName: "Устройство монолитного железобетонного ленточного фундамента",
  searchAliases: ["ленточный фундамент", "железобетонная лента", "монолитный ленточный фундамент"],
  includedResults: ["бетонная лента", "армирование", "опалубка", "укладка и уход", "выбранные машины", "конкретные грузопотоки"],
  excludedDomains: ["свайные работы", "демонтаж бетона", "резка бетона", "плиты", "колодцы", "лотки", "шахты"],
  allowedScopes: ["full_reinforced_structure", "placement_only"] as const,
  technologyChoices: ["ready_mix", "pump_or_crane_bucket", "membrane_or_water_curing", "warm_or_winter"] as const,
  inputSchema: STRIP_FOUNDATION_INPUTS,
  formulas: STRIP_FOUNDATION_FORMULAS,
  rateItems: [KRER_060100109],
  rows: STRIP_FOUNDATION_ROWS,
  contentStatus: "reviewed" as const,
  reviewedBy: "canonical-backend-contract",
  reviewedAt: "2026-08-18",
});

function resolveInputs(supplied: Readonly<Record<string, StripFoundationInputValue>>): Record<string, StripFoundationInputValue> {
  const values: Record<string, StripFoundationInputValue> = {};
  for (const parameter of STRIP_FOUNDATION_INPUTS) {
    const combined = { ...values, ...supplied };
    const applicable = !parameter.requiredWhen || evaluateInclusionGraph(parameter.requiredWhen, combined);
    const value = supplied[parameter.parameterId] ?? parameter.defaultValue;
    if (parameter.required && applicable && value == null) throw new Error(`STRIP_FOUNDATION_MISSING_INPUT:${parameter.parameterId}`);
    if (value != null) {
      if (typeof value === "number" && value < 0) throw new Error(`STRIP_FOUNDATION_NEGATIVE_INPUT:${parameter.parameterId}`);
      if (parameter.choices && !parameter.choices.includes(String(value))) throw new Error(`STRIP_FOUNDATION_INVALID_CHOICE:${parameter.parameterId}`);
      values[parameter.parameterId] = value;
    }
  }
  return values;
}

function renderedMaterialName(row: StripFoundationBoqRow, values: Readonly<Record<string, StripFoundationInputValue>>): string {
  if (row.rowId !== "main_concrete") return row.canonicalRuName;
  return `Бетонная смесь ${String(values.concrete_class)}, ${String(values.watertightness)}, ${String(values.frost_resistance)}, ${String(values.mobility)}`;
}

function formulaParameterValues(
  values: Readonly<Record<string, StripFoundationInputValue>>,
): Record<string, string | number | bigint> {
  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, string | number] => typeof entry[1] !== "boolean"),
  );
}

export function compileStripFoundationEstimate(
  supplied: Readonly<Record<string, StripFoundationInputValue>>,
): readonly StripFoundationCompiledRow[] {
  const values = resolveInputs(supplied);
  const numericValues = formulaParameterValues(values);
  const formulaById = new Map(STRIP_FOUNDATION_FORMULAS.map((item) => [item.formulaId, item]));
  const semanticOwners = new Set<string>();
  return STRIP_FOUNDATION_ROWS
    .filter((candidate) => evaluateInclusionGraph(candidate.applicabilityExpression, values))
    .map((candidate) => {
      if (semanticOwners.has(candidate.semanticOwnerId)) throw new Error(`STRIP_FOUNDATION_DUPLICATE_OWNER:${candidate.semanticOwnerId}`);
      semanticOwners.add(candidate.semanticOwnerId);
      const target = formulaById.get(candidate.formulaId);
      if (!target) throw new Error(`STRIP_FOUNDATION_MISSING_FORMULA:${candidate.formulaId}`);
      const evaluatedQuantity = evaluateFormulaGraph(target, numericValues);
      if (Number(evaluatedQuantity) <= 0) throw new Error(`STRIP_FOUNDATION_NON_POSITIVE_QUANTITY:${candidate.rowId}`);
      const cargoFormula = candidate.cargo ? formulaById.get(candidate.cargo.physicalQuantityFormulaId) : null;
      return {
        ...candidate,
        canonicalRuName: renderedMaterialName(candidate, values),
        evaluatedQuantity,
        ...(candidate.cargo && cargoFormula
          ? {
            cargoQuantity: evaluateFormulaGraph(cargoFormula, numericValues),
            distanceKm: String(values[candidate.cargo.distanceParameterId]),
          }
          : {}),
      };
    });
}

export const STRIP_FOUNDATION_GOLD_INPUT: Readonly<Record<string, StripFoundationInputValue>> = Object.freeze({
  scope_variant: "full_reinforced_structure",
  total_axis_length_m: 40,
  strip_width_m: 0.5,
  strip_height_m: 1.5,
  preparation_included: true,
  preparation_thickness_m: 0.1,
  concrete_class: "B25",
  watertightness: "W6",
  frost_resistance: "F150",
  mobility: "P4",
  concrete_order_allowance_percent: 2,
  reinforcement_mass_t: 2.4,
  binding_wire_mass_kg: 28.8,
  reinforcement_fabrication: "ready_cages",
  formwork_sides: 2,
  formwork_transport_mass_t: 12,
  concrete_supply: "ready_mix",
  placement_method: "pump",
  curing_method: "membrane",
  winter_mode: false,
  pump_productivity_m3_h: 45,
  delivery_separately_priced: true,
  concrete_delivery_distance_km: 18,
  reinforcement_delivery_distance_km: 18,
  formwork_delivery_distance_km: 18,
});
