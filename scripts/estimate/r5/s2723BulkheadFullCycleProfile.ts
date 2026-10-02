import { createHash } from "node:crypto";

import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { canonicalEstimateStableJson } from
  "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import { compileFormulaGraph } from
  "../../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_ID,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_METADATA,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256,
} from "../../../src/lib/estimate/v4/drywallCeilingP113FullCycleS2723";
import {
  S2721_BULKHEAD_FRAME_RUNTIME_PROFILE_INPUT,
  S2721_BULKHEAD_FRAME_SOURCE_ID,
  S2721_BULKHEAD_FRAME_SOURCE_PACK_SHA256,
  buildS2721BulkheadFrameCanonicalRows,
} from "./s2721BulkheadFramePreliminaryProfile";

type Scalar = string | number | boolean;
type Json = Record<string, any>;

export const S2723_BULKHEAD_FULL_CYCLE_SOURCE_CATALOG_ID =
  "drywall_ceiling_interior_bulkhead_install_standard" as const;
export const S2723_BULKHEAD_FULL_CYCLE_CATALOG_ID =
  `canonical-work:base:${S2723_BULKHEAD_FULL_CYCLE_SOURCE_CATALOG_ID}` as const;
export const S2723_BULKHEAD_FULL_CYCLE_SOURCE_ID =
  "drywall_ceiling_bulkhead_full_cycle_50m2_s27_23" as const;
export const S2723_BULKHEAD_FULL_CYCLE_NORM_ID =
  "BULKHEAD-FULL-CYCLE-FRAME-PROFILE-AND-KNAUF-P113-RATES-S27-23" as const;

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalEstimateStableJson(value), "utf8").digest("hex");
}

export const S2723_BULKHEAD_FULL_CYCLE_SOURCE_PACK_SHA256 = sha256({
  frameSourcePackSha256: S2721_BULKHEAD_FRAME_SOURCE_PACK_SHA256,
  ceilingManufacturerSourcePackSha256:
    DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256,
  profile: "S27.23 complete standard bulkhead 50 m2",
});

export const S2723_BULKHEAD_FULL_CYCLE_SOURCE_METADATA = Object.freeze({
  source_title:
    "Полный потолочный короб: профиль каркаса 50 м² и система обшивки/швов КНАУФ",
  source_authority:
    "ООО КНАУФ ГИПС; прослеживаемый предварительный профиль каркаса S27.21/S27.23",
  source_document_version: "S27_23_BULKHEAD_FULL_CYCLE_R1",
  source_kind: "MANUFACTURER_SYSTEM_PLUS_VISIBLE_REPLACEABLE_GEOMETRY_PROFILE",
  official_url: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_METADATA.official_url,
  artifact_sha256: S2723_BULKHEAD_FULL_CYCLE_SOURCE_PACK_SHA256,
  effective_from: "2026-10-01",
  exact_locator: [
    "drywall-ceiling-bulkhead-frame-50m2-preliminary-profile-r1",
    DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_METADATA.exact_locator,
  ].join(" | "),
  use_restriction:
    "Геометрия каркаса, число опор, тип анкера, системные профили, формат листа, упаковки и производительность — видимые заменяемые значения; несущие узлы подтверждаются проектом. Декоративная окраска не включена.",
});

const FINISH_PROFILE_INPUT = Object.freeze({
  board_layer_count: 1,
  board_m2_per_m2_per_layer: 1,
  board_sheet_area_m2: 2.4,
  board_screw_item_per_m2_per_layer: 23,
  board_screw_package_size_item: 1_000,
  hardware_reserve_percent: 3,
  joint_compound_kg_per_m2: 0.4,
  joint_compound_bag_kg: 25,
  joint_tape_m_per_m2: 1.2,
  joint_tape_roll_m: 75,
  separation_tape_roll_m: 50,
  primer_l_per_m2: 0.1,
  primer_can_l: 10,
  abrasive_productivity_m2_item: 40,
  external_corner_count: 2,
  external_corner_profile_piece_length_m: 3,
  finish_productivity_m2_per_shift: 40,
  selected_board_system_reference:
    "Однослойная ГСП 12,5 мм совместимой системы — подтвердить проектом",
  selected_joint_system_reference:
    "Совместимые шпаклёвка и бумажная лента — подтвердить паспортом системы",
  surface_quality_level: "Q2_READY_FOR_DECORATIVE_FINISH",
} as const satisfies Readonly<Record<string, Scalar>>);

