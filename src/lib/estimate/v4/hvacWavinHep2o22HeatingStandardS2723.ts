import sourcePack from "../../../../data/estimate-benchmarks/source-packs/hvac-wavin-hep2o22-heating-standard-s27-23.json";

import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type RuntimeClass = "NORMATIVE" | "ASSUMPTION";
type ValueType = "decimal" | "integer" | "text" | "enum";
type ResourceKind =
  | "operation" | "labor" | "material" | "component" | "fastener"
  | "consumable" | "equipment" | "delivery" | "control" | "service";

export const HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_CATALOG_ID =
  "canonical-work:base:heating_hvac_interior_heating_pipe_install_standard";
export const HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_ID =
  "hvac_wavin_hep2o22_heating_standard_s27_23";
export const HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_NORM_ID =
  "WAVIN-HEP2O-22-HEATING-STANDARD-S27-23-PRELIMINARY-R1";
export const HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_PACK_SHA256 =
  "44d5afd73b7e0f4432f858a08bbb0033fa90ce1a9818b92547ed12b6abcaf5ac";

const PROFILE = sourcePack.selectedPreliminaryProfile;
const WAVIN_GUIDE = "WAVIN_HEP2O_INSTALLER_GUIDE_2026_10_01";
const WAVIN_HOW_TO = "WAVIN_HEP2O_HOW_TO_INSTALL_2026_10_01";
const WAVIN_PIPE = "WAVIN_HEP2O_BARRIER_PIPE_22X6_PRODUCT_2026_10_01";
const KG_KRER18 = "KG_KRER_18_2015_OFFICIAL";
const PRELIMINARY = "S27_23_VISIBLE_HEP2O22_HEATING_PLANNING_PROFILE";

export const HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RUNTIME_INPUT = Object.freeze({
  pipe_section_length_m: PROFILE.pipeSectionLengthM,
  pipe_bundle_item: PROFILE.pipeBundleItem,
  pipe_outer_diameter_mm: PROFILE.pipeOuterDiameterMm,
  pipe_wall_thickness_mm: PROFILE.pipeWallThicknessMm,
  pipe_expected_waste_percent: PROFILE.pipeExpectedWastePercent,
  pipe_reserve_percent: PROFILE.pipeReservePercent,
  support_maximum_span_m: PROFILE.supportMaximumSpanM,
  support_package_item: PROFILE.supportPackageItem,
  anchor_package_item: PROFILE.anchorPackageItem,
  screw_package_item: PROFILE.screwPackageItem,
  drill_productivity_point_per_machine_hour: PROFILE.drillProductivityPointPerMachineHour,
  drill_bit_capacity_point: PROFILE.drillBitCapacityPoint,
  cutting_productivity_m_per_shift: PROFILE.cuttingProductivityMPerShift,
  cutter_blade_capacity_cut: PROFILE.cutterBladeCapacityCut,
  cleaning_wipe_per_prepared_end: PROFILE.cleaningWipePerPreparedEnd,
  cleaning_wipe_package_item: PROFILE.cleaningWipePackageItem,
  threaded_adapter_per_ptfe_roll: PROFILE.threadedAdapterPerPtfeRoll,
  route_productivity_m_per_man_hour: PROFILE.routeProductivityMPerManHour,
  end_preparation_productivity_per_man_hour: PROFILE.endPreparationProductivityPerManHour,
  node_productivity_item_per_man_hour: PROFILE.nodeProductivityItemPerManHour,
  support_productivity_point_per_man_hour: PROFILE.supportProductivityPointPerManHour,
  pressure_test_section_length_m: PROFILE.pressureTestSectionLengthM,
  pressure_test_h_per_section: PROFILE.pressureTestHPerSection,
  working_pressure_bar: PROFILE.workingPressureBar,
  low_pressure_test_bar: PROFILE.lowPressureTestBar,
  high_pressure_initial_pump_min: PROFILE.highPressureInitialPumpMin,
  test_hold_min: 45,
  fill_cycles: PROFILE.fillCycles,
  inhibitor_dose_l_per_m3: PROFILE.inhibitorDoseLPerM3,
  delivery_trip_count: PROFILE.deliveryTripCount,
  waste_removal_trip_count: PROFILE.wasteRemovalTripCount,
  working_height_m: PROFILE.workingHeightM,
  selected_system_reference: PROFILE.manufacturerSystem,
  service_profile: PROFILE.serviceProfile,
  substrate_profile: PROFILE.substrateProfile,
});

const NORMATIVE_IDS = new Set([
  "pipe_section_length_m", "pipe_bundle_item", "pipe_outer_diameter_mm",
  "pipe_wall_thickness_mm", "support_maximum_span_m", "high_pressure_initial_pump_min",
  "test_hold_min",
  "selected_system_reference", "service_profile",
]);

export const HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RUNTIME_CLASSIFICATION =
  Object.freeze(Object.fromEntries(
    Object.keys(HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RUNTIME_INPUT)
      .map((parameterId) => [parameterId, NORMATIVE_IDS.has(parameterId)
        ? "NORMATIVE" : "ASSUMPTION"]),
  ) as Readonly<Record<string, RuntimeClass>>);

export const HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RUNTIME_SOURCE_IDS =
  Object.freeze(Object.fromEntries(
    Object.keys(HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RUNTIME_INPUT)
      .map((parameterId) => [parameterId, [
        HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_ID,
      ]]),
  ) as Readonly<Record<string, readonly string[]>>);

export const HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SHORT_INPUT = Object.freeze({
  route_length_m: sourcePack.acceptanceFixture.routeLengthM,
});

export const HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_ACCEPTANCE_INPUT = Object.freeze({
  ...HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RUNTIME_INPUT,
  route_length_m: sourcePack.acceptanceFixture.routeLengthM,
  support_count: sourcePack.acceptanceFixture.supportCount,
  prepared_pipe_end_count: sourcePack.acceptanceFixture.preparedPipeEndCount,
  straight_connector_count: sourcePack.acceptanceFixture.straightConnectorCount,
  elbow_count: sourcePack.acceptanceFixture.elbowCount,
  tee_count: sourcePack.acceptanceFixture.teeCount,
  threaded_adapter_count: sourcePack.acceptanceFixture.threadedAdapterCount,
  stop_end_count: sourcePack.acceptanceFixture.stopEndCount,
});

