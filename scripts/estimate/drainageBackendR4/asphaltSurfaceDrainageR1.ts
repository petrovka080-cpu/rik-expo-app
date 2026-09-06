import {
  compileFormulaGraph,
  evaluateFormulaGraph,
  type CompiledFormulaGraph,
} from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  evaluateInclusionGraph,
  type InclusionGraphAst,
} from "../../../src/lib/estimate/backendPlatform/inclusionGraph";
import {
  ESTIMATE_CONTENT_PASSPORT_R3_CONTRACT,
  evaluateEstimateContentPassportR3,
  type EstimateContentPassportR3,
  type EstimateContentProvenanceKindR3,
} from "../../../src/lib/estimate/backendPlatform/estimateContentPassportR3";

export const ASPHALT_SURFACE_DRAINAGE_CATALOG_ID =
  "canonical-work:base:paving_roads_landscape_interior_asphalt_drain_large_area" as const;

export type AsphaltSurfaceDrainageSystem = "linear_tray" | "subsurface_drain" | "storm_sewer";
export type AsphaltSurfaceDrainageCategory = "material" | "construction_work" | "machine_equipment" | "delivery";
export type AsphaltSurfaceDrainageInputValue = string | number | boolean;

export type AsphaltSurfaceDrainageInput = {
  parameterId: string;
  titleRu: string;
  valueType: "decimal" | "integer" | "boolean" | "enum" | "text";
  unitId: string | null;
  visibilityRole: "USER_INPUT" | "INTERNAL_ONLY";
  required: boolean;
  defaultValue: AsphaltSurfaceDrainageInputValue | null;
  requiredWhen?: InclusionGraphAst;
  choices?: readonly string[];
  minimum?: number;
  maximum?: number;
  guideRu: string;
  sourceRole: "PROJECT_DOCUMENTATION" | "SELECTED_EQUIPMENT_PASSPORT" | "MANUFACTURER_CONFIRMED";
};

export type AsphaltSurfaceDrainageNormSource = {
  sourceKey: string;
  documentCode: string;
  officialUrl: string;
  locator: string;
};

export type AsphaltSurfaceDrainageRow = {
  rowId: string;
  semanticOwnerId: string;
  resourceId: string;
  category: AsphaltSurfaceDrainageCategory;
  canonicalRuName: string;
  normalizedUom: string;
  formulaId: string;
  applicabilityExpression: InclusionGraphAst;
  normSource: AsphaltSurfaceDrainageNormSource;
  costOwner: "resource";
  includedInParentRate: false;
  visibility: "customer";
  procurementMode: "buy" | "rent" | "transport" | "none";
  traceParameterIds?: readonly string[];
  titleSpecificationParameterIds?: readonly string[];
  titleSpecificationMode?: "APPEND";
  titleSpecificationSeparator?: " — " | " ";
  cargo?: {
    cargoRu: string;
    vehicleRu: string;
    physicalQuantityFormulaId: string;
    physicalQuantityUom: "m3" | "t";
    distanceParameterId: string;
  };
};

export type AsphaltSurfaceDrainageCompiledRow = AsphaltSurfaceDrainageRow & {
  evaluatedQuantity: string;
  canonicalRuName: string;
  cargoQuantity?: string;
  distanceKm?: string;
};

type Formula = CompiledFormulaGraph & { formulaId: string; outputUnitId: string };

const trueAst: InclusionGraphAst = Object.freeze({ kind: "literal", value: true });
const eq = (parameterId: string, value: AsphaltSurfaceDrainageInputValue): InclusionGraphAst => ({ kind: "equals", parameterId, value });
const gt = (parameterId: string, value: number): InclusionGraphAst => ({ kind: "greater_than", parameterId, value });
const and = (...operands: InclusionGraphAst[]): InclusionGraphAst => ({ kind: "and", operands });

const linearTray = eq("system_type", "linear_tray");
const subsurfaceDrain = eq("system_type", "subsurface_drain");
const stormSewer = eq("system_type", "storm_sewer");
const sandBedding = eq("bedding_material", "sand");
const crushedStoneBedding = eq("bedding_material", "crushed_stone");
const importedBackfill = eq("backfill_import_required", true);
const importedBackfillSand = and(importedBackfill, eq("backfill_material_type", "sand"));
const importedBackfillCrushed = and(importedBackfill, eq("backfill_material_type", "crushed_stone"));
const disposal = eq("soil_disposal_included", true);
const separateDelivery = eq("delivery_separately_priced", true);
const localAsphaltRestoration = eq("surface_restoration_scope", "local_asphalt_strip");

const KRER_27: AsphaltSurfaceDrainageNormSource = Object.freeze({
  sourceKey: "kg_krer_27_roadworks_2015",
  documentCode: "КРЕР 81-02-27-2015",
  officialUrl: "https://minstroy.gov.kg/ru/kyzmat/422/show",
  locator: "сборник 27: наружные покрытия, основания и сопряжённые элементы водоотвода; применимость уточняется проектом",
});
const PROJECT_SOURCE: AsphaltSurfaceDrainageNormSource = Object.freeze({
  sourceKey: "project_drainage_scheme",
  documentCode: "Проектная схема водоотвода",
  officialUrl: "",
  locator: "план трассы, продольный профиль, сечения, выпуски, ведомость объёмов и локальное восстановление покрытия",
});
const MANUFACTURER_SOURCE: AsphaltSurfaceDrainageNormSource = Object.freeze({
  sourceKey: "selected_drainage_system_passport",
  documentCode: "Паспорт выбранной системы водоотвода",
  officialUrl: "",
  locator: "типоразмеры, класс нагрузки, комплектность, масса, соединения и расход герметика",
});
const EQUIPMENT_SOURCE: AsphaltSurfaceDrainageNormSource = Object.freeze({
  sourceKey: "selected_drainage_equipment_passport",
  documentCode: "Паспорт выбранной машины",
  officialUrl: "",
  locator: "модель, рабочие ограничения и паспортная производительность машины",
});

function input(
  parameterId: string,
  titleRu: string,
  unitId: string | null,
  guideRu: string,
  options: Partial<Pick<AsphaltSurfaceDrainageInput,
    "valueType" | "visibilityRole" | "required" | "defaultValue" | "requiredWhen" | "choices" | "minimum" | "maximum" | "sourceRole">> = {},
): AsphaltSurfaceDrainageInput {
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
    ...(options.minimum != null ? { minimum: options.minimum } : {}),
    ...(options.maximum != null ? { maximum: options.maximum } : {}),
    guideRu,
    sourceRole: options.sourceRole ?? "PROJECT_DOCUMENTATION",
  };
}

