import sourcePack from "../../../../data/estimate-benchmarks/source-packs/electrical-elecor-cable-channel-standard-s27-23.json";

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
type RuntimeClass = "NORMATIVE" | "ASSUMPTION";
type ValueType = "decimal" | "integer" | "text" | "enum";
type ResourceKind =
  | "operation" | "labor" | "material" | "component" | "fastener"
  | "consumable" | "equipment" | "delivery" | "control";

export const ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_CATALOG_ID =
  "canonical-work:base:electrical_interior_cable_channel_install_standard";
export const ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_ID =
  "electrical_elecor_cable_channel_standard_s27_23";
export const ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_NORM_ID =
  "IEK-ELECOR-40X25-STANDARD-S27-23-PRELIMINARY-R1";
export const ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256 =
  "758c2c4822923c9619c7c08e43d70ce77cf2cb94d04c0e188c81b367867841b2";

const PROFILE = sourcePack.selectedPreliminaryProfile;
const IEK_CATALOG = "IEK_PLASTIC_CABLE_SYSTEMS_CATALOG_2026";
const IEK_PRODUCTS = "IEK_ELECOR_40X25_PRODUCT_PAGES_2026_10_01";
const KG_KRERM = "KG_KRERM_08_2015_ELECTRICAL_OFFICIAL";
const PRELIMINARY = "S27_23_VISIBLE_CABLE_CHANNEL_PLANNING_PROFILE";

/** Selected whole packages and kits, without warehouse credit or a reuse claim. */
export const ELECOR_SELECTED_SUPPLIES = Object.freeze([
  { rowId: "02:material:channel-packs", formula: "channel_packs", effective: "elecor_effective_channel_packs", base: "ceil(route_length_m/channel_transport_pack_m)" },
  { rowId: "02:consumable:cutting-blades", formula: "cutting_shifts" },
  { rowId: "03:fastener:packages", formula: "fastener_packages", effective: "elecor_effective_fastener_packages" },
  { rowId: "03:consumable:drill-bits", formula: "drill_bits" },
  { rowId: "04:component:straight-connector-sets", formula: "straight_connector_sets", effective: "elecor_effective_connector_sets" },
  { rowId: "05:component:inner-corner-sets", formula: "inner_corner_sets" },
  { rowId: "05:component:outer-corner-sets", formula: "outer_corner_sets" },
  { rowId: "05:component:flat-angle-sets", formula: "flat_angle_sets" },
  { rowId: "05:component:tee-sets", formula: "tee_sets" },
  { rowId: "05:component:end-cap-sets", formula: "end_cap_sets" },
  { rowId: "07:consumable:waste-bags", formula: "waste_bags" },
] as const);

export const ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RUNTIME_INPUT = Object.freeze({
  channel_section_length_m: PROFILE.channelSectionLengthM,
  channel_transport_pack_m: PROFILE.channelTransportPackM,
  accessory_items_per_set: PROFILE.accessoryItemsPerSet,
  channel_reserve_percent: PROFILE.channelReservePercent,
  continuous_route_count: PROFILE.continuousRouteCount,
  fastener_spacing_m: PROFILE.fastenerSpacingM,
  fastener_package_item: PROFILE.fastenerPackageItem,
  installer_productivity_m_per_man_hour: PROFILE.installerProductivityMPerManHour,
  drill_productivity_point_per_machine_hour: PROFILE.drillProductivityPointPerMachineHour,
  drill_bit_capacity_point: 200,
  cutting_productivity_m_per_shift: PROFILE.cuttingProductivityMPerShift,
  delivery_trip_count: PROFILE.deliveryTripCount,
  waste_removal_trip_count: PROFILE.wasteRemovalTripCount,
  working_height_m: PROFILE.workingHeightM,
  selected_system_reference: `${PROFILE.manufacturerSystem}; ${PROFILE.channelSku}`,
  substrate_profile: PROFILE.substrateProfile,
});

const NORMATIVE_IDS = new Set([
  "channel_section_length_m",
  "channel_transport_pack_m",
  "accessory_items_per_set",
  "selected_system_reference",
]);

export const ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RUNTIME_CLASSIFICATION =
  Object.freeze(Object.fromEntries(
    Object.keys(ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RUNTIME_INPUT).map((parameterId) => [
      parameterId,
      NORMATIVE_IDS.has(parameterId) ? "NORMATIVE" : "ASSUMPTION",
    ]),
  )) as Readonly<Record<string, RuntimeClass>>;

