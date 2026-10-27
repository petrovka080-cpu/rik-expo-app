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

export const WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_ID =
  "official_sp_kr_54_101_2023_fireproofed_wood_local_repair_project_inputs_v1";
export const WOOD_FIREPROOFING_LOCAL_REPAIR_NORM_ID =
  "norm:kg:sp_kr_54_101_2023:fireproofed_wood_local_repair_visible_profile:v1";
export const WOOD_FIREPROOFING_LOCAL_REPAIR_ARTIFACT_SHA256 =
  "e28932e7b9f8ed54b6cb2e222ed1e0981db94a885ea2a698e7c7c33ebea87a6c";

export const WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_METADATA = Object.freeze({
  source_title:
    "СП КР 54-101:2023 и утверждённая изготовителем технологическая карта локального ремонта существующей огнезащиты деревянных конструкций",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики; изготовитель существующей огнезащитной системы; ответственный инженер проекта",
  source_document_version:
    "SP_KR_54_101_2023_PLUS_APPROVED_COMPATIBLE_LOCAL_REPAIR_METHOD",
  definition_hash: WOOD_FIREPROOFING_LOCAL_REPAIR_ARTIFACT_SHA256,
  exact_locator:
    "СП КР 54-101:2023, §§10.24–10.27, печатная/PDF-страница 80: техническая документация, соблюдение технологии и проверка состояния огнезащищённой деревянной поверхности; утверждённые ведомость дефектов, совместимая ремонтная система, карта локального ремонта, контроль и план отходов",
  use_restriction:
    "Источник задаёт обязательную техническую границу, совместимость и контроль, но не универсальные нормы расхода ремонтного состава, грунта, армирования, труда, механизмов или отходов. Для первого расчёта показан редактируемый предварительный профиль; его значения не выдаются за официальные нормы и заменяются подтверждённой технологической картой до выполнения работ. Профиль включает только локальный ремонт существующей огнезащиты и не включает полное новое нанесение, инъектирование, герметизацию или усиление конструкции.",
  source_kind: "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_VISIBLE_EDITABLE_REPAIR_PROFILE",
  official_url: "https://minstroy.gov.kg/ru/document/54/show",
  artifact_url:
    "https://minstroy.gov.kg/index.php/ru/state_program/download-pdf/5tekstrusskderevo_1002-80865814f343a9461.64636209.pdf",
  artifact_sha256: WOOD_FIREPROOFING_LOCAL_REPAIR_ARTIFACT_SHA256,
  effective_from: "2024-01-10",
});

export const WOOD_FIREPROOFING_LOCAL_REPAIR_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: "canonical-work:base:special_repair_interior_fireproof_repair_standard",
    catalogVariant: "STANDARD_AREA_SEARCH_IDENTITY",
    canonicalNameRu: "Локальный ремонт существующей огнезащиты деревянных конструкций",
    aliasesRu: ["ремонт огнезащиты", "восстановление повреждённой огнезащиты древесины"],
  }),
});

