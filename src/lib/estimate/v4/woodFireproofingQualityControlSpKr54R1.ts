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

export const WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_CATALOG_ID =
  "canonical-work:base:special_repair_interior_fireproof_test_standard";
export const WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_ID =
  "official_sp_kr_54_101_2023_wood_fireproofing_quality_control_v1";
export const WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_NORM_ID =
  "norm:kg:sp_kr_54_101_2023:wood_fireproofing_quality_control:v1";
export const WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ARTIFACT_SHA256 =
  "e28932e7b9f8ed54b6cb2e222ed1e0981db94a885ea2a698e7c7c33ebea87a6c";

export const WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_METADATA = Object.freeze({
  source_title: "СП КР 54-101:2023 «Деревянные конструкции»",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
  source_document_version: "SP_KR_54_101_2023_EFFECTIVE_2024_01_10",
  definition_hash: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ARTIFACT_SHA256,
  exact_locator:
    "СП КР 54-101:2023, §§10.24–10.27, печатная страница 80 / PDF-страница 80 (индекс 79): сертификация и техническая документация, соблюдение технологии нанесения, проверка состояния огнезащищённой поверхности и качественная оценка обработки",
  use_restriction:
    "Источник устанавливает состав контроля качества огнезащитной обработки деревянных конструкций, но не задаёт универсальное число проверок, трудоёмкость, время оборудования, схему отбора проб или цену. Эти количества принимаются только из утверждённого плана контроля, технической документации применённого состава и требований объекта. Испытание устойчивости к старению для состава со сроком службы более года не превращается в полевую строку без отдельной утверждённой методики.",
  source_kind: "OFFICIAL_NORMATIVE_TECHNICAL_BOUNDARY",
  official_url: "https://minstroy.gov.kg/ru/document/54/show",
  artifact_url:
    "https://minstroy.gov.kg/index.php/ru/state_program/download-pdf/5tekstrusskderevo_1002-80865814f343a9461.64636209.pdf",
  artifact_sha256: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ARTIFACT_SHA256,
  effective_from: "2024-01-10",
});

const PARAMETER_SPECS = Object.freeze([
  ["controlled_wood_area_m2", "Площадь контролируемой огнезащиты деревянных конструкций", "decimal", "m2"],
  ["surface_condition_inspection_count", "Количество проверок состояния огнезащищённой поверхности", "integer", "test"],
  ["application_technology_check_count", "Количество проверок соблюдения технологии нанесения", "integer", "test"],
  ["qualitative_evaluation_count", "Количество качественных оценок огнезащитной обработки", "integer", "test"],
  ["quality_control_protocol_document_count", "Количество протоколов контроля качества", "integer", "document"],
] as const);

const KNOWN_SCOPE = new Set(["controlled_wood_area_m2"]);

export type WoodFireproofingQualityControlSpKr54Parameter =
CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string;
  title_ru: string;
  truth_metadata: Json;
};

