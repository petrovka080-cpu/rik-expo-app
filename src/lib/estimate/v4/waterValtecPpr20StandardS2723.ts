import sourcePack from "../../../../data/estimate-benchmarks/source-packs/water-valtec-ppr20-standard-s27-23.json";

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

export const WATER_VALTEC_PPR20_STANDARD_S2723_CATALOG_ID =
  "canonical-work:base:plumbing_interior_ppr_pipe_install_standard";
export const WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_ID =
  "water_valtec_ppr20_standard_s27_23";
export const WATER_VALTEC_PPR20_STANDARD_S2723_NORM_ID =
  "VALTEC-VTP700-PPR20-STANDARD-S27-23-PRELIMINARY-R1";
export const WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256 =
  "e264c76f39b59803cd75a3f8c0c27b00433bca0a3e9d69e7364100e670419dd9";

const PROFILE = sourcePack.selectedPreliminaryProfile;
const VALTEC_PIPE = "VALTEC_VTP_700_0020_PASSPORT_2025";
const VALTEC_FITTINGS = "VALTEC_VTP_700_FITTINGS_PASSPORT_2024";
const VALTEC_COUPLING = "VALTEC_VTP_703_COUPLING_PAGE_2026_10_01";
const KG_WATER = "KG_SN_KR_40_04_2025_OFFICIAL";
const KG_KRER16 = "KG_KRER_16_2015_OFFICIAL";
const PRELIMINARY = "S27_23_VISIBLE_PPR20_PLANNING_PROFILE";

export const WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_INPUT = Object.freeze({
  pipe_section_length_m: PROFILE.pipeSectionLengthM,
  pipe_mass_kg_per_m: PROFILE.pipeMassKgPerM,
  pipe_internal_volume_l_per_m: PROFILE.pipeInternalVolumeLPerM,
  fusion_heating_s: PROFILE.fusionHeatingS,
  fusion_welding_s: PROFILE.fusionWeldingS,
  fusion_cooling_s: PROFILE.fusionCoolingS,
  pipe_reserve_percent: PROFILE.pipeReservePercent,
  support_spacing_m: PROFILE.supportSpacingM,
  support_package_item: PROFILE.supportPackageItem,
  drill_productivity_point_per_machine_hour: PROFILE.drillProductivityPointPerMachineHour,
  drill_bit_capacity_point: PROFILE.drillBitCapacityPoint,
  cutting_productivity_m_per_shift: PROFILE.cuttingProductivityMPerShift,
  cutter_wheel_capacity_cut: PROFILE.cutterWheelCapacityCut,
  cleaning_wipe_per_fusion_socket: PROFILE.cleaningWipePerFusionSocket,
  threaded_transition_per_seal_roll: PROFILE.threadedTransitionPerSealRoll,
  route_productivity_m_per_man_hour: PROFILE.routeProductivityMPerManHour,
  fusion_socket_productivity_per_man_hour: PROFILE.fusionSocketProductivityPerManHour,
  node_productivity_item_per_man_hour: PROFILE.nodeProductivityItemPerManHour,
  fusion_machine_setup_h: PROFILE.fusionMachineSetupH,
  pressure_test_section_length_m: PROFILE.pressureTestSectionLengthM,
  pressure_test_h_per_section: PROFILE.pressureTestHPerSection,
  flushing_cycles: PROFILE.flushingCycles,
  working_pressure_bar: PROFILE.workingPressureBar,
  delivery_trip_count: PROFILE.deliveryTripCount,
  waste_removal_trip_count: PROFILE.wasteRemovalTripCount,
  working_height_m: PROFILE.workingHeightM,
  selected_system_reference: `${PROFILE.manufacturerSystem}; ${PROFILE.pipeSku}`,
  service_profile: PROFILE.serviceProfile,
  substrate_profile: PROFILE.substrateProfile,
});

const NORMATIVE_IDS = new Set([
  "pipe_section_length_m", "pipe_mass_kg_per_m", "pipe_internal_volume_l_per_m",
  "fusion_heating_s", "fusion_welding_s", "fusion_cooling_s",
  "selected_system_reference", "service_profile",
]);

export const WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_CLASSIFICATION =
  Object.freeze(Object.fromEntries(
    Object.keys(WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_INPUT).map((parameterId) => [
      parameterId,
      NORMATIVE_IDS.has(parameterId) ? "NORMATIVE" : "ASSUMPTION",
    ]),
  )) as Readonly<Record<string, RuntimeClass>>;

export const WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_SOURCE_IDS =
  Object.freeze(Object.fromEntries(
    Object.keys(WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_INPUT).map((parameterId) => [
      parameterId,
      [WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_ID],
    ]),
  ));

export const WATER_VALTEC_PPR20_STANDARD_S2723_SHORT_INPUT = Object.freeze({
  route_length_m: sourcePack.acceptanceFixture.routeLengthM,
});

