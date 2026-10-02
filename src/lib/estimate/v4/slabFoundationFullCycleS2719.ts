import sourcePack from "../../../../data/estimate-benchmarks/source-packs/slab-foundation-full-cycle-s27-19.json";

import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type Json = Record<string, unknown>;
type ValueType = "decimal" | "integer" | "text" | "enum" | "boolean";
type RuntimeClass = "NORMATIVE" | "ASSUMPTION" | "DERIVED";
type ResourceKind =
  | "operation" | "material" | "component" | "fastener" | "consumable"
  | "labor" | "equipment" | "delivery" | "service" | "document" | "waste" | "control";
type CostTreatment = "OWN_COST" | "INFORMATIONAL_SCOPE" | "CONTROL_OR_DOCUMENT" | "INCLUDED_IN_RESOURCE_ROWS";

export const SLAB_FOUNDATION_FULL_CYCLE_S2719_CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard";
export const SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_repair";
export const SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_PACK_SHA256 =
  "785d612235cdc42a7e5429d9447bb1ba01f5b88ee10e8a673df2702d425114cd";
export const SLAB_FOUNDATION_FULL_CYCLE_S2719_NORM_ID =
  "SLAB-FOUNDATION-FULL-CYCLE-S27-19-PRELIMINARY-R1";
export const SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_ID =
  "s27_19_slab_foundation_full_cycle_source_pack";

const PROFILE = sourcePack.selectedPreliminaryProfile;

export const SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_INPUT = Object.freeze({
  plan_perimeter_override_selected: false,
  plan_perimeter_m: 90,
  plan_aspect_ratio: PROFILE.planAspectRatio,
  work_margin_m: PROFILE.workMarginM,
  excavation_depth_m: PROFILE.excavationDepthM,
  slab_thickness_mm: PROFILE.slabThicknessMm,
  sand_thickness_mm: PROFILE.sandThicknessMm,
  crushed_stone_main_thickness_mm: PROFILE.crushedStoneMainThicknessMm,
  wedging_stone_thickness_mm: PROFILE.wedgingStoneThicknessMm,
  blinding_thickness_mm: PROFILE.blindingThicknessMm,
  geotextile_layout_factor: PROFILE.geotextileLayoutFactor,
  geotextile_roll_area_m2: PROFILE.geotextileRollAreaM2,
  sand_loose_factor: PROFILE.sandLooseFactor,
  stone_loose_factor: PROFILE.stoneLooseFactor,
  base_water_l_per_m2: PROFILE.baseWaterLPerM2,
  drainage_selected: PROFILE.drainageSelected,
  drain_pipe_length_m: PROFILE.drainPipeLengthM,
  drain_trench_width_m: PROFILE.drainTrenchWidthM,
  drain_trench_depth_m: PROFILE.drainTrenchDepthM,
  drain_stone_loose_factor: PROFILE.drainStoneLooseFactor,
  drain_chamber_count: PROFILE.drainChamberCount,
  blinding_order_allowance_percent: PROFILE.blindingOrderAllowancePercent,
  waterproofing_selected: PROFILE.waterproofingSelected,
  primer_kg_per_m2: PROFILE.primerKgPerM2,
  primer_package_kg: PROFILE.primerPackageKg,
  membrane_layout_factor: PROFILE.membraneLayoutFactor,
  membrane_roll_area_m2: PROFILE.membraneRollAreaM2,
  membrane_detail_factor: PROFILE.membraneDetailFactor,
  sealant_coverage_m_per_cartridge: PROFILE.sealantCoverageMPerCartridge,
  insulation_selected: PROFILE.insulationSelected,
  xps_thickness_mm: PROFILE.xpsThicknessMm,
  xps_layout_factor: PROFILE.xpsLayoutFactor,
  xps_package_area_m2: PROFILE.xpsPackageAreaM2,
  xps_joint_tape_m_per_m2: PROFILE.xpsJointTapeMPerM2,
  xps_tape_roll_m: PROFILE.xpsTapeRollM,
  formwork_layout_factor: PROFILE.formworkLayoutFactor,
  formwork_brace_timber_m3_per_m: PROFILE.formworkBraceTimberM3PerM,
  formwork_tie_spacing_m: PROFILE.formworkTieSpacingM,
  formwork_screw_per_m: PROFILE.formworkScrewPerM,
  release_agent_l_per_m2: PROFILE.releaseAgentLPerM2,
  reinforcement_budget_profile_kg_per_m3: PROFILE.reinforcementBudgetProfileKgPerM3,
  reinforcement_allowance_percent: PROFILE.reinforcementAllowancePercent,
  reinforcement_d12_share: PROFILE.reinforcementD12Share,
  binding_wire_ratio: PROFILE.bindingWireRatio,
  binding_wire_coil_kg: PROFILE.bindingWireCoilKg,
  spacer_per_m2: PROFILE.spacerPerM2,
  spacer_package_piece: PROFILE.spacerPackagePiece,
  chair_per_m2: PROFILE.chairPerM2,
  chair_package_piece: PROFILE.chairPackagePiece,
  sleeve_count: PROFILE.sleeveCount,
  grounding_strip_factor: PROFILE.groundingStripFactor,
  main_concrete_order_allowance_percent: PROFILE.mainConcreteOrderAllowancePercent,
  concrete_truck_capacity_m3: PROFILE.concreteTruckCapacityM3,
  concrete_delivery_distance_km: PROFILE.concreteDeliveryDistanceKm,
  pump_productivity_m3_h: PROFILE.pumpProductivityM3H,
  vibrator_machine_h_per_m3: PROFILE.vibratorMachineHPerM3,
  curing_method: "LIQUID_COMPOUND",
  liquid_curing_coverage_m2_per_l: PROFILE.liquidCuringCoverageM2PerL,
  liquid_curing_package_l: PROFILE.liquidCuringPackageL,
  curing_sheet_layout_factor: 1.1,
  curing_sheet_roll_area_m2: 100,
  curing_sheet_tape_roll_m: 50,
  curing_water_l_per_m2_day: 5,
  curing_duration_day: 7,
  repair_area_ratio: PROFILE.repairAreaRatio,
  repair_depth_mm: PROFILE.repairDepthMm,
  repair_mortar_kg_per_m2_mm: PROFILE.repairMortarKgPerM2Mm,
  repair_bag_kg: PROFILE.repairBagKg,
  repair_mixing_water_l_per_bag: PROFILE.repairMixingWaterLPerBag,
  bulk_truck_capacity_m3: PROFILE.bulkTruckCapacityM3,
  truck_cycle_h: PROFILE.truckCycleH,
  excavator_productivity_m3_h: PROFILE.excavatorProductivityM3H,
  base_compactor_productivity_m3_h: PROFILE.baseCompactorProductivityM3H,
  backfill_compactor_productivity_m3_h: PROFILE.backfillCompactorProductivityM3H,
  qa_lot_m3: PROFILE.qaLotM3,
  blinding_concrete_designation: "Бетонная смесь для подготовки B7,5 (М100), P3, крупность заполнителя до 20 мм — предварительно",
  main_concrete_designation: "Товарный бетон B25 W6 F150 P4 — предварительно до сверки с КЖ",
  reinforcement_designation: "Арматура периодического профиля A500C — бюджетный профиль до ведомости КЖ",
});

const NORMATIVE_RUNTIME_IDS = new Set([
  "liquid_curing_coverage_m2_per_l",
  "liquid_curing_package_l",
  "repair_mortar_kg_per_m2_mm",
  "repair_bag_kg",
  "repair_mixing_water_l_per_bag",
]);
const DERIVED_RUNTIME_IDS = new Set(["plan_perimeter_m", "qa_lot_m3"]);

export const SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_INPUT).map((parameterId) => [
    parameterId,
    NORMATIVE_RUNTIME_IDS.has(parameterId)
      ? "NORMATIVE"
      : DERIVED_RUNTIME_IDS.has(parameterId) ? "DERIVED" : "ASSUMPTION",
  ])),
) as Readonly<Record<string, RuntimeClass>>;

export const SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_INPUT).map((parameterId) => [
    parameterId,
    SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_CLASSIFICATION[parameterId] === "NORMATIVE"
      ? [SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_ID]
      : [],
  ])),
);

export const SLAB_FOUNDATION_FULL_CYCLE_S2719_SHORT_INPUT = Object.freeze({
  slab_area_m2: 500,
});

export const SLAB_FOUNDATION_FULL_CYCLE_S2719_ACCEPTANCE_INPUT = Object.freeze({
  ...SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_INPUT,
  slab_area_m2: 500,
});

/**
 * The accepted 150 m2 local-repair fixture is a variant of the complete slab
 * foundation scope, not the former concrete-placement-only definition.
 * Six measured square metres at 20 mm are represented as 4% of the slab area;
 * the ratio remains visible and editable in the canonical parameter model.
 */
export const SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_RUNTIME_INPUT = Object.freeze({
  ...SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_INPUT,
  repair_area_ratio: 0.04,
  repair_depth_mm: 20,
});

export const SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_ACCEPTANCE_INPUT = Object.freeze({
  ...SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_RUNTIME_INPUT,
  slab_area_m2: 150,
});

export const SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_METADATA = Object.freeze({
  source_title: "Плитный фундамент полного цикла: видимый предварительный профиль S27.19",
  source_authority: "NRMCA; Sika; visible replaceable preliminary technology profile",
  source_document_version: "S27_19_REVIEWED_2026_09_30",
  definition_hash: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_PACK_SHA256,
  source_kind: "COMPOSITE_PRODUCT_AND_TECHNOLOGY_PROFILE",
  official_url: "https://www.nrmca.org/wp-content/uploads/2021/01/31pr.pdf",
  effective_from: "2026-09-30",
  exact_locator: sourcePack.sources.map((source) =>
    `${source.sourceId}: ${source.exactLocator}`).join(" | "),
  use_restriction: sourcePack.selectedPreliminaryProfile.assumptionPolicy,
});

