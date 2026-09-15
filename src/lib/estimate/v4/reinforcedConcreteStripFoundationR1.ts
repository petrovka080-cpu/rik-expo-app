import {
  compileFormulaGraph,
  evaluateFormulaGraph,
  type CompiledFormulaGraph,
} from "../backendPlatform/formulaGraph";
import {
  evaluateInclusionGraph,
  type InclusionGraphAst,
} from "../backendPlatform/inclusionGraph";
import {
  NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1,
  type AppliedProfessionalPhysicalNormResolutionV1,
} from "./domainFactory/professionalPhysicalNormApplicabilityV1";
import {
  REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
  REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
  REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA,
} from "./domainFactory/reinforcementBarSchedulePhysicalNormV1";
import type { ProfessionalParameterValueV4 } from "./professionalProjectAssemblyV4";

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
  valueType: "decimal" | "boolean" | "enum" | "text";
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
  titleSpecificationParameterIds?: readonly string[];
  titleSpecificationMode?: "APPEND" | "REPLACE";
  titleSpecificationSeparator?: " — " | " ";
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
  professionalPhysicalNormApplicabilityV1?: AppliedProfessionalPhysicalNormResolutionV1;
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
const or = (...operands: InclusionGraphAst[]): InclusionGraphAst => ({ kind: "or", operands });

const fullScope = eq("scope_variant", "full_reinforced_structure");
const readyMix = eq("concrete_supply", "ready_mix");
const nrmcaReadyMixOrder = eq("product_profile_id", NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID);
const reinforcementBarSchedule = eq(
  "reinforcement_product_profile_id",
  REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
);
const preparation = and(fullScope, eq("preparation_included", true));
const pump = eq("placement_method", "pump");
const craneBucket = eq("placement_method", "crane_bucket");
const membraneCuring = eq("curing_method", "membrane");
const winter = eq("winter_mode", true);
const siteFabricatedRebar = and(fullScope, eq("reinforcement_fabrication", "site_fabricated"));
const separateDelivery = eq("delivery_separately_priced", true);
const groundworks = and(fullScope, eq("groundworks_included", true));
const bedding = and(fullScope, eq("foundation_bedding_included", true));
const sandBedding = and(bedding, eq("foundation_bedding_type", "sand"));
const crushedStoneBedding = and(bedding, eq("foundation_bedding_type", "crushed_stone"));
const waterproofing = and(fullScope, eq("waterproofing_included", true));
const coatingWaterproofing = and(waterproofing, eq("waterproofing_system", "bituminous_coating"));
const membraneWaterproofing = and(waterproofing, eq("waterproofing_system", "sheet_membrane"));
const backfill = and(fullScope, eq("backfill_included", true));
const disposal = and(groundworks, eq("soil_disposal_included", true));
const compaction = or(bedding, backfill);

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

const NRMCA_CIP31_READY_MIX_ORDER_SOURCE: StripFoundationNormSource = Object.freeze({
  sourceKey: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  documentCode: "NRMCA CIP 31",
  officialUrl: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_url,
  artifactSha256: null,
  tableCode: null,
  rateCode: null,
  meter: "м³ товарного бетона по проектному объёму и явно выбранному резерву 4–10%",
  pdfPage: 2,
  locator: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.exact_locator,
});

