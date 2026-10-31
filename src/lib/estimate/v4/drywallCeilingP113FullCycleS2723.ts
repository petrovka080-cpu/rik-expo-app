import sourcePack from "../../../../data/estimate-benchmarks/source-packs/drywall-ceiling-p113-full-cycle-s27-23.json";

import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateCompileCoreInput,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type Json = Record<string, unknown>;
type RuntimeClass = "NORMATIVE" | "ASSUMPTION" | "DERIVED";
type ValueType = "decimal" | "integer" | "text" | "enum" | "boolean";
type ResourceKind =
  | "operation" | "material" | "component" | "fastener" | "consumable"
  | "equipment" | "delivery" | "control";

export const DRYWALL_CEILING_P113_FULL_CYCLE_S2723_CATALOG_ID =
  "canonical-work:base:drywall_ceiling_interior_drywall_ceiling_install_standard";
export const DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_ID =
  "drywall_ceiling_p113_full_cycle_s27_23";
export const DRYWALL_CEILING_P113_FULL_CYCLE_S2723_NORM_ID =
  "KNAUF-P113-FULL-CYCLE-S27-23-PRELIMINARY-R1";
export const DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256 =
  "d52d5dc63a416b881804db3d90b63fcac7ec0820e84668076072ce099e62ac2f";

const PROFILE = sourcePack.selectedPreliminaryProfile;
const KNAUF = "KNAUF_P11_TECHNICAL_SHEET_2025_02";
const PRELIMINARY = "VISIBLE_REPLACEABLE_P113_PROCUREMENT_PROFILE_S2723";

/** Whole selected units of supply. These balances give no warehouse credit and
 * do not establish that forecast dimensional excess can be reused. */
export const P113_SELECTED_SUPPLIES = Object.freeze([
  { rowId: "02:material:pp-profile-pieces", formula: "pp_pieces", base: "ceil(area_m2*pp_profile_m_per_m2/profile_piece_length_m)", effective: "p113_effective_pp_items" },
  { rowId: "02:component:extensions", formula: "extensions", base: "ceil(area_m2*profile_extension_item_per_m2)" },
  { rowId: "02:component:connectors", formula: "connectors", base: "ceil(area_m2*connector_item_per_m2)" },
  { rowId: "02:component:hangers", formula: "hangers", base: "ceil(area_m2*hanger_item_per_m2)" },
  { rowId: "02:fastener:hanger-anchors", formula: "hanger_anchors", base: "ceil(area_m2*hanger_anchor_item_per_m2)" },
  { rowId: "02:fastener:ln-packages", formula: "ln_packages", base: "ceil(area_m2*ln_screw_item_per_m2/ln_package_item)" },
  { rowId: "02:material:pn-profile-pieces", formula: "pn_pieces", base: "ceil(2*(room_length_m+room_width_m)/profile_piece_length_m)" },
  { rowId: "02:fastener:perimeter-packages", formula: "perimeter_fastener_packages", base: "ceil(2*(room_length_m+room_width_m)*perimeter_fastener_item_per_m/perimeter_fastener_package_item)" },
  { rowId: "02:consumable:sealing-tape-rolls", formula: "sealing_tape_rolls", base: "ceil(2*(room_length_m+room_width_m)/sealing_tape_roll_m)" },
  { rowId: "03:material:gsp-sheets", formula: "board_sheets", base: "ceil(area_m2*board_m2_per_m2/board_sheet_area_m2)", effective: "p113_effective_board_items" },
  { rowId: "03:fastener:tn25-packages", formula: "tn25_packages", base: "ceil(area_m2*tn25_screw_item_per_m2/tn25_package_item)" },
  { rowId: "04:material:joint-compound-bags", formula: "joint_compound_bags", base: "ceil(area_m2*joint_compound_kg_per_m2/joint_compound_bag_kg)", effective: "p113_effective_compound_items" },
  { rowId: "04:material:joint-tape-rolls", formula: "joint_tape_rolls", base: "ceil(area_m2*joint_tape_m_per_m2/joint_tape_roll_m)", effective: "p113_effective_joint_tape_items" },
  { rowId: "04:material:separation-tape-rolls", formula: "separation_tape_rolls", base: "ceil(2*(room_length_m+room_width_m)/separation_tape_roll_m)" },
  { rowId: "05:material:primer-cans", formula: "primer_cans", base: "ceil(area_m2*primer_l_per_m2/primer_can_l)", effective: "p113_effective_primer_items" },
  { rowId: "05:consumable:abrasive", formula: "abrasive", base: "ceil(area_m2/abrasive_productivity_m2_item)" },
  { rowId: "06:material:control-joint-pieces", formula: "control_joint_pieces", base: "ceil(control_joint_length_m/profile_piece_length_m)" },
] as const);