type ParameterDescriptor = Readonly<{
  id: string;
  title: string;
  type?: ValueType;
  unit?: string | null;
  min?: number;
  values?: readonly unknown[];
  ordinary?: boolean;
  guide: string;
}>;

const D = (
  id: string,
  title: string,
  unit: string | null,
  guide: string,
  options: Omit<ParameterDescriptor, "id" | "title" | "unit" | "guide"> = {},
): ParameterDescriptor => ({ id, title, unit, guide, ...options });

const PARAMETER_DESCRIPTORS: readonly ParameterDescriptor[] = [
  D("slab_area_m2", "Площадь плитного фундамента", "m2", "Чистая площадь плиты из запроса или обмера.", { min: 0.001, ordinary: true }),
  D("plan_perimeter_m", "Периметр плиты", "m", "Если форма неизвестна, система показывает вычисленный серый ориентир прямоугольника; фактический периметр можно заменить.", { min: 0.001, ordinary: true }),
  D("plan_perimeter_override_selected", "Использовать фактический периметр", null, "По умолчанию периметр выводится из площади и видимого отношения сторон; включите только для применения измеренного периметра.", { type: "boolean", ordinary: true }),
  D("plan_aspect_ratio", "Отношение сторон предварительного прямоугольника", "ratio", "1,25 — видимое допущение только для вывода периметра и рабочей зоны.", { min: 0.1 }),
  D("work_margin_m", "Рабочий запас вокруг плиты", "m", "Предварительная рабочая полоса для котлована; уточняется по откосам и ППР.", { min: 0 }),
  D("excavation_depth_m", "Глубина разработки грунта", "m", "Предварительно включает основание, подготовку и технологический запас; заменить по отметкам.", { min: 0.001, ordinary: true }),
  D("slab_thickness_mm", "Толщина железобетонной плиты", "mm", "Предварительно 200 мм; бетон и бюджетное армирование пересчитываются после изменения.", { min: 1, ordinary: true }),
  D("sand_thickness_mm", "Толщина уплотнённого песчаного слоя", "mm", "Предварительный вариант основания, редактируется внутри сметы.", { min: 0 }),
  D("crushed_stone_main_thickness_mm", "Толщина основного слоя щебня 20–40 мм", "mm", "Предварительный вариант минерального основания.", { min: 0 }),
  D("wedging_stone_thickness_mm", "Толщина расклинцовки щебнем 5–20 мм", "mm", "Отдельная фракция и отдельный расход.", { min: 0 }),
  D("blinding_thickness_mm", "Толщина бетонной подготовки", "mm", "Предварительно 50 мм; уточняется по КЖ.", { min: 0 }),
  D("geotextile_layout_factor", "Коэффициент раскладки геотекстиля", "ratio", "Учитывает нахлёсты; предварительно 1,10.", { min: 1 }),
  D("geotextile_roll_area_m2", "Площадь геотекстиля в рулоне", "m2", "Выбранная закупочная упаковка 100 м².", { min: 0.001 }),
  D("sand_loose_factor", "Коэффициент поставки песка к уплотнённому объёму", "ratio", "Видимое предварительное допущение 1,15.", { min: 1 }),
  D("stone_loose_factor", "Коэффициент поставки щебня к уплотнённому объёму", "ratio", "Видимое предварительное допущение 1,12.", { min: 1 }),
  D("base_water_l_per_m2", "Технологическая вода для основания", "l_per_m2", "Предварительный расход, корректируется по влажности материалов.", { min: 0 }),
  D("drainage_selected", "Периметральный дренаж включён", null, "Включён как предложенный применимый этап; пользователь может исключить.", { type: "boolean", ordinary: true }),
  D("drain_pipe_length_m", "Заводская длина дренажной трубы DN110", "m", "Закупка считается в отрезках по 3 м.", { min: 0.001 }),
  D("drain_trench_width_m", "Ширина дренирующей призмы", "m", "Предварительная геометрия, не заменяет дренажный проект.", { min: 0.001 }),
  D("drain_trench_depth_m", "Высота дренирующей призмы", "m", "Предварительная геометрия, не заменяет отметки выпуска.", { min: 0.001 }),
  D("drain_stone_loose_factor", "Коэффициент поставки фильтрующего щебня", "ratio", "Видимый коэффициент поставки.", { min: 1 }),
  D("drain_chamber_count", "Смотровые дренажные колодцы", "item", "Четыре угловых колодца — предварительная ветвь.", { type: "integer", min: 0 }),
  D("blinding_order_allowance_percent", "Резерв заказа бетона подготовки", "percent", "4% — видимое допущение заказа.", { min: 0 }),
  D("waterproofing_selected", "Гидроизоляция под плитой включена", null, "Предварительно включена; можно исключить после проверки проекта.", { type: "boolean", ordinary: true }),
  D("primer_kg_per_m2", "Расход битумного праймера", "kg_per_m2", "Расход выбранного предварительного материала.", { min: 0 }),
  D("primer_package_kg", "Масса ведра битумного праймера", "kg", "Закупка округляется до вёдер.", { min: 0.001 }),
  D("membrane_layout_factor", "Коэффициент раскладки мембраны", "ratio", "Нахлёсты основного ковра, предварительно 1,10.", { min: 1 }),
  D("membrane_roll_area_m2", "Площадь рулона мембраны", "m2", "Выбранная упаковка 10 м².", { min: 0.001 }),
  D("membrane_detail_factor", "Доля мембраны на усиление узлов", "ratio", "Отдельный запас для углов, вводов и примыканий.", { min: 0 }),
  D("sealant_coverage_m_per_cartridge", "Длина герметизации одним картриджем", "m_per_item", "Предварительная производительность картриджа.", { min: 0.001 }),
  D("insulation_selected", "Теплоизоляция XPS под плитой включена", null, "Предложенная ветвь; исключается пользователем при неприменимости.", { type: "boolean", ordinary: true }),
  D("xps_thickness_mm", "Толщина XPS", "mm", "Предварительно 100 мм, прочность и марка уточняются расчётом.", { min: 1 }),
  D("xps_layout_factor", "Коэффициент раскладки XPS", "ratio", "Подрезка и резерв, предварительно 1,05.", { min: 1 }),
  D("xps_package_area_m2", "Площадь XPS в упаковке", "m2", "Закупочная упаковка выбранного предварительного профиля.", { min: 0.001 }),
  D("xps_joint_tape_m_per_m2", "Лента стыков XPS на площадь", "m_per_m2", "Предварительная раскладка стыков.", { min: 0 }),
  D("xps_tape_roll_m", "Длина ленты в рулоне", "m", "Закупка округляется до рулонов.", { min: 0.001 }),
  D("formwork_layout_factor", "Коэффициент раскладки бортовой опалубки", "ratio", "Доборы и подрезка, предварительно 1,10.", { min: 1 }),
  D("formwork_brace_timber_m3_per_m", "Брус для упоров на метр периметра", "m3_per_m", "Предварительный оборотный комплект.", { min: 0 }),
  D("formwork_tie_spacing_m", "Шаг крепления бортовой опалубки", "m", "Предварительная схема крепления.", { min: 0.001 }),
  D("formwork_screw_per_m", "Саморезы на метр борта", "item_per_m", "Предварительный расход крепежа.", { min: 0 }),
  D("release_agent_l_per_m2", "Разделительный состав на контактную площадь", "l_per_m2", "Расход выбранного состава.", { min: 0 }),
  D("reinforcement_budget_profile_kg_per_m3", "Бюджетная масса арматуры на объём плиты", "kg_per_m3", "Не проектная норма: используется только как явно обозначенный бюджетный профиль до ведомости КЖ.", { min: 0, ordinary: true }),
  D("reinforcement_allowance_percent", "Резерв поставки арматуры", "percent", "Предварительный резерв резки/нахлёстов; заменить ведомостью.", { min: 0 }),
  D("reinforcement_d12_share", "Доля A500C Ø12 в бюджетном профиле", "ratio", "Остаток относится к A500C Ø16; заменить ведомостью стержней.", { min: 0 }),
  D("binding_wire_ratio", "Доля вязальной проволоки от массы арматуры", "ratio", "Предварительный расход.", { min: 0 }),
  D("binding_wire_coil_kg", "Масса бухты вязальной проволоки", "kg", "Закупка округляется до бухт.", { min: 0.001 }),
  D("spacer_per_m2", "Фиксаторы защитного слоя на площадь", "item_per_m2", "Предварительная схема раскладки.", { min: 0 }),
  D("spacer_package_piece", "Фиксаторы в упаковке", "item", "Закупочная упаковка.", { min: 1 }),
  D("chair_per_m2", "Поддерживающие стульчики верхней сетки", "item_per_m2", "Предварительная схема раскладки.", { min: 0 }),
  D("chair_package_piece", "Стульчики в упаковке", "item", "Закупочная упаковка.", { min: 1 }),
  D("sleeve_count", "Предварительные гильзы вводов DN110", "item", "Условная ветвь; количество сверяется с инженерными разделами.", { type: "integer", min: 0, ordinary: true }),
  D("grounding_strip_factor", "Коэффициент длины полосы заземления к периметру", "ratio", "Предварительная ветвь уравнивания потенциалов.", { min: 0 }),
  D("main_concrete_order_allowance_percent", "Резерв заказа основного бетона", "percent", "Видимый резерв заказа; не универсальная норма.", { min: 0, ordinary: true }),
  D("concrete_truck_capacity_m3", "Вместимость автобетоносмесителя", "m3", "Рейсы считаются автоматически.", { min: 0.001 }),
  D("concrete_delivery_distance_km", "Расстояние доставки бетона", "km", "Серый ориентир; заменить маршрутом поставщика.", { min: 0 }),
  D("pump_productivity_m3_h", "Производительность автобетононасоса", "m3_per_hour", "Предварительная паспортная производительность.", { min: 0.001 }),
  D("vibrator_machine_h_per_m3", "Работа глубинного вибратора на объём", "machine_hour_per_m3", "Применимый профиль операции бетонирования.", { min: 0 }),
  D("curing_method", "Система ухода за плитой", null, "Выберите один вариант: жидкий состав, плёнка или водный уход.", { type: "enum", values: ["LIQUID_COMPOUND", "SHEET", "WATER"], ordinary: true }),
  D("liquid_curing_coverage_m2_per_l", "Покрытие Sika Antisol A одним литром", "m2_per_l", "Консервативная граница PDS 5–6,5 м²/л.", { min: 0.001 }),
  D("liquid_curing_package_l", "Тара Sika Antisol A", "l", "Закупка округляется до канистр 20 л.", { min: 0.001 }),
  D("curing_sheet_layout_factor", "Коэффициент раскладки плёнки ухода", "ratio", "Нахлёсты выбранной плёнки.", { min: 1 }),
  D("curing_sheet_roll_area_m2", "Площадь плёнки в рулоне", "m2", "Закупочная упаковка альтернативы.", { min: 0.001 }),
  D("curing_sheet_tape_roll_m", "Длина фиксирующей ленты в рулоне", "m", "Закупочная упаковка альтернативы.", { min: 0.001 }),
  D("curing_water_l_per_m2_day", "Вода на м² в сутки", "l_per_m2_day", "Предварительное значение водного ухода; заменить по ППР и погоде.", { min: 0 }),
  D("curing_duration_day", "Длительность ухода", "day", "Предварительно 7 суток; уточняется технологией бетона.", { type: "integer", min: 1 }),
  D("repair_area_ratio", "Предварительная площадь локального ремонта", "ratio", "1% поверхности — резерв завершения, не факт дефектов.", { min: 0 }),
  D("repair_depth_mm", "Средняя глубина локального ремонта", "mm", "Предварительно 10 мм в допустимом диапазоне выбранного продукта.", { min: 6 }),
  D("repair_mortar_kg_per_m2_mm", "Расход Sika MonoTop-4012", "kg_per_m2_mm", "1,9 кг/м²/мм по PDS.", { min: 0.001 }),
  D("repair_bag_kg", "Масса мешка Sika MonoTop-4012", "kg", "Заводская упаковка 25 кг.", { min: 0.001 }),
  D("repair_mixing_water_l_per_bag", "Вода затворения на мешок", "l_per_item", "Верхняя граница опубликованного диапазона.", { min: 0 }),
  D("bulk_truck_capacity_m3", "Вместимость самосвала для сыпучих", "m3", "Рейсы считаются автоматически.", { min: 0.001 }),
  D("truck_cycle_h", "Продолжительность транспортного цикла", "machine_hour", "Видимое логистическое допущение.", { min: 0.001 }),
  D("excavator_productivity_m3_h", "Производительность экскаватора", "m3_per_hour", "Предварительная производительность выбранного класса машины.", { min: 0.001 }),
  D("base_compactor_productivity_m3_h", "Производительность уплотнения основания", "m3_per_hour", "Предварительная производительность механизма.", { min: 0.001 }),
  D("backfill_compactor_productivity_m3_h", "Производительность уплотнения обратной засыпки", "m3_per_hour", "Предварительная производительность механизма.", { min: 0.001 }),
  D("qa_lot_m3", "Объём одной партии контроля бетона", "m3", "Предварительный план контроля; уточняется программой испытаний.", { min: 0.001 }),
  D("blinding_concrete_designation", "Спецификация бетона подготовки", null, "Конкретный предварительный вариант, заменяемый по проекту.", { type: "text", ordinary: true }),
  D("main_concrete_designation", "Спецификация бетона плиты", null, "Конкретный предварительный вариант, заменяемый по КЖ.", { type: "text", ordinary: true }),
  D("reinforcement_designation", "Спецификация арматуры", null, "Бюджетный вариант до утверждённой ведомости стержней.", { type: "text", ordinary: true }),
];

