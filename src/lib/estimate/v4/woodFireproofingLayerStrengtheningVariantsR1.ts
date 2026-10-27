import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;

export const WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_ID =
  "official_sp_kr_54_101_2023_fireproofed_wood_layer_strengthening_project_inputs_v1";
export const WOOD_FIREPROOFING_LAYER_STRENGTHENING_NORM_ID =
  "norm:kg:sp_kr_54_101_2023:fireproofed_wood_layer_strengthening_visible_profile:v1";
export const WOOD_FIREPROOFING_LAYER_STRENGTHENING_ARTIFACT_SHA256 =
  "e28932e7b9f8ed54b6cb2e222ed1e0981db94a885ea2a698e7c7c33ebea87a6c";

export const WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_METADATA = Object.freeze({
  source_title:
    "СП КР 54-101:2023 и утверждённая изготовителем технологическая карта усиления существующего огнезащитного слоя деревянных конструкций",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики; изготовитель существующей огнезащитной системы; ответственный инженер проекта",
  source_document_version:
    "SP_KR_54_101_2023_PLUS_APPROVED_COMPATIBLE_FIREPROOF_LAYER_STRENGTHENING_METHOD",
  definition_hash: WOOD_FIREPROOFING_LAYER_STRENGTHENING_ARTIFACT_SHA256,
  exact_locator:
    "СП КР 54-101:2023, §§10.24–10.27, печатная/PDF-страница 80: техническая документация, соблюдение технологии и проверка состояния огнезащищённой деревянной поверхности; утверждённые ведомость зон усиления слоя, совместимая технологическая карта, карта контроля и план отходов",
  use_restriction:
    "Источник задаёт обязательную техническую границу, совместимость и контроль, но не универсальные нормы расхода усиливающего состава, грунта, сетки, крепежа, труда, механизмов или отходов. Для первого расчёта показан редактируемый предварительный профиль; его значения не выдаются за официальные нормы и заменяются подтверждённой технологической картой. Конструктивное усиление деревянного элемента, инъектирование, герметизация и полная замена огнезащитной системы исключены.",
  source_kind:
    "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_VISIBLE_EDITABLE_FIREPROOF_LAYER_STRENGTHENING_PROFILE",
  official_url: "https://minstroy.gov.kg/ru/document/54/show",
  artifact_url:
    "https://minstroy.gov.kg/index.php/ru/state_program/download-pdf/5tekstrusskderevo_1002-80865814f343a9461.64636209.pdf",
  artifact_sha256: WOOD_FIREPROOFING_LAYER_STRENGTHENING_ARTIFACT_SHA256,
  effective_from: "2024-01-10",
});

export const WOOD_FIREPROOFING_LAYER_STRENGTHENING_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: "canonical-work:base:special_repair_interior_fireproof_strengthen_standard",
    catalogVariant: "STANDARD_AREA_SEARCH_IDENTITY",
    canonicalNameRu:
      "Совместимое усиление существующего огнезащитного слоя деревянных конструкций",
    aliasesRu: ["усиление огнезащиты", "армирование огнезащитного слоя древесины"],
  }),
});

export type WoodFireproofingLayerStrengtheningVariantKey =
  keyof typeof WOOD_FIREPROOFING_LAYER_STRENGTHENING_VARIANTS;

type ParameterSpec = readonly [
  parameterId: string,
  titleRu: string,
  valueType: "decimal" | "integer" | "text" | "enum",
  unitId: string | null,
  enumValues: readonly string[] | null,
  profileValue: InputValue | null,
  sourceClass: "KNOWN_SCOPE" | "APPLICABILITY" | "PROFESSIONAL_ASSUMPTION",
  guideRu: string,
];

const PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  ["strengthening_area_m2", "Площадь усиления существующего огнезащитного слоя", "decimal", "m2", null, null, "KNOWN_SCOPE", "Введите подтверждённую площадь зон усиления слоя по ведомости или обмеру."],
  ["existing_fireproof_system_designation", "Обозначение существующей огнезащитной системы", "text", null, null, null, "KNOWN_SCOPE", "Укажите систему по исполнительной документации."],
  ["strengthening_zone_statement", "Описание зон и причины усиления огнезащитного слоя", "text", null, null, null, "KNOWN_SCOPE", "Укажите подтверждённые границы и состояние слоя по акту обследования."],
  ["strengthening_method_reference", "Технологическая карта совместимого усиления огнезащитного слоя", "text", null, null, "Предварительный совместимый метод усиления существующего огнезащитного слоя", "APPLICABILITY", "Заменить утверждённой изготовителем технологической картой."],
  ["strengthening_compound_designation", "Совместимый усиливающий огнезащитный состав", "text", null, null, "Совместимый усиливающий состав существующей огнезащитной системы", "APPLICABILITY", "Уточнить марку по документации системы."],
  ["strengthening_compound_rate_kg_m2", "Расход усиливающего состава на 1 м²", "decimal", "kg_m2", null, 0.55, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,55 кг/м²; заменить подтверждённым расходом."],
  ["primer_mode", "Требуется совместимый грунт", "enum", null, ["NOT_REQUIRED", "REQUIRED"], "REQUIRED", "APPLICABILITY", "В предварительный состав включён совместимый грунт; можно отключить по карте."],
  ["primer_designation", "Совместимый грунт для усиления слоя", "text", null, null, "Совместимый грунт существующей огнезащитной системы", "APPLICABILITY", "Уточнить марку по карте усиления слоя."],
  ["primer_rate_l_m2", "Расход грунта на 1 м²", "decimal", "l_m2", null, 0.1, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,10 л/м²."],
  ["reinforcement_mesh_mode", "Требуется армирующая сетка", "enum", null, ["NOT_REQUIRED", "REQUIRED"], "REQUIRED", "APPLICABILITY", "В предварительный состав включена совместимая армирующая сетка; можно отключить по карте."],
  ["reinforcement_mesh_designation", "Совместимая армирующая сетка", "text", null, null, "Совместимая армирующая сетка огнезащитного слоя", "APPLICABILITY", "Уточнить тип по технологической карте."],
  ["reinforcement_mesh_area_factor", "Коэффициент площади армирующей сетки", "decimal", null, null, 1.15, "PROFESSIONAL_ASSUMPTION", "Предварительно 1,15 м² сетки на 1 м² зоны с учётом нахлёстов."],
  ["mesh_fastener_designation", "Совместимый крепёж армирующей сетки", "text", null, null, "Совместимый крепёж армирующей сетки огнезащитного слоя", "APPLICABILITY", "Уточнить тип и материал крепежа по карте."],
  ["mesh_fastener_density_pcs_m2", "Количество крепежа сетки на 1 м²", "decimal", "pcs_m2", null, 4, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 4 шт./м²."],
  ["masking_area_factor", "Коэффициент укрывного материала", "decimal", null, null, 1.2, "PROFESSIONAL_ASSUMPTION", "Предварительно 1,20 м² укрывного материала на 1 м² зоны."],
  ["labor_rate_man_hour_m2", "Трудоёмкость усиления слоя на 1 м²", "decimal", "man_hour_m2", null, 0.75, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,75 чел.-ч/м²."],
  ["mixing_rate_machine_hour_m2", "Работа смесителя на 1 м²", "decimal", "machine_hour_m2", null, 0.05, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,05 маш.-ч/м²."],
  ["application_tool_rate_machine_hour_m2", "Работа инструмента нанесения на 1 м²", "decimal", "machine_hour_m2", null, 0.09, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,09 маш.-ч/м²."],
  ["inspection_area_per_count_m2", "Площадь на одну контрольную точку", "decimal", "m2", null, 10, "PROFESSIONAL_ASSUMPTION", "Предварительно одна контрольная точка на каждые 10 м²."],
  ["adhesion_sample_area_per_count_m2", "Площадь на одну пробу адгезии", "decimal", "m2", null, 25, "PROFESSIONAL_ASSUMPTION", "Предварительно одна проба на каждые 25 м²."],
  ["strengthening_protocol_document_count", "Количество протоколов усиления слоя", "integer", "document", null, 1, "PROFESSIONAL_ASSUMPTION", "Предварительно один протокол на сметную операцию."],
  ["waste_mass_rate_kg_m2", "Масса отходов на 1 м²", "decimal", "kg_m2", null, 0.1, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,10 кг/м²."],
  ["waste_container_capacity_kg", "Вместимость одной единицы тары", "decimal", "kg", null, 5, "PROFESSIONAL_ASSUMPTION", "Предварительно 5 кг на единицу тары."],
  ["waste_transport_mode", "Требуется отдельная перевозка отходов", "enum", null, ["HANDOVER_ON_SITE", "TRANSPORT_REQUIRED"], "TRANSPORT_REQUIRED", "APPLICABILITY", "Предварительно включён отдельный рейс; можно заменить передачей на площадке."],
  ["waste_transport_capacity_kg", "Расчётная вместимость одного рейса", "decimal", "kg", null, 500, "PROFESSIONAL_ASSUMPTION", "Предварительно 500 кг на рейс."],
]);

export type WoodFireproofingLayerStrengtheningParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
  };

export const WOOD_FIREPROOFING_LAYER_STRENGTHENING_PARAMETERS:
readonly WoodFireproofingLayerStrengtheningParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues, profileValue, sourceClass, guideRu], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: {
      ...(enumValues ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
    },
    truth_metadata: {
      contract: "rik-expo-app.wood-fireproofing-layer-strengthening-variants-r1",
      semantic_parameter_key: `wood-fireproofing-layer-strengthening:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: sourceClass === "KNOWN_SCOPE" ? "USER_MEASURED"
        : sourceClass === "APPLICABILITY" ? "VISIBLE_PRELIMINARY_SCENARIO"
          : "VISIBLE_BASELINE_ASSUMPTION",
      input_origin_class: sourceClass,
      preliminary_compilation_allowed: sourceClass !== "KNOWN_SCOPE",
      source_confirmation_required: false,
      runtime_profile_value: sourceClass !== "KNOWN_SCOPE",
      runtime_profile_classification: sourceClass === "PROFESSIONAL_ASSUMPTION"
        ? "EXPLICIT_PRELIMINARY_ASSUMPTION" : sourceClass,
      guide: {
        guide_kind: sourceClass === "KNOWN_SCOPE" ? "MEASUREMENT_RULE" : "PRACTICE_REFERENCE",
        guide_short_ru: guideRu,
        source_role: sourceClass,
        source_document: WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_ID,
        source_locator: WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_METADATA.exact_locator,
        guide_version: "wood-fireproofing-layer-strengthening-r1",
        source_snapshot_hash: WOOD_FIREPROOFING_LAYER_STRENGTHENING_ARTIFACT_SHA256,
        applicability:
          "Только усиление существующего огнезащитного слоя; не конструктивное усиление деревянного элемента.",
        verified_at: "2026-09-25T00:00:00+06:00",
        guide_validation_policy:
          "FIRST_ESTIMATE_NOW_SHOW_AND_ALLOW_REPLACEMENT_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: sourceClass === "KNOWN_SCOPE",
      synthetic: false,
    },
  }),
));

export const WOOD_FIREPROOFING_LAYER_STRENGTHENING_PRELIMINARY_PROFILE = Object.freeze(
  Object.fromEntries(PARAMETER_SPECS.filter(([, , , , , value]) => value !== null)
    .map(([parameterId, , , , , value]) => [parameterId, value])) as Record<string, InputValue>,
);
export const WOOD_FIREPROOFING_LAYER_STRENGTHENING_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(WOOD_FIREPROOFING_LAYER_STRENGTHENING_PRELIMINARY_PROFILE)
    .map((parameterId) => [parameterId, "ASSUMPTION"])),
) as Readonly<Record<string, "ASSUMPTION">>;
export const WOOD_FIREPROOFING_LAYER_STRENGTHENING_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(WOOD_FIREPROOFING_LAYER_STRENGTHENING_PRELIMINARY_PROFILE)
    .map((parameterId) => [parameterId, parameterId === "strengthening_method_reference"
      ? [WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_ID] : []])),
) as Readonly<Record<string, readonly string[]>>;

function formula(id: string, unitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return { formula_id: id, output_unit_id: unitId, expression_source: expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
}

const FORMULA_SPECS = Object.freeze([
  ["wood_fireproofing_layer_strengthening_area_v1", "m2", "strengthening_area_m2"],
  ["wood_fireproofing_layer_strengthening_labor_v1", "man_hour", "strengthening_area_m2*labor_rate_man_hour_m2"],
  ["wood_fireproofing_layer_strengthening_compound_v1", "kg", "strengthening_area_m2*strengthening_compound_rate_kg_m2"],
  ["wood_fireproofing_layer_strengthening_primer_v1", "l", "strengthening_area_m2*primer_rate_l_m2"],
  ["wood_fireproofing_layer_strengthening_mesh_v1", "m2", "strengthening_area_m2*reinforcement_mesh_area_factor"],
  ["wood_fireproofing_layer_strengthening_mesh_fastener_v1", "pcs", "ceil(strengthening_area_m2*mesh_fastener_density_pcs_m2)"],
  ["wood_fireproofing_layer_strengthening_masking_v1", "m2", "strengthening_area_m2*masking_area_factor"],
  ["wood_fireproofing_layer_strengthening_mixing_v1", "machine_hour", "strengthening_area_m2*mixing_rate_machine_hour_m2"],
  ["wood_fireproofing_layer_strengthening_application_tool_v1", "machine_hour", "strengthening_area_m2*application_tool_rate_machine_hour_m2"],
  ["wood_fireproofing_layer_strengthening_inspection_v1", "pcs", "ceil(strengthening_area_m2/inspection_area_per_count_m2)"],
  ["wood_fireproofing_layer_strengthening_adhesion_sample_v1", "pcs", "ceil(strengthening_area_m2/adhesion_sample_area_per_count_m2)"],
  ["wood_fireproofing_layer_strengthening_protocol_v1", "document", "strengthening_protocol_document_count"],
  ["wood_fireproofing_layer_strengthening_waste_v1", "kg", "strengthening_area_m2*waste_mass_rate_kg_m2"],
  ["wood_fireproofing_layer_strengthening_waste_container_v1", "pcs", "ceil(strengthening_area_m2*waste_mass_rate_kg_m2/waste_container_capacity_kg)"],
  ["wood_fireproofing_layer_strengthening_waste_transport_v1", "trip", "ceil(strengthening_area_m2*waste_mass_rate_kg_m2/waste_transport_capacity_kg)"],
] as const);

export const WOOD_FIREPROOFING_LAYER_STRENGTHENING_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(
  FORMULA_SPECS.map(([id, unit, expression]) => formula(id, unit, expression)),
);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
const ROW_SPECS = Object.freeze([
  ["f09:wood_fireproofing_layer_strengthening_area", "Объём работ", "construction_work", "Усиление существующего огнезащитного слоя деревянной конструкции", false, literalTrue, ["existing_fireproof_system_designation", "strengthening_zone_statement"]],
  ["f09:wood_fireproofing_layer_strengthening_labor", "Труд", "construction_work", "Труд по усилению существующего огнезащитного слоя", false, literalTrue, ["strengthening_method_reference"]],
  ["f09:wood_fireproofing_layer_strengthening_compound", "Материалы", "material", "Совместимый усиливающий огнезащитный состав", true, literalTrue, ["strengthening_compound_designation"]],
  ["f09:wood_fireproofing_layer_strengthening_primer", "Материалы", "material", "Совместимый грунт для усиления огнезащитного слоя", true, equals("primer_mode", "REQUIRED"), ["primer_designation"]],
  ["f09:wood_fireproofing_layer_strengthening_mesh", "Комплектующие", "material", "Совместимая армирующая сетка огнезащитного слоя", true, equals("reinforcement_mesh_mode", "REQUIRED"), ["reinforcement_mesh_designation"]],
  ["f09:wood_fireproofing_layer_strengthening_mesh_fastener", "Крепёж", "material", "Совместимый крепёж армирующей сетки", true, equals("reinforcement_mesh_mode", "REQUIRED"), ["mesh_fastener_designation"]],
  ["f09:wood_fireproofing_layer_strengthening_masking", "Расходные материалы", "material", "Укрывной материал для защиты смежных поверхностей", true, literalTrue, []],
  ["f09:wood_fireproofing_layer_strengthening_mixer", "Оборудование", "equipment", "Смесительное оборудование для усиливающего состава", true, literalTrue, []],
  ["f09:wood_fireproofing_layer_strengthening_application_tool", "Оборудование", "equipment", "Механизированный инструмент нанесения усиливающего состава", true, literalTrue, []],
  ["f09:wood_fireproofing_layer_strengthening_inspection", "Контроль качества", "service", "Контрольные точки сплошности, крепления и толщины слоя", false, literalTrue, []],
  ["f09:wood_fireproofing_layer_strengthening_adhesion_sample", "Контроль качества", "service", "Контрольная проба адгезии усиленного огнезащитного слоя", false, literalTrue, []],
  ["f09:wood_fireproofing_layer_strengthening_protocol", "Документация", "service", "Протокол усиления и приёмки огнезащитного слоя", false, literalTrue, []],
  ["f09:wood_fireproofing_layer_strengthening_waste", "Отходы", "service", "Сбор отходов усиления слоя и использованных расходников", false, literalTrue, []],
  ["f09:wood_fireproofing_layer_strengthening_waste_container", "Материалы", "material", "Герметичная маркированная тара для отходов усиления слоя", true, literalTrue, []],
  ["f09:wood_fireproofing_layer_strengthening_waste_transport", "Перевозка", "service", "Перевозка отходов усиления слоя к утверждённому получателю", false, equals("waste_transport_mode", "TRANSPORT_REQUIRED"), []],
] as const);

export const WOOD_FIREPROOFING_LAYER_STRENGTHENING_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(ROW_SPECS.map(
  ([rowId, section, category, titleRu, procurementEligible, inclusionAst, titleParameterIds], ordinal) => {
    const [formulaId, unitId] = FORMULA_SPECS[ordinal];
    const resourceGraph = {
      formulaId, normalizedUom: unitId,
      semanticOwnerId: `wood-fireproofing-layer-strengthening:${rowId}`,
      costOwner: ordinal === 0 ? "scope" : "resource",
      costTreatment: ordinal === 0 ? "INFORMATIONAL_SCOPE" : "OWN_COST",
      payable: ordinal !== 0, noDoubleCount: true,
      ...(titleParameterIds.length > 0 ? {
        titleSpecificationParameterIds: [...titleParameterIds],
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — ",
      } : {}),
      scopeContextParameterIds: ["strengthening_area_m2", "existing_fireproof_system_designation",
        "strengthening_zone_statement", "strengthening_method_reference"],
    };
    const sourceMetadata = {
      truth_contract_version: "R3", synthetic: false,
      sourceRole: ordinal === 0 ? "CONFIRMED_FIREPROOF_LAYER_STRENGTHENING_SCOPE"
        : "VISIBLE_EDITABLE_PRELIMINARY_FIREPROOF_LAYER_STRENGTHENING_PROFILE",
      normativeTrace: [{
        sourceId: WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_ID,
        source_id: WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_ID,
        normId: WOOD_FIREPROOFING_LAYER_STRENGTHENING_NORM_ID,
        norm_id: WOOD_FIREPROOFING_LAYER_STRENGTHENING_NORM_ID,
        normVersion: WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_METADATA.source_document_version,
        source_title: WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_METADATA.source_title,
        exact_locator: WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_METADATA.exact_locator,
        source_definition_hash: WOOD_FIREPROOFING_LAYER_STRENGTHENING_ARTIFACT_SHA256,
      }],
      quantityBasis: ordinal === 0
        ? "CONFIRMED_FIREPROOF_LAYER_STRENGTHENING_AREA_INFORMATIONAL_SCOPE"
        : "AUTOMATIC_FROM_AREA_AND_VISIBLE_EDITABLE_PRELIMINARY_PROFILE",
      excludedUnownedAssumptions: ["official universal preliminary rates",
        "structural strengthening of the timber member", "injection, sealing or full replacement",
        "classification suffix quantity factor", "invented price"],
    };
    return {
      id: `resource-${rowId.replace(/:/gu, "-")}`, row_id: rowId, ordinal, section,
      category, title_ru: titleRu, unit_id: unitId, formula_id: formulaId,
      inclusion_ast: inclusionAst, resource_graph: resourceGraph,
      procurement_eligible: procurementEligible, cost_owner_id: rowId,
      source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ rowId, ordinal, section, category, titleRu,
        unitId, formulaId, procurementEligible, inclusionAst, resourceGraph, sourceMetadata }),
    };
  },
));

export const WOOD_FIREPROOFING_LAYER_STRENGTHENING_SHORT_INPUT = Object.freeze({
  strengthening_area_m2: 100,
  existing_fireproof_system_designation:
    "Существующая огнезащитная система деревянной конструкции по исполнительной документации",
  strengthening_zone_statement:
    "Зоны недостаточной сплошности или толщины слоя в границах утверждённой ведомости",
});
export const WOOD_FIREPROOFING_LAYER_STRENGTHENING_ACCEPTANCE_INPUT = Object.freeze({
  ...WOOD_FIREPROOFING_LAYER_STRENGTHENING_SHORT_INPUT,
  ...WOOD_FIREPROOFING_LAYER_STRENGTHENING_PRELIMINARY_PROFILE,
});

export function resolveWoodFireproofingLayerStrengtheningVariant(variantKey: string) {
  if (!Object.prototype.hasOwnProperty.call(
    WOOD_FIREPROOFING_LAYER_STRENGTHENING_VARIANTS, variantKey,
  )) {
    throw new Error(`WOOD_FIREPROOFING_LAYER_STRENGTHENING_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return WOOD_FIREPROOFING_LAYER_STRENGTHENING_VARIANTS[
    variantKey as WoodFireproofingLayerStrengtheningVariantKey
  ];
}

export function woodFireproofingLayerStrengtheningCompletenessMap(
  variantKey: WoodFireproofingLayerStrengtheningVariantKey,
) {
  const variant = WOOD_FIREPROOFING_LAYER_STRENGTHENING_VARIANTS[variantKey];
  return Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "PROJECT_SYSTEM", generatedFromCurrentRows: false,
    evidenceSha256: WOOD_FIREPROOFING_LAYER_STRENGTHENING_ARTIFACT_SHA256,
    evidenceReferences: [WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_METADATA.official_url,
      "СП КР 54-101:2023, §§10.24–10.27, печатная/PDF-страница 80",
      "approved layer-strengthening statement, compatible method, control and waste plan"],
    catalogVariant: `${variant.catalogVariant}_NO_HIDDEN_QUANTITY_FACTOR`,
    entries: ROW_SPECS.map(([rowId, , category, titleRu], ordinal) => ({
      operationId: rowId.replace("f09:", ""),
      expectedResourceId: `required-operation:${rowId.replace("f09:", "")}`,
      category, specification: titleRu,
      condition: ordinal === 3 ? "primer_mode=REQUIRED"
        : ordinal === 4 || ordinal === 5 ? "reinforcement_mesh_mode=REQUIRED"
          : ordinal === 14 ? "waste_transport_mode=TRANSPORT_REQUIRED"
            : "wood_fireproofing_layer_strengthening_selected",
      sourceId: WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_ID,
      unitId: FORMULA_SPECS[ordinal][1], formulaId: FORMULA_SPECS[ordinal][0],
      quantityRule: ordinal === 0
        ? "CONFIRMED_FIREPROOF_LAYER_STRENGTHENING_AREA_INFORMATIONAL_SCOPE"
        : "AUTOMATIC_FROM_AREA_AND_VISIBLE_EDITABLE_PRELIMINARY_PROFILE",
      detailPrinciple:
        "FIREPROOF_LAYER_STRENGTHENING_ONLY_NO_TIMBER_STRUCTURAL_STRENGTHENING_INJECTION_OR_SEALING",
      priceRelation: ordinal === 0 ? "INFORMATIONAL_SCOPE" : "OWN_COST_OR_HONESTLY_UNKNOWN",
      resolution: { kind: "ROW", rowId },
    })),
  });
}

export async function compileWoodFireproofingLayerStrengtheningVariantR1(
  variantKey: WoodFireproofingLayerStrengtheningVariantKey,
  parameters: Readonly<Record<string, InputValue>>,
): Promise<CanonicalEstimateCompileCoreResult> {
  const variant = resolveWoodFireproofingLayerStrengtheningVariant(variantKey);
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion:
      `canonical-estimate-compiler.wood-fireproofing-layer-strengthening-${variantKey}-r1`,
    catalogId: variant.catalogId,
    primaryMeasureParameterId: "strengthening_area_m2",
    parameterDefinitions: [...WOOD_FIREPROOFING_LAYER_STRENGTHENING_PARAMETERS],
    formulaDefinitions: [...WOOD_FIREPROOFING_LAYER_STRENGTHENING_FORMULAS],
    resourceDefinitions: [...WOOD_FIREPROOFING_LAYER_STRENGTHENING_RESOURCES],
    submittedParameters: {
      ...WOOD_FIREPROOFING_LAYER_STRENGTHENING_PRELIMINARY_PROFILE,
      ...parameters,
    },
    confirmedParameters: {}, currencyCode: "KGS", priceItems: [], maximumResourceRows: 20,
    hashJson: async (value) => JSON.stringify(value),
  });
}