const REINFORCEMENT_BAR_SCHEDULE_SOURCE: StripFoundationNormSource = Object.freeze({
  sourceKey: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
  documentCode: "FHWA-HIF-16-026 / RICS NRM 2",
  officialUrl: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.source_url,
  artifactSha256: null,
  tableCode: "FHWA-HIF-16-026 Table 3",
  rateCode: null,
  meter: "т по утверждённой ведомости стержней; исходная таблица массы — кг/м",
  pdfPage: 22,
  locator: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.exact_locator,
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
  input("product_profile_id", "Правило заказа бетона", null, "Выберите NRMCA CIP 31 только для заказа товарного бетона по подтверждённому проектному объёму и явно обоснованному резерву 4–10%.", { valueType: "enum", required: false, choices: [NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID] }),
  input("plan_volume_calculation_reference", "Расчёт проектного объёма", null, "Укажите лист рабочей документации или расчёт, по которому длина, ширина и высота дают проектный объём бетона.", { valueType: "text", requiredWhen: nrmcaReadyMixOrder }),
  input("mix_design_or_project_specification_reference", "Спецификация бетонной смеси", null, "Укажите ссылку на проектный состав, спецификацию или согласованную карточку подбора смеси.", { valueType: "text", requiredWhen: nrmcaReadyMixOrder }),
  input("mixture_designation", "Обозначение бетонной смеси", null, "Укажите точное обозначение заказываемой смеси из проекта или подтверждения производителя.", { valueType: "text", requiredWhen: nrmcaReadyMixOrder }),
  input("placement_location", "Место укладки бетона", null, "Укажите конкретную захватку, оси или участок фундамента, для которого оформляется заказ.", { valueType: "text", requiredWhen: nrmcaReadyMixOrder }),
  input("contingency_selection_justification", "Обоснование запаса", null, "Поясните выбор резерва от 4 до 10 процентов с учётом опалубки, основания, способа подачи и риска потерь.", { valueType: "text", requiredWhen: nrmcaReadyMixOrder }),
  input("delivery_schedule_and_truck_capacity", "График и вместимость миксеров", null, "Укажите согласованный график поставки и вместимость автобетоносмесителей для выбранной захватки.", { valueType: "text", requiredWhen: nrmcaReadyMixOrder }),
  input("producer_order_confirmation", "Подтверждение заказа производителем", null, "Укажите номер или ссылку на подтверждение объёма, смеси, графика и шага заказа производителем.", { valueType: "text", requiredWhen: nrmcaReadyMixOrder }),
  input("estimator_approval_reference", "Подтверждение сметчика", null, "Укажите ссылку на проверку проектного объёма и выбранного резерва ответственным сметчиком.", { valueType: "text", requiredWhen: nrmcaReadyMixOrder }),
  input("reinforcement_mass_t", "Масса арматуры", "t", "Итоговая масса по проектной ведомости расхода стали.", { requiredWhen: fullScope }),
  input("reinforcement_product_profile_id", "Правило определения массы арматуры", null, "Выберите маршрут утверждённой ведомости стержней только при наличии полной ведомости, чертежа и выбранной стандартной таблицы массы.", { valueType: "enum", required: false, choices: [REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID] }),
  input("bar_bending_schedule_reference", "Ведомость стержней", null, "Укажите номер и ревизию утверждённой ведомости стержней.", { valueType: "text", requiredWhen: reinforcementBarSchedule }),
  input("structural_drawing_and_revision_reference", "Конструктивный чертёж армирования", null, "Укажите лист конструктивного чертежа и его ревизию.", { valueType: "text", requiredWhen: reinforcementBarSchedule }),
  input("bar_standard_and_grade", "Стандарт и класс арматуры", null, "Укажите стандарт и класс стали, которым соответствует выбранная таблица массы.", { valueType: "text", requiredWhen: reinforcementBarSchedule }),
  input("bar_size_designation", "Обозначение размера стержня", null, "Укажите обозначение размера стержня из выбранной стандартной таблицы.", { valueType: "text", requiredWhen: reinforcementBarSchedule }),
  input("nominal_diameter_mm", "Номинальный диаметр стержня", "mm", "Укажите номинальный диаметр для контроля выбранного обозначения.", { requiredWhen: reinforcementBarSchedule }),
  input("shape_straight_bent_curved_or_link", "Форма стержня", null, "Укажите STRAIGHT, BENT, CURVED или LINK и проектный код формы.", { valueType: "text", requiredWhen: reinforcementBarSchedule }),
  input("bar_count_and_cut_length_m", "Число стержней и длина резки", null, "Укажите подтверждённые число стержней и длину резки по ведомости.", { valueType: "text", requiredWhen: reinforcementBarSchedule }),
  input("selected_standard_mass_kg_per_m", "Масса погонного метра", "kg_per_m", "Укажите массу погонного метра из выбранной стандартной или продуктовой таблицы.", { requiredWhen: reinforcementBarSchedule }),
  input("laps_hooks_chairs_connectors_and_accessories_scope", "Нахлёсты, крюки и аксессуары", null, "Укажите, какие нахлёсты, крюки, фиксаторы и соединители уже учтены ведомостью.", { valueType: "text", requiredWhen: reinforcementBarSchedule }),
  input("fabrication_allowance_if_documented", "Документированный запас изготовления", null, "Укажите PROJECT_ALLOWANCE:… либо NONE:INCLUDED_IN_APPROVED_SCHEDULE.", { valueType: "text", requiredWhen: reinforcementBarSchedule }),
  input("supplier_bundle_or_length_constraints", "Ограничения поставки арматуры", null, "Укажите PROJECT_CONSTRAINT:… либо NONE:NO_AUTOMATIC_BUNDLE_ROUNDING.", { valueType: "text", requiredWhen: reinforcementBarSchedule }),
  input("reinforcement_estimator_approval_reference", "Подтверждение ведомости сметчиком", null, "Укажите ссылку на согласование массы и состава ведомости ответственным сметчиком.", { valueType: "text", requiredWhen: reinforcementBarSchedule }),
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
  input("groundworks_included", "Разработка грунта входит в состав", null, "Подтвердите по границе работ, включает ли смета разработку котлована или траншей под ленту.", { valueType: "boolean", defaultValue: null, requiredWhen: fullScope }),
  input("excavation_volume_m3", "Проектный объём разработки грунта", "m3", "Укажите объём по проектному профилю котлована или траншей с учётом откосов и рабочих зон.", { requiredWhen: groundworks }),
  input("excavator_productivity_m3_h", "Производительность экскаватора", "m3_per_hour", "Берётся из паспорта выбранного экскаватора и технологической схемы разработки грунта.", { visibilityRole: "INTERNAL_ONLY", requiredWhen: groundworks, sourceRole: "SELECTED_EQUIPMENT_PASSPORT" }),
  input("foundation_bedding_included", "Подушка основания входит в состав", null, "Подтвердите по проекту, нужна ли отдельная песчаная или щебёночная подушка под подготовкой.", { valueType: "boolean", defaultValue: null, requiredWhen: fullScope }),
  input("foundation_bedding_type", "Материал подушки основания", null, "Выберите только предусмотренный проектом материал подушки; песок и щебень взаимоисключающие.", { valueType: "enum", defaultValue: null, choices: ["sand", "crushed_stone"], requiredWhen: bedding }),
  input("foundation_bedding_volume_m3", "Объём материала подушки", "m3", "Укажите объём поставляемого материала по геометрии и принятому коэффициенту уплотнения.", { requiredWhen: bedding }),
  input("compactor_productivity_m3_h", "Производительность уплотняющей машины", "m3_per_hour", "Берётся из паспорта выбранной виброплиты или катка и технологической карты уплотнения.", { visibilityRole: "INTERNAL_ONLY", requiredWhen: compaction, sourceRole: "SELECTED_EQUIPMENT_PASSPORT" }),
  input("bedding_delivery_distance_km", "Расстояние доставки материала подушки", "km", "Маршрут от подтверждённого поставщика песка или щебня до объекта.", { requiredWhen: bedding }),
  input("waterproofing_included", "Гидроизоляция входит в состав", null, "Подтвердите по проектной границе работ необходимость гидроизоляции бетонной ленты.", { valueType: "boolean", defaultValue: null, requiredWhen: fullScope }),
  input("waterproofing_system", "Система гидроизоляции", null, "Выберите подтверждённую проектом обмазочную или листовую систему; одновременно они не применяются.", { valueType: "enum", defaultValue: null, choices: ["bituminous_coating", "sheet_membrane"], requiredWhen: waterproofing }),
  input("waterproofing_area_m2", "Площадь гидроизоляции", "m2", "Укажите площадь защищаемых граней по проектной геометрии без автоматического пересчёта из габаритов здания.", { requiredWhen: waterproofing }),
  input("backfill_included", "Обратная засыпка входит в состав", null, "Подтвердите по проектной границе работ необходимость обратной засыпки после устройства ленты.", { valueType: "boolean", defaultValue: null, requiredWhen: fullScope }),
  input("backfill_volume_m3", "Объём обратной засыпки", "m3", "Укажите проектный объём пригодного грунта или привозного материала после вычета конструкций.", { requiredWhen: backfill }),
  input("soil_disposal_included", "Вывоз лишнего грунта входит в состав", null, "Подтвердите баланс грунта и необходимость вывоза на разрешённое место размещения.", { valueType: "boolean", defaultValue: null, requiredWhen: groundworks }),
  input("excavated_soil_density_t_m3", "Плотность вывозимого грунта", "t/m3", "Укажите расчётную плотность по инженерным данным для перевода объёма в транспортную массу.", { requiredWhen: disposal }),
  input("soil_disposal_distance_km", "Расстояние вывоза грунта", "km", "Укажите подтверждённый маршрут от объекта до разрешённого места размещения грунта.", { requiredWhen: disposal }),
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
  formula("excavation_volume", "m3", "excavation_volume_m3"),
  formula("excavator_machine_hours", "machine_hour", "excavation_volume_m3 / excavator_productivity_m3_h"),
  formula("foundation_bedding_volume", "m3", "foundation_bedding_volume_m3"),
  formula("bedding_compactor_hours", "machine_hour", "foundation_bedding_volume_m3 / compactor_productivity_m3_h"),
  formula("bedding_delivery", "m3_km", "foundation_bedding_volume_m3 * bedding_delivery_distance_km"),
  formula("waterproofing_area", "m2", "waterproofing_area_m2"),
  formula("backfill_volume", "m3", "backfill_volume_m3"),
  formula("backfill_compactor_hours", "machine_hour", "backfill_volume_m3 / compactor_productivity_m3_h"),
  formula("soil_disposal", "t_km", "excavation_volume_m3 * excavated_soil_density_t_m3 * soil_disposal_distance_km"),
]);