export const SLAB_FOUNDATION_FULL_CYCLE_S2719_PARAMETERS:
readonly CanonicalEstimateParameterDefinition[] = Object.freeze(
  PARAMETER_DESCRIPTORS.map((descriptor, ordinal) => ({
    parameter_id: descriptor.id,
    ordinal,
    value_type: descriptor.type ?? "decimal",
    unit_id: descriptor.unit ?? null,
    title_ru: descriptor.title,
    required: true,
    default_value: null,
    constraints_json: {
      ...(descriptor.min == null ? {} : { min: descriptor.min }),
      ...(descriptor.values ? { values: [...descriptor.values] } : {}),
    },
    truth_metadata: {
      contract: "rik-expo-app.s27-19.slab-foundation-full-cycle.v1",
      semantic_parameter_key: `slab-foundation-full-cycle-s27-19:${descriptor.id}`,
      visibility_role: "USER_INPUT",
      value_source_role: descriptor.id === "slab_area_m2"
        ? "USER_MEASURED"
        : descriptor.id === "plan_perimeter_m"
          ? "DERIVED_OR_USER_MEASURED"
          : "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
      input_origin_class: descriptor.id === "slab_area_m2"
        ? "KNOWN_WORK_SCOPE"
        : "SELECTED_VISIBLE_PRELIMINARY_PROFILE",
      preliminary_compilation_allowed: descriptor.id !== "slab_area_m2",
      source_confirmation_required: false,
      hidden_default_forbidden: descriptor.id === "slab_area_m2",
      runtime_profile_value: descriptor.id !== "slab_area_m2",
      synthetic: false,
      guide: {
        guide_kind: descriptor.id === "slab_area_m2" ? "MEASUREMENT_RULE" : "PRACTICE_REFERENCE",
        guide_short_ru: descriptor.guide,
        source_role: "VISIBLE_PRELIMINARY_PROFILE_OR_PROJECT_FACT",
        source_document: "s27_19_visible_preliminary_slab_profile",
        source_locator: "selectedPreliminaryProfile; replace with project/PPR/site/supplier data",
        guide_version: "slab-foundation-full-cycle-s27-19",
        source_snapshot_hash: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_PACK_SHA256,
        applicability: PROFILE.assumptionPolicy,
        verified_at: "2026-09-30T00:00:00+06:00",
        guide_validation_policy: "FIRST_COMPLETE_ESTIMATE_THEN_LOCAL_REFINEMENT",
      },
    },
  })),
);

function formula(id: string, unit: string, expression: string): CanonicalEstimateFormulaDefinition {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: id,
    output_unit_id: unit,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: estimateDeterministicHash(compiled.ast),
  };
}

const F = (id: string, unit: string, expression: string) => formula(`slab_full_${id}_s2719`, unit, expression);
const PLAN_PERIMETER = "(plan_perimeter_override_selected?plan_perimeter_m:2*(sqrt(slab_area_m2*plan_aspect_ratio)+sqrt(slab_area_m2/plan_aspect_ratio)))";

