import { createHash } from "node:crypto";

import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateCompileOperation,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import { compileFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";

export const S2721_BULKHEAD_FRAME_SOURCE_CATALOG_ID =
  "drywall_ceiling_interior_bulkhead_frame_standard" as const;
export const S2721_BULKHEAD_FRAME_CATALOG_ID =
  `canonical-work:base:${S2721_BULKHEAD_FRAME_SOURCE_CATALOG_ID}` as const;
export const S2721_BULKHEAD_FRAME_SOURCE_ID =
  "drywall_ceiling_bulkhead_frame_50m2_preliminary_profile_r1" as const;

type Scalar = string | number | boolean;

export const S2721_BULKHEAD_FRAME_RUNTIME_PROFILE_INPUT = {
  bulkhead_length_m: 20,
  bottom_face_width_m: 1.5,
  side_face_height_m: 0.5,
  side_face_count: 2,
  longitudinal_line_count: 4,
  cross_member_spacing_m: 0.5,
  support_point_count: 96,
  profile_piece_length_m: 3,
  profile_order_reserve_percent: 5,
  screws_per_intersection: 2,
  profile_screw_package_size_item: 100,
  substrate_contact_length_m: 20,
  sealing_tape_roll_length_m: 30,
  reinforcement_profile_length_m: 0,
  cut_protection_kg_per_cut_end: 0.003,
  cut_protection_package_kg: 1,
  access_productivity_m2_per_shift: 40,
  material_delivery_trip_count: 1,
  access_delivery_trip_count: 1,
  access_return_trip_count: 1,
  waste_removal_trip_count: 1,
  selected_profile_system_reference: "Совместимая система профилей короба — уточнить по проекту",
  support_layout_reference: "Предварительная раскладка 96 опорных точек — заменить расчётной схемой",
  structural_substrate_type: "REINFORCED_CONCRETE",
  structural_anchor_reference: "Совместимый анкер для железобетонного основания — уточнить по проекту",
  load_verification_state: "PRELIMINARY_PENDING_PROJECT_CHECK",
  working_height_m: 3.4,
  access_system_type: "MOBILE_TOWER",
} as const satisfies Readonly<Record<string, Scalar>>;

type ParameterSeed = Readonly<{
  id: string;
  titleRu: string;
  valueType?: "decimal" | "integer" | "text" | "enum";
  unitId?: string | null;
  minimum?: number;
  maximum?: number;
  values?: readonly string[];
}>;

type ResourceSeed = Readonly<{
  key: string;
  sectionRu: string;
  category: "material" | "construction_work" | "equipment" | "service";
  titleRu: string;
  unitId: string;
  expression: string;
  procurementEligible: boolean;
  conditionalParameterId?: "reinforcement_profile_length_m";
  contextParameterIds?: readonly string[];
}>;

export const S2721_BULKHEAD_FRAME_SOURCE_PACK_SHA256 =
  "2330621f7c5bff1022600657ea0c73889a88cca7f9f2c2dd01ad7b66406d5c28" as const;

const PARAMETERS: readonly ParameterSeed[] = [
  { id: "area_m2", titleRu: "Развёрнутая площадь каркаса короба", unitId: "m2", minimum: 0.000001 },
  { id: "bulkhead_length_m", titleRu: "Длина короба", unitId: "m", minimum: 0.000001 },
  { id: "bottom_face_width_m", titleRu: "Ширина нижней грани", unitId: "m", minimum: 0.000001 },
  { id: "side_face_height_m", titleRu: "Высота одной боковой грани", unitId: "m", minimum: 0.000001 },
  { id: "side_face_count", titleRu: "Число боковых граней", valueType: "integer", unitId: "item", minimum: 1 },
  { id: "longitudinal_line_count", titleRu: "Число продольных линий профиля", valueType: "integer", unitId: "item", minimum: 1 },
  { id: "cross_member_spacing_m", titleRu: "Шаг поперечных сечений", unitId: "m", minimum: 0.000001 },
  { id: "support_point_count", titleRu: "Число опорных точек по отдельной схеме", valueType: "integer", unitId: "item", minimum: 1 },
  { id: "profile_piece_length_m", titleRu: "Длина выбранного профиля в поставке", unitId: "m", minimum: 0.000001 },
  { id: "profile_order_reserve_percent", titleRu: "Запас профиля на раскрой", unitId: "percent", minimum: 0, maximum: 100 },
  { id: "screws_per_intersection", titleRu: "Винтов на одно соединение профилей", valueType: "integer", unitId: "item", minimum: 1 },
  { id: "profile_screw_package_size_item", titleRu: "Винтов в выбранной упаковке", valueType: "integer", unitId: "item", minimum: 1 },
  { id: "substrate_contact_length_m", titleRu: "Длина контакта профиля с основанием", unitId: "m", minimum: 0 },
  { id: "sealing_tape_roll_length_m", titleRu: "Длина уплотнительной ленты в рулоне", unitId: "m", minimum: 0.000001 },
  { id: "reinforcement_profile_length_m", titleRu: "Проектная длина усиления проёмов и узлов", unitId: "m", minimum: 0 },
  { id: "cut_protection_kg_per_cut_end", titleRu: "Расход защиты на один торец реза", unitId: "kg/item", minimum: 0.000001 },
  { id: "cut_protection_package_kg", titleRu: "Масса защиты мест реза в упаковке", unitId: "kg", minimum: 0.000001 },
  { id: "access_productivity_m2_per_shift", titleRu: "Площадь каркаса за смену средства доступа", unitId: "m2/shift", minimum: 0.000001 },
  { id: "material_delivery_trip_count", titleRu: "Рейсы доставки профилей и комплектующих", valueType: "integer", unitId: "trip", minimum: 0 },
  { id: "access_delivery_trip_count", titleRu: "Рейсы доставки средства доступа", valueType: "integer", unitId: "trip", minimum: 0 },
  { id: "access_return_trip_count", titleRu: "Рейсы возврата средства доступа", valueType: "integer", unitId: "trip", minimum: 0 },
  { id: "waste_removal_trip_count", titleRu: "Рейсы вывоза упаковки и отходов раскроя", valueType: "integer", unitId: "trip", minimum: 0 },
  { id: "selected_profile_system_reference", titleRu: "Выбранная совместимая система профилей", valueType: "text" },
  { id: "support_layout_reference", titleRu: "Схема и расчёт шага опор", valueType: "text" },
  { id: "structural_substrate_type", titleRu: "Тип несущего основания", valueType: "enum", values: ["REINFORCED_CONCRETE", "STEEL", "TIMBER", "OTHER_PROJECT_DEFINED"] },
  { id: "structural_anchor_reference", titleRu: "Совместимый анкер для выбранного основания", valueType: "text" },
  { id: "load_verification_state", titleRu: "Состояние проверки нагрузки и узлов", valueType: "enum", values: ["PRELIMINARY_PENDING_PROJECT_CHECK", "PROJECT_VERIFIED"] },
  { id: "working_height_m", titleRu: "Рабочая высота", unitId: "m", minimum: 0.000001 },
  { id: "access_system_type", titleRu: "Выбранное средство доступа", valueType: "enum", values: ["MOBILE_TOWER", "FRAME_SCAFFOLD", "SCISSOR_LIFT", "CONTRACTOR_COMPATIBLE_ACCESS"] },
] as const;

const FRAME_CONTEXT = [
  "selected_profile_system_reference",
  "support_layout_reference",
  "structural_substrate_type",
  "structural_anchor_reference",
  "load_verification_state",
] as const;
const ACCESS_CONTEXT = ["working_height_m", "access_system_type"] as const;

const crossCount = "(ceil(bulkhead_length_m / cross_member_spacing_m) + 1)";
const intersections = `${crossCount} * longitudinal_line_count`;
const cutEnds = `${crossCount} * (1 + side_face_count) * 2`;
const shifts = "ceil(area_m2 / access_productivity_m2_per_shift)";

const RESOURCES: readonly ResourceSeed[] = [
  { key: "longitudinal_profile_packages", sectionRu: "Профили каркаса", category: "material", titleRu: "Продольный профиль выбранной системы, мерный элемент", unitId: "item", expression: "ceil(longitudinal_line_count * bulkhead_length_m * (1 + profile_order_reserve_percent / 100) / profile_piece_length_m)", procurementEligible: true, contextParameterIds: FRAME_CONTEXT },
  { key: "horizontal_profile_packages", sectionRu: "Профили каркаса", category: "material", titleRu: "Поперечный профиль нижней грани, мерный элемент", unitId: "item", expression: `ceil(${crossCount} * bottom_face_width_m * (1 + profile_order_reserve_percent / 100) / profile_piece_length_m)`, procurementEligible: true, contextParameterIds: FRAME_CONTEXT },
  { key: "vertical_profile_packages", sectionRu: "Профили каркаса", category: "material", titleRu: "Вертикальный профиль боковых граней, мерный элемент", unitId: "item", expression: `ceil(${crossCount} * side_face_count * side_face_height_m * (1 + profile_order_reserve_percent / 100) / profile_piece_length_m)`, procurementEligible: true, contextParameterIds: FRAME_CONTEXT },
  { key: "suspension_hangers", sectionRu: "Опоры и подвесы", category: "material", titleRu: "Подвес или опорный элемент выбранной системы", unitId: "item", expression: "support_point_count", procurementEligible: true, contextParameterIds: FRAME_CONTEXT },
  { key: "structural_support_anchors", sectionRu: "Крепление к основанию", category: "material", titleRu: "Анкер опорной точки для выбранного основания", unitId: "item", expression: "support_point_count", procurementEligible: true, contextParameterIds: FRAME_CONTEXT },
  { key: "profile_intersection_connectors", sectionRu: "Соединители каркаса", category: "material", titleRu: "Соединитель пересечения профилей выбранной системы", unitId: "item", expression: intersections, procurementEligible: true, contextParameterIds: FRAME_CONTEXT },
  { key: "profile_screw_packages", sectionRu: "Крепёж каркаса", category: "material", titleRu: "Винты металл-металл, выбранная упаковка", unitId: "item", expression: `ceil(${intersections} * screws_per_intersection / profile_screw_package_size_item)`, procurementEligible: true, contextParameterIds: FRAME_CONTEXT },
  { key: "substrate_sealing_tape_rolls", sectionRu: "Уплотнение примыканий", category: "material", titleRu: "Уплотнительная лента, выбранный рулон", unitId: "item", expression: "ceil(substrate_contact_length_m * (1 + profile_order_reserve_percent / 100) / sealing_tape_roll_length_m)", procurementEligible: true, contextParameterIds: FRAME_CONTEXT },
  { key: "cut_edge_protection_packages", sectionRu: "Защита мест реза", category: "material", titleRu: "Состав защиты мест реза профиля, выбранная упаковка", unitId: "item", expression: `ceil(${cutEnds} * cut_protection_kg_per_cut_end / cut_protection_package_kg)`, procurementEligible: true, contextParameterIds: FRAME_CONTEXT },
  { key: "opening_reinforcement_profile_packages", sectionRu: "Усиление узлов", category: "material", titleRu: "Профиль усиления проёмов и специальных узлов, мерный элемент", unitId: "item", expression: "ceil(reinforcement_profile_length_m * (1 + profile_order_reserve_percent / 100) / profile_piece_length_m)", procurementEligible: true, conditionalParameterId: "reinforcement_profile_length_m", contextParameterIds: FRAME_CONTEXT },
  { key: "axis_setting_out", sectionRu: "Разметка", category: "construction_work", titleRu: "Разметка осей, граней и уровня каркаса короба", unitId: "m2", expression: "area_m2", procurementEligible: false, contextParameterIds: FRAME_CONTEXT },
  { key: "longitudinal_profile_installation", sectionRu: "Монтаж каркаса", category: "construction_work", titleRu: "Монтаж продольных линий профиля", unitId: "m", expression: "longitudinal_line_count * bulkhead_length_m", procurementEligible: false, contextParameterIds: FRAME_CONTEXT },
  { key: "horizontal_profile_installation", sectionRu: "Монтаж каркаса", category: "construction_work", titleRu: "Монтаж поперечных профилей нижней грани", unitId: "m", expression: `${crossCount} * bottom_face_width_m`, procurementEligible: false, contextParameterIds: FRAME_CONTEXT },
  { key: "vertical_profile_installation", sectionRu: "Монтаж каркаса", category: "construction_work", titleRu: "Монтаж вертикальных профилей боковых граней", unitId: "m", expression: `${crossCount} * side_face_count * side_face_height_m`, procurementEligible: false, contextParameterIds: FRAME_CONTEXT },
  { key: "support_installation", sectionRu: "Монтаж опор", category: "construction_work", titleRu: "Монтаж опорных точек по отдельной схеме", unitId: "item", expression: "support_point_count", procurementEligible: false, contextParameterIds: FRAME_CONTEXT },
  { key: "connector_installation", sectionRu: "Сборка каркаса", category: "construction_work", titleRu: "Монтаж соединителей пересечений профилей", unitId: "item", expression: intersections, procurementEligible: false, contextParameterIds: FRAME_CONTEXT },
  { key: "sealing_tape_installation", sectionRu: "Уплотнение примыканий", category: "construction_work", titleRu: "Монтаж уплотнительной ленты по контакту с основанием", unitId: "m", expression: "substrate_contact_length_m", procurementEligible: false, contextParameterIds: FRAME_CONTEXT },
  { key: "cut_edge_protection_application", sectionRu: "Защита мест реза", category: "construction_work", titleRu: "Обработка торцов реза металлического профиля", unitId: "item", expression: cutEnds, procurementEligible: false, contextParameterIds: FRAME_CONTEXT },
  { key: "opening_reinforcement_installation", sectionRu: "Усиление узлов", category: "construction_work", titleRu: "Монтаж проектного усиления проёмов и специальных узлов", unitId: "m", expression: "reinforcement_profile_length_m", procurementEligible: false, conditionalParameterId: "reinforcement_profile_length_m", contextParameterIds: FRAME_CONTEXT },
  { key: "frame_alignment", sectionRu: "Выверка каркаса", category: "construction_work", titleRu: "Выверка геометрии и уровня каркаса короба", unitId: "m2", expression: "area_m2", procurementEligible: false, contextParameterIds: FRAME_CONTEXT },
  { key: "internal_material_handling", sectionRu: "Внутриплощадочная подача", category: "construction_work", titleRu: "Подача и раскладка профилей и комплектующих в рабочей зоне", unitId: "m2", expression: "area_m2", procurementEligible: false, contextParameterIds: ACCESS_CONTEXT },
  { key: "access_operations", sectionRu: "Работы со средством доступа", category: "construction_work", titleRu: "Подготовка, проверка и перестановка выбранного средства доступа", unitId: "shift", expression: shifts, procurementEligible: false, contextParameterIds: ACCESS_CONTEXT },
  { key: "laser_level", sectionRu: "Механизация", category: "equipment", titleRu: "Лазерный нивелир для разметки и выверки", unitId: "shift", expression: shifts, procurementEligible: true, contextParameterIds: ACCESS_CONTEXT },
  { key: "rotary_hammer", sectionRu: "Механизация", category: "equipment", titleRu: "Перфоратор для крепления к несущему основанию", unitId: "shift", expression: shifts, procurementEligible: true, contextParameterIds: [...FRAME_CONTEXT, ...ACCESS_CONTEXT] },
  { key: "screwdriver", sectionRu: "Механизация", category: "equipment", titleRu: "Шуруповёрт для сборки металлического каркаса", unitId: "shift", expression: shifts, procurementEligible: true, contextParameterIds: ACCESS_CONTEXT },
  { key: "profile_cutting_tool", sectionRu: "Механизация", category: "equipment", titleRu: "Инструмент для резки металлического профиля", unitId: "shift", expression: shifts, procurementEligible: true, contextParameterIds: ACCESS_CONTEXT },
  { key: "access_equipment", sectionRu: "Средства доступа", category: "equipment", titleRu: "Выбранное средство доступа с ограждением", unitId: "shift", expression: shifts, procurementEligible: true, contextParameterIds: ACCESS_CONTEXT },
  { key: "material_delivery", sectionRu: "Логистика", category: "service", titleRu: "Доставка длинномерных профилей и комплектующих", unitId: "trip", expression: "material_delivery_trip_count", procurementEligible: true },
  { key: "access_delivery", sectionRu: "Логистика", category: "service", titleRu: "Доставка выбранного средства доступа", unitId: "trip", expression: "access_delivery_trip_count", procurementEligible: true, contextParameterIds: ACCESS_CONTEXT },
  { key: "access_return", sectionRu: "Логистика", category: "service", titleRu: "Возврат выбранного средства доступа", unitId: "trip", expression: "access_return_trip_count", procurementEligible: true, contextParameterIds: ACCESS_CONTEXT },
  { key: "waste_removal", sectionRu: "Логистика", category: "service", titleRu: "Вывоз упаковки и отходов раскроя профиля", unitId: "trip", expression: "waste_removal_trip_count", procurementEligible: true },
] as const;

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalEstimateStableJson(value), "utf8").digest("hex");
}

