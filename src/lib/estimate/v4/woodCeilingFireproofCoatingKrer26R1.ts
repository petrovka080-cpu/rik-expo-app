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
type CostTreatment = "OWN_COST" | "INCLUDED_IN_RESOURCE_ROWS" | "INFORMATIONAL_SCOPE";

export const WOOD_CEILING_FIREPROOF_COATING_KRER26_CATALOG_ID =
  "canonical-work:base:special_repair_interior_fireproof_protect_standard";
export const WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_ID =
  "kg_order_52_npa_krer_26_02_015_02_2022_v1";
export const WOOD_CEILING_FIREPROOF_COATING_KRER26_NORM_ID =
  "KRER-26-02-015-02-WOOD-CEILING-FIREPROOF-COATING-R1";
export const WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256 =
  "d99c0a9a8aab76cffa70b34cbc76de2dc6c0694dbd9ecbaba3a9a379c8e018c9";

export const WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_METADATA = Object.freeze({
  source_title:
    "Приказ Госстроя Кыргызской Республики от 28 апреля 2022 года №52-нпа, приложение 20, КРЕР 26-02-015-02",
  source_authority:
    "Государственное агентство архитектуры, строительства и жилищно-коммунального хозяйства при Кабинете Министров Кыргызской Республики",
  source_document_version: "ORDER_52_NPA_2022_KRER_26_AMENDMENT",
  definition_hash: WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256,
  exact_locator:
    "Приложение 20, раздел 2 «Огнезащита», подраздел 2.2, таблица КРЕР 26-02-015, расценка Е26-02-015-02 «Огнезащитное покрытие деревянных конструкций краской: потолков», печатная/PDF страница 209, измеритель 100 м²",
  use_restriction:
    "Только огнезащитное покрытие деревянных потолков краской «Эврика» с подготовкой поверхности и замером толщины слоя. Не применять к металлу, бетону, стенам, кабелям, проходкам, ремонту существующего покрытия, инъектированию, герметизации или усилению.",
  source_kind: "OFFICIAL_KG_UNIT_RATE_AMENDMENT",
  official_url:
    "https://minstroy.gov.kg/index.php/kg/state_program/download-pdf/prikazot28aprela2022godano52npa_compressed-25868e3850a3ecfb9.81892156.pdf",
  artifact_sha256: WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256,
  effective_from: "2022-04-28",
});

export type WoodCeilingFireproofCoatingKrer26Parameter =
CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const WOOD_CEILING_FIREPROOF_COATING_KRER26_PARAMETERS:
readonly WoodCeilingFireproofCoatingKrer26Parameter[] = Object.freeze([{
  parameter_id: "wood_ceiling_area_m2",
  ordinal: 0,
  value_type: "decimal",
  unit_id: "m2",
  title_ru: "Площадь деревянного потолка под огнезащитную краску «Эврика»",
  required: true,
  default_value: null,
  constraints_json: { min: 0.000_001 },
  truth_metadata: {
    contract: "rik-expo-app.wood-ceiling-fireproof-coating-krer26-r1",
    semantic_parameter_key: "wood-ceiling-fireproof-coating:area-m2",
    visibility_role: "USER_INPUT",
    value_source_role: "USER_INPUT",
    input_origin_class: "APPROVED_FIREPROOFING_SCHEDULE_OR_CONFIRMED_MEASUREMENT",
    preliminary_compilation_allowed: false,
    source_confirmation_required: true,
    guide: {
      guide_kind: "MEASUREMENT_RULE",
      guide_short_ru:
        "Укажите фактическую площадь деревянных потолков, для которых проектом назначена краска «Эврика» по Е26-02-015-02.",
      source_role: "APPROVED_FIREPROOFING_SCHEDULE_OR_CONFIRMED_MEASUREMENT",
      source_document: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_ID,
      source_locator: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_METADATA.exact_locator,
      guide_version: "order-52-npa-krer-26-02-015-02-r1",
      source_snapshot_hash: WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256,
      applicability:
        "Только деревянный потолок и точная система с краской «Эврика»; совместимость и требуемая огнезащитная эффективность подтверждаются проектом и документами на систему.",
      verified_at: "2026-09-24T00:00:00+06:00",
      guide_validation_policy: "REJECT_MISSING_OR_INVALID_CONFIRMED_AREA",
    },
    hidden_default_forbidden: true,
    synthetic: false,
  },
}]);

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