export type WoodFireproofingLocalRepairVariantKey =
  keyof typeof WOOD_FIREPROOFING_LOCAL_REPAIR_VARIANTS;

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
  ["repair_area_m2", "Площадь локального ремонта существующей огнезащиты", "decimal", "m2", null, null, "KNOWN_SCOPE", "Введите подтверждённую площадь дефектных участков по ведомости или обмеру."],
  ["existing_fireproof_system_designation", "Обозначение существующей огнезащитной системы", "text", null, null, null, "KNOWN_SCOPE", "Укажите систему по исполнительной документации и маркировке."],
  ["defect_condition_statement", "Подтверждённое состояние и дефекты огнезащиты", "text", null, null, null, "KNOWN_SCOPE", "Кратко укажите отслоения, повреждения и границы ремонта по акту обследования."],
  ["repair_method_reference", "Технологическая карта совместимого локального ремонта", "text", null, null, "Предварительный совместимый метод локального восстановления по границам дефекта", "APPLICABILITY", "Заменить утверждённой изготовителем технологической картой до производства работ."],
  ["repair_compound_designation", "Совместимый ремонтный огнезащитный состав", "text", null, null, "Совместимый ремонтный состав существующей огнезащитной системы", "APPLICABILITY", "Уточнить марку по документации существующей системы и карте ремонта."],
  ["repair_compound_rate_kg_m2", "Расход ремонтного состава на 1 м²", "decimal", "kg_m2", null, 0.45, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,45 кг/м²; заменить подтверждённым расходом для толщины восстановления."],
  ["primer_mode", "Требуется совместимый грунт или связующий слой", "enum", null, ["NOT_REQUIRED", "REQUIRED"], "REQUIRED", "APPLICABILITY", "В предварительный полный состав включён совместимый грунт; можно отключить по утверждённой карте."],
  ["primer_designation", "Совместимый грунт или связующий состав", "text", null, null, "Совместимый грунт или связующий состав ремонтной системы", "APPLICABILITY", "Уточнить марку по карте ремонта."],
  ["primer_rate_l_m2", "Расход грунта или связующего состава на 1 м²", "decimal", "l_m2", null, 0.12, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,12 л/м²; заменить расходом изготовителя."],
  ["reinforcement_mode", "Требуется локальное армирование ремонтного слоя", "enum", null, ["NOT_REQUIRED", "REQUIRED"], "REQUIRED", "APPLICABILITY", "В предварительный полный состав включено локальное армирование; можно отключить по карте ремонта."],
  ["reinforcement_designation", "Совместимый армирующий материал", "text", null, null, "Совместимая армирующая сетка ремонтной огнезащитной системы", "APPLICABILITY", "Уточнить тип и крепление по карте ремонта."],
  ["reinforcement_area_factor", "Коэффициент площади армирования", "decimal", "ratio", null, 1.1, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 1,10 м² армирования на 1 м² ремонта с нахлёстом."],
  ["masking_area_factor", "Коэффициент укрытия смежных поверхностей", "decimal", "ratio", null, 1.2, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 1,20 м² укрытия на 1 м² ремонта."],
  ["labor_rate_man_hour_m2", "Трудоёмкость локального ремонта на 1 м²", "decimal", "man_hour_m2", null, 0.65, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,65 чел.-ч/м²; заменить подтверждённой производительностью."],
  ["mixing_rate_machine_hour_m2", "Работа смесительного оборудования на 1 м²", "decimal", "machine_hour_m2", null, 0.04, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,04 маш.-ч/м²."],
  ["application_tool_rate_machine_hour_m2", "Работа механизированного инструмента нанесения на 1 м²", "decimal", "machine_hour_m2", null, 0.08, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,08 маш.-ч/м²."],
  ["inspection_area_per_count_m2", "Площадь на одну контрольную точку ремонта", "decimal", "m2", null, 10, "PROFESSIONAL_ASSUMPTION", "Предварительно одна контрольная точка на каждые 10 м²."],
  ["control_sample_area_per_count_m2", "Площадь на один контрольный образец или участок", "decimal", "m2", null, 25, "PROFESSIONAL_ASSUMPTION", "Предварительно один контрольный образец или участок на каждые 25 м²."],
  ["repair_protocol_document_count", "Количество протоколов локального ремонта", "integer", "document", null, 1, "PROFESSIONAL_ASSUMPTION", "Предварительно один протокол на сметную операцию."],
  ["waste_mass_rate_kg_m2", "Масса отходов ремонта на 1 м²", "decimal", "kg_m2", null, 0.08, "PROFESSIONAL_ASSUMPTION", "Предварительно принято 0,08 кг/м² с учётом снятых кромок и расходников."],
  ["waste_container_capacity_kg", "Вместимость одной единицы тары отходов", "decimal", "kg", null, 5, "PROFESSIONAL_ASSUMPTION", "Предварительно 5 кг отходов на единицу герметичной тары."],
  ["waste_transport_mode", "Требуется отдельная перевозка отходов", "enum", null, ["HANDOVER_ON_SITE", "TRANSPORT_REQUIRED"], "TRANSPORT_REQUIRED", "APPLICABILITY", "В предварительный полный состав включён отдельный рейс; можно заменить передачей на площадке."],
  ["waste_transport_capacity_kg", "Расчётная вместимость одного рейса", "decimal", "kg", null, 500, "PROFESSIONAL_ASSUMPTION", "Предварительно 500 кг на рейс; заменить фактической схемой вывоза."],
]);

export type WoodFireproofingLocalRepairParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const WOOD_FIREPROOFING_LOCAL_REPAIR_PARAMETERS:
readonly WoodFireproofingLocalRepairParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
      contract: "rik-expo-app.wood-fireproofing-local-repair-variants-r1",
      semantic_parameter_key: `wood-fireproofing-local-repair:${parameterId}`,
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
        source_document: WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_ID,
        source_locator: WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_METADATA.exact_locator,
        guide_version: "wood-fireproofing-local-repair-r1",
        source_snapshot_hash: WOOD_FIREPROOFING_LOCAL_REPAIR_ARTIFACT_SHA256,
        applicability:
          "Только локальный ремонт существующей огнезащиты деревянной конструкции по подтверждённым дефектам и совместимой технологии.",
        verified_at: "2026-09-25T00:00:00+06:00",
        guide_validation_policy:
          "FIRST_ESTIMATE_NOW_SHOW_AND_ALLOW_REPLACEMENT_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: sourceClass === "KNOWN_SCOPE",
      synthetic: false,
    },
  }),
));

