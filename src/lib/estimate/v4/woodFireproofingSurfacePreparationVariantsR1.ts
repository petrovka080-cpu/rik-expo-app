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

export const WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_ID =
  "official_sp_kr_54_101_2023_fireproofed_wood_preparation_project_inputs_v1";
export const WOOD_FIREPROOFING_SURFACE_PREPARATION_NORM_ID =
  "norm:kg:sp_kr_54_101_2023:fireproofed_wood_preparation_direct_inputs:v1";
export const WOOD_FIREPROOFING_SURFACE_PREPARATION_ARTIFACT_SHA256 =
  "e28932e7b9f8ed54b6cb2e222ed1e0981db94a885ea2a698e7c7c33ebea87a6c";

export const WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_METADATA = Object.freeze({
  source_title:
    "СП КР 54-101:2023 и утверждённая технологическая карта подготовки существующей огнезащищённой деревянной поверхности",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики; изготовитель существующей и последующей огнезащитной системы; ответственный инженер проекта",
  source_document_version:
    "SP_KR_54_101_2023_PLUS_APPROVED_FIREPROOF_SURFACE_PREPARATION_METHOD",
  definition_hash: WOOD_FIREPROOFING_SURFACE_PREPARATION_ARTIFACT_SHA256,
  exact_locator:
    "СП КР 54-101:2023, §§10.24–10.27, printed/PDF page 80: техническая документация, соблюдение технологии и проверка состояния огнезащищённой деревянной поверхности; утверждённые акт состояния, совместимая технологическая карта подготовки, требования последующей операции и план отходов",
  use_restriction:
    "Источник задаёт техническую границу состояния и совместимости, но не универсальную производительность подготовки, объём удаления, расход абразива, укрытия или отходов. Для первого расчёта используется видимый редактируемый предварительный профиль; его значения не выдаются за официальные нормы и должны быть заменены подтверждённой технологической картой. Профиль включает подготовку до заданной готовности, но не выполняет последующее нанесение, локальный ремонт, инъектирование, герметизацию или усиление.",
  source_kind: "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_APPROVED_PREPARATION_METHOD",
  official_url: "https://minstroy.gov.kg/ru/document/54/show",
  artifact_url:
    "https://minstroy.gov.kg/index.php/ru/state_program/download-pdf/5tekstrusskderevo_1002-80865814f343a9461.64636209.pdf",
  artifact_sha256: WOOD_FIREPROOFING_SURFACE_PREPARATION_ARTIFACT_SHA256,
  effective_from: "2024-01-10",
});

export const WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: "canonical-work:base:special_repair_interior_fireproof_prepare_standard",
    catalogVariant: "STANDARD_AREA_SEARCH_IDENTITY",
    canonicalNameRu:
      "Подготовка существующей огнезащищённой деревянной поверхности",
    aliasesRu: [
      "подготовка огнезащиты",
      "подготовка огнезащищённой деревянной конструкции",
    ],
  }),
});