export const WOOD_CEILING_FIREPROOF_COATING_KRER26_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("wood_ceiling_fireproof_area_v1", "m2", "wood_ceiling_area_m2"),
  formula("wood_ceiling_fireproof_labor_v1", "man_hour", "wood_ceiling_area_m2*0.0373"),
  formula("wood_ceiling_fireproof_machinist_labor_v1", "man_hour", "wood_ceiling_area_m2*0.0001"),
  formula("wood_ceiling_fireproof_forklift_v1", "machine_hour", "wood_ceiling_area_m2*0.00002"),
  formula("wood_ceiling_fireproof_lift_v1", "machine_hour", "wood_ceiling_area_m2*0.00004"),
  formula("wood_ceiling_fireproof_airless_unit_v1", "machine_hour", "wood_ceiling_area_m2*0.018"),
  formula("wood_ceiling_fireproof_paint_v1", "t", "wood_ceiling_area_m2*0.000412"),
]);

type Operation = Readonly<{
  operationId: string;
  rowId: string;
  section: string;
  category: "material" | "equipment" | "construction_work";
  titleRu: string;
  unitId: string;
  formulaId: string;
  costTreatment: CostTreatment;
  procurementEligible?: boolean;
  parentRowId?: string;
  krerResourceCode: string;
  normativeRatePer100M2: number;
  quantityRule: string;
}>;

const LABOR_ROW_ID = "f09:wood_ceiling_fireproof_coating_labor";

const OPERATIONS: readonly Operation[] = Object.freeze([
  {
    operationId: "wood_ceiling_fireproof_coating",
    rowId: "f09:wood_ceiling_fireproof_coating_operation",
    section: "Состав работ",
    category: "construction_work",
    titleRu: "Подготовка и огнезащитная окраска деревянного потолка с замером толщины",
    unitId: "m2",
    formulaId: "wood_ceiling_fireproof_area_v1",
    costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
    parentRowId: LABOR_ROW_ID,
    krerResourceCode: "Е26-02-015-02",
    normativeRatePer100M2: 100,
    quantityRule: "CONFIRMED_AREA",
  },
  {
    operationId: "construction_labor",
    rowId: LABOR_ROW_ID,
    section: "Труд",
    category: "construction_work",
    titleRu: "Труд рабочих по огнезащитной окраске, средний разряд 4,5",
    unitId: "man_hour",
    formulaId: "wood_ceiling_fireproof_labor_v1",
    costTreatment: "OWN_COST",
    krerResourceCode: "KRER_CONSTRUCTION_LABOR",
    normativeRatePer100M2: 3.73,
    quantityRule: "AREA_MULTIPLIED_BY_KRER_RATE_PER_100_M2",
  },
  {
    operationId: "machinist_labor_aggregate",
    rowId: "f09:wood_ceiling_fireproof_machinist_labor_aggregate",
    section: "Справочный состав машин",
    category: "construction_work",
    titleRu: "Затраты труда машинистов по расценке",
    unitId: "man_hour",
    formulaId: "wood_ceiling_fireproof_machinist_labor_v1",
    costTreatment: "INFORMATIONAL_SCOPE",
    krerResourceCode: "KRER_AGGREGATE_MACHINIST_LABOR",
    normativeRatePer100M2: 0.01,
    quantityRule: "AREA_MULTIPLIED_BY_KRER_RATE_PER_100_M2_NO_SEPARATE_COST",
  },
  {
    operationId: "forklift_1t",
    rowId: "f09:wood_ceiling_fireproof_forklift_1t",
    section: "Машины и механизмы",
    category: "equipment",
    titleRu: "Автопогрузчик с вилочным подхватом, 1 т",
    unitId: "machine_hour",
    formulaId: "wood_ceiling_fireproof_forklift_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "Х03-0021",
    normativeRatePer100M2: 0.002,
    quantityRule: "AREA_MULTIPLIED_BY_KRER_RATE_PER_100_M2",
  },
  {
    operationId: "mast_lift_500kg",
    rowId: "f09:wood_ceiling_fireproof_mast_lift_500kg",
    section: "Машины и механизмы",
    category: "equipment",
    titleRu: "Одномачтовый подъёмник до 500 кг, высота подъёма 15 м",
    unitId: "machine_hour",
    formulaId: "wood_ceiling_fireproof_lift_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "Х03-0324",
    normativeRatePer100M2: 0.004,
    quantityRule: "AREA_MULTIPLIED_BY_KRER_RATE_PER_100_M2",
  },
  {
    operationId: "airless_painting_unit_1kw",
    rowId: "f09:wood_ceiling_fireproof_airless_unit_1kw",
    section: "Машины и механизмы",
    category: "equipment",
    titleRu: "Окрасочный агрегат высокого давления, 1 кВт",
    unitId: "machine_hour",
    formulaId: "wood_ceiling_fireproof_airless_unit_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "Х34-0002",
    normativeRatePer100M2: 1.8,
    quantityRule: "AREA_MULTIPLIED_BY_KRER_RATE_PER_100_M2",
  },
  {
    operationId: "fireproof_paint_evrika",
    rowId: "f09:wood_ceiling_fireproof_paint_evrika",
    section: "Материалы",
    category: "material",
    titleRu: "Краска огнезащитная «Эврика»",
    unitId: "t",
    formulaId: "wood_ceiling_fireproof_paint_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "с01-3809-0010*",
    normativeRatePer100M2: 0.0412,
    quantityRule: "AREA_MULTIPLIED_BY_KRER_RATE_PER_100_M2",
  },
]);