function row(
  rowId: string,
  category: StripFoundationCategory,
  canonicalRuName: string,
  normalizedUom: string,
  formulaId: string,
  applicabilityExpression: InclusionGraphAst,
  normSource: StripFoundationNormSource,
  options: Partial<Pick<StripFoundationBoqRow, "rateItemId" | "costOwner" | "includedInParentRate" | "visibility" | "procurementMode" | "cargo" | "titleSpecificationParameterIds" | "titleSpecificationMode" | "titleSpecificationSeparator">> = {},
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
    ...(options.titleSpecificationParameterIds ? { titleSpecificationParameterIds: options.titleSpecificationParameterIds } : {}),
    ...(options.titleSpecificationMode ? { titleSpecificationMode: options.titleSpecificationMode } : {}),
    ...(options.titleSpecificationSeparator ? { titleSpecificationSeparator: options.titleSpecificationSeparator } : {}),
    ...(options.cargo ? { cargo: options.cargo } : {}),
  };
}

export const STRIP_FOUNDATION_ROWS: readonly StripFoundationBoqRow[] = Object.freeze([
  row("main_concrete", "material", "Бетонная смесь", "m3", "concrete_order", and(fullScope, readyMix), projectSource("класс, W/F, подвижность и объём заказа"), {
    titleSpecificationParameterIds: ["concrete_class", "watertightness", "frost_resistance", "mobility"],
    titleSpecificationMode: "APPEND",
    titleSpecificationSeparator: " ",
  }),
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

  row("bedding_sand", "material", "Песок для уплотнённой подушки основания", "m3", "foundation_bedding_volume", sandBedding, projectSource("проект основания, характеристики и объём песчаной подушки")),
  row("bedding_crushed_stone", "material", "Щебень проектной фракции для подушки основания", "m3", "foundation_bedding_volume", crushedStoneBedding, projectSource("проект основания, фракция и объём щебёночной подушки")),
  row("bituminous_waterproofing", "material", "Битумно-полимерная обмазочная гидроизоляция", "m2", "waterproofing_area", coatingWaterproofing, projectSource("проектная система и число слоёв гидроизоляции")),
  row("sheet_waterproofing_membrane", "material", "Листовая гидроизоляционная мембрана", "m2", "waterproofing_area", membraneWaterproofing, projectSource("проектная мембрана, нахлёсты и примыкания")),

  row("excavation_work", "construction_work", "Разработка грунта под фундаментную ленту", "m3", "excavation_volume", groundworks, projectSource("профиль выемки, категория грунта и проект производства работ")),
  row("foundation_bedding_work", "construction_work", "Устройство и послойное уплотнение подушки основания", "m3", "foundation_bedding_volume", bedding, projectSource("толщина слоёв и требуемый коэффициент уплотнения")),
  row("coating_waterproofing_work", "construction_work", "Нанесение обмазочной гидроизоляции фундаментной ленты", "m2", "waterproofing_area", coatingWaterproofing, projectSource("подготовка поверхности и проектное число слоёв")),
  row("sheet_waterproofing_work", "construction_work", "Монтаж листовой гидроизоляции фундаментной ленты", "m2", "waterproofing_area", membraneWaterproofing, projectSource("схема нахлёстов, примыканий и защитного слоя")),
  row("backfill_work", "construction_work", "Обратная засыпка пазух с послойным уплотнением", "m3", "backfill_volume", backfill, projectSource("баланс грунта, толщина слоёв и коэффициент уплотнения")),

  row("excavator", "machine_equipment", "Экскаватор для разработки грунта", "machine_hour", "excavator_machine_hours", groundworks, equipmentSource("тип ковша, категория грунта и паспортная производительность")),
  row("bedding_compactor", "machine_equipment", "Уплотняющая машина для подушки основания", "machine_hour", "bedding_compactor_hours", bedding, equipmentSource("тип материала, толщина слоя и паспортная производительность")),
  row("backfill_compactor", "machine_equipment", "Уплотняющая машина для обратной засыпки", "machine_hour", "backfill_compactor_hours", backfill, equipmentSource("тип грунта, толщина слоя и паспортная производительность")),

  row("bedding_material_delivery", "delivery", "Доставка материала подушки основания", "m3_km", "bedding_delivery", and(separateDelivery, bedding, gt("bedding_delivery_distance_km", 0)), projectSource("поставщик материала подушки и подтверждённый маршрут"), {
    cargo: { cargoRu: "материал подушки основания", vehicleRu: "автомобиль-самосвал", physicalQuantityFormulaId: "foundation_bedding_volume", physicalQuantityUom: "m3", distanceParameterId: "bedding_delivery_distance_km" },
  }),
  row("excavated_soil_disposal", "delivery", "Вывоз лишнего грунта автомобилями-самосвалами", "t_km", "soil_disposal", and(separateDelivery, disposal, gt("soil_disposal_distance_km", 0)), projectSource("баланс грунта, разрешённое место размещения и маршрут"), {
    cargo: { cargoRu: "излишний грунт", vehicleRu: "автомобиль-самосвал", physicalQuantityFormulaId: "excavation_volume", physicalQuantityUom: "m3", distanceParameterId: "soil_disposal_distance_km" },
  }),
]);