function formulaId(key: string): string {
  return `${S2721_BULKHEAD_FRAME_SOURCE_CATALOG_ID}:s2721:formula:${key}`;
}

function rowId(key: string): string {
  return `${S2721_BULKHEAD_FRAME_SOURCE_CATALOG_ID}:s2721:row:${key}`;
}

export function buildS2721BulkheadFrameCanonicalRows(
  sourcePackSha256: string = S2721_BULKHEAD_FRAME_SOURCE_PACK_SHA256,
): Readonly<{
  parameterDefinitions: readonly (CanonicalEstimateParameterDefinition & Record<string, unknown>)[];
  formulaDefinitions: readonly (CanonicalEstimateFormulaDefinition & Record<string, unknown>)[];
  resourceDefinitions: readonly (CanonicalEstimateResourceDefinition & Record<string, unknown>)[];
}> {
  const formulaDefinitions = RESOURCES.map((resource) => {
    const compiled = compileFormulaGraph(resource.expression);
    return {
      formula_id: formulaId(resource.key),
      output_unit_id: resource.unitId,
      expression_source: resource.expression,
      ast: compiled.ast,
      input_parameter_ids: [...compiled.inputParameterIds],
      ast_sha256: sha256(compiled.ast),
    };
  });
  const formulaConsumers = new Map<string, string[]>();
  for (const formula of formulaDefinitions) {
    for (const parameterId of formula.input_parameter_ids) {
      const consumers = formulaConsumers.get(parameterId) ?? [];
      consumers.push(formula.formula_id);
      formulaConsumers.set(parameterId, consumers);
    }
  }
  const branchConsumers = new Map<string, string[]>();
  for (const resource of RESOURCES) {
    for (const parameterId of [resource.conditionalParameterId, ...(resource.contextParameterIds ?? [])]) {
      if (!parameterId) continue;
      const consumers = branchConsumers.get(parameterId) ?? [];
      consumers.push(rowId(resource.key));
      branchConsumers.set(parameterId, consumers);
    }
  }
  const parameterDefinitions = PARAMETERS.map((parameter, ordinal) => ({
    parameter_id: parameter.id,
    ordinal,
    value_type: parameter.valueType ?? "decimal",
    unit_id: parameter.unitId ?? null,
    title_ru: parameter.titleRu,
    required: true,
    default_value: null,
    constraints_json: {
      ...(parameter.minimum == null ? {} : { min: parameter.minimum }),
      ...(parameter.maximum == null ? {} : { max: parameter.maximum }),
      ...(parameter.values == null ? {} : { values: parameter.values }),
      ...(parameter.valueType !== "text" ? {} : { maxLength: 1_000 }),
    },
    truth_metadata: {
      contract: "rik-expo-app.s27-21.bulkhead-frame-preliminary-profile.v1",
      semantic_parameter_key: `${S2721_BULKHEAD_FRAME_CATALOG_ID}:${parameter.id}`,
      visibility_role: "USER_INPUT",
      value_source_role: parameter.id === "area_m2" ? "USER_MEASURED" : "USER_REPLACEABLE_PRELIMINARY_PROFILE",
      input_origin_class: parameter.id === "area_m2" ? "KNOWN_WORK_SCOPE" : "SELECTED_VISIBLE_PRELIMINARY_PROFILE",
      preliminary_compilation_allowed: parameter.id !== "area_m2",
      hidden_default_forbidden: parameter.id === "area_m2",
      guide: {
        guide_kind: parameter.id === "area_m2" ? "MEASUREMENT_RULE" : "PRACTICE_REFERENCE",
        guide_short_ru: parameter.id === "area_m2"
          ? "Введите развёрнутую площадь граней каркаса короба по обмеру или чертежу."
          : `${parameter.titleRu}: предварительное значение видно и заменяется проектом, раскладкой, паспортом выбранной системы или ППР.`,
        source_role: parameter.id === "area_m2"
          ? "USER_MEASURED_SCOPE"
          : "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
        source_document: S2721_BULKHEAD_FRAME_SOURCE_ID,
        source_locator: "MASTER S27.21 A6 and independently authored preliminary source pack",
        guide_version: "drywall-ceiling-bulkhead-frame-50m2-preliminary-profile-r1",
        source_snapshot_hash: sourcePackSha256,
        applicability: "Frame-only 50 m2 ceiling bulkhead; project system and structural nodes remain replaceable inputs.",
        verified_at: "2026-09-30T00:00:00+06:00",
        guide_validation_policy: "FIRST_ESTIMATE_NOW_REPLACE_PROFILE_VALUES_WITH_PROJECT_LAYOUT",
      },
      formula_consumers: formulaConsumers.get(parameter.id) ?? [],
      resource_branch_consumers: branchConsumers.get(parameter.id) ?? [],
      source_pack_sha256: sourcePackSha256,
    },
  }));
  const resourceDefinitions = RESOURCES.map((resource, ordinal) => {
    const id = rowId(resource.key);
    const resourceGraph = {
      contract: "rik-expo-app.s27-21.bulkhead-frame-resource-graph.v1",
      domain: "interior_finishes",
      operation: "FRAME_ONLY",
      variant: "STANDARD_BULKHEAD_50M2_PRELIMINARY",
      semanticOwnerId: `${id}:semantic`,
      procurementOwnerId: resource.procurementEligible ? `${id}:procurement` : null,
      costTreatment: "OWN_COST",
      payable: true,
      noDoubleCount: true,
      primaryMeasureParameterId: "area_m2",
      contextParameterIds: resource.contextParameterIds ?? [],
      quantityBasis: resource.expression,
      supportCountIndependentFromCrossSections: resource.key.includes("support")
        || resource.key.includes("suspension")
        || resource.key.includes("anchor"),
    };
    const sourceMetadata = {
      sourceIds: ["MASTER_S27_21_A6", "S2721_VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE_R1"],
      sourcePackSha256,
      quantityRole: "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
      projectCheckRequired: FRAME_CONTEXT.some((parameterId) => resource.contextParameterIds?.includes(parameterId)),
    };
    return {
      id,
      row_id: id,
      ordinal,
      section: resource.sectionRu,
      category: resource.category,
      title_ru: resource.titleRu,
      unit_id: resource.unitId,
      formula_id: formulaId(resource.key),
      inclusion_ast: resource.conditionalParameterId
        ? { kind: "greater_than", parameterId: resource.conditionalParameterId, value: 0 }
        : { kind: "literal", value: true },
      resource_graph: resourceGraph,
      procurement_eligible: resource.procurementEligible,
      cost_owner_id: `${id}:cost`,
      source_metadata: sourceMetadata,
      row_sha256: sha256({ ordinal, resource, resourceGraph, sourceMetadata }),
    };
  });
  return { parameterDefinitions, formulaDefinitions, resourceDefinitions };
}

export async function compileS2721BulkheadFrameProfile(input: Readonly<{
  values: Readonly<Record<string, Scalar>>;
  operation?: CanonicalEstimateCompileOperation;
  sourcePackSha256?: string;
}>): Promise<CanonicalEstimateCompileCoreResult> {
  const rows = buildS2721BulkheadFrameCanonicalRows(input.sourcePackSha256);
  return compileCanonicalEstimateCore({
    operation: input.operation ?? "compile",
    compilerVersion: "canonical-estimate-compile-core-r1",
    catalogId: S2721_BULKHEAD_FRAME_CATALOG_ID,
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [...rows.parameterDefinitions],
    formulaDefinitions: [...rows.formulaDefinitions],
    resourceDefinitions: [...rows.resourceDefinitions],
    submittedParameters: { ...input.values },
    confirmedParameters: {},
    currencyCode: "KGS",
    priceSnapshotIds: [],
    priceItems: [],
    maximumResourceRows: 100,
    hashJson: sha256,
  });
}