export const HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_METADATA = Object.freeze({
  source_title: "Wavin Hep2O 22 mm Barrier internal-heating route",
  source_authority: "Wavin; Минстрой Кыргызской Республики; видимый профиль S27.23",
  source_document_version: "WAVIN_HEP2O_CAPTURE_2026_10_01_AND_S27_23_PROFILE_R1",
  definition_hash: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_PACK_SHA256,
  source_kind: "MANUFACTURER_SYSTEM_PLUS_OFFICIAL_KG_SCOPE_PLUS_VISIBLE_ASSUMPTIONS",
  official_url: sourcePack.sources[0].officialUrl,
  artifact_sha256: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_PACK_SHA256,
  effective_from: "2026-10-01",
  exact_locator: sourcePack.sources.map((source) => source.exactLocator).join(" | "),
  use_restriction: PROFILE.assumptionPolicy,
  source_pack_path:
    "data/estimate-benchmarks/source-packs/hvac-wavin-hep2o22-heating-standard-s27-23.json",
});

type ParameterDescriptor = Readonly<{
  id: string;
  title: string;
  unit: string | null;
  guide: string;
  type?: ValueType;
  min?: number;
  max?: number;
  values?: readonly string[];
}>;

const D = (
  id: string,
  title: string,
  unit: string | null,
  guide: string,
  options: Pick<ParameterDescriptor, "type" | "min" | "max" | "values"> = {},
): ParameterDescriptor => ({ id, title, unit, guide, ...options });

const PARAMETERS: readonly ParameterDescriptor[] = [
  D("route_length_m", "Длина трассы отопления", "m", "Измерить по оси фактической трассы.", { min: 0.001 }),
  D("support_count", "Опоры по проверенной раскладке", "item", "Ввести число опор из раскладки с учётом концов, узлов и препятствий.", { type: "integer", min: 0 }),
  D("prepared_pipe_end_count", "Подготовленные концы трубы", "item", "Посчитать концы трубы, входящие в фитинги; на каждый нужен SmartSleeve.", { type: "integer", min: 0 }),
  D("straight_connector_count", "Прямые соединители", "item", "Ввести из схемы соединений трассы.", { type: "integer", min: 0 }),
  D("elbow_count", "Отводы 90°", "item", "Ввести из геометрии трассы.", { type: "integer", min: 0 }),
  D("tee_count", "Тройники", "item", "Ввести из числа ответвлений.", { type: "integer", min: 0 }),
  D("threaded_adapter_count", "Резьбовые адаптеры", "item", "Ввести по границам присоединения.", { type: "integer", min: 0 }),
  D("stop_end_count", "Концевые заглушки", "item", "Ввести по проектным окончаниям.", { type: "integer", min: 0 }),
  D("pipe_section_length_m", "Длина прямого отрезка HXX06/22W", "m", "Официальный каталог Wavin: 6 м.", { min: 0.001 }),
  D("pipe_bundle_item", "Отрезков в заводской пачке", "item", "Официальная карточка Wavin: 20 отрезков.", { type: "integer", min: 1 }),
  D("pipe_outer_diameter_mm", "Наружный диаметр трубы", "mm", "Официальная карточка Wavin: 22 мм.", { min: 0.001 }),
  D("pipe_wall_thickness_mm", "Толщина стенки трубы", "mm", "Официальная карточка Wavin: 2,15 мм.", { min: 0.001 }),
  D("pipe_expected_waste_percent", "Ожидаемые потери трубы", "percent", "Видимое допущение на обрезки и безвозвратные потери; не смешивать с резервом.", { min: 0 }),
  D("pipe_reserve_percent", "Сохраняемый резерв трубы", "percent", "Видимый пригодный резерв после монтажа; не списывать как расход.", { min: 0 }),
  D("support_maximum_span_m", "Максимальный шаг опор", "m", "Wavin Table 3: 0,5 м для 22 мм горизонтальной трассы общего назначения.", { min: 0.001 }),
  D("support_package_item", "Опор в закупочной упаковке", "item", "Заменить упаковкой выбранного поставщика.", { type: "integer", min: 1 }),
  D("anchor_package_item", "Анкеров в упаковке", "item", "Заменить по основанию и выбранному крепежу.", { type: "integer", min: 1 }),
  D("screw_package_item", "Винтов в упаковке", "item", "Заменить по выбранной опоре.", { type: "integer", min: 1 }),
  D("drill_productivity_point_per_machine_hour", "Производительность сверления", "item_per_machine_hour", "Видимое допущение ППР.", { min: 0.001 }),
  D("drill_bit_capacity_point", "Ресурс комплекта буров", "item", "Точек крепления на комплект; видимое допущение.", { min: 1 }),
  D("cutting_productivity_m_per_shift", "Производительность раскроя", "m_per_shift", "Видимое допущение ППР.", { min: 0.001 }),
  D("cutter_blade_capacity_cut", "Ресурс лезвия трубореза", "item", "Отрезов на лезвие; видимое допущение.", { min: 1 }),
  D("cleaning_wipe_per_prepared_end", "Салфеток на подготовленный конец", "item", "Видимый расход чистой подготовки.", { min: 0 }),
  D("cleaning_wipe_package_item", "Салфеток в упаковке", "item", "Закупочная упаковка.", { type: "integer", min: 1 }),
  D("threaded_adapter_per_ptfe_roll", "Резьбовых адаптеров на рулон PTFE", "item", "Видимая закупочная вместимость.", { min: 1 }),
  D("route_productivity_m_per_man_hour", "Производительность прокладки", "m_per_man_hour", "Видимое допущение ППР.", { min: 0.001 }),
  D("end_preparation_productivity_per_man_hour", "Производительность подготовки концов", "item_per_man_hour", "Видимое допущение ППР.", { min: 0.001 }),
  D("node_productivity_item_per_man_hour", "Производительность монтажа узлов", "item_per_man_hour", "Видимое допущение ППР.", { min: 0.001 }),
  D("support_productivity_point_per_man_hour", "Производительность монтажа опор", "item_per_man_hour", "Видимое допущение ППР.", { min: 0.001 }),
  D("pressure_test_section_length_m", "Длина участка испытания", "m", "Заменить программой испытаний.", { min: 0.001 }),
  D("pressure_test_h_per_section", "Насосо-часы на участок", "machine_hour", "Заменить программой испытаний.", { min: 0 }),
  D("working_pressure_bar", "Максимальное рабочее давление", "bar", "Предварительное значение; заменить проектным.", { min: 0.001 }),
  D("low_pressure_test_bar", "Давление низкого испытания", "bar", "Wavin допускает диапазон 0,5–1 бар; выбранное значение видно и редактируется.", { min: 0.5, max: 1 }),
  D("high_pressure_initial_pump_min", "Начальная подкачка высокого испытания", "min", "Wavin: подача высокого испытательного давления не менее 15 минут.", { min: 15 }),
  D("test_hold_min", "Выдержка испытания", "min", "Wavin: контроль 45 минут.", { min: 0 }),
  D("fill_cycles", "Число заполнений", "item", "Видимое допущение пусковой процедуры.", { type: "integer", min: 1 }),
  D("inhibitor_dose_l_per_m3", "Доза ингибитора", "l_per_m3", "Плановое значение; заменить паспортом выбранного ингибитора.", { min: 0 }),
  D("delivery_trip_count", "Рейсы доставки", "trip", "Видимое логистическое допущение.", { type: "integer", min: 0 }),
  D("waste_removal_trip_count", "Рейсы вывоза отходов", "trip", "Видимое логистическое допущение.", { type: "integer", min: 0 }),
  D("working_height_m", "Рабочая высота", "m", "Предварительная доступная зона.", { min: 0.001 }),
  D("selected_system_reference", "Выбранная трубная система", null, "Wavin Hep2O 22 мм Barrier.", { type: "text" }),
  D("service_profile", "Профиль среды и прокладки", null, "Ограничивает применимость этого профиля.", { type: "enum", values: ["HEATING_WATER_HORIZONTAL_ACCESSIBLE_GENERAL_PURPOSE"] }),
  D("substrate_profile", "Основание креплений", null, "Определяет фактический анкер и винт.", { type: "enum", values: ["SOLID_MASONRY_PRELIMINARY", "CONCRETE", "HOLLOW_MASONRY", "TIMBER", "METAL", "PROJECT_DEFINED"] }),
];