export const WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_PARAMETERS:
readonly WoodFireproofingQualityControlSpKr54Parameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: { min: valueType === "integer" ? 1 : 0.000_001 },
    truth_metadata: {
      contract: "rik-expo-app.wood-fireproofing-quality-control-sp-kr54-r1",
      semantic_parameter_key: `wood-fireproofing-quality-control:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.has(parameterId)
        ? "USER_INPUT"
        : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.has(parameterId)
        ? "CONFIRMED_PROTECTED_WOOD_AREA"
        : "APPROVED_QUALITY_CONTROL_PLAN_OR_TECHNICAL_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.has(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.has(parameterId)
          ? "Укажите подтверждённую площадь деревянных конструкций с огнезащитной обработкой, подлежащую контролю."
          : `${titleRu}: укажите прямое количество по утверждённому плану контроля качества и технической документации применённого огнезащитного состава.`,
        source_role: KNOWN_SCOPE.has(parameterId)
          ? "APPROVED_FIREPROOFING_SCOPE_OR_CONFIRMED_MEASUREMENT"
          : "APPROVED_QUALITY_CONTROL_PLAN_AND_FIREPROOF_PRODUCT_TECHNICAL_DOCUMENTATION",
        source_document: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_ID,
        source_locator: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_METADATA.exact_locator,
        guide_version: "wood-fireproofing-quality-control-sp-kr54-r1",
        source_snapshot_hash: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ARTIFACT_SHA256,
        applicability:
          "Только контроль качества выполненной огнезащитной обработки деревянных конструкций. Нанесение или ремонт покрытия, испытание материала на старение и контроль металла, бетона, кабелей либо проходок исключены.",
        verified_at: "2026-09-24T00:00:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
);

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

export const WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("wood_fireproofing_controlled_area_v1", "m2", "controlled_wood_area_m2"),
  formula("wood_fireproofing_surface_inspection_count_v1", "test", "surface_condition_inspection_count"),
  formula("wood_fireproofing_technology_check_count_v1", "test", "application_technology_check_count"),
  formula("wood_fireproofing_qualitative_evaluation_count_v1", "test", "qualitative_evaluation_count"),
  formula("wood_fireproofing_quality_protocol_count_v1", "document", "quality_control_protocol_document_count"),
]);

type Operation = Readonly<{
  operationId: string;
  rowId: string;
  section: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  sourceRole: string;
  costTreatment: "OWN_COST" | "INFORMATIONAL_SCOPE";
}>;

const OPERATIONS: readonly Operation[] = Object.freeze([
  {
    operationId: "controlled_wood_area",
    rowId: "f09:wood_fireproofing_controlled_area",
    section: "Объём контроля",
    titleRu: "Контролируемая площадь огнезащитной обработки деревянных конструкций",
    unitId: "m2",
    formulaId: "wood_fireproofing_controlled_area_v1",
    sourceRole: "APPROVED_FIREPROOFING_SCOPE_OR_CONFIRMED_MEASUREMENT",
    costTreatment: "INFORMATIONAL_SCOPE",
  },
  {
    operationId: "surface_condition_inspection",
    rowId: "f09:wood_fireproofing_surface_condition_inspection",
    section: "Контроль качества",
    titleRu: "Проверка состояния огнезащищённой поверхности деревянных конструкций",
    unitId: "test",
    formulaId: "wood_fireproofing_surface_inspection_count_v1",
    sourceRole: "APPROVED_QUALITY_CONTROL_PLAN_SP_KR_54_101_2023_10_27",
    costTreatment: "OWN_COST",
  },
  {
    operationId: "application_technology_check",
    rowId: "f09:wood_fireproofing_application_technology_check",
    section: "Контроль качества",
    titleRu: "Проверка соблюдения технологии нанесения огнезащитного состава",
    unitId: "test",
    formulaId: "wood_fireproofing_technology_check_count_v1",
    sourceRole: "APPROVED_QUALITY_CONTROL_PLAN_AND_PRODUCT_TECHNICAL_DOCUMENTATION",
    costTreatment: "OWN_COST",
  },
  {
    operationId: "qualitative_evaluation",
    rowId: "f09:wood_fireproofing_qualitative_evaluation",
    section: "Контроль качества",
    titleRu: "Качественная оценка огнезащитной обработки деревянных конструкций",
    unitId: "test",
    formulaId: "wood_fireproofing_qualitative_evaluation_count_v1",
    sourceRole: "APPROVED_QUALITY_CONTROL_PLAN_AND_PRODUCT_TECHNICAL_DOCUMENTATION",
    costTreatment: "OWN_COST",
  },
  {
    operationId: "quality_control_protocol",
    rowId: "f09:wood_fireproofing_quality_control_protocol",
    section: "Документация",
    titleRu: "Протокол контроля качества огнезащитной обработки деревянных конструкций",
    unitId: "document",
    formulaId: "wood_fireproofing_quality_protocol_count_v1",
    sourceRole: "APPROVED_QUALITY_CONTROL_PLAN_AND_ACCEPTANCE_REQUIREMENTS",
    costTreatment: "OWN_COST",
  },
]);

function resource(operation: Operation, ordinal: number): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: operation.formulaId,
    normalizedUom: operation.unitId,
    semanticOwnerId: `wood-fireproofing-quality-control:${operation.operationId}`,
    costOwner: operation.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: operation.costTreatment,
    payable: operation.costTreatment === "OWN_COST",
    noDoubleCount: true,
    scopeContextParameterIds: ["controlled_wood_area_m2"],
    quantityBasis: operation.operationId === "controlled_wood_area"
      ? "CONFIRMED_PROTECTED_WOOD_AREA_INFORMATIONAL_SCOPE"
      : "DIRECT_APPROVED_QUALITY_CONTROL_PLAN_INPUT",
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: operation.sourceRole,
    normativeTrace: [{
      sourceId: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_ID,
      source_id: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_ID,
      normId: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_NORM_ID,
      norm_id: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_NORM_ID,
      normVersion:
        WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_METADATA.source_document_version,
      source_title: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_METADATA.source_title,
      exact_locator: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_METADATA.exact_locator,
      source_definition_hash: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ARTIFACT_SHA256,
      sourceRole: operation.sourceRole,
    }],
    quantityBasis: resourceGraph.quantityBasis,
    excludedUnownedAssumptions: [
      "universal sampling density or inspection count per square metre",
      "universal labor or equipment productivity",
      "field ageing-resistance test without an approved method",
      "application, repair or removal of fireproof coating",
      "metal, concrete, cable or penetration fireproofing control",
      "invented price",
    ],
  };
  return {
    id: `resource-${operation.rowId.replace(/:/gu, "-")}`,
    row_id: operation.rowId,
    ordinal,
    section: operation.section,
    category: operation.operationId === "quality_control_protocol"
      ? "service"
      : "construction_work",
    title_ru: operation.titleRu,
    unit_id: operation.unitId,
    formula_id: operation.formulaId,
    inclusion_ast: { kind: "literal", value: true },
    resource_graph: resourceGraph,
    procurement_eligible: operation.costTreatment === "OWN_COST",
    cost_owner_id: operation.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ operation, resourceGraph, sourceMetadata }),
  };
}

export const WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  OPERATIONS.map((operation, ordinal) => resource(operation, ordinal)),
);

export const WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_INDEPENDENT_COMPLETENESS_MAP =
Object.freeze({
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "PROJECT_SYSTEM",
  generatedFromCurrentRows: false,
  evidenceSha256: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ARTIFACT_SHA256,
  evidenceReferences: [
    WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_METADATA.official_url,
    "СП КР 54-101:2023, §§10.24–10.27, печатная страница 80",
    "approved fireproofing quality-control plan and product technical documentation",
  ],
  entries: OPERATIONS.map((operation) => ({
    operationId: operation.operationId,
    expectedResourceId: `required-operation:${operation.operationId}`,
    category: operation.operationId === "quality_control_protocol"
      ? "service"
      : "construction_work",
    specification: operation.titleRu,
    condition: "wood_fireproofing_quality_control_selected",
    sourceId: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_ID,
    unitId: operation.unitId,
    quantityRule: operation.operationId === "controlled_wood_area"
      ? "CONFIRMED_PROTECTED_WOOD_AREA_INFORMATIONAL_SCOPE"
      : "DIRECT_APPROVED_QUALITY_CONTROL_PLAN_INPUT",
    detailPrinciple: "OFFICIAL_CONTROL_SCOPE_WITHOUT_INVENTED_FREQUENCY_OR_PRODUCTIVITY",
    priceRelation: operation.costTreatment,
    formulaId: operation.formulaId,
    resolution: { kind: "ROW", rowId: operation.rowId },
  })),
});

export function validateWoodFireproofingQualityControlSpKr54Completeness(
  resources: readonly CanonicalEstimateResourceDefinition[] =
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES,
): true {
  const actual = new Set(resources.map((row) => row.row_id));
  const expected =
    WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_INDEPENDENT_COMPLETENESS_MAP.entries;
  if (actual.size !== expected.length) {
    throw new Error("WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_COMPLETENESS_COUNT_MISMATCH");
  }
  for (const entry of expected) {
    if (!actual.has(entry.resolution.rowId)) {
      throw new Error(
        `WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_COMPLETENESS_ROW_MISSING:${entry.resolution.rowId}`,
      );
    }
  }
  return true;
}

export const WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SHORT_INPUT = Object.freeze({
  controlled_wood_area_m2: 100,
});

export const WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ACCEPTANCE_INPUT = Object.freeze({
  ...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SHORT_INPUT,
  surface_condition_inspection_count: 5,
  application_technology_check_count: 3,
  qualitative_evaluation_count: 5,
  quality_control_protocol_document_count: 1,
});

export async function compileWoodFireproofingQualityControlSpKr54R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_CATALOG_ID;
  if (catalogId !== WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_CATALOG_ID) {
    throw new Error(`WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  validateWoodFireproofingQualityControlSpKr54Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.wood-fireproofing-quality-control-sp-kr54-r1",
    catalogId,
    primaryMeasureParameterId: "controlled_wood_area_m2",
    parameterDefinitions: [...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_PARAMETERS],
    formulaDefinitions: [...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_FORMULAS],
    resourceDefinitions: [...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