export const REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT = Object.freeze({
  definitionId: "r6-concrete:reinforced-concrete-strip-foundation",
  domainId: "concrete",
  canonicalRuName: "Устройство монолитного железобетонного ленточного фундамента",
  searchAliases: ["ленточный фундамент", "железобетонная лента", "монолитный ленточный фундамент"],
  includedResults: ["бетонная лента", "армирование", "опалубка", "укладка и уход", "условные земляные работы", "условная подушка основания", "условная гидроизоляция", "условная обратная засыпка", "выбранные машины", "конкретные грузопотоки"],
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

const NRMCA_CIP31_COMPILER_CAPTURED_AT = "2026-09-12T00:00:00.000Z";

function professionalProjectValue(
  parameterId: string,
  value: StripFoundationInputValue,
  unitId: string | null = null,
  sourceType: ProfessionalParameterValueV4["source_type"] = "USER_EXPLICIT",
): ProfessionalParameterValueV4 {
  return {
    value,
    unit_id: unitId,
    source_type: sourceType,
    source_id: `strip-foundation-project:${parameterId}`,
    captured_at: NRMCA_CIP31_COMPILER_CAPTURED_AT,
    confidence: "high",
    applicability: "Explicit strip-foundation project input admitted by the canonical backend compiler",
  };
}

function resolveNrmcaCip31Order(
  values: Readonly<Record<string, StripFoundationInputValue>>,
): AppliedProfessionalPhysicalNormResolutionV1 | null {
  if (values.product_profile_id !== NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID) return null;
  if (values.scope_variant !== "full_reinforced_structure" || values.concrete_supply !== "ready_mix") {
    throw new Error("STRIP_FOUNDATION_NRMCA_CIP31_NOT_APPLICABLE:ready_mix_full_scope_required");
  }
  const planDimensionConcreteVolumeM3 =
    Number(values.total_axis_length_m) * Number(values.strip_width_m) * Number(values.strip_height_m);
  const parameterValues: Readonly<Record<string, ProfessionalParameterValueV4>> = {
    product_profile_id: professionalProjectValue(
      "product_profile_id",
      NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
    ),
    plan_dimension_concrete_volume_m3: professionalProjectValue(
      "plan_dimension_concrete_volume_m3",
      planDimensionConcreteVolumeM3,
      "m3",
      "PROJECT_DOCUMENT",
    ),
    plan_volume_calculation_reference: professionalProjectValue(
      "plan_volume_calculation_reference",
      values.plan_volume_calculation_reference,
    ),
    mix_design_or_project_specification_reference: professionalProjectValue(
      "mix_design_or_project_specification_reference",
      values.mix_design_or_project_specification_reference,
    ),
    mixture_designation: professionalProjectValue("mixture_designation", values.mixture_designation),
    placement_location: professionalProjectValue("placement_location", values.placement_location),
    placement_method: professionalProjectValue("placement_method", values.placement_method),
    selected_contingency_percent: professionalProjectValue(
      "selected_contingency_percent",
      values.concrete_order_allowance_percent,
      "percent",
    ),
    contingency_selection_justification: professionalProjectValue(
      "contingency_selection_justification",
      values.contingency_selection_justification,
    ),
    delivery_schedule_and_truck_capacity: professionalProjectValue(
      "delivery_schedule_and_truck_capacity",
      values.delivery_schedule_and_truck_capacity,
    ),
    producer_order_confirmation: professionalProjectValue(
      "producer_order_confirmation",
      values.producer_order_confirmation,
    ),
    estimator_approval_reference: professionalProjectValue(
      "estimator_approval_reference",
      values.estimator_approval_reference,
    ),
  };
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "REINFORCED_CONCRETE_STRIP_FOUNDATION",
    operation_class: "ORDER_READY_MIX",
    material_system: "READY_MIX_CONCRETE",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: parameterValues,
  });
  if (resolution.status !== "APPLIED") {
    throw new Error(`STRIP_FOUNDATION_NRMCA_CIP31_${resolution.status}:${resolution.blockers.join("|")}`);
  }
  return resolution;
}