export const SLAB_FOUNDATION_FULL_CYCLE_S2719_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  F("area", "m2", "slab_area_m2"),
  F("perimeter", "m", PLAN_PERIMETER),
  F("work_footprint", "m2", "(sqrt(slab_area_m2*plan_aspect_ratio)+2*work_margin_m)*(sqrt(slab_area_m2/plan_aspect_ratio)+2*work_margin_m)"),
  F("site_labor", "man_hour", "(sqrt(slab_area_m2*plan_aspect_ratio)+2*work_margin_m)*(sqrt(slab_area_m2/plan_aspect_ratio)+2*work_margin_m)/50"),
  F("fence_panels", "item", `ceil(${PLAN_PERIMETER}/3.5)`),
  F("fence_clamps", "item", `ceil(${PLAN_PERIMETER}/3.5)*2`),
  F("survey_stakes", "item", `ceil(${PLAN_PERIMETER}/5)`),
  F("marking_cord", "m", `${PLAN_PERIMETER}*2`),
  F("survey_kit", "machine_hour", "max(1,slab_area_m2/500)"),
  F("excavation", "m3", "(sqrt(slab_area_m2*plan_aspect_ratio)+2*work_margin_m)*(sqrt(slab_area_m2/plan_aspect_ratio)+2*work_margin_m)*excavation_depth_m"),
  F("backfill", "m3", "max(((sqrt(slab_area_m2*plan_aspect_ratio)+2*work_margin_m)*(sqrt(slab_area_m2/plan_aspect_ratio)+2*work_margin_m)-slab_area_m2)*excavation_depth_m,0)"),
  F("excavation_labor", "man_hour", "(sqrt(slab_area_m2*plan_aspect_ratio)+2*work_margin_m)*(sqrt(slab_area_m2/plan_aspect_ratio)+2*work_margin_m)*excavation_depth_m/20"),
  F("excavator_hours", "machine_hour", "(sqrt(slab_area_m2*plan_aspect_ratio)+2*work_margin_m)*(sqrt(slab_area_m2/plan_aspect_ratio)+2*work_margin_m)*excavation_depth_m/excavator_productivity_m3_h"),
  F("loader_hours", "machine_hour", "(sqrt(slab_area_m2*plan_aspect_ratio)+2*work_margin_m)*(sqrt(slab_area_m2/plan_aspect_ratio)+2*work_margin_m)*excavation_depth_m/45"),
  F("soil_trips", "trip", "ceil(((sqrt(slab_area_m2*plan_aspect_ratio)+2*work_margin_m)*(sqrt(slab_area_m2/plan_aspect_ratio)+2*work_margin_m)*excavation_depth_m-max(((sqrt(slab_area_m2*plan_aspect_ratio)+2*work_margin_m)*(sqrt(slab_area_m2/plan_aspect_ratio)+2*work_margin_m)-slab_area_m2)*excavation_depth_m,0))/bulk_truck_capacity_m3)"),
  F("soil_truck_hours", "machine_hour", "ceil(((sqrt(slab_area_m2*plan_aspect_ratio)+2*work_margin_m)*(sqrt(slab_area_m2/plan_aspect_ratio)+2*work_margin_m)*excavation_depth_m-max(((sqrt(slab_area_m2*plan_aspect_ratio)+2*work_margin_m)*(sqrt(slab_area_m2/plan_aspect_ratio)+2*work_margin_m)-slab_area_m2)*excavation_depth_m,0))/bulk_truck_capacity_m3)*truck_cycle_h"),
  F("geotextile_net", "m2", "slab_area_m2*geotextile_layout_factor"),
  F("geotextile_rolls", "item", "ceil(slab_area_m2*geotextile_layout_factor/geotextile_roll_area_m2)"),
  F("geotextile_remainder", "m2", "ceil(slab_area_m2*geotextile_layout_factor/geotextile_roll_area_m2)*geotextile_roll_area_m2-slab_area_m2*geotextile_layout_factor"),
  F("geotextile_pins", "item", "ceil(slab_area_m2/2)"),
  F("geotextile_labor", "man_hour", "slab_area_m2/60"),
  F("drain_pipe_pieces", "item", `ceil(${PLAN_PERIMETER}/drain_pipe_length_m)`),
  F("drain_couplings", "item", `max(ceil(${PLAN_PERIMETER}/drain_pipe_length_m)-1,0)`),
  F("drain_stone", "m3", `${PLAN_PERIMETER}*drain_trench_width_m*drain_trench_depth_m*drain_stone_loose_factor`),
  F("drain_chambers", "item", "drain_chamber_count"),
  F("drain_fittings", "item", "max(drain_chamber_count*2,2)"),
  F("drain_labor", "man_hour", `${PLAN_PERIMETER}/8`),
  F("drain_tools", "machine_hour", `${PLAN_PERIMETER}/20`),
  F("sand_order", "m3", "slab_area_m2*sand_thickness_mm/1000*sand_loose_factor"),
  F("stone_main_order", "m3", "slab_area_m2*crushed_stone_main_thickness_mm/1000*stone_loose_factor"),
  F("stone_wedge_order", "m3", "slab_area_m2*wedging_stone_thickness_mm/1000*stone_loose_factor"),
  F("base_water", "l", "slab_area_m2*base_water_l_per_m2"),
  F("base_labor", "man_hour", "slab_area_m2/35"),
  F("base_compactor", "machine_hour", "slab_area_m2*(sand_thickness_mm+crushed_stone_main_thickness_mm+wedging_stone_thickness_mm)/1000/base_compactor_productivity_m3_h"),
  F("base_loader", "machine_hour", "(slab_area_m2*sand_thickness_mm/1000*sand_loose_factor+slab_area_m2*(crushed_stone_main_thickness_mm+wedging_stone_thickness_mm)/1000*stone_loose_factor)/40"),
  F("base_trips", "trip", "ceil((slab_area_m2*sand_thickness_mm/1000*sand_loose_factor+slab_area_m2*(crushed_stone_main_thickness_mm+wedging_stone_thickness_mm)/1000*stone_loose_factor)/bulk_truck_capacity_m3)"),
  F("blinding_net", "m3", "slab_area_m2*blinding_thickness_mm/1000"),
  F("blinding_order", "m3", "slab_area_m2*blinding_thickness_mm/1000*(1+blinding_order_allowance_percent/100)"),
  F("blinding_trips", "trip", "ceil(slab_area_m2*blinding_thickness_mm/1000*(1+blinding_order_allowance_percent/100)/concrete_truck_capacity_m3)"),
  F("blinding_labor", "man_hour", "slab_area_m2*blinding_thickness_mm/1000/4"),
  F("blinding_pump", "machine_hour", "slab_area_m2*blinding_thickness_mm/1000*(1+blinding_order_allowance_percent/100)/pump_productivity_m3_h"),
  F("blinding_vibrator", "machine_hour", "slab_area_m2*blinding_thickness_mm/1000*vibrator_machine_h_per_m3"),
  F("blinding_cure_net", "l", "slab_area_m2/liquid_curing_coverage_m2_per_l"),
  F("blinding_cure_packages", "item", "ceil(slab_area_m2/liquid_curing_coverage_m2_per_l/liquid_curing_package_l)"),
  F("primer_net", "kg", "slab_area_m2*primer_kg_per_m2"),
  F("primer_packages", "item", "ceil(slab_area_m2*primer_kg_per_m2/primer_package_kg)"),
  F("membrane_net", "m2", "slab_area_m2*membrane_layout_factor"),
  F("membrane_rolls", "item", "ceil(slab_area_m2*membrane_layout_factor/membrane_roll_area_m2)"),
  F("membrane_remainder", "m2", "ceil(slab_area_m2*membrane_layout_factor/membrane_roll_area_m2)*membrane_roll_area_m2-slab_area_m2*membrane_layout_factor"),
  F("detail_membrane_rolls", "item", "ceil(slab_area_m2*membrane_detail_factor/membrane_roll_area_m2)"),
  F("sealant_cartridges", "item", `ceil(${PLAN_PERIMETER}/sealant_coverage_m_per_cartridge)`),
  F("fillet_mortar_bags", "item", `ceil(${PLAN_PERIMETER}*2/25)`),
  F("waterproofing_labor", "man_hour", "slab_area_m2*membrane_layout_factor/25"),
  F("waterproofing_tools", "machine_hour", "slab_area_m2*membrane_layout_factor/100"),
  F("xps_net", "m2", "slab_area_m2*xps_layout_factor"),
  F("xps_thickness", "mm", "xps_thickness_mm"),
  F("xps_packages", "item", "ceil(slab_area_m2*xps_layout_factor/xps_package_area_m2)"),
  F("xps_remainder", "m2", "ceil(slab_area_m2*xps_layout_factor/xps_package_area_m2)*xps_package_area_m2-slab_area_m2*xps_layout_factor"),
  F("xps_tape_net", "m", "slab_area_m2*xps_joint_tape_m_per_m2"),
  F("xps_tape_rolls", "item", "ceil(slab_area_m2*xps_joint_tape_m_per_m2/xps_tape_roll_m)"),
  F("xps_labor", "man_hour", "slab_area_m2/30"),
  F("formwork_contact", "m2", `${PLAN_PERIMETER}*slab_thickness_mm/1000`),
  F("formwork_order", "m2", `${PLAN_PERIMETER}*slab_thickness_mm/1000*formwork_layout_factor`),
  F("brace_timber", "m3", `${PLAN_PERIMETER}*formwork_brace_timber_m3_per_m`),
  F("formwork_ties", "item", `ceil(${PLAN_PERIMETER}/formwork_tie_spacing_m)`),
  F("formwork_screws", "item", `ceil(${PLAN_PERIMETER}*formwork_screw_per_m)`),
  F("formwork_screw_boxes", "item", `ceil(${PLAN_PERIMETER}*formwork_screw_per_m/200)`),
  F("release_agent_net", "l", `${PLAN_PERIMETER}*slab_thickness_mm/1000*formwork_layout_factor*release_agent_l_per_m2`),
  F("release_agent_packages", "item", `ceil(${PLAN_PERIMETER}*slab_thickness_mm/1000*formwork_layout_factor*release_agent_l_per_m2/5)`),
  F("formwork_labor", "man_hour", `${PLAN_PERIMETER}*slab_thickness_mm/1000/2`),
  F("formwork_tools", "machine_hour", `${PLAN_PERIMETER}*slab_thickness_mm/1000/8`),
  F("concrete_net", "m3", "slab_area_m2*slab_thickness_mm/1000"),
  F("rebar_budget_net", "kg", "slab_area_m2*slab_thickness_mm/1000*reinforcement_budget_profile_kg_per_m3"),
  F("rebar_order", "kg", "slab_area_m2*slab_thickness_mm/1000*reinforcement_budget_profile_kg_per_m3*(1+reinforcement_allowance_percent/100)"),
  F("rebar_d12", "kg", "slab_area_m2*slab_thickness_mm/1000*reinforcement_budget_profile_kg_per_m3*(1+reinforcement_allowance_percent/100)*reinforcement_d12_share"),
  F("rebar_d16", "kg", "slab_area_m2*slab_thickness_mm/1000*reinforcement_budget_profile_kg_per_m3*(1+reinforcement_allowance_percent/100)*(1-reinforcement_d12_share)"),
  F("binding_wire_net", "kg", "slab_area_m2*slab_thickness_mm/1000*reinforcement_budget_profile_kg_per_m3*(1+reinforcement_allowance_percent/100)*binding_wire_ratio"),
  F("binding_wire_coils", "item", "ceil(slab_area_m2*slab_thickness_mm/1000*reinforcement_budget_profile_kg_per_m3*(1+reinforcement_allowance_percent/100)*binding_wire_ratio/binding_wire_coil_kg)"),
  F("spacers", "item", "ceil(slab_area_m2*spacer_per_m2)"),
  F("spacer_packages", "item", "ceil(slab_area_m2*spacer_per_m2/spacer_package_piece)"),
  F("chairs", "item", "ceil(slab_area_m2*chair_per_m2)"),
  F("chair_packages", "item", "ceil(slab_area_m2*chair_per_m2/chair_package_piece)"),
  F("cutting_discs", "item", "ceil(slab_area_m2*slab_thickness_mm/1000*reinforcement_budget_profile_kg_per_m3*(1+reinforcement_allowance_percent/100)/1000)"),
  F("rebar_labor", "man_hour", "slab_area_m2*slab_thickness_mm/1000*reinforcement_budget_profile_kg_per_m3*(1+reinforcement_allowance_percent/100)/35"),
  F("rebar_tools", "machine_hour", "slab_area_m2*slab_thickness_mm/1000*reinforcement_budget_profile_kg_per_m3*(1+reinforcement_allowance_percent/100)/300"),
  F("sleeves", "item", "sleeve_count"),
  F("grounding_strip", "m", `${PLAN_PERIMETER}*grounding_strip_factor`),
  F("grounding_connectors", "item", `ceil(${PLAN_PERIMETER}/3)`),
  F("embeds_labor", "man_hour", `sleeve_count/2+${PLAN_PERIMETER}*grounding_strip_factor/10`),
  F("main_concrete_order", "m3", "slab_area_m2*slab_thickness_mm/1000*(1+main_concrete_order_allowance_percent/100)"),
  F("main_concrete_trips", "trip", "ceil(slab_area_m2*slab_thickness_mm/1000*(1+main_concrete_order_allowance_percent/100)/concrete_truck_capacity_m3)"),
  F("main_concrete_ton_km", "m3_km", "slab_area_m2*slab_thickness_mm/1000*(1+main_concrete_order_allowance_percent/100)*concrete_delivery_distance_km"),
  F("main_concrete_truck_hours", "machine_hour", "ceil(slab_area_m2*slab_thickness_mm/1000*(1+main_concrete_order_allowance_percent/100)/concrete_truck_capacity_m3)*truck_cycle_h"),
  F("main_pump", "machine_hour", "slab_area_m2*slab_thickness_mm/1000*(1+main_concrete_order_allowance_percent/100)/pump_productivity_m3_h"),
  F("main_vibrator", "machine_hour", "slab_area_m2*slab_thickness_mm/1000*vibrator_machine_h_per_m3"),
  F("main_concrete_labor", "man_hour", "slab_area_m2*slab_thickness_mm/1000*0.5"),
  F("laser_screed", "machine_hour", "slab_area_m2/250"),
  F("pump_primer_bags", "item", "ceil(slab_area_m2*slab_thickness_mm/1000*(1+main_concrete_order_allowance_percent/100)/50)"),
  F("curing_liquid_net", "l", "slab_area_m2/liquid_curing_coverage_m2_per_l"),
  F("curing_liquid_packages", "item", "ceil(slab_area_m2/liquid_curing_coverage_m2_per_l/liquid_curing_package_l)"),
  F("curing_liquid_remainder", "l", "ceil(slab_area_m2/liquid_curing_coverage_m2_per_l/liquid_curing_package_l)*liquid_curing_package_l-slab_area_m2/liquid_curing_coverage_m2_per_l"),
  F("curing_sheet_net", "m2", "slab_area_m2*curing_sheet_layout_factor"),
  F("curing_sheet_rolls", "item", "ceil(slab_area_m2*curing_sheet_layout_factor/curing_sheet_roll_area_m2)"),
  F("curing_sheet_tape_rolls", "item", `ceil(${PLAN_PERIMETER}*2/curing_sheet_tape_roll_m)`),
  F("curing_water", "l", "slab_area_m2*curing_water_l_per_m2_day*curing_duration_day"),
  F("curing_labor", "man_hour", "slab_area_m2/100"),
  F("curing_sprayer", "machine_hour", "slab_area_m2/250"),
  F("qa_lots", "test", "ceil(slab_area_m2*slab_thickness_mm/1000/qa_lot_m3)"),
  F("qa_delivery_checks", "test", "ceil(slab_area_m2*slab_thickness_mm/1000*(1+main_concrete_order_allowance_percent/100)/concrete_truck_capacity_m3)"),
  F("quality_documents", "document", "1"),
  F("repair_area", "m2", "slab_area_m2*repair_area_ratio"),
  F("repair_mortar_net", "kg", "slab_area_m2*repair_area_ratio*repair_depth_mm*repair_mortar_kg_per_m2_mm"),
  F("repair_mortar_bags", "item", "ceil(slab_area_m2*repair_area_ratio*repair_depth_mm*repair_mortar_kg_per_m2_mm/repair_bag_kg)"),
  F("repair_mortar_remainder", "kg", "ceil(slab_area_m2*repair_area_ratio*repair_depth_mm*repair_mortar_kg_per_m2_mm/repair_bag_kg)*repair_bag_kg-slab_area_m2*repair_area_ratio*repair_depth_mm*repair_mortar_kg_per_m2_mm"),
  F("repair_water", "l", "slab_area_m2*repair_area_ratio*repair_depth_mm*repair_mortar_kg_per_m2_mm/repair_bag_kg*repair_mixing_water_l_per_bag"),
  F("repair_labor", "man_hour", "slab_area_m2*repair_area_ratio*2"),
  F("repair_tools", "machine_hour", "slab_area_m2*repair_area_ratio/2"),
  F("backfill_labor", "man_hour", "max(((sqrt(slab_area_m2*plan_aspect_ratio)+2*work_margin_m)*(sqrt(slab_area_m2/plan_aspect_ratio)+2*work_margin_m)-slab_area_m2)*excavation_depth_m,0)/8"),
  F("backfill_compactor", "machine_hour", "max(((sqrt(slab_area_m2*plan_aspect_ratio)+2*work_margin_m)*(sqrt(slab_area_m2/plan_aspect_ratio)+2*work_margin_m)-slab_area_m2)*excavation_depth_m,0)/backfill_compactor_productivity_m3_h"),
  F("cleanup_labor", "man_hour", "(sqrt(slab_area_m2*plan_aspect_ratio)+2*work_margin_m)*(sqrt(slab_area_m2/plan_aspect_ratio)+2*work_margin_m)/50"),
  F("waste_volume", "m3", "max(slab_area_m2*0.01,1)"),
  F("waste_trips", "trip", "ceil(max(slab_area_m2*0.01,1)/8)"),
  F("setting_out_labor", "man_hour", `max(2,${PLAN_PERIMETER}/25)`),
  F("temporary_boundary_labor", "man_hour", `ceil(${PLAN_PERIMETER}/3.5)/4`),
  F("formwork_nuts_washers", "item", `ceil(${PLAN_PERIMETER}/formwork_tie_spacing_m)*2`),
  F("qa_labor", "man_hour", "ceil(slab_area_m2*slab_thickness_mm/1000/qa_lot_m3)*2"),
  F("single", "service", "1"),
]);