export const WOOD_FIREPROOFING_LOCAL_REPAIR_PRELIMINARY_PROFILE = Object.freeze(
  Object.fromEntries(PARAMETER_SPECS
    .filter(([, , , , , profileValue]) => profileValue !== null)
    .map(([parameterId, , , , , profileValue]) => [parameterId, profileValue])) as
    Record<string, InputValue>,
);

export const WOOD_FIREPROOFING_LOCAL_REPAIR_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(WOOD_FIREPROOFING_LOCAL_REPAIR_PRELIMINARY_PROFILE)
    .map((parameterId) => [parameterId, "ASSUMPTION"])),
) as Readonly<Record<string, "ASSUMPTION">>;

export const WOOD_FIREPROOFING_LOCAL_REPAIR_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(WOOD_FIREPROOFING_LOCAL_REPAIR_PRELIMINARY_PROFILE)
    .map((parameterId) => [
      parameterId,
      parameterId === "repair_method_reference" ? [WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_ID] : [],
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
  ["wood_fireproofing_local_repair_area_v1", "m2", "repair_area_m2"],
  ["wood_fireproofing_local_repair_labor_v1", "man_hour", "repair_area_m2*labor_rate_man_hour_m2"],
  ["wood_fireproofing_local_repair_compound_v1", "kg", "repair_area_m2*repair_compound_rate_kg_m2"],
  ["wood_fireproofing_local_repair_primer_v1", "l", "repair_area_m2*primer_rate_l_m2"],
  ["wood_fireproofing_local_repair_reinforcement_v1", "m2", "repair_area_m2*reinforcement_area_factor"],
  ["wood_fireproofing_local_repair_masking_v1", "m2", "repair_area_m2*masking_area_factor"],
  ["wood_fireproofing_local_repair_mixing_v1", "machine_hour", "repair_area_m2*mixing_rate_machine_hour_m2"],
  ["wood_fireproofing_local_repair_application_tool_v1", "machine_hour", "repair_area_m2*application_tool_rate_machine_hour_m2"],
  ["wood_fireproofing_local_repair_inspection_v1", "pcs", "ceil(repair_area_m2/inspection_area_per_count_m2)"],
  ["wood_fireproofing_local_repair_control_sample_v1", "pcs", "ceil(repair_area_m2/control_sample_area_per_count_m2)"],
  ["wood_fireproofing_local_repair_protocol_v1", "document", "repair_protocol_document_count"],
  ["wood_fireproofing_local_repair_waste_v1", "kg", "repair_area_m2*waste_mass_rate_kg_m2"],
  ["wood_fireproofing_local_repair_waste_container_v1", "pcs", "ceil(repair_area_m2*waste_mass_rate_kg_m2/waste_container_capacity_kg)"],
  ["wood_fireproofing_local_repair_waste_transport_v1", "trip", "ceil(repair_area_m2*waste_mass_rate_kg_m2/waste_transport_capacity_kg)"],
] as const);

export const WOOD_FIREPROOFING_LOCAL_REPAIR_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(FORMULA_SPECS.map(
  ([formulaId, unitId, expression]) => formula(formulaId, unitId, expression),
));

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