export const WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT = Object.freeze({
  ...WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_INPUT,
  route_length_m: sourcePack.acceptanceFixture.routeLengthM,
  straight_coupling_count: sourcePack.acceptanceFixture.straightCouplingCount,
  elbow_count: sourcePack.acceptanceFixture.elbowCount,
  tee_count: sourcePack.acceptanceFixture.teeCount,
  threaded_transition_count: sourcePack.acceptanceFixture.threadedTransitionCount,
  terminal_cap_count: sourcePack.acceptanceFixture.terminalCapCount,
});

export const WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_METADATA = Object.freeze({
  source_title: "Монтаж внутреннего трубопровода VALTEC PP-R PN25 20x3,4 мм",
  source_authority: "VALTEC; Минстрой Кыргызской Республики; видимый профиль S27.23",
  source_document_version: "VALTEC_VTP700_CAPTURE_2026_10_01_AND_S27_23_PROFILE_R1",
  definition_hash: WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256,
  source_kind: "MANUFACTURER_SYSTEM_PLUS_OFFICIAL_KG_SCOPE_PLUS_VISIBLE_ASSUMPTIONS",
  official_url: sourcePack.sources[0].officialUrl,
  artifact_sha256: WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256,
  effective_from: "2026-10-01",
  exact_locator: sourcePack.sources.map((source) => source.exactLocator).join(" | "),
  use_restriction: PROFILE.assumptionPolicy,
});

type ParameterDescriptor = Readonly<{
  id: string;
  title: string;
  unit?: string | null;
  type?: ValueType;
  min?: number;
  values?: readonly unknown[];
  guide: string;
}>;

const D = (
  id: string,
  title: string,
  unit: string | null,
  guide: string,
  options: Omit<ParameterDescriptor, "id" | "title" | "unit" | "guide"> = {},
): ParameterDescriptor => ({ id, title, unit, guide, ...options });