const SOURCE_BY_ID = new Map(sourcePack.sources.map((source) => [source.sourceId, source]));
const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: unknown): Json => ({
  kind: "equals",
  parameterId,
  value,
});
const drainageSelected = equals("drainage_selected", true);
const waterproofingSelected = equals("waterproofing_selected", true);
const insulationSelected = equals("insulation_selected", true);
const liquidCuringSelected = equals("curing_method", "LIQUID_COMPOUND");
const sheetCuringSelected = equals("curing_method", "SHEET");
const waterCuringSelected = equals("curing_method", "WATER");

type ResourceSpec = Readonly<{
  rowId: string;
  stage: string;
  kind: ResourceKind;
  titleRu: string;
  unitId: string;
  formulaId: string;
  sourceId: string;
  costTreatment?: CostTreatment;
  procurementEligible?: boolean;
  inclusionAst?: Json;
  parentRowId?: string;
  titleParameterIds?: readonly string[];
}>;

function categoryFor(kind: ResourceKind): string {
  if (["material", "component", "fastener", "consumable"].includes(kind)) return "material";
  if (kind === "equipment") return "equipment";
  if (kind === "delivery") return "delivery";
  if (kind === "waste") return "waste";
  if (["service", "document", "control"].includes(kind)) return "service";
  return "construction_work";
}

function resource(spec: ResourceSpec, ordinal: number): CanonicalEstimateResourceDefinition {
  const costTreatment = spec.costTreatment ?? "OWN_COST";
  const source = SOURCE_BY_ID.get(spec.sourceId);
  const resourceGraph = {
    formulaId: spec.formulaId,
    normalizedUom: spec.unitId,
    semanticOwnerId: `slab-foundation-full-cycle-s27-19:${spec.rowId}`,
    resourceKind: spec.kind,
    stage: spec.stage,
    costOwner: costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment,
    payable: costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "slab_area_m2",
    preliminaryProfileId: SLAB_FOUNDATION_FULL_CYCLE_S2719_NORM_ID,
    visibleAssumptionPolicy: PROFILE.assumptionPolicy,
    ...(spec.parentRowId ? { parentCostOwnerId: spec.parentRowId } : {}),
    ...(spec.titleParameterIds ? {
      titleSpecificationParameterIds: [...spec.titleParameterIds],
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
    } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: spec.sourceId === "s27_19_visible_preliminary_slab_profile"
      ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
      : "PRIMARY_PRODUCT_OR_TECHNOLOGY_SOURCE",
    sourcePackSha256: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_PACK_SHA256,
    normativeTrace: [{
      sourceId: spec.sourceId,
      source_id: spec.sourceId,
      normId: SLAB_FOUNDATION_FULL_CYCLE_S2719_NORM_ID,
      norm_id: SLAB_FOUNDATION_FULL_CYCLE_S2719_NORM_ID,
      normVersion: "S27.19",
      source_title: source?.authority ?? spec.sourceId,
      source_url: source?.url ?? null,
      exact_locator: source?.exactLocator ?? "selected preliminary profile record",
      source_definition_hash: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_PACK_SHA256,
    }],
    engineeringLimitations: [...sourcePack.engineeringLimitations],
  };
  return {
    id: `resource-${spec.rowId.replace(/:/gu, "-")}`,
    row_id: spec.rowId,
    ordinal,
    section: spec.stage,
    category: categoryFor(spec.kind),
    title_ru: spec.titleRu,
    unit_id: spec.unitId,
    formula_id: spec.formulaId,
    inclusion_ast: spec.inclusionAst ?? literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: spec.procurementEligible
      ?? ["material", "component", "fastener", "consumable"].includes(spec.kind),
    cost_owner_id: spec.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ spec, resourceGraph, sourceMetadata }),
  };
}