export const ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RUNTIME_SOURCE_IDS =
  Object.freeze(Object.fromEntries(
    Object.keys(ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RUNTIME_INPUT).map((parameterId) => [
      parameterId,
      [ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_ID],
    ]),
  ));

export const ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SHORT_INPUT = Object.freeze({
  route_length_m: sourcePack.acceptanceFixture.routeLengthM,
});

export const ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT = Object.freeze({
  ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RUNTIME_INPUT,
  route_length_m: sourcePack.acceptanceFixture.routeLengthM,
  inner_corner_count: sourcePack.acceptanceFixture.innerCornerCount,
  outer_corner_count: sourcePack.acceptanceFixture.outerCornerCount,
  flat_angle_count: sourcePack.acceptanceFixture.flatAngleCount,
  tee_count: sourcePack.acceptanceFixture.teeCount,
  open_end_count: sourcePack.acceptanceFixture.openEndCount,
});

export const ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_METADATA = Object.freeze({
  source_title: "Монтаж кабель-канала IEK ELECOR 40×25 в стандартной зоне",
  source_authority: "IEK GROUP; Минстрой Кыргызской Республики; видимый профиль S27.23",
  source_document_version: "IEK_CABLE_SYSTEMS_CAPTURE_2026_10_01_AND_S27_23_PROFILE_R1",
  definition_hash: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256,
  source_kind: "MANUFACTURER_SYSTEM_PLUS_VISIBLE_REPLACEABLE_PLANNING_PROFILE",
  official_url: sourcePack.sources[0].officialUrl,
  artifact_sha256: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256,
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
  D("route_length_m", "Длина трассы кабель-канала", "m", "Известная длина трассы по обмеру или проекту.", { min: 0.001 }),
  D("inner_corner_count", "Внутренние углы трассы", "item", "Считаются по раскладке; не выводятся из длины.", { type: "integer", min: 0 }),
  D("outer_corner_count", "Внешние углы трассы", "item", "Считаются по раскладке; не выводятся из длины.", { type: "integer", min: 0 }),
  D("flat_angle_count", "Плоские повороты 90°", "item", "Считаются по раскладке; не выводятся из длины.", { type: "integer", min: 0 }),
  D("tee_count", "Т-образные ответвления", "item", "Считаются по раскладке; не выводятся из длины.", { type: "integer", min: 0 }),
  D("open_end_count", "Открытые окончания с заглушками", "item", "Считаются по раскладке; ноль подтверждает неприменимость.", { type: "integer", min: 0 }),
  D("channel_section_length_m", "Длина одной секции кабель-канала", "m", "IEK ELECOR 40×25: секция длиной 2 м.", { min: 0.001 }),
  D("channel_transport_pack_m", "Кабель-канал в транспортной упаковке", "m", "Официальная таблица IEK: 24 м для выбранного белого ELECOR 40×25.", { min: 0.001 }),
  D("accessory_items_per_set", "Аксессуаров в комплекте", "item", "Официальные карточки IEK: четыре аксессуара 40×25 в комплекте.", { type: "integer", min: 1 }),
  D("channel_reserve_percent", "Резерв кабель-канала на раскрой", "percent", "Видимое плановое допущение; заменить раскладкой.", { min: 0 }),
  D("continuous_route_count", "Число непрерывных трасс", "item", "Влияет на число прямых стыков; предварительно одна трасса.", { type: "integer", min: 1 }),
  D("fastener_spacing_m", "Шаг крепления основания", "m", "Видимое допущение; заменить по основанию, нагрузке и инструкции.", { min: 0.05 }),
  D("fastener_package_item", "Креплений в упаковке", "item", "Размер выбранной упаковки крепежа.", { type: "integer", min: 1 }),
  D("installer_productivity_m_per_man_hour", "Производительность электромонтажника", "m_per_man_hour", "Видимое допущение ППР, не универсальная норма КРЕРм.", { min: 0.001 }),
  D("drill_productivity_point_per_machine_hour", "Производительность сверления", "item_per_machine_hour", "Видимое допущение ППР.", { min: 0.001 }),
  D("drill_bit_capacity_point", "Ресурс комплекта буров", "item", "Число точек на комплект — видимое допущение.", { min: 1 }),
  D("cutting_productivity_m_per_shift", "Трасса на смену режущего инструмента", "m_per_shift", "Видимое допущение ППР.", { min: 0.001 }),
  D("delivery_trip_count", "Рейсы доставки", "trip", "Видимое логистическое допущение.", { type: "integer", min: 0 }),
  D("waste_removal_trip_count", "Рейсы вывоза отходов", "trip", "Видимое логистическое допущение.", { type: "integer", min: 0 }),
  D("working_height_m", "Рабочая высота", "m", "Стандартная зона предварительно 2,5 м; заменить фактом объекта.", { min: 0.001 }),
  D("selected_system_reference", "Выбранная система", null, "IEK ELECOR 40×25 белый; заменить только совместимой проектной системой.", { type: "text" }),
  D("substrate_profile", "Основание крепления", null, "Предварительный тип основания; определяет фактический крепёж.", {
    type: "enum",
    values: ["SOLID_MASONRY_PRELIMINARY", "CONCRETE", "HOLLOW_MASONRY", "TIMBER", "METAL", "PROJECT_DEFINED"],
  }),
];

const PROJECT_IDS = new Set([
  "route_length_m", "inner_corner_count", "outer_corner_count", "flat_angle_count",
  "tee_count", "open_end_count",
]);

export const ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_PARAMETERS:
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
      contract: "rik-expo-app.s27-23.electrical-elecor-cable-channel-standard.v1",
      semantic_parameter_key: `electrical-elecor-cable-channel-standard-s27-23:${descriptor.id}`,
      visibility_role: "USER_INPUT",
      value_source_role: PROJECT_IDS.has(descriptor.id)
        ? "USER_OR_PROJECT_MEASURED"
        : "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
      input_origin_class: PROJECT_IDS.has(descriptor.id)
        ? "PROJECT_GEOMETRY_OR_NODE_COUNT"
        : "SELECTED_VISIBLE_PRELIMINARY_PROFILE",
      preliminary_compilation_allowed: descriptor.id !== "route_length_m",
      source_confirmation_required: false,
      hidden_default_forbidden: PROJECT_IDS.has(descriptor.id),
      runtime_profile_value: Object.prototype.hasOwnProperty.call(
        ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RUNTIME_INPUT,
        descriptor.id,
      ),
      synthetic: false,
      guide: {
        guide_kind: descriptor.id === "route_length_m" ? "MEASUREMENT_RULE" : "PRACTICE_REFERENCE",
        guide_short_ru: descriptor.guide,
        source_role: NORMATIVE_IDS.has(descriptor.id)
          ? "PRIMARY_MANUFACTURER_PRODUCT_OR_PACKAGING"
          : PROJECT_IDS.has(descriptor.id)
            ? "PROJECT_GEOMETRY"
            : "VISIBLE_REPLACEABLE_PLANNING_ASSUMPTION",
        source_document: NORMATIVE_IDS.has(descriptor.id) ? IEK_CATALOG : PRELIMINARY,
        source_locator: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_METADATA.exact_locator,
        guide_version: "electrical-elecor-cable-channel-standard-s27-23-r1",
        source_snapshot_hash: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256,
        applicability: PROFILE.assumptionPolicy,
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "FIRST_ESTIMATE_NOW_THEN_REPLACE_VISIBLE_ASSUMPTIONS_AND_NODE_COUNTS",
      },
    },
  }),
), ...ELECOR_SELECTED_SUPPLIES.filter(supply => "effective" in supply).map((supply, index) => ({
  parameter_id: "effective" in supply ? supply.effective : "", ordinal: PARAMETERS.length + index,
  value_type: "decimal", unit_id: "item", title_ru: "Принятое целое количество упаковок или комплектов",
  required: false, default_value: null, constraints_json: { min: 0 },
  truth_metadata: { visibility_role: "INTERNAL_ONLY", value_source_role: "BACKEND_DERIVED",
    preliminary_compilation_allowed: true, hidden_default_forbidden: true,
    effective_resource_quantity_v1: { sourceRowId: `electrical-elecor:${supply.rowId}`, unitId: "item" } },
}))]);