const PARAMETERS: readonly ParameterDescriptor[] = [
  D("route_length_m", "Длина трассы трубопровода", "m", "Известная длина трассы по проекту или обмеру.", { min: 0.001 }),
  D("straight_coupling_count", "Прямые муфты VTp.703.0.020", "item", "Считать по раскладке труб; не выводить из длины.", { type: "integer", min: 0 }),
  D("elbow_count", "Угольники 20 мм", "item", "Считать по проектной трассе; не выводить из длины.", { type: "integer", min: 0 }),
  D("tee_count", "Тройники 20 мм", "item", "Считать по проектным ответвлениям; не выводить из длины.", { type: "integer", min: 0 }),
  D("threaded_transition_count", "Резьбовые переходы 20 мм", "item", "Считать по точкам подключения арматуры и оборудования.", { type: "integer", min: 0 }),
  D("terminal_cap_count", "Концевые заглушки 20 мм", "item", "Считать по открытым концам, которые требуется закрыть.", { type: "integer", min: 0 }),
  D("pipe_section_length_m", "Длина закупочного отрезка трубы", "m", "Выбран официальный отрезок VALTEC 4 м.", { min: 0.001 }),
  D("pipe_mass_kg_per_m", "Масса трубы 20x3,4 на метр", "kg_per_m", "Паспорт VALTEC: 0,166 кг/м.", { min: 0.001 }),
  D("pipe_internal_volume_l_per_m", "Внутренний объём трубы на метр", "l_per_m", "Паспорт VALTEC: 0,137 л/м.", { min: 0.001 }),
  D("fusion_heating_s", "Нагрев одного сварного соединения", "s", "Паспорт VALTEC для 20 мм: 5 секунд.", { min: 0 }),
  D("fusion_welding_s", "Фиксация при сварке", "s", "Паспорт VALTEC для 20 мм: 4 секунды.", { min: 0 }),
  D("fusion_cooling_s", "Остывание сварного соединения", "s", "Паспорт VALTEC для 20 мм: 120 секунд.", { min: 0 }),
  D("pipe_reserve_percent", "Резерв трубы на раскрой", "percent", "Видимое плановое допущение; заменить раскладкой.", { min: 0 }),
  D("support_spacing_m", "Шаг опор", "m", "Видимое допущение; заменить по проекту, температуре и основанию.", { min: 0.05 }),
  D("support_package_item", "Опорных комплектов в упаковке", "item", "Размер выбранной закупочной упаковки.", { type: "integer", min: 1 }),
  D("drill_productivity_point_per_machine_hour", "Производительность сверления", "item_per_machine_hour", "Видимое допущение ППР.", { min: 0.001 }),
  D("drill_bit_capacity_point", "Ресурс комплекта буров", "item", "Точек крепления на комплект — видимое допущение.", { min: 1 }),
  D("cutting_productivity_m_per_shift", "Производительность раскроя", "m_per_shift", "Видимое допущение ППР.", { min: 0.001 }),
  D("cutter_wheel_capacity_cut", "Ресурс режущего колеса", "item", "Отрезов на колесо — видимое допущение.", { min: 1 }),
  D("cleaning_wipe_per_fusion_socket", "Салфеток на сварное гнездо", "item", "Видимый расход подготовки соединения.", { min: 0 }),
  D("threaded_transition_per_seal_roll", "Переходов на рулон уплотнения", "item", "Видимая закупочная вместимость расходника.", { min: 1 }),
  D("route_productivity_m_per_man_hour", "Производительность монтажа трубы", "m_per_man_hour", "Видимое допущение ППР, не универсальная норма.", { min: 0.001 }),
  D("fusion_socket_productivity_per_man_hour", "Производительность сварки гнёзд", "item_per_man_hour", "Видимое допущение ППР.", { min: 0.001 }),
  D("node_productivity_item_per_man_hour", "Производительность монтажа узлов", "item_per_man_hour", "Видимое допущение ППР.", { min: 0.001 }),
  D("fusion_machine_setup_h", "Подготовка сварочного аппарата", "machine_hour", "Видимое допущение на комплект трассы.", { min: 0 }),
  D("pressure_test_section_length_m", "Длина участка гидроиспытания", "m", "Видимое допущение; заменить программой испытаний.", { min: 0.001 }),
  D("pressure_test_h_per_section", "Насосо-часы на участок испытания", "machine_hour", "Видимое допущение программы испытаний.", { min: 0 }),
  D("flushing_cycles", "Число объёмов воды для промывки", "item", "Видимое допущение; заменить программой промывки.", { type: "integer", min: 1 }),
  D("working_pressure_bar", "Рабочее давление", "bar", "Предварительное давление; заменить проектным.", { min: 0.001 }),
  D("delivery_trip_count", "Рейсы доставки", "trip", "Видимое логистическое допущение.", { type: "integer", min: 0 }),
  D("waste_removal_trip_count", "Рейсы вывоза отходов", "trip", "Видимое логистическое допущение.", { type: "integer", min: 0 }),
  D("working_height_m", "Рабочая высота", "m", "Предварительная доступная зона; заменить фактом объекта.", { min: 0.001 }),
  D("selected_system_reference", "Выбранная трубная система", null, "VALTEC VTp.700.0020 20x3,4 мм и совместимые фитинги.", { type: "text" }),
  D("service_profile", "Профиль среды и прокладки", null, "Этот профиль ограничен открытой доступной трассой ХВС.", { type: "enum", values: ["COLD_WATER_HORIZONTAL_OPEN_ACCESSIBLE"] }),
  D("substrate_profile", "Основание креплений", null, "Определяет фактическую опору и крепёж.", { type: "enum", values: ["SOLID_MASONRY_PRELIMINARY", "CONCRETE", "HOLLOW_MASONRY", "TIMBER", "METAL", "PROJECT_DEFINED"] }),
];

const PROJECT_IDS = new Set([
  "route_length_m", "straight_coupling_count", "elbow_count", "tee_count",
  "threaded_transition_count", "terminal_cap_count",
]);

export const VALTEC_SELECTED_SUPPLIES = [
  { rowId: "02:material:pipe-sections", formula: "pipe_sections", effective: "valtec_effective_pipe_sections", base: "ceil(route_length_m/pipe_section_length_m)" },
  { rowId: "02:consumable:cutter-wheels", formula: "cutter_wheels" },
  { rowId: "03:fastener:support-packages", formula: "support_packages", effective: "valtec_effective_support_packages" },
  { rowId: "03:consumable:drill-bits", formula: "drill_bits" },
  { rowId: "04:component:straight-couplings", formula: "straight_couplings" },
  { rowId: "04:consumable:cleaning-wipes", formula: "straight_wipes" },
  { rowId: "05:component:elbows", formula: "elbows" },
  { rowId: "05:component:tees", formula: "tees" },
  { rowId: "05:component:threaded-transitions", formula: "transitions" },
  { rowId: "05:component:terminal-caps", formula: "caps" },
  { rowId: "05:consumable:cleaning-wipes", formula: "node_wipes" },
  { rowId: "05:consumable:thread-seal", formula: "thread_seal_rolls" },
  { rowId: "08:consumable:waste-bags", formula: "waste_bags" },
] as const;

export const VALTEC_FLUID_SUPPLIES = [
  { rowId: "07:material:test-water", formula: "test_water" },
  { rowId: "07:material:flushing-water", formula: "flush_water" },
] as const;