const PRELIMINARY = "s27_19_visible_preliminary_slab_profile";
const CONCRETE = "nrmca_cip31_ordering_ready_mixed_concrete";
const CURING = "nrmca_cip11_curing_in_place_concrete";
const ANTISOL = "sika_antisol_a_pds";
const REPAIR = "sika_monotop_4012_pds_2026_03";
const FF = (id: string) => `slab_full_${id}_s2719`;
const S = (
  stage: string,
  rowId: string,
  kind: ResourceKind,
  titleRu: string,
  unitId: string,
  formulaId: string,
  sourceId = PRELIMINARY,
  options: Omit<ResourceSpec, "stage" | "rowId" | "kind" | "titleRu" | "unitId" | "formulaId" | "sourceId"> = {},
): ResourceSpec => ({ stage, rowId, kind, titleRu, unitId, formulaId, sourceId, ...options });

const RESOURCE_SPECS: readonly ResourceSpec[] = Object.freeze([
  S("01 · Подготовка площадки", "slab-full:01:operation:site-preparation", "operation", "Подготовка рабочей зоны, доступа и фронта работ", "m2", FF("work_footprint"), PRELIMINARY, { costTreatment: "INFORMATIONAL_SCOPE" }),
  S("01 · Подготовка площадки", "slab-full:01:material:survey-stakes", "material", "Разбивочные колья", "item", FF("survey_stakes")),
  S("01 · Подготовка площадки", "slab-full:01:material:marking-cord", "material", "Разметочный шнур", "m", FF("marking_cord")),
  S("01 · Подготовка площадки", "slab-full:01:labor:setting-out", "labor", "Разбивка осей и контроль отметок", "man_hour", FF("setting_out_labor")),
  S("01 · Подготовка площадки", "slab-full:01:equipment:survey-kit", "equipment", "Комплект геодезических приборов", "machine_hour", FF("survey_kit")),
  S("01 · Подготовка площадки", "slab-full:01:component:fence-panels", "component", "Панели временного ограждения, с учётом повторного использования", "item", FF("fence_panels")),
  S("01 · Подготовка площадки", "slab-full:01:component:fence-feet", "component", "Опорные блоки временного ограждения", "item", FF("fence_panels")),
  S("01 · Подготовка площадки", "slab-full:01:component:fence-clamps", "component", "Соединительные хомуты временного ограждения", "item", FF("fence_clamps")),
  S("01 · Подготовка площадки", "slab-full:01:labor:temporary-boundary", "labor", "Монтаж и снятие временного ограждения", "man_hour", FF("temporary_boundary_labor")),

  S("02 · Котлован и грунт", "slab-full:02:operation:excavation", "operation", "Разработка котлована с планировкой и зачисткой", "m3", FF("excavation"), PRELIMINARY, { costTreatment: "INFORMATIONAL_SCOPE" }),
  S("02 · Котлован и грунт", "slab-full:02:labor:excavation", "labor", "Зачистка, планировка и сопровождение земляных работ", "man_hour", FF("excavation_labor")),
  S("02 · Котлован и грунт", "slab-full:02:equipment:excavator", "equipment", "Экскаватор для разработки котлована", "machine_hour", FF("excavator_hours")),
  S("02 · Котлован и грунт", "slab-full:02:equipment:loader", "equipment", "Фронтальный погрузчик для перемещения грунта", "machine_hour", FF("loader_hours")),
  S("02 · Котлован и грунт", "slab-full:02:delivery:soil-trips", "delivery", "Рейсы самосвалов для вывозимого грунта", "trip", FF("soil_trips")),
  S("02 · Котлован и грунт", "slab-full:02:equipment:soil-trucks", "equipment", "Работа самосвалов по принятому транспортному циклу", "machine_hour", FF("soil_truck_hours")),

  S("03 · Дренаж и разделение", "slab-full:03:material:separation-geotextile-rolls", "material", "Геотекстиль разделительный, рулон 100 м²", "item", FF("geotextile_rolls")),
  S("03 · Дренаж и разделение", "slab-full:03:component:geotextile-pins", "component", "Фиксаторы геотекстиля", "item", FF("geotextile_pins")),
  S("03 · Дренаж и разделение", "slab-full:03:labor:geotextile", "labor", "Раскладка и фиксация геотекстиля с нахлёстами", "man_hour", FF("geotextile_labor")),
  S("03 · Дренаж и разделение", "slab-full:03:control:geotextile-net", "control", "Чистая площадь геотекстиля с нахлёстами", "m2", FF("geotextile_net"), PRELIMINARY, { costTreatment: "INFORMATIONAL_SCOPE", procurementEligible: false }),
  S("03 · Дренаж и разделение", "slab-full:03:control:geotextile-remainder", "control", "Остаток геотекстиля после округления до рулонов", "m2", FF("geotextile_remainder"), PRELIMINARY, { costTreatment: "INFORMATIONAL_SCOPE", procurementEligible: false }),
  S("03 · Дренаж и разделение", "slab-full:03:material:drain-pipe", "material", "Дренажная перфорированная труба DN110, отрезок 3 м", "item", FF("drain_pipe_pieces"), PRELIMINARY, { inclusionAst: drainageSelected }),
  S("03 · Дренаж и разделение", "slab-full:03:component:drain-couplings", "component", "Соединительные муфты дренажной трубы DN110", "item", FF("drain_couplings"), PRELIMINARY, { inclusionAst: drainageSelected }),
  S("03 · Дренаж и разделение", "slab-full:03:material:drain-stone", "material", "Щебень фильтрующей призмы дренажа", "m3", FF("drain_stone"), PRELIMINARY, { inclusionAst: drainageSelected }),
  S("03 · Дренаж и разделение", "slab-full:03:component:inspection-chambers", "component", "Смотровые дренажные колодцы с подключениями", "item", FF("drain_chambers"), PRELIMINARY, { inclusionAst: drainageSelected }),
  S("03 · Дренаж и разделение", "slab-full:03:component:drain-fittings", "component", "Фасонные элементы и подключения дренажа", "item", FF("drain_fittings"), PRELIMINARY, { inclusionAst: drainageSelected }),
  S("03 · Дренаж и разделение", "slab-full:03:labor:drainage", "labor", "Укладка, соединение и выверка уклона дренажа", "man_hour", FF("drain_labor"), PRELIMINARY, { inclusionAst: drainageSelected }),
  S("03 · Дренаж и разделение", "slab-full:03:equipment:drain-tools", "equipment", "Инструмент устройства и контроля дренажа", "machine_hour", FF("drain_tools"), PRELIMINARY, { inclusionAst: drainageSelected }),

  S("04 · Песчано-щебёночное основание", "slab-full:04:material:sand", "material", "Песок для уплотнённого слоя основания", "m3", FF("sand_order")),
  S("04 · Песчано-щебёночное основание", "slab-full:04:material:crushed-stone-20-40", "material", "Щебень фракции 20–40 мм для основного слоя", "m3", FF("stone_main_order")),
  S("04 · Песчано-щебёночное основание", "slab-full:04:material:wedging-stone-5-20", "material", "Щебень фракции 5–20 мм для расклинцовки", "m3", FF("stone_wedge_order")),
  S("04 · Песчано-щебёночное основание", "slab-full:04:material:process-water", "material", "Технологическая вода для увлажнения основания", "l", FF("base_water")),
  S("04 · Песчано-щебёночное основание", "slab-full:04:labor:base", "labor", "Раскладка, разравнивание и послойное уплотнение основания", "man_hour", FF("base_labor")),
  S("04 · Песчано-щебёночное основание", "slab-full:04:equipment:compactor", "equipment", "Виброплита или каток для послойного уплотнения", "machine_hour", FF("base_compactor")),
  S("04 · Песчано-щебёночное основание", "slab-full:04:equipment:loader", "equipment", "Погрузчик для распределения песка и щебня", "machine_hour", FF("base_loader")),
  S("04 · Песчано-щебёночное основание", "slab-full:04:delivery:bulk-trips", "delivery", "Рейсы поставки песка и щебня", "trip", FF("base_trips")),

  S("05 · Бетонная подготовка", "slab-full:05:material:blinding-concrete", "material", "Бетонная смесь для подготовки", "m3", FF("blinding_order"), CONCRETE, { titleParameterIds: ["blinding_concrete_designation"] }),
  S("05 · Бетонная подготовка", "slab-full:05:material:curing-compound", "material", "Sika Antisol A для ухода за бетонной подготовкой, канистра 20 л", "item", FF("blinding_cure_packages"), ANTISOL),
  S("05 · Бетонная подготовка", "slab-full:05:labor:blinding", "labor", "Подача, укладка, выравнивание и уход за бетонной подготовкой", "man_hour", FF("blinding_labor"), CONCRETE),
  S("05 · Бетонная подготовка", "slab-full:05:equipment:pump", "equipment", "Бетононасос для бетонной подготовки", "machine_hour", FF("blinding_pump"), CONCRETE),
  S("05 · Бетонная подготовка", "slab-full:05:equipment:vibrator", "equipment", "Глубинный вибратор для бетонной подготовки", "machine_hour", FF("blinding_vibrator"), CONCRETE),
  S("05 · Бетонная подготовка", "slab-full:05:delivery:mixer-trips", "delivery", "Рейсы автобетоносмесителей для бетонной подготовки", "trip", FF("blinding_trips"), CONCRETE),

  S("06 · Гидроизоляция и утепление", "slab-full:06:material:primer-pails", "material", "Битумный праймер, ведро 20 кг", "item", FF("primer_packages"), PRELIMINARY, { inclusionAst: waterproofingSelected }),
  S("06 · Гидроизоляция и утепление", "slab-full:06:material:membrane-rolls", "material", "Рулонная битумно-полимерная мембрана, рулон 10 м²", "item", FF("membrane_rolls"), PRELIMINARY, { inclusionAst: waterproofingSelected }),
  S("06 · Гидроизоляция и утепление", "slab-full:06:component:detail-membrane-rolls", "component", "Мембрана для усиления углов, вводов и примыканий", "item", FF("detail_membrane_rolls"), PRELIMINARY, { inclusionAst: waterproofingSelected }),
  S("06 · Гидроизоляция и утепление", "slab-full:06:consumable:sealant-cartridges", "consumable", "Битумно-полимерный герметик для примыканий, картридж", "item", FF("sealant_cartridges"), PRELIMINARY, { inclusionAst: waterproofingSelected }),
  S("06 · Гидроизоляция и утепление", "slab-full:06:consumable:fillet-mortar", "consumable", "Сухая смесь для галтелей и подготовки примыканий, мешок", "item", FF("fillet_mortar_bags"), PRELIMINARY, { inclusionAst: waterproofingSelected }),
  S("06 · Гидроизоляция и утепление", "slab-full:06:labor:waterproofing", "labor", "Подготовка, грунтование и устройство гидроизоляционного ковра", "man_hour", FF("waterproofing_labor"), PRELIMINARY, { inclusionAst: waterproofingSelected }),
  S("06 · Гидроизоляция и утепление", "slab-full:06:equipment:application-tools", "equipment", "Горелка и инструмент устройства гидроизоляции", "machine_hour", FF("waterproofing_tools"), PRELIMINARY, { inclusionAst: waterproofingSelected }),
  S("06 · Гидроизоляция и утепление", "slab-full:06:control:membrane-remainder", "control", "Остаток мембраны после округления до рулонов", "m2", FF("membrane_remainder"), PRELIMINARY, { costTreatment: "INFORMATIONAL_SCOPE", procurementEligible: false, inclusionAst: waterproofingSelected }),
  S("06 · Гидроизоляция и утепление", "slab-full:06:material:xps-packages", "material", "XPS для утепления под плитой, упаковка выбранной толщины", "item", FF("xps_packages"), PRELIMINARY, { inclusionAst: insulationSelected }),
  S("06 · Гидроизоляция и утепление", "slab-full:06:control:xps-thickness", "control", "Выбранная толщина XPS", "mm", FF("xps_thickness"), PRELIMINARY, { costTreatment: "INFORMATIONAL_SCOPE", procurementEligible: false, inclusionAst: insulationSelected }),
  S("06 · Гидроизоляция и утепление", "slab-full:06:component:xps-joint-tape-rolls", "component", "Лента для стыков XPS, рулон 50 м", "item", FF("xps_tape_rolls"), PRELIMINARY, { inclusionAst: insulationSelected }),
  S("06 · Гидроизоляция и утепление", "slab-full:06:labor:insulation", "labor", "Раскладка XPS, подрезка и герметизация стыков", "man_hour", FF("xps_labor"), PRELIMINARY, { inclusionAst: insulationSelected }),
  S("06 · Гидроизоляция и утепление", "slab-full:06:control:xps-remainder", "control", "Остаток XPS после округления до упаковок", "m2", FF("xps_remainder"), PRELIMINARY, { costTreatment: "INFORMATIONAL_SCOPE", procurementEligible: false, inclusionAst: insulationSelected }),

  S("07 · Опалубка", "slab-full:07:material:formwork-panels", "material", "Щиты бортовой опалубки, закупка или аренда по выбранной схеме", "m2", FF("formwork_order")),
  S("07 · Опалубка", "slab-full:07:component:brace-timber", "component", "Брус для упоров и подкосов опалубки", "m3", FF("brace_timber")),
  S("07 · Опалубка", "slab-full:07:fastener:ties", "fastener", "Стяжные элементы бортовой опалубки", "item", FF("formwork_ties")),
  S("07 · Опалубка", "slab-full:07:fastener:nuts-washers", "fastener", "Гайки и шайбы стяжных элементов", "item", FF("formwork_nuts_washers")),
  S("07 · Опалубка", "slab-full:07:fastener:screws", "fastener", "Саморезы для доборов опалубки, коробка 200 шт.", "item", FF("formwork_screw_boxes")),
  S("07 · Опалубка", "slab-full:07:control:screws-net", "control", "Расчётное количество саморезов до округления до коробок", "item", FF("formwork_screws"), PRELIMINARY, { costTreatment: "INFORMATIONAL_SCOPE", procurementEligible: false }),
  S("07 · Опалубка", "slab-full:07:consumable:release-agent", "consumable", "Разделительный состав для опалубки, канистра 5 л", "item", FF("release_agent_packages")),
  S("07 · Опалубка", "slab-full:07:labor:formwork", "labor", "Сборка, выверка, закрепление и распалубка", "man_hour", FF("formwork_labor")),
  S("07 · Опалубка", "slab-full:07:equipment:formwork-tools", "equipment", "Инструмент сборки и очистки опалубки", "machine_hour", FF("formwork_tools")),

  S("08 · Армирование и закладные", "slab-full:08:material:rebar-d12", "material", "Арматура A500C Ø12 по предварительному бюджетному профилю", "kg", FF("rebar_d12"), PRELIMINARY, { titleParameterIds: ["reinforcement_designation"] }),
  S("08 · Армирование и закладные", "slab-full:08:material:rebar-d16", "material", "Арматура A500C Ø16 по предварительному бюджетному профилю", "kg", FF("rebar_d16"), PRELIMINARY, { titleParameterIds: ["reinforcement_designation"] }),
  S("08 · Армирование и закладные", "slab-full:08:consumable:binding-wire-coils", "consumable", "Вязальная проволока, бухта 50 кг", "item", FF("binding_wire_coils")),
  S("08 · Армирование и закладные", "slab-full:08:component:spacer-packs", "component", "Фиксаторы защитного слоя, упаковка 100 шт.", "item", FF("spacer_packages")),
  S("08 · Армирование и закладные", "slab-full:08:component:chair-packs", "component", "Поддерживающие каркасы верхней сетки, упаковка 50 шт.", "item", FF("chair_packages")),
  S("08 · Армирование и закладные", "slab-full:08:consumable:cutting-discs", "consumable", "Отрезные диски для арматурных работ", "item", FF("cutting_discs")),
  S("08 · Армирование и закладные", "slab-full:08:labor:reinforcement", "labor", "Резка, гибка, сборка и вязка арматурных сеток", "man_hour", FF("rebar_labor")),
  S("08 · Армирование и закладные", "slab-full:08:equipment:rebar-tools", "equipment", "Станок и электроинструмент арматурных работ", "machine_hour", FF("rebar_tools")),
  S("08 · Армирование и закладные", "slab-full:08:component:pvc-sleeves", "component", "ПВХ-гильзы инженерных вводов", "item", FF("sleeves")),
  S("08 · Армирование и закладные", "slab-full:08:component:grounding-strip", "component", "Стальная полоса контура заземления", "m", FF("grounding_strip")),
  S("08 · Армирование и закладные", "slab-full:08:component:grounding-connectors", "component", "Соединители и сварные узлы полосы заземления", "item", FF("grounding_connectors")),
  S("08 · Армирование и закладные", "slab-full:08:labor:embeds", "labor", "Установка гильз, закладных и контура заземления", "man_hour", FF("embeds_labor")),

  S("09 · Бетонирование плиты", "slab-full:09:material:ready-mix", "material", "Товарный бетон для фундаментной плиты", "m3", FF("main_concrete_order"), CONCRETE, { titleParameterIds: ["main_concrete_designation"] }),
  S("09 · Бетонирование плиты", "slab-full:09:consumable:pump-primer", "consumable", "Пусковая смесь для бетоновода, мешок", "item", FF("pump_primer_bags"), CONCRETE),
  S("09 · Бетонирование плиты", "slab-full:09:labor:place-concrete", "labor", "Приём, распределение, уплотнение и отделка бетона плиты", "man_hour", FF("main_concrete_labor"), CONCRETE),
  S("09 · Бетонирование плиты", "slab-full:09:equipment:concrete-pump", "equipment", "Автобетононасос", "machine_hour", FF("main_pump"), CONCRETE),
  S("09 · Бетонирование плиты", "slab-full:09:equipment:deep-vibrator", "equipment", "Глубинный вибратор", "machine_hour", FF("main_vibrator"), CONCRETE),
  S("09 · Бетонирование плиты", "slab-full:09:equipment:laser-screed", "equipment", "Виброрейка или лазерный бетоноукладчик", "machine_hour", FF("laser_screed"), CONCRETE),
  S("09 · Бетонирование плиты", "slab-full:09:delivery:mixer-trips", "delivery", "Рейсы автобетоносмесителей", "trip", FF("main_concrete_trips"), CONCRETE),
  S("09 · Бетонирование плиты", "slab-full:09:delivery:ready-mix-distance", "delivery", "Доставка бетона по маршруту поставщика", "m3_km", FF("main_concrete_ton_km"), CONCRETE),
  S("09 · Бетонирование плиты", "slab-full:09:equipment:mixer-truck-time", "equipment", "Работа автобетоносмесителей по принятому циклу", "machine_hour", FF("main_concrete_truck_hours"), CONCRETE),

  S("10 · Уход за бетоном", "slab-full:10:material:liquid-curing-packages", "material", "Sika Antisol A, готовый состав для ухода, канистра 20 л", "item", FF("curing_liquid_packages"), ANTISOL, { inclusionAst: liquidCuringSelected }),
  S("10 · Уход за бетоном", "slab-full:10:control:liquid-curing-net", "control", "Расчётный объём состава для ухода до округления", "l", FF("curing_liquid_net"), ANTISOL, { costTreatment: "INFORMATIONAL_SCOPE", procurementEligible: false, inclusionAst: liquidCuringSelected }),
  S("10 · Уход за бетоном", "slab-full:10:control:liquid-curing-remainder", "control", "Остаток состава для ухода после округления до канистр", "l", FF("curing_liquid_remainder"), ANTISOL, { costTreatment: "INFORMATIONAL_SCOPE", procurementEligible: false, inclusionAst: liquidCuringSelected }),
  S("10 · Уход за бетоном", "slab-full:10:material:curing-sheet-rolls", "material", "Полиэтиленовая плёнка для ухода, рулон 100 м²", "item", FF("curing_sheet_rolls"), CURING, { inclusionAst: sheetCuringSelected }),
  S("10 · Уход за бетоном", "slab-full:10:component:curing-sheet-tape", "component", "Лента фиксации плёнки, рулон 50 м", "item", FF("curing_sheet_tape_rolls"), CURING, { inclusionAst: sheetCuringSelected }),
  S("10 · Уход за бетоном", "slab-full:10:material:curing-water", "material", "Вода для влажностного ухода по принятой длительности", "l", FF("curing_water"), CURING, { inclusionAst: waterCuringSelected }),
  S("10 · Уход за бетоном", "slab-full:10:labor:cure", "labor", "Устройство и поддержание выбранной системы ухода", "man_hour", FF("curing_labor"), CURING),
  S("10 · Уход за бетоном", "slab-full:10:equipment:sprayer", "equipment", "Распылитель или оборудование выбранного способа ухода", "machine_hour", FF("curing_sprayer"), CURING),

  S("11 · Контроль и исполнительные материалы", "slab-full:11:consumable:test-sets", "consumable", "Комплекты отбора проб бетона по партиям контроля", "test", FF("qa_lots"), CONCRETE),
  S("11 · Контроль и исполнительные материалы", "slab-full:11:control:delivery-checks", "control", "Входной контроль каждой поставки бетонной смеси", "test", FF("qa_delivery_checks"), CONCRETE, { costTreatment: "CONTROL_OR_DOCUMENT", procurementEligible: false }),
  S("11 · Контроль и исполнительные материалы", "slab-full:11:labor:quality-control", "labor", "Контроль поставок, укладки и партий испытаний", "man_hour", FF("qa_labor"), CONCRETE),
  S("11 · Контроль и исполнительные материалы", "slab-full:11:document:quality-pack", "document", "Комплект накладных, паспортов, протоколов и исполнительных записей", "document", FF("quality_documents"), CONCRETE, { costTreatment: "CONTROL_OR_DOCUMENT", procurementEligible: false }),

  S("12 · Завершение", "slab-full:12:material:repair-mortar-bags", "material", "Sika MonoTop-4012, ремонтный раствор R4, мешок 25 кг", "item", FF("repair_mortar_bags"), REPAIR),
  S("12 · Завершение", "slab-full:12:consumable:repair-water", "consumable", "Вода затворения ремонтного раствора", "l", FF("repair_water"), REPAIR),
  S("12 · Завершение", "slab-full:12:labor:defect-repair", "labor", "Подготовка и локальный ремонт выявленных дефектов", "man_hour", FF("repair_labor"), REPAIR),
  S("12 · Завершение", "slab-full:12:equipment:repair-tools", "equipment", "Инструмент подготовки и нанесения ремонтного состава", "machine_hour", FF("repair_tools"), REPAIR),
  S("12 · Завершение", "slab-full:12:control:repair-net", "control", "Расчётная нетто-масса ремонтного раствора", "kg", FF("repair_mortar_net"), REPAIR, { costTreatment: "INFORMATIONAL_SCOPE", procurementEligible: false }),
  S("12 · Завершение", "slab-full:12:control:repair-remainder", "control", "Сухой остаток после округления до мешков", "kg", FF("repair_mortar_remainder"), REPAIR, { costTreatment: "INFORMATIONAL_SCOPE", procurementEligible: false }),
  S("12 · Завершение", "slab-full:12:material:selected-backfill-soil", "material", "Отобранный пригодный грунт из котлована для обратной засыпки", "m3", FF("backfill"), PRELIMINARY, { costTreatment: "INFORMATIONAL_SCOPE", procurementEligible: false }),
  S("12 · Завершение", "slab-full:12:labor:backfill", "labor", "Обратная засыпка и послойное уплотнение", "man_hour", FF("backfill_labor")),
  S("12 · Завершение", "slab-full:12:equipment:compactor", "equipment", "Механизм уплотнения обратной засыпки", "machine_hour", FF("backfill_compactor")),
  S("12 · Завершение", "slab-full:12:delivery:waste-trips", "delivery", "Рейсы вывоза строительных отходов", "trip", FF("waste_trips")),
  S("12 · Завершение", "slab-full:12:waste:volume", "waste", "Сбор и погрузка строительных отходов", "m3", FF("waste_volume")),
  S("12 · Завершение", "slab-full:12:labor:cleanup", "labor", "Финальная уборка, планировка и передача фронта", "man_hour", FF("cleanup_labor")),
  S("12 · Завершение", "slab-full:12:service:demobilization", "service", "Демобилизация временного обеспечения", "service", FF("single")),
]);