const PROJECT_IDS = new Set([
  "route_length_m", "support_count", "prepared_pipe_end_count", "straight_connector_count",
  "elbow_count", "tee_count", "threaded_adapter_count", "stop_end_count",
]);

export const WAVIN_SELECTED_SUPPLIES = [
  { rowId: "02:material:pipe-bundles", effective: "wavin_effective_pipe_bundles",
    base: "ceil(ceil((route_length_m+route_length_m*pipe_expected_waste_percent/100)/pipe_section_length_m)/pipe_bundle_item)" },
  { rowId: "02:consumable:cutter-blades" },
  { rowId: "03:fastener:support-packages", effective: "wavin_effective_support_packages" },
  { rowId: "03:fastener:anchor-packages" }, { rowId: "03:fastener:screw-packages" },
  { rowId: "03:consumable:drill-bits" }, { rowId: "04:component:smartsleeves" },
  { rowId: "04:consumable:wipe-packages" }, { rowId: "05:component:straight-connectors" },
  { rowId: "05:component:elbows" }, { rowId: "05:component:tees" },
  { rowId: "05:component:threaded-adapters" }, { rowId: "05:component:stop-ends" },
  { rowId: "05:consumable:ptfe" }, { rowId: "08:consumable:waste-bags" },
] as const;
export const WAVIN_FLUID_SUPPLIES = ["07:material:test-water", "07:material:fill-water", "07:material:inhibitor"] as const;

export const HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_PARAMETERS:
readonly CanonicalEstimateParameterDefinition[] = Object.freeze([...PARAMETERS.map(
  (descriptor, ordinal) => ({
    parameter_id: descriptor.id,
    ordinal,
    value_type: descriptor.type ?? "decimal",
    unit_id: descriptor.unit ?? null,
    title_ru: descriptor.title,
    required: true,
    default_value: null,
    constraints_json: {
      ...(descriptor.min == null ? {} : { min: descriptor.min }),
      ...(descriptor.max == null ? {} : { max: descriptor.max }),
      ...(descriptor.values ? { values: [...descriptor.values] } : {}),
    },
    truth_metadata: {
      contract: "rik-expo-app.s27-23.hvac-wavin-hep2o22-heating.v1",
      semantic_parameter_key: `hvac-wavin-hep2o22-heating-s27-23:${descriptor.id}`,
      visibility_role: "USER_INPUT",
      value_source_role: PROJECT_IDS.has(descriptor.id)
        ? "USER_OR_PROJECT_MEASURED"
        : "VISIBLE_NORMATIVE_OR_REPLACEABLE_PROFILE",
      input_origin_class: PROJECT_IDS.has(descriptor.id)
        ? "PROJECT_ROUTE_GEOMETRY"
        : "SELECTED_VISIBLE_PRELIMINARY_PROFILE",
      preliminary_compilation_allowed: descriptor.id !== "route_length_m",
      source_confirmation_required: false,
      hidden_default_forbidden: PROJECT_IDS.has(descriptor.id),
      runtime_profile_value: Object.prototype.hasOwnProperty.call(
        HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RUNTIME_INPUT,
        descriptor.id,
      ),
      synthetic: false,
      guide: {
        guide_kind: descriptor.id === "route_length_m" ? "MEASUREMENT_RULE" : "PRACTICE_REFERENCE",
        guide_short_ru: descriptor.guide,
        source_role: NORMATIVE_IDS.has(descriptor.id)
          ? "PRIMARY_MANUFACTURER_PRODUCT_OR_METHOD"
          : PROJECT_IDS.has(descriptor.id)
            ? "PROJECT_ROUTE_GEOMETRY"
            : "VISIBLE_REPLACEABLE_PLANNING_ASSUMPTION",
        source_document: NORMATIVE_IDS.has(descriptor.id) ? WAVIN_GUIDE : PRELIMINARY,
        source_locator: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_METADATA.exact_locator,
        guide_version: "hvac-wavin-hep2o22-heating-standard-s27-23-r1",
        source_snapshot_hash: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_PACK_SHA256,
        applicability: PROFILE.assumptionPolicy,
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "FIRST_ESTIMATE_NOW_THEN_REPLACE_VISIBLE_ASSUMPTIONS_AND_ROUTE_COUNTS",
      },
    },
  })), ...WAVIN_SELECTED_SUPPLIES.filter(supply => "effective" in supply).map((supply, index) => ({
    parameter_id: "effective" in supply ? supply.effective : "", ordinal: PARAMETERS.length + index,
    value_type: "decimal", unit_id: "item", title_ru: "Действительное количество выбранных единиц поставки",
    required: false, default_value: null, constraints_json: { min: 0 },
    truth_metadata: { visibility_role: "INTERNAL_ONLY", value_source_role: "BACKEND_DERIVED",
      effective_resource_quantity_v1: { sourceRowId: `hvac-hep2o22:${supply.rowId}`, unitId: "item" } },
  })), ],
);