export const S2723_BULKHEAD_FULL_CYCLE_RUNTIME_PROFILE_INPUT = Object.freeze({
  ...S2721_BULKHEAD_FRAME_RUNTIME_PROFILE_INPUT,
  ...FINISH_PROFILE_INPUT,
});

const NORMATIVE_FINISH_PARAMETERS = new Set([
  "board_m2_per_m2_per_layer",
  "board_screw_item_per_m2_per_layer",
  "joint_compound_kg_per_m2",
  "joint_tape_m_per_m2",
  "primer_l_per_m2",
]);

export const S2723_BULKHEAD_FULL_CYCLE_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(S2723_BULKHEAD_FULL_CYCLE_RUNTIME_PROFILE_INPUT).map(
    (parameterId) => [
      parameterId,
      NORMATIVE_FINISH_PARAMETERS.has(parameterId) ? "NORMATIVE" : "ASSUMPTION",
    ],
  )),
) as Readonly<Record<string, "NORMATIVE" | "ASSUMPTION">>;

export const S2723_BULKHEAD_FULL_CYCLE_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(S2723_BULKHEAD_FULL_CYCLE_RUNTIME_PROFILE_INPUT).map(
    (parameterId) => [parameterId, [S2723_BULKHEAD_FULL_CYCLE_SOURCE_ID]],
  )),
);

export const S2723_BULKHEAD_FULL_CYCLE_SHORT_INPUT = Object.freeze({ area_m2: 50 });
export const S2723_BULKHEAD_FULL_CYCLE_ACCEPTANCE_INPUT = Object.freeze({
  area_m2: 50,
  ...S2723_BULKHEAD_FULL_CYCLE_RUNTIME_PROFILE_INPUT,
});

type ParameterSeed = Readonly<{
  id: keyof typeof FINISH_PROFILE_INPUT;
  titleRu: string;
  valueType?: "decimal" | "integer" | "text" | "enum";
  unitId?: string | null;
  minimum?: number;
  values?: readonly string[];
}>;

const FINISH_PARAMETERS: readonly ParameterSeed[] = [
  { id: "board_layer_count", titleRu: "Число слоёв листовой обшивки", valueType: "integer", unitId: "item", minimum: 1 },
  { id: "board_m2_per_m2_per_layer", titleRu: "ГСП на 1 м² одного слоя", unitId: "m2/m2", minimum: 0.001 },
  { id: "board_sheet_area_m2", titleRu: "Площадь выбранного листа ГСП", unitId: "m2", minimum: 0.001 },
  { id: "board_screw_item_per_m2_per_layer", titleRu: "Шурупы TN на 1 м² одного слоя", unitId: "item/m2", minimum: 0.001 },
  { id: "board_screw_package_size_item", titleRu: "Шурупов TN в упаковке", valueType: "integer", unitId: "item", minimum: 1 },
  { id: "hardware_reserve_percent", titleRu: "Резерв штучного крепежа", unitId: "percent", minimum: 0 },
  { id: "joint_compound_kg_per_m2", titleRu: "Шпаклёвка швов на 1 м²", unitId: "kg/m2", minimum: 0 },
  { id: "joint_compound_bag_kg", titleRu: "Шпаклёвка в мешке", unitId: "kg", minimum: 0.001 },
  { id: "joint_tape_m_per_m2", titleRu: "Бумажная лента стыков на 1 м²", unitId: "m/m2", minimum: 0 },
  { id: "joint_tape_roll_m", titleRu: "Лента стыков в рулоне", unitId: "m", minimum: 0.001 },
  { id: "separation_tape_roll_m", titleRu: "Разделительная лента в рулоне", unitId: "m", minimum: 0.001 },
  { id: "primer_l_per_m2", titleRu: "Грунтовка поверхности на 1 м²", unitId: "l/m2", minimum: 0 },
  { id: "primer_can_l", titleRu: "Грунтовка в канистре", unitId: "l", minimum: 0.001 },
  { id: "abrasive_productivity_m2_item", titleRu: "Ресурс абразива", unitId: "m2/item", minimum: 0.001 },
  { id: "external_corner_count", titleRu: "Число продольных наружных углов", valueType: "integer", unitId: "item", minimum: 0 },
  { id: "external_corner_profile_piece_length_m", titleRu: "Длина углозащитного профиля", unitId: "m", minimum: 0.001 },
  { id: "finish_productivity_m2_per_shift", titleRu: "Производительность комплекта отделки", unitId: "m2/shift", minimum: 0.001 },
  { id: "selected_board_system_reference", titleRu: "Выбранная листовая система", valueType: "text" },
  { id: "selected_joint_system_reference", titleRu: "Выбранная система швов", valueType: "text" },
  { id: "surface_quality_level", titleRu: "Уровень готовности поверхности", valueType: "enum", values: ["Q2_READY_FOR_DECORATIVE_FINISH"] },
] as const;