export const DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RUNTIME_INPUT = Object.freeze({
  board_m2_per_m2: 1,
  pp_profile_m_per_m2: 2.9,
  profile_extension_item_per_m2: 0.2,
  connector_item_per_m2: 1.7,
  hanger_item_per_m2: 0.7,
  hanger_anchor_item_per_m2: 0.7,
  ln_screw_item_per_m2: 1.4,
  tn25_screw_item_per_m2: 23,
  joint_compound_kg_per_m2: 0.4,
  joint_tape_m_per_m2: 1.2,
  primer_l_per_m2: 0.1,
  perimeter_fastener_item_per_m: 2,
  material_reserve_percent: PROFILE.materialReservePercent,
  hardware_reserve_percent: PROFILE.hardwareReservePercent,
  profile_piece_length_m: PROFILE.profilePieceLengthM,
  board_sheet_area_m2: PROFILE.boardSheetAreaM2,
  tn25_package_item: PROFILE.tn25PackageItem,
  ln_package_item: PROFILE.lnPackageItem,
  perimeter_fastener_package_item: PROFILE.perimeterFastenerPackageItem,
  sealing_tape_roll_m: PROFILE.sealingTapeRollM,
  separation_tape_roll_m: PROFILE.separationTapeRollM,
  joint_compound_bag_kg: PROFILE.jointCompoundBagKg,
  joint_tape_roll_m: PROFILE.jointTapeRollM,
  primer_can_l: PROFILE.primerCanL,
  abrasive_productivity_m2_item: PROFILE.abrasiveProductivityM2Item,
  work_productivity_m2_shift: PROFILE.workProductivityM2Shift,
  delivery_trip_count: PROFILE.deliveryTripCount,
  access_delivery_trip_count: PROFILE.accessDeliveryTripCount,
  access_return_trip_count: PROFILE.accessReturnTripCount,
  waste_removal_trip_count: PROFILE.wasteRemovalTripCount,
  working_height_m: PROFILE.workingHeightM,
  selected_system_reference: "КНАУФ П 113, одноуровневый металлический каркас, один слой ГСП 12,5 мм",
  structural_substrate_type: "REINFORCED_CONCRETE_SLAB",
  access_system_type: "MOBILE_TOWER",
});

const NORMATIVE_IDS = new Set([
  "board_m2_per_m2",
  "pp_profile_m_per_m2",
  "profile_extension_item_per_m2",
  "connector_item_per_m2",
  "hanger_item_per_m2",
  "hanger_anchor_item_per_m2",
  "ln_screw_item_per_m2",
  "tn25_screw_item_per_m2",
  "joint_compound_kg_per_m2",
  "joint_tape_m_per_m2",
  "primer_l_per_m2",
  "perimeter_fastener_item_per_m",
]);

export const DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RUNTIME_CLASSIFICATION =
  Object.freeze(Object.fromEntries(
    Object.keys(DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RUNTIME_INPUT).map((parameterId) => [
      parameterId,
      NORMATIVE_IDS.has(parameterId) ? "NORMATIVE" : "ASSUMPTION",
    ]),
  )) as Readonly<Record<string, RuntimeClass>>;

export const DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RUNTIME_SOURCE_IDS =
  Object.freeze(Object.fromEntries(
    Object.keys(DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RUNTIME_INPUT).map((parameterId) => [
      parameterId,
      [DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_ID],
    ]),
  ));

export const DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SHORT_INPUT = Object.freeze({
  area_m2: 500,
});

export const DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT = Object.freeze({
  ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RUNTIME_INPUT,
  area_m2: 500,
  room_length_m: 25,
  room_width_m: 20,
  control_joint_length_m: 20,
});