function formula(id: string, unit: string, expression: string): CanonicalEstimateFormulaDefinition {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: `hvac_wavin_hep2o22_${id}_s2723`,
    output_unit_id: unit,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: estimateDeterministicHash(compiled.ast),
  };
}

const F = (id: string, unit: string, expression: string) => formula(id, unit, expression);
const EXPECTED_WASTE = "route_length_m*pipe_expected_waste_percent/100";
const RESERVE = "route_length_m*pipe_reserve_percent/100";
const GROSS = `route_length_m+(${EXPECTED_WASTE})+(${RESERVE})`;
const SECTIONS = `ceil((${GROSS})/pipe_section_length_m)`;
const BUNDLES = `ceil((${SECTIONS})/pipe_bundle_item)`;
const ORDERED_SECTIONS = "wavin_effective_pipe_bundles*pipe_bundle_item";
const ORDERED_LENGTH = `(${ORDERED_SECTIONS})*pipe_section_length_m`;
const INTERNAL_DIAMETER = "pipe_outer_diameter_mm-2*pipe_wall_thickness_mm";
const INTERNAL_L_PER_M = `((${INTERNAL_DIAMETER})*(${INTERNAL_DIAMETER})*3.141592653589793/4)/1000`;
const SYSTEM_VOLUME = `route_length_m*(${INTERNAL_L_PER_M})/1000`;
const NODE_ITEMS = "straight_connector_count+elbow_count+tee_count+threaded_adapter_count+stop_end_count";

export const HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  F("route", "m", "route_length_m"),
  F("single", "service", "1"),
  F("pipe_expected_waste", "m", EXPECTED_WASTE),
  F("pipe_reserve", "m", RESERVE),
  F("required_sections", "item", SECTIONS),
  F("pipe_bundles", "item", BUNDLES),
  F("ordered_sections", "item", ORDERED_SECTIONS),
  F("ordered_length", "m", ORDERED_LENGTH),
  F("available_before_losses", "m", `max(0,${ORDERED_LENGTH}-route_length_m)`),
  F("pipe_remainder", "m", `max(0,${ORDERED_LENGTH}-route_length_m-(${EXPECTED_WASTE}))`),
  F("pipe_inside_diameter", "mm", INTERNAL_DIAMETER),
  F("system_volume", "m3", SYSTEM_VOLUME),
  F("cutting_shifts", "shift", "ceil(route_length_m/cutting_productivity_m_per_shift)"),
  F("cutter_blades", "item", `ceil((${SECTIONS})/cutter_blade_capacity_cut)`),
  F("supports", "item", "support_count"),
  F("support_max_span", "m", "support_maximum_span_m"),
  F("support_packages", "item", "ceil(support_count/support_package_item)"),
  F("anchor_packages", "item", "ceil(support_count/anchor_package_item)"),
  F("screw_packages", "item", "ceil(support_count/screw_package_item)"),
  F("support_order", "item", "wavin_effective_support_packages*support_package_item"),
  F("support_remainder", "item", "max(0,wavin_effective_support_packages*support_package_item-support_count)"),
  F("support_machine_hours", "machine_hour", "support_count/drill_productivity_point_per_machine_hour"),
  F("drill_bits", "item", "ceil(support_count/drill_bit_capacity_point)"),
  F("prepared_ends", "item", "prepared_pipe_end_count"),
  F("wipes", "item", "ceil(prepared_pipe_end_count*cleaning_wipe_per_prepared_end)"),
  F("wipe_packages", "item", "ceil(prepared_pipe_end_count*cleaning_wipe_per_prepared_end/cleaning_wipe_package_item)"),
  F("end_labor", "man_hour", "prepared_pipe_end_count/end_preparation_productivity_per_man_hour"),
  F("straight_connectors", "item", "straight_connector_count"),
  F("elbows", "item", "elbow_count"),
  F("tees", "item", "tee_count"),
  F("threaded_adapters", "item", "threaded_adapter_count"),
  F("stop_ends", "item", "stop_end_count"),
  F("ptfe_rolls", "item", "ceil(threaded_adapter_count/threaded_adapter_per_ptfe_roll)"),
  F("node_labor", "man_hour", `(${NODE_ITEMS})/node_productivity_item_per_man_hour`),
  F("route_labor", "man_hour", "route_length_m/route_productivity_m_per_man_hour"),
  F("support_labor", "man_hour", "support_count/support_productivity_point_per_man_hour"),
  F("test_sections", "test", "ceil(route_length_m/pressure_test_section_length_m)"),
  F("low_test_pressure", "bar", "low_pressure_test_bar"),
  F("test_pressure", "bar", "working_pressure_bar*1.5"),
  F("reduced_test_pressure", "bar", "working_pressure_bar*1.5/3"),
  F("high_pressure_initial_pump", "min", "high_pressure_initial_pump_min"),
  F("test_pump_hours", "machine_hour", "ceil(route_length_m/pressure_test_section_length_m)*pressure_test_h_per_section"),
  F("test_water", "m3", SYSTEM_VOLUME),
  F("fill_water", "m3", `(${SYSTEM_VOLUME})*fill_cycles`),
  F("inhibitor", "l", `(${SYSTEM_VOLUME})*inhibitor_dose_l_per_m3`),
  F("test_hold", "min", "test_hold_min"),
  F("delivery", "trip", "delivery_trip_count"),
  F("waste_bags", "item", "ceil(route_length_m/50)"),
  F("waste_delivery", "trip", "waste_removal_trip_count"),
]);