export const WATER_VALTEC_PPR20_STANDARD_S2723_PARAMETERS:
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
      ...(descriptor.values ? { values: [...descriptor.values] } : {}),
    },
    truth_metadata: {
      contract: "rik-expo-app.s27-23.water-valtec-ppr20-standard.v1",
      semantic_parameter_key: `water-valtec-ppr20-standard-s27-23:${descriptor.id}`,
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
        WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_INPUT,
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
        source_document: NORMATIVE_IDS.has(descriptor.id) ? VALTEC_PIPE : PRELIMINARY,
        source_locator: WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_METADATA.exact_locator,
        guide_version: "water-valtec-ppr20-standard-s27-23-r1",
        source_snapshot_hash: WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256,
        applicability: PROFILE.assumptionPolicy,
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "FIRST_ESTIMATE_NOW_THEN_REPLACE_VISIBLE_ASSUMPTIONS_AND_ROUTE_COUNTS",
      },
    },
  })), ...VALTEC_SELECTED_SUPPLIES.filter(supply => "effective" in supply).map((supply, index) => ({
    parameter_id: "effective" in supply ? supply.effective : "", ordinal: PARAMETERS.length + index,
    value_type: "decimal", unit_id: "item", title_ru: "Действительное количество выбранных единиц поставки",
    required: false, default_value: null, constraints_json: { min: 0 },
    truth_metadata: { visibility_role: "INTERNAL_ONLY", value_source_role: "BACKEND_DERIVED",
      effective_resource_quantity_v1: { sourceRowId: `water-ppr20:${supply.rowId}`, unitId: "item" } },
  })),
],
);

function formula(id: string, unit: string, expression: string): CanonicalEstimateFormulaDefinition {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: `water_valtec_ppr20_${id}_s2723`,
    output_unit_id: unit,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: estimateDeterministicHash(compiled.ast),
  };
}

const F = (id: string, unit: string, expression: string) => formula(id, unit, expression);
const GROSS = "route_length_m*(1+pipe_reserve_percent/100)";
const SECTIONS = `ceil((${GROSS})/pipe_section_length_m)`;
const ORDER = "valtec_effective_pipe_sections*pipe_section_length_m";
const SUPPORTS = "ceil(route_length_m/support_spacing_m)+1";
const STRAIGHT_SOCKETS = "straight_coupling_count*2";
const NODE_ITEMS = "elbow_count+tee_count+threaded_transition_count+terminal_cap_count";
const NODE_SOCKETS = "elbow_count*2+tee_count*3+threaded_transition_count+terminal_cap_count";
const ALL_SOCKETS = `(${STRAIGHT_SOCKETS})+(${NODE_SOCKETS})`;
const FUSION_SECONDS = "fusion_heating_s+fusion_welding_s+fusion_cooling_s";

export const WATER_VALTEC_PPR20_STANDARD_S2723_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  F("route", "m", "route_length_m"),
  F("single", "service", "1"),
  F("pipe_gross", "m", GROSS),
  F("pipe_reserve", "m", "route_length_m*pipe_reserve_percent/100"),
  F("pipe_sections", "item", SECTIONS),
  F("pipe_order", "m", ORDER),
  F("pipe_remainder", "m", `max(0,${ORDER}-${GROSS})`),
  F("pipe_mass", "kg", `${ORDER}*pipe_mass_kg_per_m`),
  F("cutting_shifts", "shift", "ceil(route_length_m/cutting_productivity_m_per_shift)"),
  F("cutter_wheels", "item", `ceil((${SECTIONS})/cutter_wheel_capacity_cut)`),
  F("support_points", "item", SUPPORTS),
  F("support_packages", "item", `ceil((${SUPPORTS})/support_package_item)`),
  F("support_order", "item", "valtec_effective_support_packages*support_package_item"),
  F("support_remainder", "item", `max(0,valtec_effective_support_packages*support_package_item-(${SUPPORTS}))`),
  F("support_hours", "machine_hour", `(${SUPPORTS})/drill_productivity_point_per_machine_hour`),
  F("drill_bits", "item", `ceil((${SUPPORTS})/drill_bit_capacity_point)`),
  F("straight_couplings", "item", "straight_coupling_count"),
  F("straight_sockets", "item", STRAIGHT_SOCKETS),
  F("all_sockets", "item", ALL_SOCKETS),
  F("fusion_machine_hours", "machine_hour", `fusion_machine_setup_h+((${ALL_SOCKETS})*(${FUSION_SECONDS}))/3600`),
  F("straight_wipes", "item", `ceil((${STRAIGHT_SOCKETS})*cleaning_wipe_per_fusion_socket)`),
  F("elbows", "item", "elbow_count"),
  F("tees", "item", "tee_count"),
  F("transitions", "item", "threaded_transition_count"),
  F("caps", "item", "terminal_cap_count"),
  F("node_wipes", "item", `ceil((${NODE_SOCKETS})*cleaning_wipe_per_fusion_socket)`),
  F("thread_seal_rolls", "item", "ceil(threaded_transition_count/threaded_transition_per_seal_roll)"),
  F("node_labor", "man_hour", `(${NODE_ITEMS})/node_productivity_item_per_man_hour`),
  F("route_labor", "man_hour", "route_length_m/route_productivity_m_per_man_hour"),
  F("straight_labor", "man_hour", `(${STRAIGHT_SOCKETS})/fusion_socket_productivity_per_man_hour`),
  F("test_sections", "test", "ceil(route_length_m/pressure_test_section_length_m)"),
  F("test_pressure", "bar", "max(working_pressure_bar*1.5,6)"),
  F("test_pump_hours", "machine_hour", "ceil(route_length_m/pressure_test_section_length_m)*pressure_test_h_per_section"),
  F("test_water", "m3", "route_length_m*pipe_internal_volume_l_per_m/1000"),
  F("flush_water", "m3", "route_length_m*pipe_internal_volume_l_per_m*flushing_cycles/1000"),
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