export const SLAB_FOUNDATION_FULL_CYCLE_S2719_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  RESOURCE_SPECS.map((spec, ordinal) => resource(spec, ordinal)),
);

export const SLAB_FOUNDATION_FULL_CYCLE_S2719_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  contract: "rik-expo-app.s27-19.slab-foundation-full-cycle-completeness.v1",
  sourceKind: "INDEPENDENT_MASTER_STAGE_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_PACK_SHA256,
  sourcePackPath: "data/estimate-benchmarks/source-packs/slab-foundation-full-cycle-s27-19.json",
  entries: sourcePack.independentRequiredComponents.map((component) => ({
    ...component,
    expectedResourceIds: [...component.requiredRowIds],
    detailPrinciple: "Every independently listed stage component has its own visible resource row.",
  })),
});

export function slabFullCycleMissingRequiredRows(
  rowIds: ReadonlySet<string>,
  options: Readonly<{
    drainageSelected?: boolean;
    waterproofingSelected?: boolean;
    insulationSelected?: boolean;
  }> = {},
): string[] {
  const includedSemanticKeys = new Set<string>();
  if (options.drainageSelected === false) includedSemanticKeys.add("stage03.drainage");
  if (options.waterproofingSelected === false) includedSemanticKeys.add("stage06.waterproofing");
  if (options.insulationSelected === false) includedSemanticKeys.add("stage06.insulation");
  return SLAB_FOUNDATION_FULL_CYCLE_S2719_INDEPENDENT_COMPLETENESS_MAP.entries
    .filter((entry) => !includedSemanticKeys.has(entry.semanticKey))
    .flatMap((entry) => entry.requiredRowIds)
    .filter((rowId) => !rowIds.has(rowId));
}