type ResourceSpec = Readonly<{
  stage: string;
  rowId: string;
  kind: ResourceKind;
  title: string;
  unit: string;
  formula: string;
  source: string;
  procurement?: boolean;
  informational?: boolean;
  titleParameterIds?: readonly string[];
}>;

const id = (short: string) => `hvac_wavin_hep2o22_${short}_s2723`;
const R = (
  stage: string,
  rowId: string,
  kind: ResourceKind,
  title: string,
  unit: string,
  shortFormula: string,
  source: string,
  options: Pick<ResourceSpec, "procurement" | "informational" | "titleParameterIds"> = {},
): ResourceSpec => ({ stage, rowId, kind, title, unit, formula: id(shortFormula), source, ...options });

const RESOURCE_SPECS: readonly ResourceSpec[] = [
  R("01 · Трасса", "hvac-hep2o22:01:operation:route-survey", "operation", "Обследование и обмер внутренней отопительной трассы", "m", "route", KG_KRER18),
  R("01 · Трасса", "hvac-hep2o22:01:operation:route-layout", "operation", "Разметка оси, опор, фитингов и границ подключения", "m", "route", KG_KRER18),
  R("01 · Трасса", "hvac-hep2o22:01:control:system-applicability", "control", "Проверка Hep2O 22 мм по температуре, давлению, тепловому источнику и способу прокладки", "service", "single", WAVIN_GUIDE, { informational: true }),

  R("02 · Труба и раскрой", "hvac-hep2o22:02:control:pipe-inside-diameter", "control", "Проверка положительного внутреннего диаметра: наружный диаметр минус две стенки", "mm", "pipe_inside_diameter", WAVIN_PIPE, { informational: true }),
  R("02 · Труба и раскрой", "hvac-hep2o22:02:material:pipe-net", "material", "Труба Wavin Hep2O Barrier HXX06/22W — чистая длина", "m", "route", WAVIN_PIPE, { informational: true }),
  R("02 · Труба и раскрой", "hvac-hep2o22:02:material:pipe-expected-waste", "material", "Ожидаемые безвозвратные потери трубы при раскрое", "m", "pipe_expected_waste", PRELIMINARY, { informational: true }),
  R("02 · Труба и раскрой", "hvac-hep2o22:02:material:pipe-reserve", "material", "Требуемый сохраняемый резерв трубы после монтажа", "m", "pipe_reserve", PRELIMINARY, { informational: true }),
  R("02 · Труба и раскрой", "hvac-hep2o22:02:control:required-sections", "control", "Требуемые отрезки с потерями и сохраняемым резервом; выбранная длина, м", "item", "required_sections", WAVIN_PIPE, { informational: true, titleParameterIds: ["pipe_section_length_m"] }),
  R("02 · Труба и раскрой", "hvac-hep2o22:02:material:pipe-bundles", "material", "Заводские пачки HXX06/22W; отрезков в пачке", "item", "pipe_bundles", WAVIN_PIPE, { procurement: true, titleParameterIds: ["pipe_bundle_item"] }),
  R("02 · Труба и раскрой", "hvac-hep2o22:02:control:ordered-sections", "control", "Количество отрезков в заказанных пачках", "item", "ordered_sections", WAVIN_PIPE, { informational: true }),
  R("02 · Труба и раскрой", "hvac-hep2o22:02:control:ordered-length", "control", "Заказанная длина трубы", "m", "ordered_length", WAVIN_PIPE, { informational: true }),
  R("02 · Труба и раскрой", "hvac-hep2o22:02:control:available-before-losses", "control", "Прогноз превышения поставленной длины над монтажом до ожидаемых потерь; пригодность не подтверждена", "m", "available_before_losses", WAVIN_PIPE, { informational: true }),
  R("02 · Труба и раскрой", "hvac-hep2o22:02:control:pipe-remainder", "control", "Прогноз остатка после монтажа и ожидаемых потерь, включая сохраняемый резерв; пригодность не подтверждена", "m", "pipe_remainder", WAVIN_PIPE, { informational: true }),
  R("02 · Труба и раскрой", "hvac-hep2o22:02:control:system-volume", "control", "Расчётный внутренний объём выбранной трубы", "m3", "system_volume", WAVIN_PIPE, { informational: true }),
  R("02 · Труба и раскрой", "hvac-hep2o22:02:operation:cutting", "operation", "Разметка, прямоугольный рез и удаление заусенцев", "item", "required_sections", WAVIN_GUIDE),
  R("02 · Труба и раскрой", "hvac-hep2o22:02:equipment:pipe-cutter", "equipment", "Труборез Wavin или совместимый", "shift", "cutting_shifts", WAVIN_GUIDE, { procurement: true }),
  R("02 · Труба и раскрой", "hvac-hep2o22:02:consumable:cutter-blades", "consumable", "Сменные лезвия трубореза", "item", "cutter_blades", PRELIMINARY, { procurement: true }),

  R("03 · Опоры", "hvac-hep2o22:03:fastener:supports", "fastener", "Винтовые клипсы Wavin HX85/22W по проверенной раскладке", "item", "supports", WAVIN_GUIDE, { informational: true }),
  R("03 · Опоры", "hvac-hep2o22:03:fastener:support-packages", "fastener", "Упаковки клипс Wavin HX85/22W; клипс в упаковке", "item", "support_packages", PRELIMINARY, { procurement: true, titleParameterIds: ["support_package_item"] }),
  R("03 · Опоры", "hvac-hep2o22:03:fastener:anchor-packages", "fastener", "Упаковки анкеров по фактическому основанию", "item", "anchor_packages", PRELIMINARY, { procurement: true }),
  R("03 · Опоры", "hvac-hep2o22:03:fastener:screw-packages", "fastener", "Упаковки совместимых винтов для клипс", "item", "screw_packages", PRELIMINARY, { procurement: true }),
  R("03 · Опоры", "hvac-hep2o22:03:control:support-max-span", "control", "Максимальный шаг общей горизонтальной раскладки 22 мм", "m", "support_max_span", WAVIN_GUIDE, { informational: true }),
  R("03 · Опоры", "hvac-hep2o22:03:control:support-order", "control", "Заказанное количество клипс после округления упаковки", "item", "support_order", PRELIMINARY, { informational: true }),
  R("03 · Опоры", "hvac-hep2o22:03:control:support-remainder", "control", "Прогноз превышения поставленных клипс над раскладкой; пригодность не подтверждена", "item", "support_remainder", PRELIMINARY, { informational: true }),
  R("03 · Опоры", "hvac-hep2o22:03:operation:drill-and-fix", "operation", "Сверление основания и монтаж опор", "item", "supports", KG_KRER18),
  R("03 · Опоры", "hvac-hep2o22:03:equipment:rotary-hammer", "equipment", "Перфоратор или дрель по фактическому основанию", "machine_hour", "support_machine_hours", PRELIMINARY, { procurement: true }),
  R("03 · Опоры", "hvac-hep2o22:03:consumable:drill-bits", "consumable", "Комплекты буров или свёрл", "item", "drill_bits", PRELIMINARY, { procurement: true }),

  R("04 · Подготовка концов", "hvac-hep2o22:04:operation:prepare-ends", "operation", "Прямой рез, очистка и проверка каждого конца трубы", "item", "prepared_ends", WAVIN_HOW_TO),
  R("04 · Подготовка концов", "hvac-hep2o22:04:component:smartsleeves", "component", "Опорные втулки Wavin SmartSleeve HX60/22W", "item", "prepared_ends", WAVIN_GUIDE, { procurement: true }),
  R("04 · Подготовка концов", "hvac-hep2o22:04:consumable:cleaning-wipes", "consumable", "Безворсовые салфетки — расчётная потребность", "item", "wipes", PRELIMINARY, { informational: true }),
  R("04 · Подготовка концов", "hvac-hep2o22:04:consumable:wipe-packages", "consumable", "Упаковки безворсовых салфеток", "item", "wipe_packages", PRELIMINARY, { procurement: true }),
  R("04 · Подготовка концов", "hvac-hep2o22:04:labor:end-preparation", "labor", "Труд подготовки концов и установки SmartSleeve", "man_hour", "end_labor", PRELIMINARY),
  R("04 · Подготовка концов", "hvac-hep2o22:04:control:joint-recognition", "control", "Проверка полной посадки In4Sure и обратным натяжением", "item", "prepared_ends", WAVIN_GUIDE, { informational: true }),
  R("04 · Подготовка концов", "hvac-hep2o22:04:control:no-extra-lubricant", "control", "Дополнительная смазка не закупается: фитинги предварительно смазаны", "service", "single", WAVIN_GUIDE, { informational: true }),

  R("05 · Узлы трассы", "hvac-hep2o22:05:component:straight-connectors", "component", "Прямые соединители Wavin HD1/22W", "item", "straight_connectors", WAVIN_GUIDE, { procurement: true }),
  R("05 · Узлы трассы", "hvac-hep2o22:05:component:elbows", "component", "Отводы 90° Wavin HD5/22W", "item", "elbows", WAVIN_GUIDE, { procurement: true }),
  R("05 · Узлы трассы", "hvac-hep2o22:05:component:tees", "component", "Равнопроходные тройники Wavin HD10/22W", "item", "tees", WAVIN_GUIDE, { procurement: true }),
  R("05 · Узлы трассы", "hvac-hep2o22:05:component:threaded-adapters", "component", "Резьбовые адаптеры Wavin 22 мм по границам подключения", "item", "threaded_adapters", WAVIN_GUIDE, { procurement: true }),
  R("05 · Узлы трассы", "hvac-hep2o22:05:component:stop-ends", "component", "Концевые заглушки Wavin HD62/22W", "item", "stop_ends", WAVIN_GUIDE, { procurement: true }),
  R("05 · Узлы трассы", "hvac-hep2o22:05:operation:straight-connectors", "operation", "Монтаж прямых push-fit соединителей", "item", "straight_connectors", WAVIN_GUIDE),
  R("05 · Узлы трассы", "hvac-hep2o22:05:operation:elbows", "operation", "Монтаж отводов push-fit", "item", "elbows", WAVIN_GUIDE),
  R("05 · Узлы трассы", "hvac-hep2o22:05:operation:tees", "operation", "Монтаж тройников push-fit", "item", "tees", WAVIN_GUIDE),
  R("05 · Узлы трассы", "hvac-hep2o22:05:operation:threaded-adapters", "operation", "Монтаж резьбовых адаптеров на границах", "item", "threaded_adapters", WAVIN_GUIDE),
  R("05 · Узлы трассы", "hvac-hep2o22:05:operation:stop-ends", "operation", "Монтаж концевых заглушек", "item", "stop_ends", WAVIN_GUIDE),
  R("05 · Узлы трассы", "hvac-hep2o22:05:consumable:ptfe", "consumable", "Рулоны PTFE для применимых резьбовых переходов", "item", "ptfe_rolls", WAVIN_GUIDE, { procurement: true }),
  R("05 · Узлы трассы", "hvac-hep2o22:05:labor:node-installation", "labor", "Труд монтажа соединителей, поворотов, ответвлений и окончаний", "man_hour", "node_labor", PRELIMINARY),

  R("06 · Сборка", "hvac-hep2o22:06:operation:pipe-installation", "operation", "Прокладка и фиксация трубы по отопительной трассе", "m", "route", KG_KRER18),
  R("06 · Сборка", "hvac-hep2o22:06:labor:route-installation", "labor", "Труд монтажника по прокладке трубы", "man_hour", "route_labor", PRELIMINARY),
  R("06 · Сборка", "hvac-hep2o22:06:labor:support-installation", "labor", "Труд монтажа опор и крепежа", "man_hour", "support_labor", PRELIMINARY),
  R("06 · Сборка", "hvac-hep2o22:06:control:thermal-movement-review", "control", "Контроль свободы температурного перемещения, изгибов и положения опор", "service", "single", WAVIN_GUIDE, { informational: true }),

  R("07 · Испытание и заполнение", "hvac-hep2o22:07:operation:low-pressure-test", "operation", "Предварительное испытание на утечки при низком давлении", "test", "test_sections", WAVIN_GUIDE),
  R("07 · Испытание и заполнение", "hvac-hep2o22:07:control:low-test-pressure", "control", "Давление низкого испытания в диапазоне Wavin 0,5–1 бар", "bar", "low_test_pressure", WAVIN_GUIDE, { informational: true }),
  R("07 · Испытание и заполнение", "hvac-hep2o22:07:control:low-test-hold", "control", "Выдержка низкого испытания без видимой утечки", "min", "test_hold", WAVIN_GUIDE, { informational: true }),
  R("07 · Испытание и заполнение", "hvac-hep2o22:07:operation:high-pressure-test", "operation", "Гидравлическое испытание давлением 1,5 рабочего", "test", "test_sections", WAVIN_GUIDE),
  R("07 · Испытание и заполнение", "hvac-hep2o22:07:control:test-pressure", "control", "Расчётное высокое испытательное давление", "bar", "test_pressure", WAVIN_GUIDE, { informational: true }),
  R("07 · Испытание и заполнение", "hvac-hep2o22:07:control:high-pressure-pump", "control", "Начальная подкачка высокого испытательного давления", "min", "high_pressure_initial_pump", WAVIN_GUIDE, { informational: true }),
  R("07 · Испытание и заполнение", "hvac-hep2o22:07:control:reduced-test-pressure", "control", "Контроль после снижения до одной трети максимального рабочего давления", "bar", "reduced_test_pressure", WAVIN_GUIDE, { informational: true }),
  R("07 · Испытание и заполнение", "hvac-hep2o22:07:equipment:test-pump", "equipment", "Опрессовочный насос с поверенным манометром", "machine_hour", "test_pump_hours", PRELIMINARY, { procurement: true }),
  R("07 · Испытание и заполнение", "hvac-hep2o22:07:material:test-water", "material", "Вода для первичного заполнения и испытания", "m3", "test_water", PRELIMINARY, { procurement: true }),
  R("07 · Испытание и заполнение", "hvac-hep2o22:07:operation:fill-and-purge", "operation", "Заполнение контура и удаление воздуха до пуска источника тепла", "m", "route", WAVIN_GUIDE),
  R("07 · Испытание и заполнение", "hvac-hep2o22:07:material:fill-water", "material", "Подготовленная вода для заполнения отопительного контура", "m3", "fill_water", PRELIMINARY, { procurement: true }),
  R("07 · Испытание и заполнение", "hvac-hep2o22:07:material:inhibitor", "material", "Совместимый ингибитор коррозии по выбранному паспорту", "l", "inhibitor", PRELIMINARY, { procurement: true }),
  R("07 · Испытание и заполнение", "hvac-hep2o22:07:control:air-purge", "control", "Подтверждение удаления воздушных карманов до пуска", "service", "single", WAVIN_GUIDE, { informational: true }),
  R("07 · Испытание и заполнение", "hvac-hep2o22:07:control:test-record", "control", "Высокое испытание: контроль отсутствия падения давления и протокол", "min", "test_hold", WAVIN_GUIDE, { informational: true }),

  R("08 · Завершение", "hvac-hep2o22:08:delivery:materials", "delivery", "Доставка трубы, фитингов, опор и расходников", "trip", "delivery", PRELIMINARY, { procurement: true }),
  R("08 · Завершение", "hvac-hep2o22:08:consumable:waste-bags", "consumable", "Мешки для обрезков и упаковки", "item", "waste_bags", PRELIMINARY, { procurement: true }),
  R("08 · Завершение", "hvac-hep2o22:08:operation:cleanup", "operation", "Сбор обрезков, очистка трассы и рабочего места", "m", "route", KG_KRER18),
  R("08 · Завершение", "hvac-hep2o22:08:delivery:waste", "delivery", "Вывоз отходов раскроя и упаковки", "trip", "waste_delivery", PRELIMINARY, { procurement: true }),
  R("08 · Завершение", "hvac-hep2o22:08:control:acceptance", "control", "Приёмочный контроль трассы, соединений, опор, испытаний и заполнения", "service", "single", KG_KRER18, { informational: true }),
];