type ResourceSeed = Readonly<{
  key: string;
  sectionRu: string;
  category: "material" | "construction_work" | "equipment" | "service";
  titleRu: string;
  unitId: string;
  expression: string;
  procurementEligible: boolean;
  informational?: boolean;
  contextParameterIds?: readonly string[];
}>;

const reserve = "(1+profile_order_reserve_percent/100)";
const hardwareReserve = "(1+hardware_reserve_percent/100)";
const cornerLength = "bulkhead_length_m*external_corner_count";
const finishShifts = "ceil(area_m2/finish_productivity_m2_per_shift)";

const FINISH_RESOURCES: readonly ResourceSeed[] = [
  { key: "board_sheets", sectionRu: "Обшивка ГСП", category: "material", titleRu: "Гипсовая строительная плита 12,5 мм выбранного формата", unitId: "item", expression: `ceil(area_m2*board_layer_count*board_m2_per_m2_per_layer*${reserve}/board_sheet_area_m2)`, procurementEligible: true, contextParameterIds: ["selected_board_system_reference"] },
  { key: "board_net_m2", sectionRu: "Обшивка ГСП", category: "service", titleRu: "Чистая площадь листовой обшивки", unitId: "m2", expression: "area_m2*board_layer_count*board_m2_per_m2_per_layer", procurementEligible: false, informational: true },
  { key: "board_order_m2", sectionRu: "Обшивка ГСП", category: "service", titleRu: "Площадь ГСП в заказанном числе листов", unitId: "m2", expression: `ceil(area_m2*board_layer_count*board_m2_per_m2_per_layer*${reserve}/board_sheet_area_m2)*board_sheet_area_m2`, procurementEligible: false, informational: true },
  { key: "board_remainder_m2", sectionRu: "Обшивка ГСП", category: "service", titleRu: "Резерв и остаток ГСП после округления", unitId: "m2", expression: `ceil(area_m2*board_layer_count*board_m2_per_m2_per_layer*${reserve}/board_sheet_area_m2)*board_sheet_area_m2-area_m2*board_layer_count*board_m2_per_m2_per_layer`, procurementEligible: false, informational: true },
  { key: "board_screw_packages", sectionRu: "Обшивка ГСП", category: "material", titleRu: "Шурупы TN для крепления ГСП, упаковка", unitId: "item", expression: `ceil(area_m2*board_layer_count*board_screw_item_per_m2_per_layer*${hardwareReserve}/board_screw_package_size_item)`, procurementEligible: true, contextParameterIds: ["selected_board_system_reference"] },
  { key: "board_cutting", sectionRu: "Обшивка ГСП", category: "construction_work", titleRu: "Раскрой листов и обработка резаных кромок короба", unitId: "m2", expression: "area_m2", procurementEligible: false },
  { key: "board_installation", sectionRu: "Обшивка ГСП", category: "construction_work", titleRu: "Установка и крепление листов на все грани короба", unitId: "m2", expression: "area_m2", procurementEligible: false, contextParameterIds: ["selected_board_system_reference"] },
  { key: "external_corner_profiles", sectionRu: "Наружные углы", category: "material", titleRu: "Профиль углозащитный перфорированный выбранной длины", unitId: "item", expression: `ceil(${cornerLength}*${reserve}/external_corner_profile_piece_length_m)`, procurementEligible: true },
  { key: "external_corner_installation", sectionRu: "Наружные углы", category: "construction_work", titleRu: "Установка углозащитного профиля на наружных углах", unitId: "m", expression: cornerLength, procurementEligible: false },
  { key: "joint_compound_bags", sectionRu: "Стыки и крепёж", category: "material", titleRu: "Шпаклёвочная смесь для стыков и крепежа, мешок", unitId: "item", expression: `ceil(area_m2*joint_compound_kg_per_m2*${reserve}/joint_compound_bag_kg)`, procurementEligible: true, contextParameterIds: ["selected_joint_system_reference"] },
  { key: "joint_compound_net_kg", sectionRu: "Стыки и крепёж", category: "service", titleRu: "Чистая потребность шпаклёвки швов", unitId: "kg", expression: "area_m2*joint_compound_kg_per_m2", procurementEligible: false, informational: true },
  { key: "joint_compound_remainder_kg", sectionRu: "Стыки и крепёж", category: "service", titleRu: "Резерв и остаток шпаклёвки после округления", unitId: "kg", expression: `ceil(area_m2*joint_compound_kg_per_m2*${reserve}/joint_compound_bag_kg)*joint_compound_bag_kg-area_m2*joint_compound_kg_per_m2`, procurementEligible: false, informational: true },
  { key: "joint_tape_rolls", sectionRu: "Стыки и крепёж", category: "material", titleRu: "Бумажная армирующая лента стыков, рулон", unitId: "item", expression: `ceil(area_m2*joint_tape_m_per_m2*${reserve}/joint_tape_roll_m)`, procurementEligible: true, contextParameterIds: ["selected_joint_system_reference"] },
  { key: "joint_tape_net_m", sectionRu: "Стыки и крепёж", category: "service", titleRu: "Чистая длина ленты стыков", unitId: "m", expression: "area_m2*joint_tape_m_per_m2", procurementEligible: false, informational: true },
  { key: "separation_tape_rolls", sectionRu: "Стыки и крепёж", category: "material", titleRu: "Разделительная лента примыканий, рулон", unitId: "item", expression: `ceil(substrate_contact_length_m*${reserve}/separation_tape_roll_m)`, procurementEligible: true, contextParameterIds: ["selected_joint_system_reference"] },
  { key: "joint_filling", sectionRu: "Стыки и крепёж", category: "construction_work", titleRu: "Заделка стыков, углов и углублений крепежа", unitId: "m2", expression: "area_m2", procurementEligible: false, contextParameterIds: ["surface_quality_level"] },
  { key: "primer_cans", sectionRu: "Подготовка поверхности", category: "material", titleRu: "Грунтовка поверхности ГСП, канистра", unitId: "item", expression: `ceil(area_m2*primer_l_per_m2*${reserve}/primer_can_l)`, procurementEligible: true },
  { key: "primer_net_l", sectionRu: "Подготовка поверхности", category: "service", titleRu: "Чистая потребность грунтовки", unitId: "l", expression: "area_m2*primer_l_per_m2", procurementEligible: false, informational: true },
  { key: "primer_remainder_l", sectionRu: "Подготовка поверхности", category: "service", titleRu: "Резерв и остаток грунтовки после округления", unitId: "l", expression: `ceil(area_m2*primer_l_per_m2*${reserve}/primer_can_l)*primer_can_l-area_m2*primer_l_per_m2`, procurementEligible: false, informational: true },
  { key: "abrasive_items", sectionRu: "Подготовка поверхности", category: "material", titleRu: "Абразив для шлифования заделанных стыков", unitId: "item", expression: "ceil(area_m2/abrasive_productivity_m2_item)", procurementEligible: true },
  { key: "sanding_priming", sectionRu: "Подготовка поверхности", category: "construction_work", titleRu: "Шлифование, обеспыливание и грунтование под отделку", unitId: "m2", expression: "area_m2", procurementEligible: false, contextParameterIds: ["surface_quality_level"] },
  { key: "board_cutting_tool", sectionRu: "Инструмент обшивки", category: "equipment", titleRu: "Комплект инструмента для раскроя и обработки ГСП", unitId: "shift", expression: finishShifts, procurementEligible: true },
  { key: "sanding_dust_extractor", sectionRu: "Инструмент обшивки", category: "equipment", titleRu: "Шлифовальная машина с промышленным пылеудалением", unitId: "shift", expression: finishShifts, procurementEligible: true },
  { key: "finish_acceptance", sectionRu: "Завершение", category: "service", titleRu: "Контроль каркаса, крепежа, углов, стыков и готовности поверхности", unitId: "service", expression: "1", procurementEligible: false, informational: true },
] as const;