export const ASPHALT_SURFACE_DRAINAGE_INPUTS: readonly AsphaltSurfaceDrainageInput[] = Object.freeze([
  input("system_type", "Тип системы водоотвода", null, "Выберите линейные лотки, подземный дренаж или закрытую дождевую сеть; это взаимоисключающие технологии.", { valueType: "enum", choices: ["linear_tray", "subsurface_drain", "storm_sewer"] }),
  input("route_length_m", "Проектная длина трассы", "m", "Длина именно элементов выбранной системы по плану, а не площадь асфальтового покрытия.", { minimum: 1, maximum: 1_000_000 }),
  input("design_slope_percent", "Проектный продольный уклон", "percent", "Уклон подтверждается продольным профилем и направлением к указанному выпуску.", { minimum: 0.001, maximum: 100 }),
  input("trench_width_m", "Ширина траншеи", "m", "Ширина проектного сечения траншеи с рабочими зазорами.", { minimum: 0.1, maximum: 20 }),
  input("trench_depth_m", "Средняя глубина траншеи", "m", "Средняя расчётная глубина по проектным отметкам трассы.", { minimum: 0.1, maximum: 30 }),
  input("bedding_material", "Материал подготовки", null, "Выберите предусмотренную сечением песчаную или щебёночную подготовку.", { valueType: "enum", choices: ["sand", "crushed_stone"] }),
  input("bedding_thickness_m", "Толщина подготовки", "m", "Уплотнённая толщина подготовки по проектному сечению.", { minimum: 0.01, maximum: 2 }),
  input("bedding_density_t_m3", "Плотность материала подготовки", "t/m3", "Плотность принятого материала для расчёта грузопотока поставки.", { minimum: 0.1, maximum: 5 }),
  input("bedding_delivery_distance_km", "Расстояние доставки материала подготовки", "km", "Подтверждённый маршрут от поставщика до объекта.", { minimum: 0, maximum: 10_000 }),
  input("backfill_cross_section_m2", "Площадь сечения обратной засыпки", "m2", "Площадь обратной засыпки по проектному сечению после вычета системы и подготовки.", { minimum: 0.001, maximum: 100 }),
  input("backfill_import_required", "Требуется привозной материал обратной засыпки", null, "Подтвердите баланс грунта: повторное использование или отдельная поставка материала.", { valueType: "boolean" }),
  input("backfill_material_type", "Материал привозной обратной засыпки", null, "Выберите только фактически предусмотренный песок или щебень.", { valueType: "enum", choices: ["sand", "crushed_stone"], requiredWhen: importedBackfill }),
  input("backfill_density_t_m3", "Плотность привозного материала засыпки", "t/m3", "Плотность нужна для измеримого грузопотока поставки.", { minimum: 0.1, maximum: 5, requiredWhen: importedBackfill }),
  input("backfill_delivery_distance_km", "Расстояние доставки материала засыпки", "km", "Подтверждённый маршрут поставки привозной засыпки.", { minimum: 0, maximum: 10_000, requiredWhen: importedBackfill }),
  input("outlet_connection_count", "Количество подключений к выпуску", "pcs", "Количество фактических узлов подключения выбранной системы к подтверждённому выпуску.", { valueType: "integer", minimum: 1, maximum: 100_000 }),
  input("outfall_status", "Статус выпуска", null, "Расчёт выполняется только после подтверждения места и границы подключения выпуска.", { valueType: "enum", choices: ["confirmed"] }),
  input("soil_disposal_included", "Входит вывоз излишнего грунта", null, "Подтвердите по балансу грунта и границе договора.", { valueType: "boolean" }),
  input("soil_disposal_volume_m3", "Объём вывозимого грунта", "m3", "Проектный излишек грунта после обратной засыпки, без автоматического приравнивания ко всей выемке.", { minimum: 0.001, maximum: 10_000_000, requiredWhen: disposal }),
  input("soil_density_t_m3", "Плотность вывозимого грунта", "t/m3", "Расчётная плотность грунта для перевода объёма в транспортную массу.", { minimum: 0.1, maximum: 5, requiredWhen: disposal }),
  input("soil_disposal_distance_km", "Расстояние вывоза грунта", "km", "Подтверждённый маршрут до разрешённого места размещения.", { minimum: 0.001, maximum: 10_000, requiredWhen: disposal }),
  input("delivery_separately_priced", "Доставка учитывается отдельными строками", null, "Отключите только если грузопотоки уже включены в подтверждённые цены поставщиков.", { valueType: "boolean" }),
  input("system_transport_mass_t", "Транспортная масса элементов системы", "t", "Масса по комплектовочной ведомости выбранных лотков, труб, колодцев и соединений.", { minimum: 0.001, maximum: 1_000_000, sourceRole: "MANUFACTURER_CONFIRMED" }),
  input("system_delivery_distance_km", "Расстояние доставки элементов системы", "km", "Подтверждённый маршрут поставки выбранной системы.", { minimum: 0, maximum: 10_000 }),
  input("excavator_model", "Модель экскаватора", null, "Укажите выбранную машину, для которой подтверждена производительность.", { valueType: "text", sourceRole: "SELECTED_EQUIPMENT_PASSPORT" }),
  input("excavator_productivity_m3_h", "Производительность экскаватора", "m3_per_hour", "Паспортная производительность с поправкой на фактические условия разработки траншеи.", { minimum: 0.001, maximum: 100_000, sourceRole: "SELECTED_EQUIPMENT_PASSPORT" }),
  input("compactor_model", "Модель траншейного уплотнителя", null, "Укажите выбранную уплотняющую машину.", { valueType: "text", sourceRole: "SELECTED_EQUIPMENT_PASSPORT" }),
  input("compactor_productivity_m3_h", "Производительность траншейного уплотнителя", "m3_per_hour", "Паспортная производительность для принятого материала и толщины слоя.", { minimum: 0.001, maximum: 100_000, sourceRole: "SELECTED_EQUIPMENT_PASSPORT" }),
  input("surface_restoration_scope", "Восстановление асфальта", null, "Выберите отсутствие восстановления либо только измеримую полосу вскрытия; вся дорожная инфраструктура не добавляется.", { valueType: "enum", choices: ["none", "local_asphalt_strip"] }),
  input("asphalt_restoration_area_m2", "Площадь локального восстановления асфальта", "m2", "Площадь только вскрытой полосы по ведомости восстановления.", { minimum: 0.001, maximum: 10_000_000, requiredWhen: localAsphaltRestoration }),
  input("asphalt_restoration_thickness_mm", "Толщина восстанавливаемого слоя асфальта", "mm", "Проектная суммарная толщина восстанавливаемого асфальтобетона.", { minimum: 1, maximum: 1_000, requiredWhen: localAsphaltRestoration }),
  input("asphalt_density_t_m3", "Плотность асфальтобетонной смеси", "t/m3", "Плотность выбранной смеси по паспорту состава.", { minimum: 0.1, maximum: 5, requiredWhen: localAsphaltRestoration, sourceRole: "MANUFACTURER_CONFIRMED" }),
  input("asphalt_emulsion_rate_kg_m2", "Расход битумной эмульсии", "kg/m2", "Расход по принятой технологии подгрунтовки локальной полосы.", { minimum: 0.001, maximum: 10, requiredWhen: localAsphaltRestoration }),
  input("asphalt_cut_edge_length_m", "Длина обрезки кромок асфальта", "m", "Суммарная длина сопряжений локальной полосы с существующим покрытием.", { minimum: 0.001, maximum: 10_000_000, requiredWhen: localAsphaltRestoration }),
  input("asphalt_delivery_distance_km", "Расстояние доставки асфальтобетона", "km", "Маршрут от подтверждённого завода до объекта.", { minimum: 0, maximum: 10_000, requiredWhen: localAsphaltRestoration }),
  input("asphalt_roller_model", "Модель катка локального восстановления", null, "Укажите выбранный каток или виброплиту для измеримой полосы восстановления.", { valueType: "text", requiredWhen: localAsphaltRestoration, sourceRole: "SELECTED_EQUIPMENT_PASSPORT" }),
  input("asphalt_roller_productivity_m2_h", "Производительность катка локального восстановления", "m2_per_hour", "Паспортная производительность в стеснённой полосе восстановления.", { minimum: 0.001, maximum: 1_000_000, requiredWhen: localAsphaltRestoration, sourceRole: "SELECTED_EQUIPMENT_PASSPORT" }),

  input("tray_nominal_size", "Номинальное сечение лотка", null, "Типоразмер выбранного лотка, например DN200, по гидравлической схеме.", { valueType: "text", requiredWhen: linearTray, sourceRole: "MANUFACTURER_CONFIRMED" }),
  input("tray_load_class", "Класс нагрузки лотка", null, "Класс нагрузки решётки и корпуса по зоне установки.", { valueType: "enum", choices: ["A15", "B125", "C250", "D400", "E600", "F900"], requiredWhen: linearTray, sourceRole: "MANUFACTURER_CONFIRMED" }),
  input("tray_module_length_m", "Длина модуля лотка", "m", "Монтажная длина одного элемента выбранной системы.", { minimum: 0.1, maximum: 10, requiredWhen: linearTray, sourceRole: "MANUFACTURER_CONFIRMED" }),
  input("tray_base_concrete_cross_section_m2", "Площадь сечения бетонного основания и обоймы лотка", "m2", "Суммарная площадь бетона по принятому монтажному узлу.", { minimum: 0.001, maximum: 10, requiredWhen: linearTray }),
  input("tray_joint_sealant_kg_per_joint", "Расход герметика на стык лотка", "kg/pcs", "Расход совместимого герметика по паспорту системы.", { minimum: 0.001, maximum: 100, requiredWhen: linearTray, sourceRole: "MANUFACTURER_CONFIRMED" }),
  input("tray_fasteners_per_module", "Крепёж решётки на модуль лотка", "pcs", "Комплектное количество фиксаторов решётки на один модуль.", { valueType: "integer", minimum: 1, maximum: 100, requiredWhen: linearTray, sourceRole: "MANUFACTURER_CONFIRMED" }),
  input("tray_silt_trap_count", "Количество пескоуловителей лотковой системы", "pcs", "Количество по плану трассы и узлам подключения.", { valueType: "integer", minimum: 1, maximum: 100_000, requiredWhen: linearTray }),
  input("concrete_delivery_distance_km", "Расстояние доставки бетона лотков", "km", "Маршрут от поставщика бетонной смеси до объекта.", { minimum: 0, maximum: 10_000, requiredWhen: linearTray }),

  input("drain_pipe_nominal_size", "Номинальный диаметр дренажной трубы", null, "Диаметр выбранной перфорированной трубы по расчётной схеме.", { valueType: "text", requiredWhen: subsurfaceDrain, sourceRole: "MANUFACTURER_CONFIRMED" }),
  input("drain_pipe_stiffness_class", "Класс кольцевой жёсткости дренажной трубы", null, "Класс трубы по глубине заложения и нагрузке.", { valueType: "enum", choices: ["SN4", "SN8", "SN16"], requiredWhen: subsurfaceDrain, sourceRole: "MANUFACTURER_CONFIRMED" }),
  input("drain_pipe_module_length_m", "Поставочная длина дренажной трубы", "m", "Длина трубы или бухты для расчёта соединений.", { minimum: 0.1, maximum: 1_000, requiredWhen: subsurfaceDrain, sourceRole: "MANUFACTURER_CONFIRMED" }),
  input("filter_aggregate_cross_section_m2", "Площадь сечения фильтрующего щебня", "m2", "Площадь фильтрующей обсыпки по проектному сечению.", { minimum: 0.001, maximum: 100, requiredWhen: subsurfaceDrain }),
  input("filter_aggregate_density_t_m3", "Плотность фильтрующего щебня", "t/m3", "Плотность принятой промытой фракции для грузопотока.", { minimum: 0.1, maximum: 5, requiredWhen: subsurfaceDrain }),
  input("filter_aggregate_delivery_distance_km", "Расстояние доставки фильтрующего щебня", "km", "Подтверждённый маршрут поставки фильтрующего материала.", { minimum: 0, maximum: 10_000, requiredWhen: subsurfaceDrain }),
  input("geotextile_developed_width_m", "Развёрнутая ширина геотекстиля", "m", "Ширина полотна по обёртке фильтрующего слоя с подтверждёнными нахлёстами.", { minimum: 0.1, maximum: 100, requiredWhen: subsurfaceDrain }),
  input("drain_inspection_well_count", "Количество смотровых колодцев дренажа", "pcs", "Количество по поворотам, перепадам и эксплуатационным участкам проекта.", { valueType: "integer", minimum: 1, maximum: 100_000, requiredWhen: subsurfaceDrain }),

  input("storm_pipe_nominal_size", "Номинальный диаметр трубы дождевой сети", null, "Диаметр по гидравлическому расчёту сети.", { valueType: "text", requiredWhen: stormSewer, sourceRole: "MANUFACTURER_CONFIRMED" }),
  input("storm_pipe_material", "Материал трубы дождевой сети", null, "Материал выбранной трубной системы.", { valueType: "enum", choices: ["ПНД", "ПП", "железобетон"], requiredWhen: stormSewer, sourceRole: "MANUFACTURER_CONFIRMED" }),
  input("storm_pipe_stiffness_class", "Класс жёсткости трубы дождевой сети", null, "Класс или исполнение трубы по глубине и нагрузке.", { valueType: "text", requiredWhen: stormSewer, sourceRole: "MANUFACTURER_CONFIRMED" }),
  input("storm_pipe_module_length_m", "Поставочная длина трубы дождевой сети", "m", "Длина одного трубного элемента для расчёта соединительных комплектов.", { minimum: 0.1, maximum: 100, requiredWhen: stormSewer, sourceRole: "MANUFACTURER_CONFIRMED" }),
  input("storm_fitting_count", "Количество фасонных частей дождевой сети", "pcs", "Отводы, тройники и переходы по проектной спецификации без процентной догадки.", { valueType: "integer", minimum: 1, maximum: 1_000_000, requiredWhen: stormSewer }),
  input("storm_inlet_count", "Количество дождеприёмников", "pcs", "Фактическое количество точек сбора по плану поверхности.", { valueType: "integer", minimum: 1, maximum: 1_000_000, requiredWhen: stormSewer }),
  input("storm_inlet_load_class", "Класс нагрузки дождеприёмников", null, "Класс рам и решёток по зоне движения.", { valueType: "enum", choices: ["A15", "B125", "C250", "D400", "E600", "F900"], requiredWhen: stormSewer, sourceRole: "MANUFACTURER_CONFIRMED" }),
  input("storm_well_count", "Количество смотровых колодцев дождевой сети", "pcs", "Количество по плану, поворотам, подключениям и перепадам.", { valueType: "integer", minimum: 1, maximum: 1_000_000, requiredWhen: stormSewer }),
  input("storm_well_nominal_size", "Номинальный диаметр смотровых колодцев", null, "Типоразмер комплектного колодца по проектной спецификации.", { valueType: "text", requiredWhen: stormSewer, sourceRole: "MANUFACTURER_CONFIRMED" }),
]);