const SOURCE_BY_ID = new Map(sourcePack.sources.map((source) => [source.sourceId, source]));

function category(kind: ResourceKind): string {
  if (["material", "component", "fastener", "consumable"].includes(kind)) return "material";
  if (kind === "labor") return "labor";
  if (kind === "equipment") return "equipment";
  if (kind === "delivery") return "delivery";
  if (["control", "service"].includes(kind)) return "service";
  return "construction_work";
}

function resource(spec: ResourceSpec, ordinal: number): CanonicalEstimateResourceDefinition {
  const source = SOURCE_BY_ID.get(spec.source);
  const informational = spec.informational === true;
  const procurementEligible = spec.procurement
    ?? (["material", "component", "fastener", "consumable"].includes(spec.kind) && !informational);
  const supply = WAVIN_SELECTED_SUPPLIES.find(value => `hvac-hep2o22:${value.rowId}` === spec.rowId);
  const fluidSupply = WAVIN_FLUID_SUPPLIES.some(value => `hvac-hep2o22:${value}` === spec.rowId);
  const selectedOrder = HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_FORMULAS.find(value => value.formula_id === spec.formula);
  const resourceGraph = {
    formulaId: spec.formula,
    normalizedUom: spec.unit,
    semanticOwnerId: `hvac-wavin-hep2o22-heating-s27-23:${spec.rowId}`,
    resourceKind: spec.kind,
    stage: spec.stage,
    costOwner: informational ? "scope" : "resource",
    costTreatment: informational ? "INFORMATIONAL_SCOPE" : "OWN_COST",
    payable: !informational,
    noDoubleCount: true,
    ...(spec.rowId === "hvac-hep2o22:02:control:pipe-inside-diameter" ? {
      formulaOutputBoundsV1: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "mm", exclusiveMinimum: 0,
        reasonRu: "Две стенки трубы должны быть меньше её наружного диаметра; ручной заказ не исправляет невозможное сечение." },
    } : {}),
    ...(spec.titleParameterIds ? { titleSpecificationParameterIds: [...spec.titleParameterIds], titleSpecificationMode: "APPEND" } : {}),
    ...(supply ? {
      purchaseBalanceV1: { quantityMode: "supply_quantum", balanceScope: "new_order_vs_required_consumption",
        requirementBasis: "selected_supply_order", unitId: "item", stockExpression: "0", reserveExpression: "0", orderQuantumExpression: "1",
        consumedExpression: selectedOrder!.expression_source, plannedConsumptionExpression: "base" in supply ? supply.base : selectedOrder!.expression_source },
      ...("effective" in supply ? { effectiveQuantityOutputV1: { parameterId: supply.effective, unitId: "item" } } : {}),
    } : {}),
    ...(fluidSupply ? { purchaseBalanceV1: { quantityMode: "canonical_decimal", balanceScope: "new_order_vs_required_consumption",
      unitId: spec.unit, consumedExpression: selectedOrder!.expression_source, stockExpression: "0", reserveExpression: "0" } } : {}),
    primaryMeasureParameterId: "route_length_m",
    preliminaryProfileId: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_NORM_ID,
    visibleAssumptionPolicy: PROFILE.assumptionPolicy,
    contextParameterIds: [
      "selected_system_reference", "service_profile", "substrate_profile", "working_height_m",
    ],
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: source?.role ?? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
    sourcePackSha256: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_PACK_SHA256,
    ...(supply || fluidSupply ? { purchaseBalanceScopeRu: supply?.rowId === "02:material:pipe-bundles"
      ? "Расчётный заказ пачек включает монтаж, ожидаемые безвозвратные потери и отдельно сохраняемый плановый резерв. Плановая поставка без сохраняемого резерва всё равно включает ожидаемые потери. Нулевые склад и резерв в заказном балансе означают отсутствие отдельного зачёта: физический резерв остаётся отдельной потребностью в метрах. Пригодность прогнозного остатка не подтверждена."
      : "Заказ относительно исходной расчётной потребности. Склад не засчитывается; превышение поставки не подтверждает пригодность остатка. Физическая технологическая потребность и самостоятельные факты доставки сохраняются." } : {}),
    normativeTrace: [{
      sourceId: spec.source,
      source_id: spec.source,
      normId: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_NORM_ID,
      norm_id: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_NORM_ID,
      normVersion: "S27.23",
      source_title: source?.authority ?? spec.source,
      source_url: source?.officialUrl ?? null,
      exact_locator: source?.exactLocator ?? "selected visible preliminary profile",
      source_definition_hash: source?.artifactSha256
        ?? HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_PACK_SHA256,
    }],
    engineeringLimitations: [...sourcePack.engineeringLimitations],
  };
  return {
    id: `resource-${spec.rowId.replace(/:/gu, "-")}`,
    row_id: spec.rowId,
    ordinal,
    section: spec.stage,
    category: category(spec.kind),
    title_ru: spec.title,
    unit_id: spec.unit,
    formula_id: spec.formula,
    inclusion_ast: { kind: "literal", value: true },
    resource_graph: resourceGraph,
    procurement_eligible: procurementEligible,
    cost_owner_id: spec.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ spec, resourceGraph, sourceMetadata }),
  };
}