function fullFormulaId(key: string): string {
  return `${S2723_BULKHEAD_FULL_CYCLE_SOURCE_CATALOG_ID}:s2723-full:formula:${key}`;
}

function fullRowId(key: string): string {
  return `${S2723_BULKHEAD_FULL_CYCLE_SOURCE_CATALOG_ID}:s2723-full:row:${key}`;
}

function frameKey(id: string): string {
  return id.split(":").at(-1) ?? id;
}

export function buildS2723BulkheadFullCycleCanonicalRows(): Readonly<{
  parameterDefinitions: readonly (CanonicalEstimateParameterDefinition & Json)[];
  formulaDefinitions: readonly (CanonicalEstimateFormulaDefinition & Json)[];
  resourceDefinitions: readonly (CanonicalEstimateResourceDefinition & Json)[];
}> {
  const frame = buildS2721BulkheadFrameCanonicalRows();
  const frameFormulas = frame.formulaDefinitions.map((formula) => ({
    ...formula,
    formula_id: fullFormulaId(frameKey(formula.formula_id)),
  }));
  const finishFormulas = FINISH_RESOURCES.map((resource) => {
    const compiled = compileFormulaGraph(resource.expression);
    return {
      formula_id: fullFormulaId(resource.key),
      output_unit_id: resource.unitId,
      expression_source: resource.expression,
      ast: compiled.ast,
      input_parameter_ids: [...compiled.inputParameterIds],
      ast_sha256: sha256(compiled.ast),
    };
  });
  const formulaDefinitions = [...frameFormulas, ...finishFormulas];
  const frameResources = frame.resourceDefinitions.map((resource, ordinal) => {
    const key = frameKey(resource.row_id);
    const id = fullRowId(key);
    const isSharedLogistics = ["material_delivery", "waste_removal"].includes(key);
    return {
      ...resource,
      id,
      row_id: id,
      ordinal,
      title_ru: key === "material_delivery"
        ? "Единая доставка профилей, листов и комплектующих полного короба"
        : key === "waste_removal"
          ? "Единый вывоз упаковки и отходов раскроя полного короба"
          : resource.title_ru,
      formula_id: fullFormulaId(key),
      resource_graph: {
        ...(resource.resource_graph as Json),
        contract: "rik-expo-app.s27-23.bulkhead-full-cycle-resource-graph.v1",
        operation: "COMPLETE_INSTALLATION",
        variant: "STANDARD_BULKHEAD_50M2_VISIBLE_PROFILE",
        semanticOwnerId: `${id}:semantic`,
        procurementOwnerId: resource.procurement_eligible ? `${id}:procurement` : null,
        fullCycleSharedLogistics: isSharedLogistics,
      },
      cost_owner_id: `${id}:cost`,
      source_metadata: {
        ...(resource.source_metadata as Json),
        sourceIds: [S2721_BULKHEAD_FRAME_SOURCE_ID],
        fullCycleSourcePackSha256: S2723_BULKHEAD_FULL_CYCLE_SOURCE_PACK_SHA256,
        scopeBoundary: "FRAME_STAGE_INSIDE_COMPLETE_BULKHEAD",
      },
    };
  });
  const finishResources = FINISH_RESOURCES.map((resource, index) => {
    const id = fullRowId(resource.key);
    const ordinal = frameResources.length + index;
    const resourceGraph = {
      contract: "rik-expo-app.s27-23.bulkhead-full-cycle-resource-graph.v1",
      domain: "interior_finishes",
      operation: "COMPLETE_INSTALLATION",
      variant: "STANDARD_BULKHEAD_50M2_VISIBLE_PROFILE",
      semanticOwnerId: `${id}:semantic`,
      procurementOwnerId: resource.procurementEligible ? `${id}:procurement` : null,
      costTreatment: resource.informational ? "INFORMATIONAL_SCOPE" : "OWN_COST",
      payable: !resource.informational,
      noDoubleCount: true,
      primaryMeasureParameterId: "area_m2",
      contextParameterIds: resource.contextParameterIds ?? [],
      quantityBasis: resource.expression,
    };
    const sourceMetadata = {
      sourceIds: [DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_ID],
      sourcePackSha256: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256,
      fullCycleSourcePackSha256: S2723_BULKHEAD_FULL_CYCLE_SOURCE_PACK_SHA256,
      sourceRole: "MANUFACTURER_SYSTEM_AND_VISIBLE_PACKAGING_PROFILE",
      applicability:
        "One-layer 12.5 mm GSP standard bulkhead; confirm system, substrate, layers, corners and selected product packaging.",
      normativeTrace: [{
        sourceId: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_ID,
        source_id: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_ID,
        normId: S2723_BULKHEAD_FULL_CYCLE_NORM_ID,
        norm_id: S2723_BULKHEAD_FULL_CYCLE_NORM_ID,
        exact_locator: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_METADATA.exact_locator,
        source_definition_hash: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256,
      }],
    };
    return {
      id,
      row_id: id,
      ordinal,
      section: resource.sectionRu,
      category: resource.category,
      title_ru: resource.titleRu,
      unit_id: resource.unitId,
      formula_id: fullFormulaId(resource.key),
      inclusion_ast: { kind: "literal", value: true },
      resource_graph: resourceGraph,
      procurement_eligible: resource.procurementEligible,
      cost_owner_id: `${id}:cost`,
      source_metadata: sourceMetadata,
      row_sha256: sha256({ ordinal, resource, resourceGraph, sourceMetadata }),
    };
  });
  const resourceDefinitions = [...frameResources, ...finishResources];
  const formulaConsumers = new Map<string, string[]>();
  for (const formula of formulaDefinitions) {
    for (const parameterId of formula.input_parameter_ids) {
      const consumers = formulaConsumers.get(parameterId) ?? [];
      consumers.push(formula.formula_id);
      formulaConsumers.set(parameterId, consumers);
    }
  }
  const resourceConsumers = new Map<string, string[]>();
  for (const resource of resourceDefinitions) {
    const contextIds = (resource.resource_graph as Json)?.contextParameterIds;
    for (const parameterId of Array.isArray(contextIds) ? contextIds : []) {
      const consumers = resourceConsumers.get(String(parameterId)) ?? [];
      consumers.push(resource.row_id);
      resourceConsumers.set(String(parameterId), consumers);
    }
  }
  const frameParameters = frame.parameterDefinitions.map((parameter, ordinal) => ({
    ...parameter,
    ordinal,
    truth_metadata: {
      ...(parameter.truth_metadata as Json),
      contract: "rik-expo-app.s27-23.bulkhead-full-cycle-visible-profile.v1",
      semantic_parameter_key: `${S2723_BULKHEAD_FULL_CYCLE_CATALOG_ID}:${parameter.parameter_id}`,
      value_source_role: parameter.parameter_id === "area_m2"
        ? "USER_MEASURED"
        : "VISIBLE_PRELIMINARY_SCENARIO",
      applicability:
        "Complete 50 m2 standard bulkhead; frame geometry is visible and replaceable by project layout.",
      formula_consumers: formulaConsumers.get(parameter.parameter_id) ?? [],
      resource_branch_consumers: resourceConsumers.get(parameter.parameter_id) ?? [],
      full_cycle_source_pack_sha256: S2723_BULKHEAD_FULL_CYCLE_SOURCE_PACK_SHA256,
    },
  }));
  const finishParameters = FINISH_PARAMETERS.map((parameter, index) => ({
    parameter_id: parameter.id,
    ordinal: frameParameters.length + index,
    value_type: parameter.valueType ?? "decimal",
    unit_id: parameter.unitId ?? null,
    title_ru: parameter.titleRu,
    required: true,
    default_value: null,
    constraints_json: {
      ...(parameter.minimum == null ? {} : { min: parameter.minimum }),
      ...(parameter.values == null ? {} : { values: [...parameter.values] }),
      ...(parameter.valueType === "text" ? { maxLength: 1_000 } : {}),
    },
    truth_metadata: {
      contract: "rik-expo-app.s27-23.bulkhead-full-cycle-visible-profile.v1",
      semantic_parameter_key: `${S2723_BULKHEAD_FULL_CYCLE_CATALOG_ID}:${parameter.id}`,
      visibility_role: "USER_INPUT",
      value_source_role: NORMATIVE_FINISH_PARAMETERS.has(parameter.id)
        ? "MANDATORY_NORM_VALUE"
        : "VISIBLE_PRELIMINARY_SCENARIO",
      input_origin_class: NORMATIVE_FINISH_PARAMETERS.has(parameter.id)
        ? "MANUFACTURER_SYSTEM_RATE"
        : "SELECTED_VISIBLE_PRELIMINARY_PROFILE",
      preliminary_compilation_allowed: true,
      hidden_default_forbidden: false,
      runtime_profile_value: true,
      source_confirmation_required: false,
      formula_consumers: formulaConsumers.get(parameter.id) ?? [],
      resource_branch_consumers: resourceConsumers.get(parameter.id) ?? [],
      guide: {
        guide_kind: NORMATIVE_FINISH_PARAMETERS.has(parameter.id)
          ? "MANDATORY_NORM_VALUE" : "PRACTICE_REFERENCE",
        guide_short_ru:
          `${parameter.titleRu}: значение видно и заменяется выбранной системой, форматом товара, картой раскроя или проектом.`,
        source_role: NORMATIVE_FINISH_PARAMETERS.has(parameter.id)
          ? "PRIMARY_MANUFACTURER_QUANTITY_NORM"
          : "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
        source_document: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_ID,
        source_locator: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_METADATA.exact_locator,
        guide_version: "s27-23-bulkhead-full-cycle-r1",
        source_snapshot_hash: S2723_BULKHEAD_FULL_CYCLE_SOURCE_PACK_SHA256,
        applicability: S2723_BULKHEAD_FULL_CYCLE_SOURCE_METADATA.use_restriction,
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "FIRST_ESTIMATE_NOW_REPLACE_VISIBLE_PROFILE_WITH_PROJECT_DATA",
      },
    },
  }));
  return {
    parameterDefinitions: [...frameParameters, ...finishParameters],
    formulaDefinitions,
    resourceDefinitions,
  };
}