function formula(formulaId: string, outputUnitId: string, source: string): Formula {
  return { formulaId, outputUnitId, ...compileFormulaGraph(source) };
}

export const ASPHALT_SURFACE_DRAINAGE_FORMULAS: readonly Formula[] = Object.freeze([
  formula("route_length", "m", "route_length_m"),
  formula("excavation_volume", "m3", "route_length_m * trench_width_m * trench_depth_m"),
  formula("bedding_volume", "m3", "route_length_m * trench_width_m * bedding_thickness_m"),
  formula("backfill_volume", "m3", "route_length_m * backfill_cross_section_m2"),
  formula("outlet_connections", "pcs", "outlet_connection_count"),
  formula("excavator_hours", "machine_hour", "route_length_m * trench_width_m * trench_depth_m / excavator_productivity_m3_h"),
  formula("compactor_hours", "machine_hour", "route_length_m * backfill_cross_section_m2 / compactor_productivity_m3_h"),
  formula("system_transport_mass", "t", "system_transport_mass_t"),
  formula("system_delivery", "t_km", "system_transport_mass_t * system_delivery_distance_km"),
  formula("bedding_delivery", "t_km", "route_length_m * trench_width_m * bedding_thickness_m * bedding_density_t_m3 * bedding_delivery_distance_km"),
  formula("backfill_delivery", "t_km", "route_length_m * backfill_cross_section_m2 * backfill_density_t_m3 * backfill_delivery_distance_km"),
  formula("soil_disposal_volume", "m3", "soil_disposal_volume_m3"),
  formula("soil_disposal", "t_km", "soil_disposal_volume_m3 * soil_density_t_m3 * soil_disposal_distance_km"),
  formula("tray_module_count", "pcs", "ceil(route_length_m / tray_module_length_m)"),
  formula("tray_fastener_count", "pcs", "ceil(route_length_m / tray_module_length_m) * tray_fasteners_per_module"),
  formula("tray_sealant_mass", "kg", "ceil(route_length_m / tray_module_length_m) * tray_joint_sealant_kg_per_joint"),
  formula("tray_concrete_volume", "m3", "route_length_m * tray_base_concrete_cross_section_m2"),
  formula("tray_silt_traps", "pcs", "tray_silt_trap_count"),
  formula("tray_concrete_delivery", "m3_km", "route_length_m * tray_base_concrete_cross_section_m2 * concrete_delivery_distance_km"),
  formula("drain_pipe_couplings", "pcs", "ceil(route_length_m / drain_pipe_module_length_m)"),
  formula("filter_aggregate_volume", "m3", "route_length_m * filter_aggregate_cross_section_m2"),
  formula("geotextile_area", "m2", "route_length_m * geotextile_developed_width_m"),
  formula("drain_inspection_wells", "pcs", "drain_inspection_well_count"),
  formula("filter_aggregate_delivery", "t_km", "route_length_m * filter_aggregate_cross_section_m2 * filter_aggregate_density_t_m3 * filter_aggregate_delivery_distance_km"),
  formula("storm_pipe_couplings", "pcs", "ceil(route_length_m / storm_pipe_module_length_m)"),
  formula("storm_fittings", "pcs", "storm_fitting_count"),
  formula("storm_inlets", "pcs", "storm_inlet_count"),
  formula("storm_wells", "pcs", "storm_well_count"),
  formula("asphalt_mass", "t", "asphalt_restoration_area_m2 * asphalt_restoration_thickness_mm / 1000 * asphalt_density_t_m3"),
  formula("asphalt_emulsion_mass", "kg", "asphalt_restoration_area_m2 * asphalt_emulsion_rate_kg_m2"),
  formula("asphalt_restoration_area", "m2", "asphalt_restoration_area_m2"),
  formula("asphalt_cut_edge", "m", "asphalt_cut_edge_length_m"),
  formula("asphalt_roller_hours", "machine_hour", "asphalt_restoration_area_m2 / asphalt_roller_productivity_m2_h"),
  formula("asphalt_delivery", "t_km", "asphalt_restoration_area_m2 * asphalt_restoration_thickness_mm / 1000 * asphalt_density_t_m3 * asphalt_delivery_distance_km"),
]);