export const DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_METADATA = Object.freeze({
  source_title: "Полный цикл подвесного потолка КНАУФ П 113",
  source_authority: "ООО КНАУФ ГИПС; видимый заменяемый профиль планирования S27.23",
  source_document_version: "KNAUF_P11_02_2025_AND_S27_23_PROFILE_2026_10_01",
  definition_hash: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256,
  source_kind: "MANUFACTURER_SYSTEM_PLUS_VISIBLE_PROCUREMENT_PROFILE",
  official_url: sourcePack.sources[0].officialUrl,
  artifact_sha256: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256,
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
  D("area_m2", "Площадь потолка", "m2", "Известная площадь потолка по обмеру или проекту.", { min: 0.001 }),
  D("room_length_m", "Длина помещения", "m", "Нужна для периметра; система не выводит её из площади.", { min: 0.001 }),
  D("room_width_m", "Ширина помещения", "m", "Нужна для периметра; система не выводит её из площади.", { min: 0.001 }),
  D("control_joint_length_m", "Проектная длина деформационных швов", "m", "Оставьте как уточнение до раскладки; 0 допустим только после подтверждения неприменимости.", { min: 0 }),
  D("board_m2_per_m2", "ГСП на 1 м² потолка", "m2_per_m2", "Норма П 113 из таблицы 2 КНАУФ.", { min: 0.001 }),
  D("pp_profile_m_per_m2", "Профиль ПП 60×27 на 1 м²", "m_per_m2", "Норма П 113 из таблицы 2 КНАУФ.", { min: 0.001 }),
  D("profile_extension_item_per_m2", "Удлинители ПП на 1 м²", "item_per_m2", "Норма П 113 из таблицы 2 КНАУФ.", { min: 0 }),
  D("connector_item_per_m2", "Одноуровневые соединители на 1 м²", "item_per_m2", "Норма П 113 из таблицы 2 КНАУФ.", { min: 0 }),
  D("hanger_item_per_m2", "Подвесы на 1 м²", "item_per_m2", "Норма П 113 из таблицы 2 КНАУФ; тип проверяется по нагрузке.", { min: 0 }),
  D("hanger_anchor_item_per_m2", "Анкеры подвесов на 1 м²", "item_per_m2", "Норма П 113 для железобетонного основания.", { min: 0 }),
  D("ln_screw_item_per_m2", "Шурупы LN на 1 м²", "item_per_m2", "Норма П 113 из таблицы 2 КНАУФ.", { min: 0 }),
  D("tn25_screw_item_per_m2", "Шурупы TN 3,5×25 на 1 м²", "item_per_m2", "Норма однослойной обшивки П 113.", { min: 0 }),
  D("joint_compound_kg_per_m2", "Шпаклёвка для стыков на 1 м²", "kg_per_m2", "Норма таблицы 2 КНАУФ.", { min: 0 }),
  D("joint_tape_m_per_m2", "Армирующая лента на 1 м²", "m_per_m2", "Норма таблицы 2 КНАУФ.", { min: 0 }),
  D("primer_l_per_m2", "Грунтовка на 1 м²", "l_per_m2", "Норма КНАУФ-Тифенгрунд из таблицы 2.", { min: 0 }),
  D("perimeter_fastener_item_per_m", "Крепления ПН на 1 м периметра", "item_per_m", "Два дюбеля на 1 пог. м ПН по примечанию таблицы 2.", { min: 0 }),
  D("material_reserve_percent", "Резерв материалов на раскрой", "percent", "Видимое плановое допущение; нормы КНАУФ приведены без потерь.", { min: 0 }),
  D("hardware_reserve_percent", "Резерв штучных комплектующих", "percent", "Видимое плановое допущение.", { min: 0 }),
  D("profile_piece_length_m", "Длина профиля в поставке", "m", "Заменить фактической длиной выбранного SKU.", { min: 0.001 }),
  D("board_sheet_area_m2", "Площадь одного листа ГСП", "m2", "Предварительно 2,4 м²; заменить выбранным форматом.", { min: 0.001 }),
  D("tn25_package_item", "Шурупов TN в упаковке", "item", "Размер выбранной упаковки.", { type: "integer", min: 1 }),
  D("ln_package_item", "Шурупов LN в упаковке", "item", "Размер выбранной упаковки.", { type: "integer", min: 1 }),
  D("perimeter_fastener_package_item", "Дюбелей ПН в упаковке", "item", "Размер выбранной упаковки.", { type: "integer", min: 1 }),
  D("sealing_tape_roll_m", "Уплотнительная лента в рулоне", "m", "Размер выбранного рулона.", { min: 0.001 }),
  D("separation_tape_roll_m", "Разделительная лента в рулоне", "m", "Размер выбранного рулона.", { min: 0.001 }),
  D("joint_compound_bag_kg", "Шпаклёвка в мешке", "kg", "Размер выбранной упаковки.", { min: 0.001 }),
  D("joint_tape_roll_m", "Армирующая лента в рулоне", "m", "Размер выбранного рулона.", { min: 0.001 }),
  D("primer_can_l", "Грунтовка в канистре", "l", "Размер выбранной упаковки.", { min: 0.001 }),
  D("abrasive_productivity_m2_item", "Ресурс абразива", "m2_per_item", "Видимое плановое допущение до выбора абразива.", { min: 0.001 }),
  D("work_productivity_m2_shift", "Площадь за смену комплекта механизмов", "m2_per_shift", "Видимое плановое допущение ППР.", { min: 0.001 }),
  D("delivery_trip_count", "Рейсы доставки материалов", "trip", "Видимое логистическое допущение.", { type: "integer", min: 0 }),
  D("access_delivery_trip_count", "Рейсы доставки средства доступа", "trip", "Видимое логистическое допущение.", { type: "integer", min: 0 }),
  D("access_return_trip_count", "Рейсы возврата средства доступа", "trip", "Видимое логистическое допущение.", { type: "integer", min: 0 }),
  D("waste_removal_trip_count", "Рейсы вывоза отходов", "trip", "Видимое логистическое допущение.", { type: "integer", min: 0 }),
  D("working_height_m", "Рабочая высота", "m", "Проверяется по объекту и ППР.", { min: 0.001 }),
  D("selected_system_reference", "Выбранная комплектная система", null, "Предварительно КНАУФ П 113; заменить проектным паспортом.", { type: "text" }),
  D("structural_substrate_type", "Тип несущего основания", null, "Определяет применимость анкеров.", { type: "enum", values: ["REINFORCED_CONCRETE_SLAB", "STEEL", "TIMBER", "OTHER_PROJECT_DEFINED"] }),
  D("access_system_type", "Средство доступа", null, "Подтверждается ППР.", { type: "enum", values: ["MOBILE_TOWER", "FRAME_SCAFFOLD", "SCISSOR_LIFT", "OTHER_PROJECT_DEFINED"] }),
];

export const DRYWALL_CEILING_P113_FULL_CYCLE_S2723_PARAMETERS:
readonly CanonicalEstimateParameterDefinition[] = Object.freeze(
  [...PARAMETERS.map((descriptor, ordinal) => ({
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
      contract: "rik-expo-app.s27-23.drywall-ceiling-p113-full-cycle.v1",
      semantic_parameter_key: `drywall-ceiling-p113-full-cycle-s27-23:${descriptor.id}`,
      visibility_role: "USER_INPUT",
      value_source_role: descriptor.id === "area_m2"
        ? "USER_MEASURED"
        : ["room_length_m", "room_width_m", "control_joint_length_m"].includes(descriptor.id)
          ? "USER_OR_PROJECT_MEASURED"
          : "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
      input_origin_class: descriptor.id === "area_m2"
        ? "KNOWN_WORK_SCOPE"
        : ["room_length_m", "room_width_m", "control_joint_length_m"].includes(descriptor.id)
          ? "PROJECT_CLARIFICATION"
          : "SELECTED_VISIBLE_PRELIMINARY_PROFILE",
      preliminary_compilation_allowed: descriptor.id !== "area_m2",
      source_confirmation_required: false,
      hidden_default_forbidden: ["area_m2", "room_length_m", "room_width_m", "control_joint_length_m"].includes(descriptor.id),
      runtime_profile_value: Object.prototype.hasOwnProperty.call(
        DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RUNTIME_INPUT,
        descriptor.id,
      ),
      synthetic: false,
      guide: {
        guide_kind: descriptor.id === "area_m2" ? "MEASUREMENT_RULE" : "PRACTICE_REFERENCE",
        guide_short_ru: descriptor.guide,
        source_role: NORMATIVE_IDS.has(descriptor.id)
          ? "PRIMARY_MANUFACTURER_QUANTITY_NORM"
          : "VISIBLE_PRELIMINARY_PROFILE_OR_PROJECT_FACT",
        source_document: NORMATIVE_IDS.has(descriptor.id) ? KNAUF : PRELIMINARY,
        source_locator: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_METADATA.exact_locator,
        guide_version: "drywall-ceiling-p113-full-cycle-s27-23",
        source_snapshot_hash: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256,
        applicability: PROFILE.assumptionPolicy,
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "FIRST_ESTIMATE_NOW_THEN_REPLACE_VISIBLE_ASSUMPTIONS",
      },
    },
  })), ...P113_SELECTED_SUPPLIES.filter(supply => "effective" in supply).map((supply, index) => ({
    parameter_id: "effective" in supply ? supply.effective : "", ordinal: PARAMETERS.length + index,
    value_type: "decimal", unit_id: "item", title_ru: "Принятое целое количество единиц поставки",
    required: false, default_value: null, constraints_json: { min: 0 },
    truth_metadata: { visibility_role: "INTERNAL_ONLY", value_source_role: "BACKEND_DERIVED",
      preliminary_compilation_allowed: true, hidden_default_forbidden: true,
      effective_resource_quantity_v1: { sourceRowId: `ceiling-p113-full:${supply.rowId}`, unitId: "item" } },
  }))],
);