export type WoodFireproofingSurfacePreparationVariantKey =
  keyof typeof WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANTS;

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
  ["preparation_area_m2", "Площадь подготовки огнезащищённой деревянной поверхности", "decimal", "m2", null, null, "KNOWN_SCOPE", "Введите измеренную площадь подготовки."],
  ["existing_fireproof_system_designation", "Обозначение существующей огнезащитной системы", "text", null, null, null, "KNOWN_SCOPE", "Укажите систему по исполнительной документации или акту обследования."],
  ["surface_condition_statement", "Состояние поверхности по акту обследования", "text", null, null, null, "KNOWN_SCOPE", "Кратко укажите подтверждённые дефекты, загрязнение и непрочные участки."],
  ["subsequent_operation", "Согласованная последующая операция", "enum", null, ["INSPECTION", "LOCAL_REPAIR", "RECOATING", "OTHER_APPROVED"], null, "KNOWN_SCOPE", "Выберите согласованную операцию после подготовки."],
  ["preparation_method_reference", "Технологическая карта совместимой подготовки", "text", null, null, "Предварительный совместимый метод: локальное механическое удаление непрочных участков с пылеудалением", "APPLICABILITY", "Предварительное описание метода; заменить утверждённой технологической картой до выполнения работ."],
  ["labor_rate_man_hour_m2", "Трудоёмкость подготовки на 1 м²", "decimal", "man_hour_m2", null, 0.24, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,24 чел.-ч/м²; заменить подтверждённой производительностью."],
  ["dust_extraction_rate_machine_hour_m2", "Работа пылеудаляющего оборудования на 1 м²", "decimal", "machine_hour_m2", null, 0.05, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,05 маш.-ч/м²."],
  ["manual_tool_rate_machine_hour_m2", "Работа механизированного ручного инструмента на 1 м²", "decimal", "machine_hour_m2", null, 0.08, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,08 маш.-ч/м²."],
  ["removed_material_rate_kg_m2", "Удаляемый непрочный материал на 1 м²", "decimal", "kg_m2", null, 0.18, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,18 кг/м² по сценарию локальных непрочных участков."],
  ["abrasive_mode", "Требуется совместимый абразив", "enum", null, ["NOT_REQUIRED", "REQUIRED"], "REQUIRED", "APPLICABILITY", "В предварительный полный состав включён совместимый абразив; можно отключить после обследования."],
  ["abrasive_designation", "Совместимый абразивный материал", "text", null, null, "Абразив для древесины, совместимый с существующей и последующей огнезащитной системой", "APPLICABILITY", "Уточнить марку по технологической карте и документации систем."],
  ["abrasive_rate_kg_m2", "Расход совместимого абразива на 1 м²", "decimal", "kg_m2", null, 0.06, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,06 кг/м²; заменить нормой выбранного абразива."],
  ["masking_mode", "Требуется укрытие смежных поверхностей", "enum", null, ["NOT_REQUIRED", "REQUIRED"], "REQUIRED", "APPLICABILITY", "В предварительный полный состав включено укрытие; можно отключить при отсутствии смежных поверхностей."],
  ["masking_material_designation", "Укрывной материал", "text", null, null, "Защитная плёнка и малярная лента, совместимые с основанием", "APPLICABILITY", "Уточнить тип укрытия по площадке."],
  ["masking_area_factor", "Коэффициент площади укрытия", "decimal", "ratio", null, 1.2, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 1,20 м² укрытия на 1 м² подготовки."],
  ["profile_measurement_area_per_count_m2", "Площадь на один контрольный участок профиля", "decimal", "m2", null, 10, "PROFESSIONAL_ASSUMPTION", "Предварительно один контрольный участок на каждые 10 м²."],
  ["readiness_protocol_document_count", "Количество протоколов готовности поверхности", "integer", "document", null, 1, "PROFESSIONAL_ASSUMPTION", "Предварительно один протокол на сметную операцию."],
  ["waste_container_designation", "Тара для удалённых материалов и расходников", "text", null, null, "Герметичная маркированная тара для отходов подготовки", "APPLICABILITY", "Уточнить тип тары по плану обращения с отходами."],
  ["waste_container_capacity_kg", "Вместимость одной единицы тары", "decimal", "kg", null, 3, "PROFESSIONAL_ASSUMPTION", "Предварительно 3 кг отходов на одну единицу тары."],
  ["waste_transport_mode", "Требуется отдельная перевозка отходов", "enum", null, ["HANDOVER_ON_SITE", "TRANSPORT_REQUIRED"], "TRANSPORT_REQUIRED", "APPLICABILITY", "В предварительный полный состав включена передача отходов отдельным рейсом."],
  ["waste_transport_capacity_kg", "Расчётная вместимость одного рейса", "decimal", "kg", null, 500, "PROFESSIONAL_ASSUMPTION", "Предварительно 500 кг на рейс; заменить фактической схемой вывоза."],
]);

export type WoodFireproofingSurfacePreparationParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
    truth_metadata: Json;
  };

export const WOOD_FIREPROOFING_SURFACE_PREPARATION_PARAMETERS:
readonly WoodFireproofingSurfacePreparationParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues, profileValue, sourceClass,
    guideRu], ordinal) => ({
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
        contract: "rik-expo-app.wood-fireproofing-surface-preparation-variants-r2",
        semantic_parameter_key: `wood-fireproofing-surface-preparation:${parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: sourceClass === "KNOWN_SCOPE"
          ? "USER_MEASURED" : sourceClass === "APPLICABILITY"
            ? "VISIBLE_PRELIMINARY_SCENARIO" : "VISIBLE_BASELINE_ASSUMPTION",
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
          source_document: WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_ID,
          source_locator: WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_METADATA.exact_locator,
          guide_version: "wood-fireproofing-surface-preparation-r2",
          source_snapshot_hash: WOOD_FIREPROOFING_SURFACE_PREPARATION_ARTIFACT_SHA256,
          applicability:
            "Только подготовка существующей огнезащищённой деревянной поверхности до заданной готовности; последующая операция в этот профиль не входит.",
          verified_at: "2026-09-25T00:00:00+06:00",
          guide_validation_policy:
            "FIRST_ESTIMATE_NOW_SHOW_AND_ALLOW_REPLACEMENT_REJECT_INVALID_SUPPLIED_VALUE",
        },
        hidden_default_forbidden: sourceClass === "KNOWN_SCOPE",
        synthetic: false,
      },
    }),
));

export const WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE = Object.freeze(
  Object.fromEntries(PARAMETER_SPECS
    .filter(([, , , , , profileValue]) => profileValue !== null)
    .map(([parameterId, , , , , profileValue]) => [parameterId, profileValue])) as
    Record<string, InputValue>,
);

export const WOOD_FIREPROOFING_SURFACE_PREPARATION_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE)
    .map((parameterId) => [parameterId, "ASSUMPTION"])),
) as Readonly<Record<string, "ASSUMPTION">>;

export const WOOD_FIREPROOFING_SURFACE_PREPARATION_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE)
    .map((parameterId) => [
      parameterId,
      parameterId === "preparation_method_reference"
        ? [WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_ID] : [],
    ])),
) as Readonly<Record<string, readonly string[]>>;

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

const FORMULA_SPECS = Object.freeze([
  ["wood_fireproofing_preparation_area_v2", "m2", "preparation_area_m2"],
  ["wood_fireproofing_preparation_labor_v2", "man_hour", "preparation_area_m2*labor_rate_man_hour_m2"],
  ["wood_fireproofing_preparation_dust_extraction_v2", "machine_hour", "preparation_area_m2*dust_extraction_rate_machine_hour_m2"],
  ["wood_fireproofing_preparation_manual_tool_v2", "machine_hour", "preparation_area_m2*manual_tool_rate_machine_hour_m2"],
  ["wood_fireproofing_preparation_removed_material_v2", "kg", "preparation_area_m2*removed_material_rate_kg_m2"],
  ["wood_fireproofing_preparation_abrasive_v2", "kg", "preparation_area_m2*abrasive_rate_kg_m2"],
  ["wood_fireproofing_preparation_masking_v2", "m2", "preparation_area_m2*masking_area_factor"],
  ["wood_fireproofing_preparation_profile_measurements_v2", "pcs", "ceil(preparation_area_m2/profile_measurement_area_per_count_m2)"],
  ["wood_fireproofing_preparation_readiness_protocol_v2", "document", "readiness_protocol_document_count"],
  ["wood_fireproofing_preparation_waste_containers_v2", "pcs", "ceil((preparation_area_m2*removed_material_rate_kg_m2+preparation_area_m2*abrasive_rate_kg_m2)/waste_container_capacity_kg)"],
  ["wood_fireproofing_preparation_waste_transport_v2", "trip", "ceil((preparation_area_m2*removed_material_rate_kg_m2+preparation_area_m2*abrasive_rate_kg_m2)/waste_transport_capacity_kg)"],
] as const);

export const WOOD_FIREPROOFING_SURFACE_PREPARATION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(FORMULA_SPECS.map(
  ([formulaId, unitId, parameterId]) => formula(formulaId, unitId, parameterId),
));

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({
  kind: "equals",
  parameterId,
  value,
});

const ROW_SPECS = Object.freeze([
  ["f09:wood_fireproofing_prepared_area", "Объём работ", "construction_work", "Подготовка существующей огнезащищённой деревянной поверхности", false, literalTrue, ["existing_fireproof_system_designation", "subsequent_operation"]],
  ["f09:wood_fireproofing_preparation_labor", "Труд", "construction_work", "Труд по совместимой подготовке поверхности", false, literalTrue, ["preparation_method_reference"]],
  ["f09:wood_fireproofing_preparation_dust_extraction", "Оборудование", "equipment", "Пылеудаляющее оборудование подготовки", true, literalTrue, []],
  ["f09:wood_fireproofing_preparation_manual_tool", "Оборудование", "equipment", "Ручной механизированный инструмент подготовки", true, literalTrue, []],
  ["f09:wood_fireproofing_removed_loose_material", "Удаление", "service", "Сбор удалённых непрочных и несовместимых участков", false, literalTrue, []],
  ["f09:wood_fireproofing_preparation_abrasive", "Условные материалы", "material", "Совместимый абразивный материал подготовки", true, equals("abrasive_mode", "REQUIRED"), ["abrasive_designation"]],
  ["f09:wood_fireproofing_preparation_masking", "Условные материалы", "material", "Укрывной материал для смежных поверхностей", true, equals("masking_mode", "REQUIRED"), ["masking_material_designation"]],
  ["f09:wood_fireproofing_surface_profile_measurements", "Контроль качества", "service", "Измерения или контрольные участки подготовленного профиля", false, literalTrue, []],
  ["f09:wood_fireproofing_preparation_readiness_protocol", "Документация", "service", "Протокол готовности поверхности к согласованной операции", false, literalTrue, []],
  ["f09:wood_fireproofing_preparation_waste_containers", "Материалы", "material", "Тара для удалённых материалов и расходников", true, literalTrue, ["waste_container_designation"]],
  ["f09:wood_fireproofing_preparation_waste_transport", "Перевозка", "service", "Перевозка отходов подготовки к утверждённому получателю", false, equals("waste_transport_mode", "TRANSPORT_REQUIRED"), []],
] as const);

export const WOOD_FIREPROOFING_SURFACE_PREPARATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(ROW_SPECS.map(
  ([rowId, section, category, titleRu, procurementEligible, inclusionAst,
    titleParameterIds], ordinal) => {
    const [formulaId, unitId] = FORMULA_SPECS[ordinal];
    const resourceGraph = {
      formulaId,
      normalizedUom: unitId,
      semanticOwnerId: `wood-fireproofing-surface-preparation:${rowId}`,
      costOwner: ordinal === 0 ? "scope" : "resource",
      costTreatment: ordinal === 0 ? "INFORMATIONAL_SCOPE" : "OWN_COST",
      payable: ordinal !== 0,
      noDoubleCount: true,
      ...(titleParameterIds.length > 0 ? {
        titleSpecificationParameterIds: [...titleParameterIds],
        titleSpecificationMode: "APPEND",
        titleSpecificationSeparator: " — ",
      } : {}),
      scopeContextParameterIds: [
        "preparation_area_m2",
        "existing_fireproof_system_designation",
        "surface_condition_statement",
        "subsequent_operation",
        "preparation_method_reference",
      ],
    };
    const sourceMetadata = {
      truth_contract_version: "R3",
      synthetic: false,
      sourceRole: ordinal === 0
        ? "CONFIRMED_FIREPROOFED_WOOD_PREPARATION_SCOPE"
        : "VISIBLE_EDITABLE_PRELIMINARY_PREPARATION_PROFILE",
      normativeTrace: [{
        sourceId: WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_ID,
        source_id: WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_ID,
        normId: WOOD_FIREPROOFING_SURFACE_PREPARATION_NORM_ID,
        norm_id: WOOD_FIREPROOFING_SURFACE_PREPARATION_NORM_ID,
        normVersion:
          WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_METADATA.source_document_version,
        source_title: WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_METADATA.source_title,
        exact_locator: WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_METADATA.exact_locator,
        source_definition_hash: WOOD_FIREPROOFING_SURFACE_PREPARATION_ARTIFACT_SHA256,
      }],
      quantityBasis: ordinal === 0
        ? "CONFIRMED_FIREPROOFED_WOOD_PREPARATION_AREA_INFORMATIONAL_SCOPE"
        : "AUTOMATIC_FROM_AREA_AND_VISIBLE_EDITABLE_PRELIMINARY_PROFILE",
      excludedUnownedAssumptions: [
        "claim that preliminary productivity or consumption is an official universal norm",
        "subsequent coating, repair, injection, sealing or strengthening",
        "classification suffix quantity factor",
        "invented price",
      ],
    };
    return {
      id: `resource-${rowId.replace(/:/gu, "-")}`,
      row_id: rowId,
      ordinal,
      section,
      category,
      title_ru: titleRu,
      unit_id: unitId,
      formula_id: formulaId,
      inclusion_ast: inclusionAst,
      resource_graph: resourceGraph,
      procurement_eligible: procurementEligible,
      cost_owner_id: rowId,
      source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({
        rowId, ordinal, section, category, titleRu, unitId, formulaId,
        procurementEligible, inclusionAst, resourceGraph, sourceMetadata,
      }),
    };
  },
));

export const WOOD_FIREPROOFING_SURFACE_PREPARATION_SHORT_INPUT = Object.freeze({
  preparation_area_m2: 100,
  existing_fireproof_system_designation:
    "Существующая огнезащитная система деревянной конструкции по ведомости",
  surface_condition_statement:
    "Локальные непрочные участки и неоднородный профиль по акту обследования",
  subsequent_operation: "LOCAL_REPAIR",
});

export const WOOD_FIREPROOFING_SURFACE_PREPARATION_ACCEPTANCE_INPUT = Object.freeze({
  ...WOOD_FIREPROOFING_SURFACE_PREPARATION_SHORT_INPUT,
  ...WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE,
});

export function resolveWoodFireproofingSurfacePreparationVariant(
  variantKey: string,
): (typeof WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANTS)[
  WoodFireproofingSurfacePreparationVariantKey
] {
  if (!Object.prototype.hasOwnProperty.call(
    WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANTS,
    variantKey,
  )) {
    throw new Error(`WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANTS[
    variantKey as WoodFireproofingSurfacePreparationVariantKey
  ];
}

export function woodFireproofingSurfacePreparationCompletenessMap(
  variantKey: WoodFireproofingSurfacePreparationVariantKey,
) {
  const variant = WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANTS[variantKey];
  return Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "PROJECT_SYSTEM",
    generatedFromCurrentRows: false,
    evidenceSha256: WOOD_FIREPROOFING_SURFACE_PREPARATION_ARTIFACT_SHA256,
    evidenceReferences: [
      WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_METADATA.official_url,
      "СП КР 54-101:2023, §§10.24–10.27, printed/PDF page 80",
      "approved condition statement, compatible preparation method, subsequent-operation requirements and waste plan",
    ],
    catalogVariant: `${variant.catalogVariant}_NO_HIDDEN_QUANTITY_FACTOR`,
    entries: ROW_SPECS.map(([rowId, , category, titleRu], ordinal) => ({
      operationId: rowId.replace("f09:", ""),
      expectedResourceId: `required-operation:${rowId.replace("f09:", "")}`,
      category,
      specification: titleRu,
      condition: ordinal === 5
        ? "abrasive_mode=REQUIRED"
        : ordinal === 6
          ? "masking_mode=REQUIRED"
          : ordinal === 10
            ? "waste_transport_mode=TRANSPORT_REQUIRED"
            : "wood_fireproofing_surface_preparation_selected",
      sourceId: WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_ID,
      unitId: FORMULA_SPECS[ordinal][1],
      quantityRule: ordinal === 0
        ? "CONFIRMED_FIREPROOFED_WOOD_PREPARATION_AREA_INFORMATIONAL_SCOPE"
        : "AUTOMATIC_FROM_AREA_AND_VISIBLE_EDITABLE_PRELIMINARY_PROFILE",
      detailPrinciple:
        "PREPARATION_ONLY_NO_SUBSEQUENT_COATING_REPAIR_INJECTION_SEALING_OR_STRENGTHENING",
      priceRelation: ordinal === 0 ? "INFORMATIONAL_SCOPE" : "OWN_COST_OR_HONESTLY_UNKNOWN",
      formulaId: FORMULA_SPECS[ordinal][0],
      resolution: { kind: "ROW", rowId },
    })),
  });
}

export async function compileWoodFireproofingSurfacePreparationVariantR1(
  variantKey: WoodFireproofingSurfacePreparationVariantKey,
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const variant = WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANTS[variantKey];
  const catalogId = options.catalogId ?? variant.catalogId;
  if (catalogId !== variant.catalogId) {
    throw new Error(`WOOD_FIREPROOFING_SURFACE_PREPARATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  const resolvedParameters = {
    ...WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE,
    ...submittedParameters,
  };
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion:
      `canonical-estimate-compiler.wood-fireproofing-surface-preparation-${variantKey}-r2`,
    catalogId,
    primaryMeasureParameterId: "preparation_area_m2",
    parameterDefinitions: [...WOOD_FIREPROOFING_SURFACE_PREPARATION_PARAMETERS],
    formulaDefinitions: [...WOOD_FIREPROOFING_SURFACE_PREPARATION_FORMULAS],
    resourceDefinitions: [...WOOD_FIREPROOFING_SURFACE_PREPARATION_RESOURCES],
    submittedParameters: resolvedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 16,
    hashJson: async (value) => JSON.stringify(value),
  });
}