function row(
  rowId: string,
  category: AsphaltSurfaceDrainageCategory,
  canonicalRuName: string,
  normalizedUom: string,
  formulaId: string,
  applicabilityExpression: InclusionGraphAst,
  normSource: AsphaltSurfaceDrainageNormSource,
  options: Partial<Pick<AsphaltSurfaceDrainageRow,
    "procurementMode" | "traceParameterIds" | "titleSpecificationParameterIds" | "titleSpecificationMode" | "titleSpecificationSeparator" | "cargo">> = {},
): AsphaltSurfaceDrainageRow {
  return {
    rowId,
    semanticOwnerId: `r4-a10:asphalt-surface-drainage:${rowId}`,
    resourceId: `r4-a10-drainage-resource:${rowId}`,
    category,
    canonicalRuName,
    normalizedUom,
    formulaId,
    applicabilityExpression,
    normSource,
    costOwner: "resource",
    includedInParentRate: false,
    visibility: "customer",
    procurementMode: options.procurementMode ?? (category === "material" ? "buy" : category === "machine_equipment" ? "rent" : category === "delivery" ? "transport" : "none"),
    ...(options.traceParameterIds ? { traceParameterIds: options.traceParameterIds } : {}),
    ...(options.titleSpecificationParameterIds ? { titleSpecificationParameterIds: options.titleSpecificationParameterIds } : {}),
    ...(options.titleSpecificationMode ? { titleSpecificationMode: options.titleSpecificationMode } : {}),
    ...(options.titleSpecificationSeparator ? { titleSpecificationSeparator: options.titleSpecificationSeparator } : {}),
    ...(options.cargo ? { cargo: options.cargo } : {}),
  };
}

const commonTrace = ["system_type", "design_slope_percent", "outfall_status"] as const;