function formula(id: string, unit: string, expression: string): CanonicalEstimateFormulaDefinition {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: `drywall_p113_full_${id}_s2723`,
    output_unit_id: unit,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: estimateDeterministicHash(compiled.ast),
  };
}

const F = (id: string, unit: string, expression: string) => formula(id, unit, expression);
const PERIMETER = "2*(room_length_m+room_width_m)";
const SHIFTS = "ceil(area_m2/work_productivity_m2_shift)";

export const DRYWALL_CEILING_P113_FULL_CYCLE_S2723_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  F("area", "m2", "area_m2"),
  F("single", "service", "1"),
  F("shifts", "shift", SHIFTS),
  F("perimeter", "m", PERIMETER),
  F("pp_net", "m", "area_m2*pp_profile_m_per_m2"),
  F("pp_pieces", "item", "ceil(area_m2*pp_profile_m_per_m2*(1+material_reserve_percent/100)/profile_piece_length_m)"),
  F("pp_order", "m", "p113_effective_pp_items*profile_piece_length_m"),
  F("pp_remainder", "m", "max(0,p113_effective_pp_items*profile_piece_length_m-area_m2*pp_profile_m_per_m2)"),
  F("extensions", "item", "ceil(area_m2*profile_extension_item_per_m2*(1+hardware_reserve_percent/100))"),
  F("connectors", "item", "ceil(area_m2*connector_item_per_m2*(1+hardware_reserve_percent/100))"),
  F("hangers", "item", "ceil(area_m2*hanger_item_per_m2*(1+hardware_reserve_percent/100))"),
  F("hanger_anchors", "item", "ceil(area_m2*hanger_anchor_item_per_m2*(1+hardware_reserve_percent/100))"),
  F("ln_packages", "item", "ceil(area_m2*ln_screw_item_per_m2*(1+hardware_reserve_percent/100)/ln_package_item)"),
  F("pn_pieces", "item", `ceil(${PERIMETER}*(1+material_reserve_percent/100)/profile_piece_length_m)`),
  F("perimeter_fastener_packages", "item", `ceil(${PERIMETER}*perimeter_fastener_item_per_m*(1+hardware_reserve_percent/100)/perimeter_fastener_package_item)`),
  F("sealing_tape_rolls", "item", `ceil(${PERIMETER}*(1+material_reserve_percent/100)/sealing_tape_roll_m)`),
  F("separation_tape_rolls", "item", `ceil(${PERIMETER}*(1+material_reserve_percent/100)/separation_tape_roll_m)`),
  F("board_net", "m2", "area_m2*board_m2_per_m2"),
  F("board_sheets", "item", "ceil(area_m2*board_m2_per_m2*(1+material_reserve_percent/100)/board_sheet_area_m2)"),
  F("board_order", "m2", "p113_effective_board_items*board_sheet_area_m2"),
  F("board_remainder", "m2", "max(0,p113_effective_board_items*board_sheet_area_m2-area_m2*board_m2_per_m2)"),
  F("tn25_packages", "item", "ceil(area_m2*tn25_screw_item_per_m2*(1+hardware_reserve_percent/100)/tn25_package_item)"),
  F("joint_compound_net", "kg", "area_m2*joint_compound_kg_per_m2"),
  F("joint_compound_bags", "item", "ceil(area_m2*joint_compound_kg_per_m2*(1+material_reserve_percent/100)/joint_compound_bag_kg)"),
  F("joint_compound_remainder", "kg", "max(0,p113_effective_compound_items*joint_compound_bag_kg-area_m2*joint_compound_kg_per_m2)"),
  F("joint_tape_net", "m", "area_m2*joint_tape_m_per_m2"),
  F("joint_tape_rolls", "item", "ceil(area_m2*joint_tape_m_per_m2*(1+material_reserve_percent/100)/joint_tape_roll_m)"),
  F("joint_tape_remainder", "m", "max(0,p113_effective_joint_tape_items*joint_tape_roll_m-area_m2*joint_tape_m_per_m2)"),
  F("primer_net", "l", "area_m2*primer_l_per_m2"),
  F("primer_cans", "item", "ceil(area_m2*primer_l_per_m2*(1+material_reserve_percent/100)/primer_can_l)"),
  F("primer_remainder", "l", "max(0,p113_effective_primer_items*primer_can_l-area_m2*primer_l_per_m2)"),
  F("abrasive", "item", "ceil(area_m2/abrasive_productivity_m2_item)"),
  F("control_joint_pieces", "item", "ceil(control_joint_length_m/profile_piece_length_m)"),
  F("control_joint_length", "m", "control_joint_length_m"),
  F("delivery", "trip", "delivery_trip_count"),
  F("access_delivery", "trip", "access_delivery_trip_count"),
  F("access_return", "trip", "access_return_trip_count"),
  F("waste_delivery", "trip", "waste_removal_trip_count"),
]);