export const HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  RESOURCE_SPECS.map((spec, ordinal) => resource(spec, ordinal)),
);

export const HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s27-23.hvac-wavin-hep2o22-heating-completeness.v1",
    sourceKind: "INDEPENDENT_MANUFACTURER_TECHNOLOGY_MAP",
    generatedFromCurrentRows: false,
    evidenceSha256: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_PACK_SHA256,
    sourcePackPath:
      "data/estimate-benchmarks/source-packs/hvac-wavin-hep2o22-heating-standard-s27-23.json",
    entries: [...sourcePack.independentRequiredComponents, {
      semanticKey: "derived-pipe-geometry-safety-check", requiredRowIds: ["hvac-hep2o22:02:control:pipe-inside-diameter"],
    }].map((component) => ({
      ...component,
      expectedResourceIds: [...component.requiredRowIds],
    })),
  });

export function hvacWavinHep2o22HeatingStandardMissingRows(rowIds: ReadonlySet<string>): string[] {
  return HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
    .flatMap((entry) => entry.requiredRowIds)
    .filter((rowId) => !rowIds.has(rowId));
}

export async function compileHvacWavinHep2o22HeatingStandardS2723(
  submittedParameters: Record<string, unknown>,
  rowOverrides?: Parameters<typeof compileCanonicalEstimateCore>[0]["rowOverrides"],
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileCanonicalEstimateCore({
    operation: rowOverrides ? "recalculate" : "compile",
    compilerVersion: "canonical-estimate-compiler.hvac-wavin-hep2o22-heating-standard-s27-23.v1",
    catalogId: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_CATALOG_ID,
    primaryMeasureParameterId: "route_length_m",
    parameterDefinitions: [...HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_PARAMETERS],
    formulaDefinitions: [...HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_FORMULAS],
    resourceDefinitions: [...HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES],
    submittedParameters,
    rowOverrides,
    confirmedParameters: { ...HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