export const ASPHALT_SURFACE_DRAINAGE_ROWS: readonly AsphaltSurfaceDrainageRow[] = Object.freeze([
  row("bedding_sand", "material", "Песок для уплотнённой подготовки системы водоотвода", "m3", "bedding_volume", sandBedding, PROJECT_SOURCE),
  row("bedding_crushed_stone", "material", "Щебень проектной фракции для подготовки системы водоотвода", "m3", "bedding_volume", crushedStoneBedding, PROJECT_SOURCE),
  row("imported_backfill_sand", "material", "Песок для привозной обратной засыпки траншеи", "m3", "backfill_volume", importedBackfillSand, PROJECT_SOURCE),
  row("imported_backfill_crushed_stone", "material", "Щебень проектной фракции для привозной обратной засыпки", "m3", "backfill_volume", importedBackfillCrushed, PROJECT_SOURCE),

  row("tray_body", "material", "Водоотводный лоток", "m", "route_length", linearTray, MANUFACTURER_SOURCE, { titleSpecificationParameterIds: ["tray_nominal_size", "tray_load_class"], titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " }),
  row("tray_grating", "material", "Решётка водоотводного лотка", "m", "route_length", linearTray, MANUFACTURER_SOURCE, { titleSpecificationParameterIds: ["tray_load_class"], titleSpecificationMode: "APPEND" }),
  row("tray_connection_kits", "material", "Комплекты соединения модулей водоотводного лотка", "pcs", "tray_module_count", linearTray, MANUFACTURER_SOURCE),
  row("tray_grating_fasteners", "material", "Фиксаторы решёток водоотводного лотка", "pcs", "tray_fastener_count", linearTray, MANUFACTURER_SOURCE),
  row("tray_joint_sealant", "material", "Герметик стыков водоотводных лотков", "kg", "tray_sealant_mass", linearTray, MANUFACTURER_SOURCE),
  row("tray_base_concrete", "material", "Бетонная смесь основания и обоймы водоотводных лотков", "m3", "tray_concrete_volume", linearTray, PROJECT_SOURCE),
  row("tray_silt_traps", "material", "Пескоуловители линейного водоотвода", "pcs", "tray_silt_traps", linearTray, MANUFACTURER_SOURCE),
  row("tray_outlet_adapters", "material", "Адаптеры подключения лотков к выпуску", "pcs", "outlet_connections", linearTray, MANUFACTURER_SOURCE),

  row("drain_perforated_pipe", "material", "Перфорированная дренажная труба", "m", "route_length", subsurfaceDrain, MANUFACTURER_SOURCE, { titleSpecificationParameterIds: ["drain_pipe_nominal_size", "drain_pipe_stiffness_class"], titleSpecificationMode: "APPEND" }),
  row("drain_pipe_couplings", "material", "Муфты дренажной трубы", "pcs", "drain_pipe_couplings", subsurfaceDrain, MANUFACTURER_SOURCE),
  row("drain_filter_aggregate", "material", "Промытый фильтрующий щебень проектной фракции", "m3", "filter_aggregate_volume", subsurfaceDrain, PROJECT_SOURCE),
  row("drain_geotextile", "material", "Фильтрующий геотекстиль дренажной обсыпки", "m2", "geotextile_area", subsurfaceDrain, PROJECT_SOURCE),
  row("drain_inspection_well_sets", "material", "Комплекты смотровых колодцев подземного дренажа", "pcs", "drain_inspection_wells", subsurfaceDrain, MANUFACTURER_SOURCE),
  row("drain_outlet_fittings", "material", "Фасонные узлы подключения дренажа к выпуску", "pcs", "outlet_connections", subsurfaceDrain, MANUFACTURER_SOURCE),

  row("storm_pipe", "material", "Труба дождевой канализации", "m", "route_length", stormSewer, MANUFACTURER_SOURCE, { titleSpecificationParameterIds: ["storm_pipe_material", "storm_pipe_nominal_size", "storm_pipe_stiffness_class"], titleSpecificationMode: "APPEND" }),
  row("storm_pipe_couplings", "material", "Соединительные комплекты труб дождевой канализации", "pcs", "storm_pipe_couplings", stormSewer, MANUFACTURER_SOURCE),
  row("storm_fittings", "material", "Фасонные части дождевой канализации по проектной спецификации", "pcs", "storm_fittings", stormSewer, PROJECT_SOURCE),
  row("storm_inlet_sets", "material", "Комплекты дождеприёмников с рамой, решёткой и корзиной", "pcs", "storm_inlets", stormSewer, MANUFACTURER_SOURCE, { titleSpecificationParameterIds: ["storm_inlet_load_class"], titleSpecificationMode: "APPEND" }),
  row("storm_well_sets", "material", "Комплекты смотровых колодцев дождевой канализации", "pcs", "storm_wells", stormSewer, MANUFACTURER_SOURCE, { titleSpecificationParameterIds: ["storm_well_nominal_size"], titleSpecificationMode: "APPEND" }),
  row("storm_outlet_sets", "material", "Комплекты подключения дождевой сети к выпуску", "pcs", "outlet_connections", stormSewer, PROJECT_SOURCE),

  row("asphalt_mix", "material", "Асфальтобетонная смесь локального восстановления полосы", "t", "asphalt_mass", localAsphaltRestoration, MANUFACTURER_SOURCE),
  row("asphalt_emulsion", "material", "Битумная эмульсия для подгрунтовки локальной полосы", "kg", "asphalt_emulsion_mass", localAsphaltRestoration, PROJECT_SOURCE),

  row("route_setting_out", "construction_work", "Разбивка трассы системы водоотвода", "m", "route_length", trueAst, PROJECT_SOURCE, { traceParameterIds: commonTrace }),
  row("trench_excavation", "construction_work", "Разработка траншеи системы водоотвода", "m3", "excavation_volume", trueAst, KRER_27, { traceParameterIds: ["trench_width_m", "trench_depth_m"] }),
  row("bedding_installation", "construction_work", "Устройство и уплотнение подготовки системы водоотвода", "m3", "bedding_volume", trueAst, KRER_27, { traceParameterIds: ["bedding_material", "bedding_thickness_m"] }),
  row("trench_backfill", "construction_work", "Обратная засыпка траншеи с послойным уплотнением", "m3", "backfill_volume", trueAst, KRER_27, { traceParameterIds: ["backfill_import_required", "backfill_material_type"] }),

  row("tray_base_installation", "construction_work", "Устройство бетонного основания и обоймы водоотводных лотков", "m3", "tray_concrete_volume", linearTray, KRER_27),
  row("tray_installation", "construction_work", "Монтаж водоотводных лотков по проектному уклону", "m", "route_length", linearTray, KRER_27, { traceParameterIds: commonTrace }),
  row("tray_joint_sealing", "construction_work", "Герметизация соединений водоотводных лотков", "pcs", "tray_module_count", linearTray, KRER_27),
  row("tray_grating_installation", "construction_work", "Монтаж и фиксация решёток водоотводных лотков", "m", "route_length", linearTray, KRER_27),
  row("tray_silt_trap_installation", "construction_work", "Монтаж пескоуловителей линейного водоотвода", "pcs", "tray_silt_traps", linearTray, KRER_27),
  row("tray_outlet_connection", "construction_work", "Подключение линейного водоотвода к подтверждённому выпуску", "pcs", "outlet_connections", linearTray, PROJECT_SOURCE, { traceParameterIds: ["outfall_status"] }),
  row("tray_flushing", "construction_work", "Промывка линейного водоотвода перед вводом", "m", "route_length", linearTray, PROJECT_SOURCE),

  row("drain_geotextile_installation", "construction_work", "Укладка геотекстиля фильтрующего контура дренажа", "m2", "geotextile_area", subsurfaceDrain, KRER_27),
  row("drain_pipe_installation", "construction_work", "Укладка перфорированной дренажной трубы по проектному уклону", "m", "route_length", subsurfaceDrain, KRER_27, { traceParameterIds: commonTrace }),
  row("drain_filter_installation", "construction_work", "Устройство фильтрующей щебёночной обсыпки дренажа", "m3", "filter_aggregate_volume", subsurfaceDrain, KRER_27),
  row("drain_well_installation", "construction_work", "Монтаж смотровых колодцев подземного дренажа", "pcs", "drain_inspection_wells", subsurfaceDrain, KRER_27),
  row("drain_outlet_connection", "construction_work", "Подключение подземного дренажа к подтверждённому выпуску", "pcs", "outlet_connections", subsurfaceDrain, PROJECT_SOURCE, { traceParameterIds: ["outfall_status"] }),
  row("drain_flushing", "construction_work", "Промывка подземного дренажа перед вводом", "m", "route_length", subsurfaceDrain, PROJECT_SOURCE),

  row("storm_pipe_installation", "construction_work", "Прокладка труб дождевой канализации по проектному уклону", "m", "route_length", stormSewer, KRER_27, { traceParameterIds: commonTrace }),
  row("storm_fitting_installation", "construction_work", "Монтаж фасонных частей дождевой канализации", "pcs", "storm_fittings", stormSewer, KRER_27),
  row("storm_inlet_installation", "construction_work", "Монтаж комплектных дождеприёмников", "pcs", "storm_inlets", stormSewer, KRER_27),
  row("storm_well_installation", "construction_work", "Монтаж комплектных смотровых колодцев дождевой канализации", "pcs", "storm_wells", stormSewer, KRER_27),
  row("storm_outlet_connection", "construction_work", "Подключение дождевой сети к подтверждённому выпуску", "pcs", "outlet_connections", stormSewer, PROJECT_SOURCE, { traceParameterIds: ["outfall_status"] }),
  row("storm_flushing", "construction_work", "Промывка труб дождевой канализации перед вводом", "m", "route_length", stormSewer, PROJECT_SOURCE),

  row("asphalt_edge_cutting", "construction_work", "Обрезка кромок локальной полосы восстановления асфальта", "m", "asphalt_cut_edge", localAsphaltRestoration, KRER_27),
  row("asphalt_strip_restoration", "construction_work", "Восстановление асфальтобетона в границах вскрытой полосы", "m2", "asphalt_restoration_area", localAsphaltRestoration, KRER_27),

  row("trench_excavator", "machine_equipment", "Экскаватор для разработки траншеи", "machine_hour", "excavator_hours", trueAst, EQUIPMENT_SOURCE, { titleSpecificationParameterIds: ["excavator_model"], titleSpecificationMode: "APPEND" }),
  row("trench_compactor", "machine_equipment", "Траншейный уплотнитель", "machine_hour", "compactor_hours", trueAst, EQUIPMENT_SOURCE, { titleSpecificationParameterIds: ["compactor_model"], titleSpecificationMode: "APPEND" }),
  row("asphalt_roller", "machine_equipment", "Каток локального восстановления асфальта", "machine_hour", "asphalt_roller_hours", localAsphaltRestoration, EQUIPMENT_SOURCE, { titleSpecificationParameterIds: ["asphalt_roller_model"], titleSpecificationMode: "APPEND" }),

  row("system_delivery", "delivery", "Доставка комплектных элементов системы водоотвода", "t_km", "system_delivery", and(separateDelivery, gt("system_delivery_distance_km", 0)), PROJECT_SOURCE, { cargo: { cargoRu: "комплектные элементы системы водоотвода", vehicleRu: "бортовой автомобиль", physicalQuantityFormulaId: "system_transport_mass", physicalQuantityUom: "t", distanceParameterId: "system_delivery_distance_km" } }),
  row("bedding_delivery", "delivery", "Доставка материала подготовки системы водоотвода", "t_km", "bedding_delivery", and(separateDelivery, gt("bedding_delivery_distance_km", 0)), PROJECT_SOURCE, { cargo: { cargoRu: "материал подготовки", vehicleRu: "автомобиль-самосвал", physicalQuantityFormulaId: "bedding_volume", physicalQuantityUom: "m3", distanceParameterId: "bedding_delivery_distance_km" } }),
  row("backfill_delivery", "delivery", "Доставка привозного материала обратной засыпки", "t_km", "backfill_delivery", and(separateDelivery, importedBackfill, gt("backfill_delivery_distance_km", 0)), PROJECT_SOURCE, { cargo: { cargoRu: "материал обратной засыпки", vehicleRu: "автомобиль-самосвал", physicalQuantityFormulaId: "backfill_volume", physicalQuantityUom: "m3", distanceParameterId: "backfill_delivery_distance_km" } }),
  row("soil_disposal", "delivery", "Вывоз излишнего грунта автомобилями-самосвалами", "t_km", "soil_disposal", and(separateDelivery, disposal), PROJECT_SOURCE, { cargo: { cargoRu: "излишний грунт", vehicleRu: "автомобиль-самосвал", physicalQuantityFormulaId: "soil_disposal_volume", physicalQuantityUom: "m3", distanceParameterId: "soil_disposal_distance_km" } }),
  row("tray_concrete_delivery", "delivery", "Доставка бетонной смеси для основания лотков", "m3_km", "tray_concrete_delivery", and(separateDelivery, linearTray, gt("concrete_delivery_distance_km", 0)), PROJECT_SOURCE, { cargo: { cargoRu: "бетонная смесь основания лотков", vehicleRu: "автобетоносмеситель", physicalQuantityFormulaId: "tray_concrete_volume", physicalQuantityUom: "m3", distanceParameterId: "concrete_delivery_distance_km" } }),
  row("filter_aggregate_delivery", "delivery", "Доставка фильтрующего щебня подземного дренажа", "t_km", "filter_aggregate_delivery", and(separateDelivery, subsurfaceDrain, gt("filter_aggregate_delivery_distance_km", 0)), PROJECT_SOURCE, { cargo: { cargoRu: "фильтрующий щебень", vehicleRu: "автомобиль-самосвал", physicalQuantityFormulaId: "filter_aggregate_volume", physicalQuantityUom: "m3", distanceParameterId: "filter_aggregate_delivery_distance_km" } }),
  row("asphalt_delivery", "delivery", "Доставка асфальтобетонной смеси для локальной полосы", "t_km", "asphalt_delivery", and(separateDelivery, localAsphaltRestoration, gt("asphalt_delivery_distance_km", 0)), PROJECT_SOURCE, { cargo: { cargoRu: "асфальтобетонная смесь", vehicleRu: "автомобиль-самосвал с термозащитой", physicalQuantityFormulaId: "asphalt_mass", physicalQuantityUom: "t", distanceParameterId: "asphalt_delivery_distance_km" } }),
]);

export const ASPHALT_SURFACE_DRAINAGE_PASSPORT = Object.freeze({
  definitionId: "r4-a10:asphalt-surface-drainage",
  domainId: "roadworks_drainage",
  canonicalRuName: "Устройство системы водоотвода асфальтированного покрытия",
  searchAliases: [
    "водоотвод для асфальтового покрытия на большой площади",
    "линейный водоотвод асфальтированной площадки",
    "дренаж асфальтированной площадки",
    "дождевая канализация асфальтированной площадки",
  ],
  includedResults: [
    "выбранная система: линейные лотки, подземный дренаж либо закрытая дождевая сеть",
    "земляные работы и подготовка по проектному сечению",
    "комплектные материалы и соединения выбранной технологии",
    "подключения к подтверждённому выпуску",
    "применимые машины и измеримые грузопотоки",
    "локальное восстановление вскрытой полосы асфальта только при явном включении",
  ],
  excludedDomains: [
    "полное строительство дорожной одежды",
    "освещение, дорожные знаки, разметка и барьерные ограждения",
    "водоотвод вне указанной трассы и неподтверждённые выпуски",
    "проектирование и гидравлический расчёт вместо исходной проектной схемы",
  ],
  allowedScopes: ["linear_tray", "subsurface_drain", "storm_sewer"] as const,
  rows: ASPHALT_SURFACE_DRAINAGE_ROWS,
  inputSchema: ASPHALT_SURFACE_DRAINAGE_INPUTS,
  formulas: ASPHALT_SURFACE_DRAINAGE_FORMULAS,
  contentStatus: "reviewed" as const,
  reviewedBy: "r4-a10-canonical-backend-contract",
  reviewedAt: "2026-09-06",
});

function inclusionParameterIds(ast: InclusionGraphAst): string[] {
  const kind = String(ast.kind ?? "");
  if (kind === "parameter") return [String(ast.id ?? "")].filter(Boolean);
  if (["equals", "not_equals", "in", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal"].includes(kind)) {
    return [String(ast.parameterId ?? "")].filter(Boolean);
  }
  if (kind === "not" && ast.operand && typeof ast.operand === "object" && !Array.isArray(ast.operand)) {
    return inclusionParameterIds(ast.operand as InclusionGraphAst);
  }
  if ((kind === "and" || kind === "or") && Array.isArray(ast.operands)) {
    return ast.operands
      .filter((operand): operand is InclusionGraphAst => Boolean(operand) && typeof operand === "object" && !Array.isArray(operand))
      .flatMap(inclusionParameterIds);
  }
  return [];
}

export function buildAsphaltSurfaceDrainageContentPassportR3(
  catalogId = ASPHALT_SURFACE_DRAINAGE_CATALOG_ID,
): {
  passport: EstimateContentPassportR3;
  formulaConsumers: Record<string, string[]>;
  resourceConsumers: Record<string, string[]>;
  decision: ReturnType<typeof evaluateEstimateContentPassportR3>;
} {
  const formulaConsumers = Object.fromEntries(ASPHALT_SURFACE_DRAINAGE_INPUTS.map((parameter) => [
    parameter.parameterId,
    ASPHALT_SURFACE_DRAINAGE_FORMULAS
      .filter((formulaItem) => formulaItem.inputParameterIds.includes(parameter.parameterId))
      .map((formulaItem) => formulaItem.formulaId)
      .sort(),
  ]));
  const resourceConsumers = Object.fromEntries(ASPHALT_SURFACE_DRAINAGE_INPUTS.map((parameter) => {
    const formulaIds = new Set(formulaConsumers[parameter.parameterId] ?? []);
    const rows = ASPHALT_SURFACE_DRAINAGE_ROWS.filter((candidate) => formulaIds.has(candidate.formulaId)
      || inclusionParameterIds(candidate.applicabilityExpression).includes(parameter.parameterId)
      || candidate.traceParameterIds?.includes(parameter.parameterId)
      || candidate.titleSpecificationParameterIds?.includes(parameter.parameterId));
    return [parameter.parameterId, rows.map((candidate) => candidate.rowId).sort()];
  }));
  const provenanceByCategory: Record<AsphaltSurfaceDrainageCategory, EstimateContentProvenanceKindR3> = {
    material: "CANONICAL_PHYSICAL_RESOURCE",
    construction_work: "EXPLICIT_CONSTRUCTION_OPERATION",
    machine_equipment: "EXPLICIT_EQUIPMENT",
    delivery: "EXPLICIT_CARGO_DELIVERY",
  };
  const passport: EstimateContentPassportR3 = {
    contract: ESTIMATE_CONTENT_PASSPORT_R3_CONTRACT,
    catalogId,
    titleRu: ASPHALT_SURFACE_DRAINAGE_PASSPORT.canonicalRuName,
    identityMode: "WORK",
    aliasesRu: ASPHALT_SURFACE_DRAINAGE_PASSPORT.searchAliases,
    physicalResultRu: "Система водоотвода асфальтированной площадки выбранного проектного типа, подключённая к подтверждённому выпуску",
    includedScopeRu: ASPHALT_SURFACE_DRAINAGE_PASSPORT.includedResults,
    excludedScopeRu: ASPHALT_SURFACE_DRAINAGE_PASSPORT.excludedDomains,
    parameters: ASPHALT_SURFACE_DRAINAGE_INPUTS.map((parameter) => ({
      parameterId: parameter.parameterId,
      titleRu: parameter.titleRu,
      guideRu: parameter.guideRu,
      visibilityRole: parameter.visibilityRole,
      formulaConsumerIds: formulaConsumers[parameter.parameterId] ?? [],
      resourceConsumerIds: resourceConsumers[parameter.parameterId] ?? [],
    })),
    formulas: ASPHALT_SURFACE_DRAINAGE_FORMULAS.map((formulaItem) => ({
      formulaId: formulaItem.formulaId,
      outputUnitId: formulaItem.outputUnitId,
      expressionSource: formulaItem.source,
      inputParameterIds: formulaItem.inputParameterIds,
    })),
    resources: ASPHALT_SURFACE_DRAINAGE_ROWS.map((candidate) => ({
      rowId: candidate.rowId,
      group: candidate.category,
      titleRu: candidate.canonicalRuName,
      unitId: candidate.normalizedUom,
      formulaId: candidate.formulaId,
      semanticOwnerId: candidate.semanticOwnerId,
      costOwnerId: candidate.semanticOwnerId,
      resourceIdentity: candidate.resourceId,
      provenanceKind: provenanceByCategory[candidate.category],
      generationAxes: [],
      costingMode: "OWN_COST",
      procurementEligible: candidate.category !== "construction_work",
      normativeSource: { sourceKey: candidate.normSource.sourceKey, locator: candidate.normSource.locator },
      ...(candidate.cargo ? { delivery: {
        cargoRu: candidate.cargo.cargoRu,
        vehicleRu: candidate.cargo.vehicleRu,
        physicalQuantityFormulaId: candidate.cargo.physicalQuantityFormulaId,
        distanceParameterId: candidate.cargo.distanceParameterId,
      } } : {}),
    })),
    capabilityMatrix: (["material", "construction_work", "machine_equipment", "delivery"] as const).map((group) => ({
      group,
      status: "INCLUDED" as const,
      reasonRu: `Группа ${group} содержит только применимые строки выбранной системы водоотвода.`,
    })),
  };
  return { passport, formulaConsumers, resourceConsumers, decision: evaluateEstimateContentPassportR3(passport) };
}

function resolveInputs(
  supplied: Readonly<Record<string, AsphaltSurfaceDrainageInputValue>>,
): Record<string, AsphaltSurfaceDrainageInputValue> {
  const values: Record<string, AsphaltSurfaceDrainageInputValue> = {};
  for (const parameter of ASPHALT_SURFACE_DRAINAGE_INPUTS) {
    const combined = { ...values, ...supplied };
    const applicable = !parameter.requiredWhen || evaluateInclusionGraph(parameter.requiredWhen, combined);
    const value = supplied[parameter.parameterId] ?? parameter.defaultValue;
    if (parameter.required && applicable && value == null) throw new Error(`ASPHALT_DRAINAGE_MISSING_INPUT:${parameter.parameterId}`);
    if (value == null) continue;
    if (parameter.choices && !parameter.choices.includes(String(value))) throw new Error(`ASPHALT_DRAINAGE_INVALID_CHOICE:${parameter.parameterId}`);
    if ((parameter.valueType === "decimal" || parameter.valueType === "integer")) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)
        || (parameter.valueType === "integer" && !Number.isInteger(numeric))
        || (parameter.minimum != null && numeric < parameter.minimum)
        || (parameter.maximum != null && numeric > parameter.maximum)) {
        throw new Error(`ASPHALT_DRAINAGE_INVALID_NUMBER:${parameter.parameterId}`);
      }
    }
    values[parameter.parameterId] = value;
  }
  if (values.outfall_status !== "confirmed") throw new Error("ASPHALT_DRAINAGE_OUTFALL_NOT_CONFIRMED");
  const excavation = Number(values.route_length_m) * Number(values.trench_width_m) * Number(values.trench_depth_m);
  const occupied = Number(values.route_length_m) * (Number(values.bedding_thickness_m) * Number(values.trench_width_m) + Number(values.backfill_cross_section_m2));
  if (!(excavation > occupied)) throw new Error("ASPHALT_DRAINAGE_TRENCH_BALANCE_INVALID");
  return values;
}