type ResourceSpec = Readonly<{
  stage: string;
  rowId: string;
  kind: ResourceKind;
  title: string;
  unit: string;
  formula: string;
  source?: string;
  procurement?: boolean;
  informational?: boolean;
}>;

const R = (
  stage: string,
  rowId: string,
  kind: ResourceKind,
  title: string,
  unit: string,
  formulaId: string,
  options: Omit<ResourceSpec, "stage" | "rowId" | "kind" | "title" | "unit" | "formula"> = {},
): ResourceSpec => ({ stage, rowId, kind, title, unit, formula: `drywall_p113_full_${formulaId}_s2723`, ...options });

const RESOURCE_SPECS: readonly ResourceSpec[] = [
  R("01 · Подготовка фронта", "ceiling-p113-full:01:operation:survey", "operation", "Проверка готовности фронта, основания и инженерных коммуникаций", "m2", "area"),
  R("01 · Подготовка фронта", "ceiling-p113-full:01:operation:setout", "operation", "Разметка уровня потолка, осей профилей и точек подвесов", "m2", "area"),
  R("01 · Подготовка фронта", "ceiling-p113-full:01:equipment:laser", "equipment", "Лазерный нивелир для разметки и контроля плоскости", "shift", "shifts", { procurement: true }),
  R("01 · Подготовка фронта", "ceiling-p113-full:01:delivery:materials", "delivery", "Доставка комплектной системы и расходных материалов", "trip", "delivery", { procurement: true }),

  R("02 · Каркас П 113", "ceiling-p113-full:02:material:pp-profile-pieces", "material", "Профиль КНАУФ ПП 60×27 выбранной длины", "item", "pp_pieces"),
  R("02 · Каркас П 113", "ceiling-p113-full:02:control:pp-profile-net", "control", "Расчётная потребность профиля ПП 60×27 без резерва", "m", "pp_net", { informational: true }),
  R("02 · Каркас П 113", "ceiling-p113-full:02:control:pp-profile-order", "control", "Длина профиля ПП 60×27 в заказе", "m", "pp_order", { informational: true }),
  R("02 · Каркас П 113", "ceiling-p113-full:02:control:pp-profile-remainder", "control", "Прогнозное превышение поставленной длины ПП над расчётной потребностью; пригодность для повторного использования не подтверждена", "m", "pp_remainder", { informational: true }),
  R("02 · Каркас П 113", "ceiling-p113-full:02:component:extensions", "component", "Удлинитель профиля ПП 60×27", "item", "extensions"),
  R("02 · Каркас П 113", "ceiling-p113-full:02:component:connectors", "component", "Соединитель одноуровневый профилей ПП 60×27", "item", "connectors"),
  R("02 · Каркас П 113", "ceiling-p113-full:02:component:hangers", "component", "Подвес выбранного типа для профиля ПП 60×27", "item", "hangers"),
  R("02 · Каркас П 113", "ceiling-p113-full:02:fastener:hanger-anchors", "fastener", "Анкер подвеса для железобетонного основания", "item", "hanger_anchors"),
  R("02 · Каркас П 113", "ceiling-p113-full:02:fastener:ln-packages", "fastener", "Шурупы LN для соединения подвеса и профиля, упаковка", "item", "ln_packages"),
  R("02 · Каркас П 113", "ceiling-p113-full:02:material:pn-profile-pieces", "material", "Профиль направляющий ПН 28×27 выбранной длины", "item", "pn_pieces"),
  R("02 · Каркас П 113", "ceiling-p113-full:02:fastener:perimeter-packages", "fastener", "Дюбели крепления ПН 28×27, упаковка", "item", "perimeter_fastener_packages"),
  R("02 · Каркас П 113", "ceiling-p113-full:02:consumable:sealing-tape-rolls", "consumable", "Уплотнительная лента под направляющий профиль, рулон", "item", "sealing_tape_rolls"),
  R("02 · Каркас П 113", "ceiling-p113-full:02:operation:perimeter-installation", "operation", "Монтаж уплотнения и направляющего профиля по периметру", "m", "perimeter"),
  R("02 · Каркас П 113", "ceiling-p113-full:02:operation:frame-installation", "operation", "Монтаж подвесов, основных и несущих профилей, соединителей и выверка", "m2", "area"),
  R("02 · Каркас П 113", "ceiling-p113-full:02:control:frame-acceptance", "control", "Приёмка каркаса перед закрытием листами", "m2", "area", { informational: true }),

  R("03 · Обшивка ГСП", "ceiling-p113-full:03:material:gsp-sheets", "material", "Гипсовая строительная плита 12,5 мм выбранного формата", "item", "board_sheets"),
  R("03 · Обшивка ГСП", "ceiling-p113-full:03:control:gsp-net", "control", "Расчётная площадь ГСП без резерва", "m2", "board_net", { informational: true }),
  R("03 · Обшивка ГСП", "ceiling-p113-full:03:control:gsp-order", "control", "Площадь ГСП в заказанном числе листов", "m2", "board_order", { informational: true }),
  R("03 · Обшивка ГСП", "ceiling-p113-full:03:control:gsp-remainder", "control", "Прогнозное превышение поставленной площади ГСП над расчётной потребностью; пригодность для повторного использования не подтверждена", "m2", "board_remainder", { informational: true }),
  R("03 · Обшивка ГСП", "ceiling-p113-full:03:fastener:tn25-packages", "fastener", "Шурупы TN 3,5×25 для однослойной обшивки, упаковка", "item", "tn25_packages"),
  R("03 · Обшивка ГСП", "ceiling-p113-full:03:operation:board-cutting", "operation", "Раскрой листов, обработка торцевых кромок и разбежка стыков", "m2", "area"),
  R("03 · Обшивка ГСП", "ceiling-p113-full:03:operation:board-installation", "operation", "Подъём, установка и крепление листов к каркасу", "m2", "area"),
  R("03 · Обшивка ГСП", "ceiling-p113-full:03:equipment:board-lift", "equipment", "Подъёмник листов ГСП", "shift", "shifts", { procurement: true }),

  R("04 · Стыки и примыкания", "ceiling-p113-full:04:material:joint-compound-bags", "material", "Гипсовая шпаклёвка КНАУФ для стыков, мешок", "item", "joint_compound_bags"),
  R("04 · Стыки и примыкания", "ceiling-p113-full:04:control:joint-compound-net", "control", "Расчётная масса шпаклёвки без резерва", "kg", "joint_compound_net", { informational: true }),
  R("04 · Стыки и примыкания", "ceiling-p113-full:04:control:joint-compound-remainder", "control", "Прогнозное превышение поставленной массы шпаклёвки; пригодность для повторного использования не подтверждена", "kg", "joint_compound_remainder", { informational: true }),
  R("04 · Стыки и примыкания", "ceiling-p113-full:04:material:joint-tape-rolls", "material", "Бумажная армирующая лента стыков, рулон", "item", "joint_tape_rolls"),
  R("04 · Стыки и примыкания", "ceiling-p113-full:04:control:joint-tape-net", "control", "Расчётная длина армирующей ленты без резерва", "m", "joint_tape_net", { informational: true }),
  R("04 · Стыки и примыкания", "ceiling-p113-full:04:control:joint-tape-remainder", "control", "Прогнозное превышение поставленной длины армирующей ленты; пригодность для повторного использования не подтверждена", "m", "joint_tape_remainder", { informational: true }),
  R("04 · Стыки и примыкания", "ceiling-p113-full:04:material:separation-tape-rolls", "material", "Разделительная лента КНАУФ-Треннфикс по примыканию, рулон", "item", "separation_tape_rolls"),
  R("04 · Стыки и примыкания", "ceiling-p113-full:04:operation:joint-filling", "operation", "Заделка стыков с армирующей лентой и углублений от шурупов", "m2", "area"),

  R("05 · Подготовка поверхности", "ceiling-p113-full:05:material:primer-cans", "material", "Грунтовка КНАУФ-Тифенгрунд, канистра", "item", "primer_cans"),
  R("05 · Подготовка поверхности", "ceiling-p113-full:05:control:primer-net", "control", "Расчётная потребность грунтовки без резерва", "l", "primer_net", { informational: true }),
  R("05 · Подготовка поверхности", "ceiling-p113-full:05:control:primer-remainder", "control", "Прогнозное превышение поставленного объёма грунтовки; пригодность для повторного использования не подтверждена", "l", "primer_remainder", { informational: true }),
  R("05 · Подготовка поверхности", "ceiling-p113-full:05:consumable:abrasive", "consumable", "Абразив для шлифования заделанных стыков", "item", "abrasive"),
  R("05 · Подготовка поверхности", "ceiling-p113-full:05:operation:sanding", "operation", "Шлифование высохшей заделки стыков и мест крепления", "m2", "area"),
  R("05 · Подготовка поверхности", "ceiling-p113-full:05:operation:priming", "operation", "Обеспыливание и грунтование поверхности под последующую отделку", "m2", "area"),
  R("05 · Подготовка поверхности", "ceiling-p113-full:05:equipment:dust-extraction", "equipment", "Шлифовальная машина с промышленным пылеудалением", "shift", "shifts", { procurement: true }),

  R("06 · Швы большой площади", "ceiling-p113-full:06:material:control-joint-pieces", "material", "Профиль проектного деформационного шва выбранной длины", "item", "control_joint_pieces"),
  R("06 · Швы большой площади", "ceiling-p113-full:06:operation:control-joint-installation", "operation", "Устройство проектного деформационного шва", "m", "control_joint_length"),

  R("07 · Доступ и инструмент", "ceiling-p113-full:07:equipment:access", "equipment", "Передвижная вышка-тура или подтверждённое средство доступа", "shift", "shifts", { procurement: true }),
  R("07 · Доступ и инструмент", "ceiling-p113-full:07:equipment:rotary-hammer", "equipment", "Перфоратор для крепления подвесов и направляющего профиля", "shift", "shifts", { procurement: true }),
  R("07 · Доступ и инструмент", "ceiling-p113-full:07:equipment:profile-cutter", "equipment", "Инструмент резки металлического профиля", "shift", "shifts", { procurement: true }),
  R("07 · Доступ и инструмент", "ceiling-p113-full:07:equipment:screwdriver", "equipment", "Шуруповёрт для сборки каркаса и крепления листов", "shift", "shifts", { procurement: true }),
  R("07 · Доступ и инструмент", "ceiling-p113-full:07:operation:access", "operation", "Монтаж, проверка и перестановка средства доступа", "shift", "shifts"),
  R("07 · Доступ и инструмент", "ceiling-p113-full:07:delivery:access-in", "delivery", "Доставка средства доступа", "trip", "access_delivery", { procurement: true }),
  R("07 · Доступ и инструмент", "ceiling-p113-full:07:delivery:access-out", "delivery", "Возврат средства доступа", "trip", "access_return", { procurement: true }),

  R("08 · Завершение", "ceiling-p113-full:08:operation:cleanup", "operation", "Сбор отходов раскроя, упаковки и финальная уборка рабочей зоны", "m2", "area"),
  R("08 · Завершение", "ceiling-p113-full:08:control:acceptance", "control", "Контроль плоскости, крепежа, стыков и готовности поверхности", "service", "single", { informational: true }),
  R("08 · Завершение", "ceiling-p113-full:08:delivery:waste", "delivery", "Вывоз отходов раскроя и упаковки", "trip", "waste_delivery", { procurement: true }),
];