const id = (short: string) => `water_valtec_ppr20_${short}_s2723`;
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
  R("01 · Трасса", "water-ppr20:01:operation:route-survey", "operation", "Обследование и обмер трассы внутреннего водопровода", "m", "route", KG_WATER),
  R("01 · Трасса", "water-ppr20:01:operation:route-layout", "operation", "Разметка оси, опор, фитингов и подключений", "m", "route", KG_KRER16),
  R("01 · Трасса", "water-ppr20:01:control:system-applicability", "control", "Проверка применимости PP-R 20x3,4 для среды, давления, температуры и способа прокладки", "service", "single", VALTEC_PIPE, { informational: true }),

  R("02 · Труба и раскрой", "water-ppr20:02:material:pipe-net", "material", "Труба VALTEC VTp.700.0020 PP-R PN25 20x3,4 — чистая длина", "m", "route", VALTEC_PIPE, { informational: true }),
  R("02 · Труба и раскрой", "water-ppr20:02:material:pipe-reserve", "material", "Резерв трубы на раскрой", "m", "pipe_reserve", PRELIMINARY, { informational: true }),
  R("02 · Труба и раскрой", "water-ppr20:02:material:pipe-sections", "material", "Отрезки трубы VALTEC VTp.700.0020.20; выбранная длина, м", "item", "pipe_sections", VALTEC_PIPE, { procurement: true, titleParameterIds: ["pipe_section_length_m"] }),
  R("02 · Труба и раскрой", "water-ppr20:02:control:pipe-order", "control", "Заказанная длина трубы после округления отрезков", "m", "pipe_order", VALTEC_PIPE, { informational: true }),
  R("02 · Труба и раскрой", "water-ppr20:02:control:pipe-remainder", "control", "Прогноз превышения поставленной длины над расчётной потребностью; пригодность остатка не подтверждена", "m", "pipe_remainder", VALTEC_PIPE, { informational: true }),
  R("02 · Труба и раскрой", "water-ppr20:02:control:pipe-mass", "control", "Расчётная масса заказа трубы", "kg", "pipe_mass", VALTEC_PIPE, { informational: true }),
  R("02 · Труба и раскрой", "water-ppr20:02:operation:cutting", "operation", "Разметка, перпендикулярный рез и подготовка торцов трубы", "item", "pipe_sections", VALTEC_FITTINGS),
  R("02 · Труба и раскрой", "water-ppr20:02:equipment:pipe-cutter", "equipment", "Труборез для полипропиленовой трубы", "shift", "cutting_shifts", PRELIMINARY, { procurement: true }),
  R("02 · Труба и раскрой", "water-ppr20:02:consumable:cutter-wheels", "consumable", "Сменные режущие колёса трубореза", "item", "cutter_wheels", PRELIMINARY, { procurement: true }),

  R("03 · Опоры", "water-ppr20:03:fastener:support-points", "fastener", "Точки крепления и опоры трубопровода", "item", "support_points", PRELIMINARY, { informational: true }),
  R("03 · Опоры", "water-ppr20:03:fastener:support-packages", "fastener", "Упаковки совместимых опор и крепежа по фактическому основанию; комплектов в упаковке, шт.", "item", "support_packages", PRELIMINARY, { procurement: true, titleParameterIds: ["support_package_item"] }),
  R("03 · Опоры", "water-ppr20:03:control:support-order", "control", "Заказанное количество опорных комплектов", "item", "support_order", PRELIMINARY, { informational: true }),
  R("03 · Опоры", "water-ppr20:03:control:support-remainder", "control", "Прогноз превышения поставленных опорных комплектов над расчётной потребностью; пригодность остатка не подтверждена", "item", "support_remainder", PRELIMINARY, { informational: true }),
  R("03 · Опоры", "water-ppr20:03:operation:drill-and-fix", "operation", "Сверление основания и монтаж опор", "item", "support_points", KG_KRER16),
  R("03 · Опоры", "water-ppr20:03:equipment:rotary-hammer", "equipment", "Перфоратор или дрель по фактическому основанию", "machine_hour", "support_hours", PRELIMINARY, { procurement: true }),
  R("03 · Опоры", "water-ppr20:03:consumable:drill-bits", "consumable", "Комплекты буров или свёрл для основания", "item", "drill_bits", PRELIMINARY, { procurement: true }),

  R("04 · Прямые стыки", "water-ppr20:04:component:straight-couplings", "component", "Прямые муфты VALTEC VTp.703.0.020, 20 мм", "item", "straight_couplings", VALTEC_COUPLING, { procurement: true }),
  R("04 · Прямые стыки", "water-ppr20:04:operation:socket-fusion", "operation", "Полифузионная муфтовая сварка прямых соединений", "item", "straight_sockets", VALTEC_FITTINGS),
  R("04 · Прямые стыки", "water-ppr20:04:equipment:fusion-machine", "equipment", "Сварочный аппарат PP-R с насадкой 20 мм, включая подготовку", "machine_hour", "fusion_machine_hours", VALTEC_FITTINGS, { procurement: true }),
  R("04 · Прямые стыки", "water-ppr20:04:consumable:cleaning-wipes", "consumable", "Безворсовые салфетки для подготовки прямых сварных гнёзд", "item", "straight_wipes", PRELIMINARY, { procurement: true }),
  R("04 · Прямые стыки", "water-ppr20:04:control:fusion-cycles", "control", "Контролируемые циклы нагрева, сварки и остывания прямых гнёзд", "item", "straight_sockets", VALTEC_PIPE, { informational: true }),

  R("05 · Узлы трассы", "water-ppr20:05:component:elbows", "component", "Угольники PP-R 20 мм по проектной трассе", "item", "elbows", VALTEC_FITTINGS, { procurement: true }),
  R("05 · Узлы трассы", "water-ppr20:05:component:tees", "component", "Тройники PP-R 20 мм по проектным ответвлениям", "item", "tees", VALTEC_FITTINGS, { procurement: true }),
  R("05 · Узлы трассы", "water-ppr20:05:component:threaded-transitions", "component", "Комбинированные резьбовые переходы PP-R 20 мм", "item", "transitions", VALTEC_FITTINGS, { procurement: true }),
  R("05 · Узлы трассы", "water-ppr20:05:component:terminal-caps", "component", "Заглушки PP-R 20 мм для проектных окончаний", "item", "caps", VALTEC_FITTINGS, { procurement: true }),
  R("05 · Узлы трассы", "water-ppr20:05:operation:elbows", "operation", "Монтаж и сварка угольников", "item", "elbows", VALTEC_FITTINGS),
  R("05 · Узлы трассы", "water-ppr20:05:operation:tees", "operation", "Монтаж и сварка тройников", "item", "tees", VALTEC_FITTINGS),
  R("05 · Узлы трассы", "water-ppr20:05:operation:threaded-transitions", "operation", "Монтаж сварно-резьбовых переходов", "item", "transitions", VALTEC_FITTINGS),
  R("05 · Узлы трассы", "water-ppr20:05:operation:terminal-caps", "operation", "Монтаж и сварка концевых заглушек", "item", "caps", VALTEC_FITTINGS),
  R("05 · Узлы трассы", "water-ppr20:05:consumable:cleaning-wipes", "consumable", "Безворсовые салфетки для подготовки сварных гнёзд узлов", "item", "node_wipes", PRELIMINARY, { procurement: true }),
  R("05 · Узлы трассы", "water-ppr20:05:consumable:thread-seal", "consumable", "Рулоны совместимого резьбового уплотнения", "item", "thread_seal_rolls", PRELIMINARY, { procurement: true }),
  R("05 · Узлы трассы", "water-ppr20:05:labor:node-installation", "labor", "Труд монтажа поворотов, ответвлений, переходов и окончаний", "man_hour", "node_labor", PRELIMINARY),
  R("05 · Узлы трассы", "water-ppr20:05:control:total-fusion-sockets", "control", "Баланс всех сварных раструбов: прямые муфты и фитинги узлов", "item", "all_sockets", VALTEC_FITTINGS, { informational: true }),

  R("06 · Сборка", "water-ppr20:06:operation:pipe-installation", "operation", "Укладка и фиксация трубы на опорах по трассе", "m", "route", KG_KRER16),
  R("06 · Сборка", "water-ppr20:06:labor:route-installation", "labor", "Труд монтажника по прокладке трассы", "man_hour", "route_labor", PRELIMINARY),
  R("06 · Сборка", "water-ppr20:06:labor:straight-fusion", "labor", "Труд монтажника по сварке прямых гнёзд", "man_hour", "straight_labor", PRELIMINARY),
  R("06 · Сборка", "water-ppr20:06:control:thermal-movement-review", "control", "Проверка температурных перемещений, опор и необходимости компенсации", "service", "single", VALTEC_FITTINGS, { informational: true }),

  R("07 · Испытание и промывка", "water-ppr20:07:operation:pressure-test", "operation", "Гидравлическое испытание смонтированных участков", "test", "test_sections", VALTEC_PIPE),
  R("07 · Испытание и промывка", "water-ppr20:07:control:test-pressure", "control", "Испытательное давление: 1,5 рабочего, но не менее 6 бар", "bar", "test_pressure", VALTEC_PIPE, { informational: true }),
  R("07 · Испытание и промывка", "water-ppr20:07:equipment:test-pump", "equipment", "Опрессовочный насос с поверенным средством контроля", "machine_hour", "test_pump_hours", PRELIMINARY, { procurement: true }),
  R("07 · Испытание и промывка", "water-ppr20:07:material:test-water", "material", "Вода для первичного заполнения и гидроиспытания", "m3", "test_water", VALTEC_PIPE, { procurement: true }),
  R("07 · Испытание и промывка", "water-ppr20:07:operation:flushing", "operation", "Промывка смонтированного трубопровода", "m", "route", VALTEC_PIPE),
  R("07 · Испытание и промывка", "water-ppr20:07:material:flushing-water", "material", "Вода для промывки по числу объёмов", "m3", "flush_water", PRELIMINARY, { procurement: true }),
  R("07 · Испытание и промывка", "water-ppr20:07:service:controlled-discharge", "service", "Организованный отвод воды после промывки", "m3", "flush_water", KG_WATER),

  R("08 · Завершение", "water-ppr20:08:delivery:materials", "delivery", "Доставка трубы, фитингов, опор и расходников", "trip", "delivery", PRELIMINARY, { procurement: true }),
  R("08 · Завершение", "water-ppr20:08:consumable:waste-bags", "consumable", "Мешки для обрезков и упаковки", "item", "waste_bags", PRELIMINARY, { procurement: true }),
  R("08 · Завершение", "water-ppr20:08:operation:cleanup", "operation", "Сбор обрезков, очистка трассы и рабочего места", "m", "route", KG_KRER16),
  R("08 · Завершение", "water-ppr20:08:delivery:waste", "delivery", "Вывоз отходов раскроя и упаковки", "trip", "waste_delivery", PRELIMINARY, { procurement: true }),
  R("08 · Завершение", "water-ppr20:08:control:acceptance", "control", "Приёмочный контроль трассы, сварных соединений, опор, испытания и промывки", "service", "single", KG_WATER, { informational: true }),
];