function renderedTitle(
  candidate: AsphaltSurfaceDrainageRow,
  values: Readonly<Record<string, AsphaltSurfaceDrainageInputValue>>,
): string {
  const parts = candidate.titleSpecificationParameterIds?.map((parameterId) => String(values[parameterId] ?? "").trim()) ?? [];
  return parts.length === 0 ? candidate.canonicalRuName : `${candidate.canonicalRuName}${candidate.titleSpecificationSeparator ?? " — "}${parts.join(", ")}`;
}

export function compileAsphaltSurfaceDrainageEstimate(
  supplied: Readonly<Record<string, AsphaltSurfaceDrainageInputValue>>,
): readonly AsphaltSurfaceDrainageCompiledRow[] {
  const values = resolveInputs(supplied);
  const numericValues = Object.fromEntries(Object.entries(values)
    .filter((entry): entry is [string, string | number] => typeof entry[1] !== "boolean"));
  const formulas = new Map(ASPHALT_SURFACE_DRAINAGE_FORMULAS.map((item) => [item.formulaId, item]));
  const semanticOwners = new Set<string>();
  return ASPHALT_SURFACE_DRAINAGE_ROWS
    .filter((candidate) => evaluateInclusionGraph(candidate.applicabilityExpression, values))
    .map((candidate) => {
      if (semanticOwners.has(candidate.semanticOwnerId)) throw new Error(`ASPHALT_DRAINAGE_DUPLICATE_OWNER:${candidate.semanticOwnerId}`);
      semanticOwners.add(candidate.semanticOwnerId);
      const target = formulas.get(candidate.formulaId);
      if (!target) throw new Error(`ASPHALT_DRAINAGE_MISSING_FORMULA:${candidate.formulaId}`);
      const evaluatedQuantity = evaluateFormulaGraph(target, numericValues);
      if (Number(evaluatedQuantity) <= 0) throw new Error(`ASPHALT_DRAINAGE_NON_POSITIVE_QUANTITY:${candidate.rowId}`);
      const cargoFormula = candidate.cargo ? formulas.get(candidate.cargo.physicalQuantityFormulaId) : null;
      return {
        ...candidate,
        canonicalRuName: renderedTitle(candidate, values),
        evaluatedQuantity,
        ...(candidate.cargo && cargoFormula ? {
          cargoQuantity: evaluateFormulaGraph(cargoFormula, numericValues),
          distanceKm: String(values[candidate.cargo.distanceParameterId]),
        } : {}),
      };
    });
}