function formula(id: string, unit: string, expression: string): CanonicalEstimateFormulaDefinition {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: `electrical_elecor_${id}_s2723`,
    output_unit_id: unit,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: estimateDeterministicHash(compiled.ast),
  };
}

const F = (id: string, unit: string, expression: string) => formula(id, unit, expression);
const GROSS = "route_length_m*(1+channel_reserve_percent/100)";
const PACKS = `ceil(${GROSS}/channel_transport_pack_m)`;
const PIECES = "ceil(route_length_m/channel_section_length_m)";
const FASTENER_POINTS = "ceil(route_length_m/fastener_spacing_m)+continuous_route_count";
const CONNECTORS = `max(0,${PIECES}-continuous_route_count)`;

export const ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  F("route", "m", "route_length_m"),
  F("single", "service", "1"),
  F("channel_gross", "m", GROSS),
  F("channel_reserve", "m", "route_length_m*channel_reserve_percent/100"),
  F("channel_packs", "item", PACKS),
  F("channel_order", "m", "elecor_effective_channel_packs*channel_transport_pack_m"),
  F("channel_remainder", "m", `max(0,elecor_effective_channel_packs*channel_transport_pack_m-(${GROSS}))`),
  F("channel_pieces", "item", PIECES),
  F("cutting_shifts", "shift", "ceil(route_length_m/cutting_productivity_m_per_shift)"),
  F("fastener_points", "item", FASTENER_POINTS),
  F("fastener_packages", "item", `ceil((${FASTENER_POINTS})/fastener_package_item)`),
  F("fastener_order", "item", "elecor_effective_fastener_packages*fastener_package_item"),
  F("fastener_remainder", "item", `max(0,elecor_effective_fastener_packages*fastener_package_item-(${FASTENER_POINTS}))`),
  F("drill_hours", "machine_hour", `(${FASTENER_POINTS})/drill_productivity_point_per_machine_hour`),
  F("drill_bits", "item", `ceil((${FASTENER_POINTS})/drill_bit_capacity_point)`),
  F("straight_connectors", "item", CONNECTORS),
  F("straight_connector_sets", "item", `ceil((${CONNECTORS})/accessory_items_per_set)`),
  F("straight_connector_order", "item", "elecor_effective_connector_sets*accessory_items_per_set"),
  F("straight_connector_remainder", "item", `max(0,elecor_effective_connector_sets*accessory_items_per_set-(${CONNECTORS}))`),
  F("inner_corner_sets", "item", "ceil(inner_corner_count/accessory_items_per_set)"),
  F("outer_corner_sets", "item", "ceil(outer_corner_count/accessory_items_per_set)"),
  F("flat_angle_sets", "item", "ceil(flat_angle_count/accessory_items_per_set)"),
  F("tee_sets", "item", "ceil(tee_count/accessory_items_per_set)"),
  F("end_cap_sets", "item", "ceil(open_end_count/accessory_items_per_set)"),
  F("inner_corners", "item", "inner_corner_count"),
  F("outer_corners", "item", "outer_corner_count"),
  F("flat_angles", "item", "flat_angle_count"),
  F("tees", "item", "tee_count"),
  F("end_caps", "item", "open_end_count"),
  F("installer_hours", "man_hour", "route_length_m/installer_productivity_m_per_man_hour"),
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