function resolveReinforcementBarSchedule(
  values: Readonly<Record<string, StripFoundationInputValue>>,
): AppliedProfessionalPhysicalNormResolutionV1 | null {
  if (values.reinforcement_product_profile_id !== REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID) {
    return null;
  }
  if (values.scope_variant !== "full_reinforced_structure") {
    throw new Error("STRIP_FOUNDATION_REINFORCEMENT_SCHEDULE_NOT_APPLICABLE:full_scope_required");
  }
  const parameterValues: Readonly<Record<string, ProfessionalParameterValueV4>> = {
    product_profile_id: professionalProjectValue(
      "reinforcement_product_profile_id",
      REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
    ),
    approved_reinforcement_schedule_weight_kg: professionalProjectValue(
      "approved_reinforcement_schedule_weight_kg",
      Number(values.reinforcement_mass_t) * 1_000,
      "kg",
      "PROJECT_DOCUMENT",
    ),
    bar_bending_schedule_reference: professionalProjectValue(
      "bar_bending_schedule_reference",
      values.bar_bending_schedule_reference,
    ),
    structural_drawing_and_revision_reference: professionalProjectValue(
      "structural_drawing_and_revision_reference",
      values.structural_drawing_and_revision_reference,
    ),
    bar_standard_and_grade: professionalProjectValue(
      "bar_standard_and_grade",
      values.bar_standard_and_grade,
    ),
    bar_size_designation: professionalProjectValue(
      "bar_size_designation",
      values.bar_size_designation,
    ),
    nominal_diameter_mm: professionalProjectValue(
      "nominal_diameter_mm",
      values.nominal_diameter_mm,
      "mm",
    ),
    shape_straight_bent_curved_or_link: professionalProjectValue(
      "shape_straight_bent_curved_or_link",
      values.shape_straight_bent_curved_or_link,
    ),
    bar_count_and_cut_length_m: professionalProjectValue(
      "bar_count_and_cut_length_m",
      values.bar_count_and_cut_length_m,
    ),
    selected_standard_mass_kg_per_m: professionalProjectValue(
      "selected_standard_mass_kg_per_m",
      values.selected_standard_mass_kg_per_m,
      "kg_per_m",
    ),
    laps_hooks_chairs_connectors_and_accessories_scope: professionalProjectValue(
      "laps_hooks_chairs_connectors_and_accessories_scope",
      values.laps_hooks_chairs_connectors_and_accessories_scope,
    ),
    fabrication_allowance_if_documented: professionalProjectValue(
      "fabrication_allowance_if_documented",
      values.fabrication_allowance_if_documented,
    ),
    supplier_bundle_or_length_constraints: professionalProjectValue(
      "supplier_bundle_or_length_constraints",
      values.supplier_bundle_or_length_constraints,
    ),
    estimator_approval_reference: professionalProjectValue(
      "reinforcement_estimator_approval_reference",
      values.reinforcement_estimator_approval_reference,
    ),
  };
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "REINFORCEMENT_SCHEDULE_MEASUREMENT",
    operation_class: "MEASURE",
    material_system: "APPROVED_REINFORCEMENT_BAR_SCHEDULE",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: parameterValues,
  });
  if (resolution.status !== "APPLIED") {
    throw new Error(`STRIP_FOUNDATION_REINFORCEMENT_SCHEDULE_${resolution.status}:${resolution.blockers.join("|")}`);
  }
  return resolution;
}