export const ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD_INPUT: Readonly<Record<string, AsphaltSurfaceDrainageInputValue>> = Object.freeze({
  system_type: "linear_tray",
  route_length_m: 180,
  design_slope_percent: 0.8,
  trench_width_m: 0.6,
  trench_depth_m: 0.5,
  bedding_material: "crushed_stone",
  bedding_thickness_m: 0.1,
  bedding_density_t_m3: 1.6,
  bedding_delivery_distance_km: 12,
  backfill_cross_section_m2: 0.18,
  backfill_import_required: true,
  backfill_material_type: "sand",
  backfill_density_t_m3: 1.65,
  backfill_delivery_distance_km: 14,
  outlet_connection_count: 2,
  outfall_status: "confirmed",
  soil_disposal_included: true,
  soil_disposal_volume_m3: 10.8,
  soil_density_t_m3: 1.8,
  soil_disposal_distance_km: 20,
  delivery_separately_priced: true,
  system_transport_mass_t: 18,
  system_delivery_distance_km: 30,
  excavator_model: "E35",
  excavator_productivity_m3_h: 25,
  compactor_model: "DPU 6555",
  compactor_productivity_m3_h: 12,
  surface_restoration_scope: "none",
  tray_nominal_size: "DN200",
  tray_load_class: "D400",
  tray_module_length_m: 1,
  tray_base_concrete_cross_section_m2: 0.08,
  tray_joint_sealant_kg_per_joint: 0.12,
  tray_fasteners_per_module: 2,
  tray_silt_trap_count: 6,
  concrete_delivery_distance_km: 18,
});