const id = (short: string) => `electrical_elecor_${short}_s2723`;
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
  R("01 · Трасса", "electrical-elecor:01:operation:route-survey", "operation", "Обследование и обмер трассы кабель-канала", "m", "route", KG_KRERM),
  R("01 · Трасса", "electrical-elecor:01:operation:route-layout", "operation", "Разметка оси, поворотов, ответвлений и точек крепления", "m", "route", KG_KRERM),
  R("01 · Трасса", "electrical-elecor:01:control:substrate-and-capacity", "control", "Проверка основания крепления и заполнения выбранного сечения 40×25", "service", "single", IEK_CATALOG, { informational: true }),

  R("02 · Канал и раскрой", "electrical-elecor:02:material:channel-net", "material", "Кабель-канал IEK ELECOR 40×25 CKK10-040-025-1-K01 — чистая длина", "m", "route", IEK_CATALOG, { informational: true }),
  R("02 · Канал и раскрой", "electrical-elecor:02:material:channel-reserve", "material", "Резерв кабель-канала на раскрой", "m", "channel_reserve", PRELIMINARY, { informational: true }),
  R("02 · Канал и раскрой", "electrical-elecor:02:material:channel-packs", "material", "Транспортные упаковки кабель-канала IEK ELECOR 40×25; выбранная длина упаковки, м", "item", "channel_packs", IEK_CATALOG, { procurement: true, titleParameterIds: ["channel_transport_pack_m"] }),
  R("02 · Канал и раскрой", "electrical-elecor:02:control:channel-order", "control", "Заказанная длина кабель-канала после округления упаковок", "m", "channel_order", IEK_CATALOG, { informational: true }),
  R("02 · Канал и раскрой", "electrical-elecor:02:control:channel-remainder", "control", "Прогноз превышения длины поставки над потребностью с резервом; пригодность обрезков не подтверждена", "m", "channel_remainder", IEK_CATALOG, { informational: true }),
  R("02 · Канал и раскрой", "electrical-elecor:02:operation:cutting", "operation", "Раскрой устанавливаемых секций кабель-канала; выбранная длина секции, м", "item", "channel_pieces", IEK_CATALOG, { titleParameterIds: ["channel_section_length_m"] }),
  R("02 · Канал и раскрой", "electrical-elecor:02:equipment:cutting-tool", "equipment", "Режущий инструмент с пылеудалением для ровного раскроя", "shift", "cutting_shifts", PRELIMINARY, { procurement: true }),
  R("02 · Канал и раскрой", "electrical-elecor:02:consumable:cutting-blades", "consumable", "Комплект оснастки для резки ПВХ кабель-канала", "item", "cutting_shifts", PRELIMINARY, { procurement: true }),

  R("03 · Крепление", "electrical-elecor:03:fastener:points", "fastener", "Точки крепления основания кабель-канала к фактическому основанию", "item", "fastener_points", PRELIMINARY, { informational: true }),
  R("03 · Крепление", "electrical-elecor:03:fastener:packages", "fastener", "Упаковки совместимого крепежа для выбранного основания; количество в упаковке, шт.", "item", "fastener_packages", PRELIMINARY, { procurement: true, titleParameterIds: ["fastener_package_item"] }),
  R("03 · Крепление", "electrical-elecor:03:control:fastener-order", "control", "Заказанное количество креплений", "item", "fastener_order", PRELIMINARY, { informational: true }),
  R("03 · Крепление", "electrical-elecor:03:control:fastener-remainder", "control", "Прогноз превышения количества поставленных креплений над потребностью; пригодность не подтверждена", "item", "fastener_remainder", PRELIMINARY, { informational: true }),
  R("03 · Крепление", "electrical-elecor:03:operation:drill-and-fix", "operation", "Сверление и крепление основания кабель-канала", "item", "fastener_points", KG_KRERM),
  R("03 · Крепление", "electrical-elecor:03:equipment:rotary-hammer", "equipment", "Перфоратор или дрель по фактическому основанию", "machine_hour", "drill_hours", PRELIMINARY, { procurement: true }),
  R("03 · Крепление", "electrical-elecor:03:consumable:drill-bits", "consumable", "Комплекты буров/свёрл для основания", "item", "drill_bits", PRELIMINARY, { procurement: true }),

  R("04 · Прямые стыки", "electrical-elecor:04:component:straight-connectors-net", "component", "Соединители КМС 40×25 — потребность", "item", "straight_connectors", IEK_PRODUCTS, { informational: true }),
  R("04 · Прямые стыки", "electrical-elecor:04:component:straight-connector-sets", "component", "Комплекты соединителей КМС 40×25; количество в комплекте, шт.", "item", "straight_connector_sets", IEK_PRODUCTS, { procurement: true, titleParameterIds: ["accessory_items_per_set"] }),
  R("04 · Прямые стыки", "electrical-elecor:04:control:straight-connector-order", "control", "Заказанные соединители КМС", "item", "straight_connector_order", IEK_PRODUCTS, { informational: true }),
  R("04 · Прямые стыки", "electrical-elecor:04:control:straight-connector-remainder", "control", "Прогноз превышения количества поставленных соединителей над потребностью; пригодность не подтверждена", "item", "straight_connector_remainder", IEK_PRODUCTS, { informational: true }),
  R("04 · Прямые стыки", "electrical-elecor:04:operation:straight-joints", "operation", "Стыковка прямых секций и установка соединителей КМС", "item", "straight_connectors", IEK_PRODUCTS),

  R("05 · Узлы трассы", "electrical-elecor:05:component:inner-corner-sets", "component", "Комплекты внутренних углов КМВ 40×25; количество в комплекте, шт.", "item", "inner_corner_sets", IEK_PRODUCTS, { procurement: true, titleParameterIds: ["accessory_items_per_set"] }),
  R("05 · Узлы трассы", "electrical-elecor:05:component:outer-corner-sets", "component", "Комплекты внешних углов КМН 40×25; количество в комплекте, шт.", "item", "outer_corner_sets", IEK_PRODUCTS, { procurement: true, titleParameterIds: ["accessory_items_per_set"] }),
  R("05 · Узлы трассы", "electrical-elecor:05:component:flat-angle-sets", "component", "Комплекты плоских поворотов КМП 40×25; количество в комплекте, шт.", "item", "flat_angle_sets", IEK_CATALOG, { procurement: true, titleParameterIds: ["accessory_items_per_set"] }),
  R("05 · Узлы трассы", "electrical-elecor:05:component:tee-sets", "component", "Комплекты Т-углов КМТ 40×25; количество в комплекте, шт.", "item", "tee_sets", IEK_CATALOG, { procurement: true, titleParameterIds: ["accessory_items_per_set"] }),
  R("05 · Узлы трассы", "electrical-elecor:05:component:end-cap-sets", "component", "Комплекты заглушек КМЗ 40×25; количество в комплекте, шт.", "item", "end_cap_sets", IEK_PRODUCTS, { procurement: true, titleParameterIds: ["accessory_items_per_set"] }),
  R("05 · Узлы трассы", "electrical-elecor:05:operation:inner-corners", "operation", "Монтаж внутренних углов трассы", "item", "inner_corners", IEK_PRODUCTS),
  R("05 · Узлы трассы", "electrical-elecor:05:operation:outer-corners", "operation", "Монтаж внешних углов трассы", "item", "outer_corners", IEK_PRODUCTS),
  R("05 · Узлы трассы", "electrical-elecor:05:operation:flat-angles", "operation", "Монтаж плоских поворотов трассы", "item", "flat_angles", IEK_CATALOG),
  R("05 · Узлы трассы", "electrical-elecor:05:operation:tees", "operation", "Монтаж Т-образных ответвлений", "item", "tees", IEK_CATALOG),
  R("05 · Узлы трассы", "electrical-elecor:05:operation:end-caps", "operation", "Монтаж заглушек открытых окончаний", "item", "end_caps", IEK_PRODUCTS),

  R("06 · Сборка", "electrical-elecor:06:operation:channel-installation", "operation", "Монтаж основания кабель-канала по трассе", "m", "route", KG_KRERM),
  R("06 · Сборка", "electrical-elecor:06:labor:installer-hours", "labor", "Труд электромонтажника по видимой производительности ППР", "man_hour", "installer_hours", PRELIMINARY),
  R("06 · Сборка", "electrical-elecor:06:operation:cover-closure", "operation", "Установка и закрытие крышки кабель-канала", "m", "route", IEK_CATALOG),

  R("07 · Завершение", "electrical-elecor:07:delivery:materials", "delivery", "Доставка кабель-канала, аксессуаров и крепежа", "trip", "delivery", PRELIMINARY, { procurement: true }),
  R("07 · Завершение", "electrical-elecor:07:consumable:waste-bags", "consumable", "Мешки для обрезков и упаковки", "item", "waste_bags", PRELIMINARY, { procurement: true }),
  R("07 · Завершение", "electrical-elecor:07:operation:cleanup", "operation", "Сбор обрезков, очистка трассы и рабочего места", "m", "route", KG_KRERM),
  R("07 · Завершение", "electrical-elecor:07:delivery:waste", "delivery", "Вывоз отходов раскроя и упаковки", "trip", "waste_delivery", PRELIMINARY, { procurement: true }),
  R("07 · Завершение", "electrical-elecor:07:control:acceptance", "control", "Контроль крепления, совместимости аксессуаров, крышек и доступности трассы", "service", "single", KG_KRERM, { informational: true }),
];