function resource(operation: Operation, ordinal: number): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: operation.formulaId,
    normalizedUom: operation.unitId,
    semanticOwnerId: `wood-ceiling-fireproof-coating:${operation.operationId}`,
    costOwner: operation.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: operation.costTreatment,
    payable: operation.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "wood_ceiling_area_m2",
    quantityBasis: operation.quantityRule,
    ...(operation.parentRowId ? { parentCostOwnerId: operation.parentRowId } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "OFFICIAL_KG_RESOURCE_NORM_AMENDMENT",
    normativeRatePer100M2: operation.normativeRatePer100M2,
    krerResourceCode: operation.krerResourceCode,
    normativeTrace: [{
      sourceId: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_ID,
      source_id: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_ID,
      normId: WOOD_CEILING_FIREPROOF_COATING_KRER26_NORM_ID,
      norm_id: WOOD_CEILING_FIREPROOF_COATING_KRER26_NORM_ID,
      normVersion: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_METADATA.source_document_version,
      source_title: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_METADATA.source_title,
      exact_locator: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_METADATA.exact_locator,
      source_definition_hash: WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256,
    }],
    excludedAdjacentScope: [
      "steel, concrete, reinforced-concrete, wall or cable fireproofing",
      "firestop penetration sealing",
      "repair or removal of an existing coating",
      "injection, structural strengthening or separate topcoat",
      "scaffolding not present in the exact rate",
      "invented fire-rating performance or market price",
    ],
  };
  return {
    id: `resource-${operation.rowId.replace(/:/gu, "-")}`,
    row_id: operation.rowId,
    ordinal,
    section: operation.section,
    category: operation.category,
    title_ru: operation.titleRu,
    unit_id: operation.unitId,
    formula_id: operation.formulaId,
    inclusion_ast: { kind: "literal", value: true },
    resource_graph: resourceGraph,
    procurement_eligible: operation.procurementEligible ?? false,
    cost_owner_id: operation.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ operation, resourceGraph, sourceMetadata }),
  };
}

export const WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  OPERATIONS.map((operation, ordinal) => resource(operation, ordinal)),
);

const INDEPENDENT_REQUIRED_COMPONENTS = Object.freeze([
  { operationId: "wood_ceiling_fireproof_coating", rowId: "f09:wood_ceiling_fireproof_coating_operation", category: "construction_work", specification: "Подготовка, нанесение краски на деревянный потолок и замер толщины", unitId: "m2", formulaId: "wood_ceiling_fireproof_area_v1", priceRelation: "INCLUDED_IN_PARENT" },
  { operationId: "construction_labor", rowId: "f09:wood_ceiling_fireproof_coating_labor", category: "construction_work", specification: "Рабочие среднего разряда 4,5", unitId: "man_hour", formulaId: "wood_ceiling_fireproof_labor_v1", priceRelation: "OWN_COST" },
  { operationId: "machinist_labor_aggregate", rowId: "f09:wood_ceiling_fireproof_machinist_labor_aggregate", category: "construction_work", specification: "Справочная сумма труда машинистов без повторной оплаты", unitId: "man_hour", formulaId: "wood_ceiling_fireproof_machinist_labor_v1", priceRelation: "INFORMATIONAL_SCOPE" },
  { operationId: "forklift_1t", rowId: "f09:wood_ceiling_fireproof_forklift_1t", category: "equipment", specification: "Автопогрузчик 1 т", unitId: "machine_hour", formulaId: "wood_ceiling_fireproof_forklift_v1", priceRelation: "OWN_COST" },
  { operationId: "mast_lift_500kg", rowId: "f09:wood_ceiling_fireproof_mast_lift_500kg", category: "equipment", specification: "Одномачтовый подъёмник до 500 кг, 15 м", unitId: "machine_hour", formulaId: "wood_ceiling_fireproof_lift_v1", priceRelation: "OWN_COST" },
  { operationId: "airless_painting_unit_1kw", rowId: "f09:wood_ceiling_fireproof_airless_unit_1kw", category: "equipment", specification: "Окрасочный агрегат высокого давления 1 кВт", unitId: "machine_hour", formulaId: "wood_ceiling_fireproof_airless_unit_v1", priceRelation: "OWN_COST" },
  { operationId: "fireproof_paint_evrika", rowId: "f09:wood_ceiling_fireproof_paint_evrika", category: "material", specification: "Огнезащитная краска «Эврика»", unitId: "t", formulaId: "wood_ceiling_fireproof_paint_v1", priceRelation: "OWN_COST" },
]);