const ROW_SPECS = Object.freeze([
  ["f09:wood_fireproofing_local_repair_area", "Объём работ", "construction_work", "Локальный ремонт существующей огнезащиты деревянной конструкции", false, literalTrue, ["existing_fireproof_system_designation", "defect_condition_statement"]],
  ["f09:wood_fireproofing_local_repair_labor", "Труд", "construction_work", "Труд по локальному восстановлению огнезащитной системы", false, literalTrue, ["repair_method_reference"]],
  ["f09:wood_fireproofing_local_repair_compound", "Материалы", "material", "Совместимый ремонтный огнезащитный состав", true, literalTrue, ["repair_compound_designation"]],
  ["f09:wood_fireproofing_local_repair_primer", "Материалы", "material", "Совместимый грунт или связующий состав", true, equals("primer_mode", "REQUIRED"), ["primer_designation"]],
  ["f09:wood_fireproofing_local_repair_reinforcement", "Материалы", "material", "Совместимый армирующий материал локального ремонта", true, equals("reinforcement_mode", "REQUIRED"), ["reinforcement_designation"]],
  ["f09:wood_fireproofing_local_repair_masking", "Расходные материалы", "material", "Укрывной материал для защиты смежных поверхностей", true, literalTrue, []],
  ["f09:wood_fireproofing_local_repair_mixer", "Оборудование", "equipment", "Смесительное оборудование для ремонтного состава", true, literalTrue, []],
  ["f09:wood_fireproofing_local_repair_application_tool", "Оборудование", "equipment", "Механизированный инструмент нанесения ремонтного состава", true, literalTrue, []],
  ["f09:wood_fireproofing_local_repair_inspection", "Контроль качества", "service", "Контрольные точки границ, сплошности и толщины ремонта", false, literalTrue, []],
  ["f09:wood_fireproofing_local_repair_control_sample", "Контроль качества", "service", "Контрольный образец или участок совместимого ремонта", false, literalTrue, []],
  ["f09:wood_fireproofing_local_repair_protocol", "Документация", "service", "Протокол локального ремонта и приёмки огнезащиты", false, literalTrue, []],
  ["f09:wood_fireproofing_local_repair_waste", "Отходы", "service", "Сбор снятых кромок огнезащиты и использованных расходников", false, literalTrue, []],
  ["f09:wood_fireproofing_local_repair_waste_container", "Материалы", "material", "Герметичная маркированная тара для отходов ремонта", true, literalTrue, []],
  ["f09:wood_fireproofing_local_repair_waste_transport", "Перевозка", "service", "Перевозка отходов локального ремонта к утверждённому получателю", false, equals("waste_transport_mode", "TRANSPORT_REQUIRED"), []],
] as const);