export const S2723_BULKHEAD_FULL_CYCLE_ROWS = buildS2723BulkheadFullCycleCanonicalRows();

export async function compileS2723BulkheadFullCycleProfile(input: Readonly<{
  submittedParameters: Readonly<Record<string, Scalar>>;
  confirmedParameters?: Readonly<Record<string, Scalar>>;
}>): Promise<CanonicalEstimateCompileCoreResult> {
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compile-core-s27-23-bulkhead-full-cycle-r1",
    catalogId: S2723_BULKHEAD_FULL_CYCLE_CATALOG_ID,
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [...S2723_BULKHEAD_FULL_CYCLE_ROWS.parameterDefinitions],
    formulaDefinitions: [...S2723_BULKHEAD_FULL_CYCLE_ROWS.formulaDefinitions],
    resourceDefinitions: [...S2723_BULKHEAD_FULL_CYCLE_ROWS.resourceDefinitions],
    submittedParameters: { ...input.submittedParameters },
    confirmedParameters: {
      ...S2723_BULKHEAD_FULL_CYCLE_RUNTIME_PROFILE_INPUT,
      ...(input.confirmedParameters ?? {}),
    },
    currencyCode: "KGS",
    priceSnapshotIds: [],
    priceItems: [],
    maximumResourceRows: 100,
    hashJson: sha256,
  });
}