export const WOOD_CEILING_FIREPROOF_COATING_KRER26_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "NORMATIVE_OPERATION_MAP",
  rateTable: "KRER_26_02_015_02",
  generatedFromCurrentRows: false,
  evidenceSha256: WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256,
  evidenceReferences: [
    WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_METADATA.official_url,
    "Приказ №52-нпа, приложение 20, печатная/PDF страница 209",
  ],
  entries: INDEPENDENT_REQUIRED_COMPONENTS.map((component) => ({
    operationId: component.operationId,
    expectedResourceId: `required-operation:${component.operationId}`,
    category: component.category,
    specification: component.specification,
    condition: "selected_exact_krer_rate_e26_02_015_02",
    sourceId: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_ID,
    unitId: component.unitId,
    quantityRule: "CONFIRMED_AREA_MULTIPLIED_BY_EXACT_KRER_RATE_PER_100_M2",
    detailPrinciple: "EXACT_OFFICIAL_UNIT_RATE_WITHOUT_CROSS_SUBSTRATE_SCOPE",
    priceRelation: component.priceRelation,
    formulaId: component.formulaId,
    resolution: {
      kind: component.priceRelation === "INCLUDED_IN_PARENT" ? "INCLUDED_COMPONENT_ROW" : "ROW",
      rowId: component.rowId,
      ...(component.priceRelation === "INCLUDED_IN_PARENT"
        ? { parentRowId: LABOR_ROW_ID }
        : {}),
    },
  })),
});

export function validateWoodCeilingFireproofCoatingKrer26Completeness(
  resources: readonly CanonicalEstimateResourceDefinition[] =
  WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES,
): true {
  const actual = new Set(resources.map((row) => row.row_id));
  const expected = WOOD_CEILING_FIREPROOF_COATING_KRER26_INDEPENDENT_COMPLETENESS_MAP.entries;
  if (actual.size !== expected.length) {
    throw new Error("WOOD_CEILING_FIREPROOF_COATING_KRER26_COMPLETENESS_COUNT_MISMATCH");
  }
  for (const entry of expected) {
    if (!actual.has(entry.resolution.rowId)) {
      throw new Error(
        `WOOD_CEILING_FIREPROOF_COATING_KRER26_COMPLETENESS_ROW_MISSING:${entry.resolution.rowId}`,
      );
    }
  }
  return true;
}

export const WOOD_CEILING_FIREPROOF_COATING_KRER26_SHORT_INPUT = Object.freeze({
  wood_ceiling_area_m2: 10,
});

export const WOOD_CEILING_FIREPROOF_COATING_KRER26_ACCEPTANCE_INPUT = Object.freeze({
  wood_ceiling_area_m2: 100,
});

export async function compileWoodCeilingFireproofCoatingKrer26R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? WOOD_CEILING_FIREPROOF_COATING_KRER26_CATALOG_ID;
  if (catalogId !== WOOD_CEILING_FIREPROOF_COATING_KRER26_CATALOG_ID) {
    throw new Error(`WOOD_CEILING_FIREPROOF_COATING_KRER26_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  validateWoodCeilingFireproofCoatingKrer26Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.wood-ceiling-fireproof-coating-krer26-r1",
    catalogId,
    primaryMeasureParameterId: "wood_ceiling_area_m2",
    parameterDefinitions: [...WOOD_CEILING_FIREPROOF_COATING_KRER26_PARAMETERS],
    formulaDefinitions: [...WOOD_CEILING_FIREPROOF_COATING_KRER26_FORMULAS],
    resourceDefinitions: [...WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