export function compileStripFoundationEstimate(
  supplied: Readonly<Record<string, StripFoundationInputValue>>,
): readonly StripFoundationCompiledRow[] {
  const values = resolveInputs(supplied);
  const nrmcaCip31Order = resolveNrmcaCip31Order(values);
  const reinforcementSchedule = resolveReinforcementBarSchedule(values);
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
      if (
        candidate.rowId === "main_concrete" &&
        nrmcaCip31Order &&
        Math.abs(Number(evaluatedQuantity) - nrmcaCip31Order.calculated_concrete_order_quantity_m3!) > 1e-9
      ) {
        throw new Error("STRIP_FOUNDATION_NRMCA_CIP31_ORDER_QUANTITY_DIVERGENCE");
      }
      if (
        candidate.rowId === "reinforcement" &&
        reinforcementSchedule &&
        Math.abs(Number(evaluatedQuantity) * 1_000
          - reinforcementSchedule.calculated_reinforcement_schedule_weight_kg!) > 1e-9
      ) {
        throw new Error("STRIP_FOUNDATION_REINFORCEMENT_SCHEDULE_QUANTITY_DIVERGENCE");
      }
      const cargoFormula = candidate.cargo ? formulaById.get(candidate.cargo.physicalQuantityFormulaId) : null;
      return {
        ...candidate,
        ...(candidate.rowId === "main_concrete" && nrmcaCip31Order
          ? { normSource: NRMCA_CIP31_READY_MIX_ORDER_SOURCE }
          : candidate.rowId === "reinforcement" && reinforcementSchedule
            ? { normSource: REINFORCEMENT_BAR_SCHEDULE_SOURCE }
          : {}),
        canonicalRuName: renderedMaterialName(candidate, values),
        evaluatedQuantity,
        ...(["main_concrete", "concrete_delivery"].includes(candidate.rowId) && nrmcaCip31Order
          ? { professionalPhysicalNormApplicabilityV1: nrmcaCip31Order }
          : candidate.rowId === "reinforcement" && reinforcementSchedule
            ? { professionalPhysicalNormApplicabilityV1: reinforcementSchedule }
          : {}),
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
  groundworks_included: true,
  excavation_volume_m3: 54,
  excavator_productivity_m3_h: 30,
  foundation_bedding_included: true,
  foundation_bedding_type: "sand",
  foundation_bedding_volume_m3: 4,
  compactor_productivity_m3_h: 12,
  bedding_delivery_distance_km: 12,
  waterproofing_included: true,
  waterproofing_system: "bituminous_coating",
  waterproofing_area_m2: 120,
  backfill_included: true,
  backfill_volume_m3: 20,
  soil_disposal_included: true,
  excavated_soil_density_t_m3: 1.8,
  soil_disposal_distance_km: 15,
});