const SOURCE_BY_ID = new Map(sourcePack.sources.map((source) => [source.sourceId, source]));

const WORK_PROCESS = {
  route: 'Обмер, проверка применимости и разметка трассы',
  cutting: 'Раскрой трубы и подготовка торцов',
  supports: 'Сверление основания и монтаж опор с крепежом',
  straight: 'Подготовка и полифузионная сварка прямых муфтовых соединений',
  nodes: 'Монтаж поворотов, ответвлений, резьбовых переходов и окончаний',
  assembly: 'Укладка и фиксация трубы; проверка температурных перемещений',
  testing: 'Гидравлическое испытание с заполнением водой и контролем давления',
  flushing: 'Промывка трубопровода и организованный отвод воды',
  completion: 'Сбор обрезков, уборка, вывоз отходов и приёмочный контроль',
} as const;
function workProcessReference(spec: ResourceSpec) {
  const phase = spec.stage.slice(0, 2);
  const operationId = spec.rowId === 'water-ppr20:08:delivery:materials' ? 'route'
    : spec.rowId === 'water-ppr20:06:labor:straight-fusion' ? 'straight'
    : phase === '01' ? 'route' : phase === '02' ? 'cutting' : phase === '03' ? 'supports'
    : phase === '04' ? 'straight' : phase === '05' ? 'nodes' : phase === '06' ? 'assembly'
    : phase === '07' ? /:(flushing|flushing-water|controlled-discharge)$/.test(spec.rowId) ? 'flushing' : 'testing'
    : 'completion';
  return {
    contractVersion: 'canonical-operation-resource/v1' as const,
    groupId: 'valtec-ppr20-internal-cold-water',
    groupTitleRu: 'Монтаж открытого внутреннего водопровода из труб VALTEC PP-R PN25, 20 × 3,4 мм',
    operationId, operationTitleRu: WORK_PROCESS[operationId],
    processOrdinal: Object.keys(WORK_PROCESS).indexOf(operationId),
    // These references disclose the existing scope. The site-specific order
    // is not supplied by the product passport and is not invented here.
    completionCriterionRu: 'Состав выбранного профиля раскрыт; последовательность уточняется по проекту и ППР',
  };
}

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
  const supply = VALTEC_SELECTED_SUPPLIES.find(value => `water-ppr20:${value.rowId}` === spec.rowId);
  const fluidSupply = VALTEC_FLUID_SUPPLIES.find(value => `water-ppr20:${value.rowId}` === spec.rowId);
  const selectedOrder = WATER_VALTEC_PPR20_STANDARD_S2723_FORMULAS.find(value => value.formula_id === spec.formula);
  const resourceGraph = {
    formulaId: spec.formula,
    normalizedUom: spec.unit,
    semanticOwnerId: `water-valtec-ppr20-standard-s27-23:${spec.rowId}`,
    resourceKind: spec.kind,
    stage: spec.stage,
    costOwner: informational ? "scope" : "resource",
    costTreatment: informational ? "INFORMATIONAL_SCOPE" : "OWN_COST",
    payable: !informational,
    noDoubleCount: true,
    operationCompositionV1: workProcessReference(spec),
    ...(spec.titleParameterIds ? { titleSpecificationParameterIds: [...spec.titleParameterIds], titleSpecificationMode: "APPEND" } : {}),
    ...(supply ? {
      purchaseBalanceV1: { quantityMode: "supply_quantum", balanceScope: "new_order_vs_required_consumption",
        requirementBasis: "selected_order_including_contingency", unitId: "item", stockExpression: "0", reserveExpression: "0",
        orderQuantumExpression: "1", consumedExpression: selectedOrder!.expression_source,
        plannedConsumptionExpression: "base" in supply ? supply.base : selectedOrder!.expression_source },
      ...("effective" in supply ? { effectiveQuantityOutputV1: { parameterId: supply.effective, unitId: "item" } } : {}),
    } : {}),
    ...(fluidSupply ? { purchaseBalanceV1: { quantityMode: "canonical_decimal", balanceScope: "new_order_vs_required_consumption",
      unitId: "m3", consumedExpression: selectedOrder!.expression_source, stockExpression: "0", reserveExpression: "0" } } : {}),
    primaryMeasureParameterId: "route_length_m",
    preliminaryProfileId: WATER_VALTEC_PPR20_STANDARD_S2723_NORM_ID,
    visibleAssumptionPolicy: PROFILE.assumptionPolicy,
    contextParameterIds: [
      "selected_system_reference", "service_profile", "substrate_profile", "working_height_m",
    ],
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: source?.role ?? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
    sourcePackSha256: WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256,
    normativeTrace: [{
      sourceId: spec.source,
      source_id: spec.source,
      normId: WATER_VALTEC_PPR20_STANDARD_S2723_NORM_ID,
      norm_id: WATER_VALTEC_PPR20_STANDARD_S2723_NORM_ID,
      normVersion: "S27.23",
      source_title: source?.authority ?? spec.source,
      source_url: source?.officialUrl ?? null,
      exact_locator: source?.exactLocator ?? "selected visible preliminary profile",
      source_definition_hash: source?.artifactSha256
        ?? WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256,
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

export const WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  RESOURCE_SPECS.map((spec, ordinal) => resource(spec, ordinal)),
);

export const WATER_VALTEC_PPR20_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s27-23.water-valtec-ppr20-completeness.v1",
    sourceKind: "INDEPENDENT_MANUFACTURER_TECHNOLOGY_MAP",
    generatedFromCurrentRows: false,
    evidenceSha256: WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256,
    sourcePackPath:
      "data/estimate-benchmarks/source-packs/water-valtec-ppr20-standard-s27-23.json",
    entries: sourcePack.independentRequiredComponents.map((component) => ({
      ...component,
      expectedResourceIds: [...component.requiredRowIds],
    })),
  });

export function waterValtecPpr20StandardMissingRows(rowIds: ReadonlySet<string>): string[] {
  return WATER_VALTEC_PPR20_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
    .flatMap((entry) => entry.requiredRowIds)
    .filter((rowId) => !rowIds.has(rowId));
}

export async function compileWaterValtecPpr20StandardS2723(
  submittedParameters: Record<string, unknown>,
  rowOverrides?: Parameters<typeof compileCanonicalEstimateCore>[0]["rowOverrides"],
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileCanonicalEstimateCore({
    operation: rowOverrides ? "recalculate" : "compile",
    compilerVersion: "canonical-estimate-compiler.water-valtec-ppr20-standard-s27-23.v1",
    catalogId: WATER_VALTEC_PPR20_STANDARD_S2723_CATALOG_ID,
    primaryMeasureParameterId: "route_length_m",
    parameterDefinitions: [...WATER_VALTEC_PPR20_STANDARD_S2723_PARAMETERS],
    formulaDefinitions: [...WATER_VALTEC_PPR20_STANDARD_S2723_FORMULAS],
    resourceDefinitions: [...WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES],
    submittedParameters,
    rowOverrides,
    confirmedParameters: { ...WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