export function deriveSlabFoundationPlanPerimeterS2719(
  areaM2: number,
  aspectRatio = Number(SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_INPUT.plan_aspect_ratio),
): number {
  if (!Number.isFinite(areaM2) || areaM2 <= 0
    || !Number.isFinite(aspectRatio) || aspectRatio <= 0) return Number.NaN;
  return 2 * (Math.sqrt(areaM2 * aspectRatio) + Math.sqrt(areaM2 / aspectRatio));
}

export async function compileSlabFoundationFullCycleS2719(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? SLAB_FOUNDATION_FULL_CYCLE_S2719_CATALOG_ID;
  if (![SLAB_FOUNDATION_FULL_CYCLE_S2719_CATALOG_ID,
    SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_CATALOG_ID].includes(catalogId)) {
    throw new Error(`SLAB_FOUNDATION_FULL_CYCLE_S2719_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  const areaM2 = Number(submittedParameters.slab_area_m2);
  const aspectRatio = Number(submittedParameters.plan_aspect_ratio
    ?? SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_INPUT.plan_aspect_ratio);
  const derivedPerimeter = deriveSlabFoundationPlanPerimeterS2719(areaM2, aspectRatio);
  const confirmedParameters: Record<string, unknown> = {
    ...SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_INPUT,
    plan_perimeter_override_selected: submittedParameters.plan_perimeter_override_selected
      ?? submittedParameters.plan_perimeter_m != null,
    ...(submittedParameters.plan_perimeter_m == null && Number.isFinite(derivedPerimeter)
      ? { plan_perimeter_m: derivedPerimeter }
      : {}),
  };
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.slab-foundation-full-cycle-s27-19.v1",
    catalogId,
    primaryMeasureParameterId: "slab_area_m2",
    parameterDefinitions: [...SLAB_FOUNDATION_FULL_CYCLE_S2719_PARAMETERS],
    formulaDefinitions: [...SLAB_FOUNDATION_FULL_CYCLE_S2719_FORMULAS],
    resourceDefinitions: [...SLAB_FOUNDATION_FULL_CYCLE_S2719_RESOURCES],
    submittedParameters,
    confirmedParameters,
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: SLAB_FOUNDATION_FULL_CYCLE_S2719_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