export const WOOD_FIREPROOFING_LOCAL_REPAIR_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(ROW_SPECS.map(
  ([rowId, section, category, titleRu, procurementEligible, inclusionAst, titleParameterIds], ordinal) => {
    const [formulaId, unitId] = FORMULA_SPECS[ordinal];
    const resourceGraph = {
      formulaId,
      normalizedUom: unitId,
      semanticOwnerId: `wood-fireproofing-local-repair:${rowId}`,
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
        "repair_area_m2",
        "existing_fireproof_system_designation",
        "defect_condition_statement",
        "repair_method_reference",
      ],
    };
    const sourceMetadata = {
      truth_contract_version: "R3",
      synthetic: false,
      sourceRole: ordinal === 0
        ? "CONFIRMED_LOCAL_REPAIR_SCOPE"
        : "VISIBLE_EDITABLE_PRELIMINARY_LOCAL_REPAIR_PROFILE",
      normativeTrace: [{
        sourceId: WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_ID,
        source_id: WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_ID,
        normId: WOOD_FIREPROOFING_LOCAL_REPAIR_NORM_ID,
        norm_id: WOOD_FIREPROOFING_LOCAL_REPAIR_NORM_ID,
        normVersion: WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_METADATA.source_document_version,
        source_title: WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_METADATA.source_title,
        exact_locator: WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_METADATA.exact_locator,
        source_definition_hash: WOOD_FIREPROOFING_LOCAL_REPAIR_ARTIFACT_SHA256,
      }],
      quantityBasis: ordinal === 0
        ? "CONFIRMED_LOCAL_REPAIR_AREA_INFORMATIONAL_SCOPE"
        : "AUTOMATIC_FROM_AREA_AND_VISIBLE_EDITABLE_PRELIMINARY_PROFILE",
      excludedUnownedAssumptions: [
        "claim that preliminary productivity or consumption is an official universal norm",
        "new full-area fireproof coating outside confirmed repair limits",
        "injection, sealing or structural strengthening",
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

export const WOOD_FIREPROOFING_LOCAL_REPAIR_SHORT_INPUT = Object.freeze({
  repair_area_m2: 100,
  existing_fireproof_system_designation: "Существующая огнезащитная система деревянной конструкции по исполнительной документации",
  defect_condition_statement: "Локальные отслоения и повреждения в границах ведомости дефектов",
});

export const WOOD_FIREPROOFING_LOCAL_REPAIR_ACCEPTANCE_INPUT = Object.freeze({
  ...WOOD_FIREPROOFING_LOCAL_REPAIR_SHORT_INPUT,
  ...WOOD_FIREPROOFING_LOCAL_REPAIR_PRELIMINARY_PROFILE,
});

export function resolveWoodFireproofingLocalRepairVariant(variantKey: string) {
  if (!Object.prototype.hasOwnProperty.call(WOOD_FIREPROOFING_LOCAL_REPAIR_VARIANTS, variantKey)) {
    throw new Error(`WOOD_FIREPROOFING_LOCAL_REPAIR_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return WOOD_FIREPROOFING_LOCAL_REPAIR_VARIANTS[
    variantKey as WoodFireproofingLocalRepairVariantKey
  ];
}

export function woodFireproofingLocalRepairCompletenessMap(
  variantKey: WoodFireproofingLocalRepairVariantKey,
) {
  const variant = WOOD_FIREPROOFING_LOCAL_REPAIR_VARIANTS[variantKey];
  return Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "PROJECT_SYSTEM",
    generatedFromCurrentRows: false,
    evidenceSha256: WOOD_FIREPROOFING_LOCAL_REPAIR_ARTIFACT_SHA256,
    evidenceReferences: [
      WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_METADATA.official_url,
      "СП КР 54-101:2023, §§10.24–10.27, печатная/PDF-страница 80",
      "approved defect statement, compatible local-repair method, repair-system documentation, control and waste plan",
    ],
    catalogVariant: `${variant.catalogVariant}_NO_HIDDEN_QUANTITY_FACTOR`,
    entries: ROW_SPECS.map(([rowId, , category, titleRu], ordinal) => ({
      operationId: rowId.replace("f09:", ""),
      expectedResourceId: `required-operation:${rowId.replace("f09:", "")}`,
      category,
      specification: titleRu,
      condition: ordinal === 3 ? "primer_mode=REQUIRED"
        : ordinal === 4 ? "reinforcement_mode=REQUIRED"
          : ordinal === 13 ? "waste_transport_mode=TRANSPORT_REQUIRED"
            : "wood_fireproofing_local_repair_selected",
      sourceId: WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_ID,
      unitId: FORMULA_SPECS[ordinal][1],
      quantityRule: ordinal === 0
        ? "CONFIRMED_LOCAL_REPAIR_AREA_INFORMATIONAL_SCOPE"
        : "AUTOMATIC_FROM_AREA_AND_VISIBLE_EDITABLE_PRELIMINARY_PROFILE",
      detailPrinciple:
        "LOCAL_REPAIR_ONLY_NO_FULL_NEW_COATING_INJECTION_SEALING_OR_STRENGTHENING",
      priceRelation: ordinal === 0 ? "INFORMATIONAL_SCOPE" : "OWN_COST_OR_HONESTLY_UNKNOWN",
      formulaId: FORMULA_SPECS[ordinal][0],
      resolution: { kind: "ROW", rowId },
    })),
  });
}

export async function compileWoodFireproofingLocalRepairVariantR1(
  variantKey: WoodFireproofingLocalRepairVariantKey,
  parameters: Readonly<Record<string, InputValue>>,
): Promise<CanonicalEstimateCompileCoreResult> {
  const variant = resolveWoodFireproofingLocalRepairVariant(variantKey);
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: `canonical-estimate-compiler.wood-fireproofing-local-repair-${variantKey}-r1`,
    catalogId: variant.catalogId,
    primaryMeasureParameterId: "repair_area_m2",
    parameterDefinitions: [...WOOD_FIREPROOFING_LOCAL_REPAIR_PARAMETERS],
    formulaDefinitions: [...WOOD_FIREPROOFING_LOCAL_REPAIR_FORMULAS],
    resourceDefinitions: [...WOOD_FIREPROOFING_LOCAL_REPAIR_RESOURCES],
    submittedParameters: {
      ...WOOD_FIREPROOFING_LOCAL_REPAIR_PRELIMINARY_PROFILE,
      ...parameters,
    },
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 20,
    hashJson: async (value) => JSON.stringify(value),
  });
}