const SOURCE_BY_ID = new Map(sourcePack.sources.map((source) => [source.sourceId, source]));

function category(kind: ResourceKind): string {
  if (["material", "component", "fastener", "consumable"].includes(kind)) return "material";
  if (kind === "equipment") return "equipment";
  if (kind === "delivery") return "delivery";
  if (kind === "control") return "service";
  return "construction_work";
}

function resource(spec: ResourceSpec, ordinal: number): CanonicalEstimateResourceDefinition {
  const sourceId = spec.source ?? (spec.kind === "control" ? PRELIMINARY : KNAUF);
  const source = SOURCE_BY_ID.get(sourceId);
  const procurementEligible = spec.procurement
    ?? ["material", "component", "fastener", "consumable"].includes(spec.kind);
  const supply = P113_SELECTED_SUPPLIES.find(value => `ceiling-p113-full:${value.rowId}` === spec.rowId);
  const requiredOrder = DRYWALL_CEILING_P113_FULL_CYCLE_S2723_FORMULAS.find(value => value.formula_id === spec.formula);
  const resourceGraph = {
    formulaId: spec.formula,
    normalizedUom: spec.unit,
    semanticOwnerId: `drywall-ceiling-p113-full-cycle-s27-23:${spec.rowId}`,
    resourceKind: spec.kind,
    stage: spec.stage,
    costOwner: spec.informational ? "scope" : "resource",
    costTreatment: spec.informational ? "INFORMATIONAL_SCOPE" : "OWN_COST",
    payable: !spec.informational,
    noDoubleCount: true,
    ...(supply ? {
      purchaseBalanceV1: { quantityMode: "supply_quantum", balanceScope: "new_order_vs_required_consumption",
        requirementBasis: "selected_order_including_contingency", unitId: "item", stockExpression: "0", reserveExpression: "0",
        orderQuantumExpression: "1", consumedExpression: requiredOrder!.expression_source, plannedConsumptionExpression: supply.base },
      ...("effective" in supply ? { effectiveQuantityOutputV1: { parameterId: supply.effective, unitId: "item" } } : {}),
    } : {}),
    primaryMeasureParameterId: "area_m2",
    preliminaryProfileId: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_NORM_ID,
    visibleAssumptionPolicy: PROFILE.assumptionPolicy,
    contextParameterIds: [
      "selected_system_reference",
      "structural_substrate_type",
      "working_height_m",
      "access_system_type",
    ],
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: sourceId === KNAUF
      ? "PRIMARY_MANUFACTURER_SYSTEM_AND_QUANTITY_SOURCE"
      : "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
    sourcePackSha256: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256,
    normativeTrace: [{
      sourceId,
      source_id: sourceId,
      normId: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_NORM_ID,
      norm_id: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_NORM_ID,
      normVersion: "S27.23",
      source_title: source?.authority ?? sourceId,
      source_url: source?.officialUrl ?? null,
      exact_locator: source?.exactLocator ?? "selected preliminary profile record",
      source_definition_hash: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256,
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

export const DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  RESOURCE_SPECS.map((spec, ordinal) => resource(spec, ordinal)),
);

export const DRYWALL_CEILING_P113_FULL_CYCLE_S2723_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s27-23.drywall-ceiling-p113-full-cycle-completeness.v1",
    sourceKind: "INDEPENDENT_MANUFACTURER_TECHNOLOGY_MAP",
    generatedFromCurrentRows: false,
    evidenceSha256: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256,
    sourcePackPath: "data/estimate-benchmarks/source-packs/drywall-ceiling-p113-full-cycle-s27-23.json",
    entries: sourcePack.independentRequiredComponents.map((component) => ({
      ...component,
      expectedResourceIds: [...component.requiredRowIds],
    })),
  });

export function drywallCeilingP113FullCycleMissingRows(rowIds: ReadonlySet<string>): string[] {
  return DRYWALL_CEILING_P113_FULL_CYCLE_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
    .flatMap((entry) => entry.requiredRowIds)
    .filter((rowId) => !rowIds.has(rowId));
}

export async function compileDrywallCeilingP113FullCycleS2723(
  submittedParameters: Record<string, unknown>,
  rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileCanonicalEstimateCore({
    operation: Object.keys(rowOverrides).length > 0 ? "recalculate" : "compile",
    compilerVersion: "canonical-estimate-compiler.drywall-ceiling-p113-full-cycle-s27-23.v1",
    catalogId: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_CATALOG_ID,
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_PARAMETERS],
    formulaDefinitions: [...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_FORMULAS],
    resourceDefinitions: [...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RESOURCES],
    submittedParameters,
    rowOverrides,
    confirmedParameters: { ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