const SOURCE_BY_ID = new Map(sourcePack.sources.map((source) => [source.sourceId, source]));

function category(kind: ResourceKind): string {
  if (["material", "component", "fastener", "consumable"].includes(kind)) return "material";
  if (kind === "labor") return "labor";
  if (kind === "equipment") return "equipment";
  if (kind === "delivery") return "delivery";
  if (kind === "control") return "service";
  return "construction_work";
}

function resource(spec: ResourceSpec, ordinal: number): CanonicalEstimateResourceDefinition {
  const source = SOURCE_BY_ID.get(spec.source);
  const informational = spec.informational === true;
  const procurementEligible = spec.procurement
    ?? (["material", "component", "fastener", "consumable"].includes(spec.kind) && !informational);
  const supply = ELECOR_SELECTED_SUPPLIES.find(value => `electrical-elecor:${value.rowId}` === spec.rowId);
  const selectedOrder = ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_FORMULAS.find(value => value.formula_id === spec.formula);
  const resourceGraph = {
    formulaId: spec.formula,
    normalizedUom: spec.unit,
    semanticOwnerId: `electrical-elecor-cable-channel-standard-s27-23:${spec.rowId}`,
    resourceKind: spec.kind,
    stage: spec.stage,
    costOwner: informational ? "scope" : "resource",
    costTreatment: informational ? "INFORMATIONAL_SCOPE" : "OWN_COST",
    payable: !informational,
    noDoubleCount: true,
    ...(spec.titleParameterIds ? { titleSpecificationParameterIds: [...spec.titleParameterIds], titleSpecificationMode: "APPEND" } : {}),
    ...(supply ? {
      purchaseBalanceV1: { quantityMode: "supply_quantum", balanceScope: "new_order_vs_required_consumption",
        requirementBasis: "selected_order_including_contingency", unitId: "item", stockExpression: "0", reserveExpression: "0",
        orderQuantumExpression: "1", consumedExpression: selectedOrder!.expression_source,
        plannedConsumptionExpression: "base" in supply ? supply.base : selectedOrder!.expression_source },
      ...("effective" in supply ? { effectiveQuantityOutputV1: { parameterId: supply.effective, unitId: "item" } } : {}),
    } : {}),
    primaryMeasureParameterId: "route_length_m",
    preliminaryProfileId: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_NORM_ID,
    visibleAssumptionPolicy: PROFILE.assumptionPolicy,
    contextParameterIds: [
      "selected_system_reference", "substrate_profile", "working_height_m",
    ],
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: source?.role ?? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
    sourcePackSha256: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256,
    normativeTrace: [{
      sourceId: spec.source,
      source_id: spec.source,
      normId: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_NORM_ID,
      norm_id: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_NORM_ID,
      normVersion: "S27.23",
      source_title: source?.authority ?? spec.source,
      source_url: source?.officialUrl ?? null,
      exact_locator: source?.exactLocator ?? "selected visible preliminary profile",
      source_definition_hash: source?.artifactSha256
        ?? ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256,
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

export const ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  RESOURCE_SPECS.map((spec, ordinal) => resource(spec, ordinal)),
);

export const ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s27-23.electrical-elecor-cable-channel-completeness.v1",
    sourceKind: "INDEPENDENT_MANUFACTURER_TECHNOLOGY_MAP",
    generatedFromCurrentRows: false,
    evidenceSha256: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256,
    sourcePackPath:
      "data/estimate-benchmarks/source-packs/electrical-elecor-cable-channel-standard-s27-23.json",
    entries: sourcePack.independentRequiredComponents.map((component) => ({
      ...component,
      expectedResourceIds: [...component.requiredRowIds],
    })),
  });

export function electricalElecorCableChannelStandardMissingRows(
  rowIds: ReadonlySet<string>,
): string[] {
  return ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
    .flatMap((entry) => entry.requiredRowIds)
    .filter((rowId) => !rowIds.has(rowId));
}

export async function compileElectricalElecorCableChannelStandardS2723(
  submittedParameters: Record<string, unknown>,
  rowOverrides?: Parameters<typeof compileCanonicalEstimateCore>[0]["rowOverrides"],
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileCanonicalEstimateCore({
    operation: rowOverrides ? "recalculate" : "compile",
    rowOverrides,
    compilerVersion: "canonical-estimate-compiler.electrical-elecor-cable-channel-standard-s27-23.v1",
    catalogId: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_CATALOG_ID,
    primaryMeasureParameterId: "route_length_m",
    parameterDefinitions: [...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_PARAMETERS],
    formulaDefinitions: [...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_FORMULAS],
    resourceDefinitions: [...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES.length,
    hashJson: async (value: Json) => estimateDeterministicHash(value),
  });
}