export const S2723_BULKHEAD_FULL_CYCLE_REQUIRED_ROW_GROUPS = Object.freeze({
  frame: [
    fullRowId("longitudinal_profile_packages"),
    fullRowId("horizontal_profile_packages"),
    fullRowId("vertical_profile_packages"),
    fullRowId("suspension_hangers"),
    fullRowId("structural_support_anchors"),
    fullRowId("profile_intersection_connectors"),
    fullRowId("profile_screw_packages"),
  ],
  cladding: [
    fullRowId("board_sheets"),
    fullRowId("board_screw_packages"),
    fullRowId("board_cutting"),
    fullRowId("board_installation"),
  ],
  cornersAndJoints: [
    fullRowId("external_corner_profiles"),
    fullRowId("joint_compound_bags"),
    fullRowId("joint_tape_rolls"),
    fullRowId("separation_tape_rolls"),
    fullRowId("joint_filling"),
  ],
  surface: [
    fullRowId("primer_cans"),
    fullRowId("abrasive_items"),
    fullRowId("sanding_priming"),
  ],
  equipmentAndCompletion: [
    fullRowId("access_equipment"),
    fullRowId("screwdriver"),
    fullRowId("board_cutting_tool"),
    fullRowId("sanding_dust_extractor"),
    fullRowId("finish_acceptance"),
  ],
});
