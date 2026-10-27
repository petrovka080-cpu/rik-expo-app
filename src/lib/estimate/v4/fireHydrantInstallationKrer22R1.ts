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

export const FIRE_HYDRANT_INSTALLATION_KRER22_CATALOG_ID =
  "canonical-work:expanded:fire_hydrants";
export const FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_ID =
  "kg_krer_22_03_011_03_2015_fire_hydrant_installation_v1";
export const FIRE_HYDRANT_INSTALLATION_KRER22_NORM_ID =
  "KRER-22-03-011-03-FIRE-HYDRANT-R1";
export const FIRE_HYDRANT_INSTALLATION_KRER22_ARTIFACT_SHA256 =
  "84bd0f140b1d5a95968654757d58516bc7ec479ddae8b7aac77a354c75a5dbd9";

export const FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_METADATA = Object.freeze({
  source_title:
    "КРЕР 22 «Водопровод — наружные сети», таблица 22-03-011, расценка 22-03-011-03",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
  source_document_version: "KRER_22_2015",
  definition_hash: FIRE_HYDRANT_INSTALLATION_KRER22_ARTIFACT_SHA256,
  exact_locator:
    "КРЕР 22, раздел 3.3, таблица 22-03-011 «Установка вантузов, гидрантов, колонок», колонка 22-03-011-03 «Установка гидрантов пожарных», печатные/PDF страницы 109–110",
  use_restriction:
    "Только установка одного подземного пожарного гидранта DN125, 1,0 МПа, высотой 500–2500 мм. Трубопровод, колодец, земляные работы, обратная засыпка, дорожное восстановление, испытания сети, пожарная колонка и обозначение гидранта этой расценкой не нормируются.",
  source_kind: "OFFICIAL_KG_UNIT_RATE",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/438/show",
  artifact_sha256: FIRE_HYDRANT_INSTALLATION_KRER22_ARTIFACT_SHA256,
  effective_from: "2015-01-01",
});

export type FireHydrantInstallationKrer22Parameter =
CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const FIRE_HYDRANT_INSTALLATION_KRER22_PARAMETERS:
readonly FireHydrantInstallationKrer22Parameter[] = Object.freeze([{
  parameter_id: "hydrant_count",
  ordinal: 0,
  value_type: "integer",
  unit_id: "pcs",
  title_ru: "Количество устанавливаемых подземных пожарных гидрантов DN125",
  required: true,
  default_value: null,
  constraints_json: { min: 1 },
  truth_metadata: {
    contract: "rik-expo-app.fire-hydrant-installation-krer22-r1",
    semantic_parameter_key: "fire-hydrant-installation:hydrant-count",
    visibility_role: "USER_INPUT",
    value_source_role: "USER_INPUT",
    input_origin_class: "APPROVED_EXTERNAL_WATER_NETWORK_PROJECT_OR_CONFIRMED_SCOPE",
    preliminary_compilation_allowed: false,
    source_confirmation_required: true,
    guide: {
      guide_kind: "MEASUREMENT_RULE",
      guide_short_ru:
        "Укажите число подземных пожарных гидрантов DN125, 1,0 МПа, высотой 500–2500 мм по проекту наружной сети.",
      source_role: "APPROVED_EXTERNAL_WATER_NETWORK_PROJECT_OR_CONFIRMED_SCOPE",
      source_document: FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_ID,
      source_locator: FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_METADATA.exact_locator,
      guide_version: "krer-22-03-011-03-fire-hydrant-r1",
      source_snapshot_hash: FIRE_HYDRANT_INSTALLATION_KRER22_ARTIFACT_SHA256,
      applicability:
        "Только для точной позиции подземного пожарного гидранта DN125 из КРЕР 22-03-011-03.",
      verified_at: "2026-09-24T00:00:00+06:00",
      guide_validation_policy: "REJECT_MISSING_OR_INVALID_CONFIRMED_COUNT",
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

export const FIRE_HYDRANT_INSTALLATION_KRER22_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("fire_hydrant_count_v1", "pcs", "hydrant_count"),
  formula("fire_hydrant_labor_v1", "man_hour", "hydrant_count*1.98"),
  formula("fire_hydrant_machinist_labor_v1", "man_hour", "hydrant_count*0.02"),
  formula("fire_hydrant_crane_10t_v1", "machine_hour", "hydrant_count*0.02"),
  formula("fire_hydrant_onboard_truck_5t_v1", "machine_hour", "hydrant_count*0.03"),
  formula("fire_hydrant_bolts_d16_v1", "t", "hydrant_count*0.0038"),
  formula("fire_hydrant_rubber_gasket_v1", "kg", "hydrant_count*0.06"),
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
  normativeRatePerHydrant: number;
  quantityRule: string;
}>;

const LABOR_ROW_ID = "f09:fire_hydrant_installation_labor";

const OPERATIONS: readonly Operation[] = Object.freeze([
  {
    operationId: "install_fire_hydrant",
    rowId: "f09:fire_hydrant_installation_operation",
    section: "Состав работ",
    category: "construction_work",
    titleRu: "Монтаж подземного пожарного гидранта DN125",
    unitId: "pcs",
    formulaId: "fire_hydrant_count_v1",
    costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
    parentRowId: LABOR_ROW_ID,
    krerResourceCode: "22-03-011-03",
    normativeRatePerHydrant: 1,
    quantityRule: "ONE_INSTALLATION_OPERATION_PER_HYDRANT",
  },
  {
    operationId: "construction_labor",
    rowId: LABOR_ROW_ID,
    section: "Труд",
    category: "construction_work",
    titleRu: "Труд рабочих-строителей, средний разряд 3,0",
    unitId: "man_hour",
    formulaId: "fire_hydrant_labor_v1",
    costTreatment: "OWN_COST",
    krerResourceCode: "000-1003-4",
    normativeRatePerHydrant: 1.98,
    quantityRule: "HYDRANT_COUNT_MULTIPLIED_BY_KRER_RATE",
  },
  {
    operationId: "machinist_labor_aggregate",
    rowId: "f09:fire_hydrant_machinist_labor_aggregate",
    section: "Справочный состав машин",
    category: "construction_work",
    titleRu: "Затраты труда машинистов по расценке",
    unitId: "man_hour",
    formulaId: "fire_hydrant_machinist_labor_v1",
    costTreatment: "INFORMATIONAL_SCOPE",
    krerResourceCode: "KRER_AGGREGATE_MACHINIST_LABOR",
    normativeRatePerHydrant: 0.02,
    quantityRule: "HYDRANT_COUNT_MULTIPLIED_BY_KRER_RATE_NO_SEPARATE_COST",
  },
  {
    operationId: "truck_crane_10t",
    rowId: "f09:fire_hydrant_truck_crane_10t",
    section: "Машины и механизмы",
    category: "equipment",
    titleRu: "Кран на автомобильном ходу при работе на других видах строительства, 10 т",
    unitId: "machine_hour",
    formulaId: "fire_hydrant_crane_10t_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "02-0005",
    normativeRatePerHydrant: 0.02,
    quantityRule: "HYDRANT_COUNT_MULTIPLIED_BY_KRER_RATE",
  },
  {
    operationId: "onboard_truck_5t",
    rowId: "f09:fire_hydrant_onboard_truck_5t",
    section: "Машины и механизмы",
    category: "equipment",
    titleRu: "Автомобиль бортовой грузоподъёмностью до 5 т",
    unitId: "machine_hour",
    formulaId: "fire_hydrant_onboard_truck_5t_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "40-0001",
    normativeRatePerHydrant: 0.03,
    quantityRule: "HYDRANT_COUNT_MULTIPLIED_BY_KRER_RATE",
  },
  {
    operationId: "bolts_d16",
    rowId: "f09:fire_hydrant_bolts_d16",
    section: "Материалы",
    category: "material",
    titleRu: "Болты с гайками и шайбами для санитарно-технических работ, диаметр 16 мм",
    unitId: "t",
    formulaId: "fire_hydrant_bolts_d16_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "01-0407-0004",
    normativeRatePerHydrant: 0.0038,
    quantityRule: "HYDRANT_COUNT_MULTIPLIED_BY_KRER_RATE",
  },
  {
    operationId: "pressed_rubber_gasket",
    rowId: "f09:fire_hydrant_pressed_rubber_gasket",
    section: "Материалы",
    category: "material",
    titleRu: "Прокладка резиновая из прессованной технической пластины",
    unitId: "kg",
    formulaId: "fire_hydrant_rubber_gasket_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "01-2601-0020",
    normativeRatePerHydrant: 0.06,
    quantityRule: "HYDRANT_COUNT_MULTIPLIED_BY_KRER_RATE",
  },
  {
    operationId: "underground_fire_hydrant_product",
    rowId: "f09:fire_hydrant_dn125_product",
    section: "Оборудование",
    category: "material",
    titleRu: "Пожарный гидрант подземный DN125, 1,0 МПа, высота 500–2500 мм",
    unitId: "pcs",
    formulaId: "fire_hydrant_count_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "23-0802-0001",
    normativeRatePerHydrant: 1,
    quantityRule: "ONE_PRODUCT_PER_HYDRANT",
  },
]);

function resource(operation: Operation, ordinal: number): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: operation.formulaId,
    normalizedUom: operation.unitId,
    semanticOwnerId: `fire-hydrant-installation:${operation.operationId}`,
    costOwner: operation.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: operation.costTreatment,
    payable: operation.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "hydrant_count",
    quantityBasis: operation.quantityRule,
    ...(operation.parentRowId ? { parentCostOwnerId: operation.parentRowId } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "OFFICIAL_KG_RESOURCE_NORM",
    normativeRatePerHydrant: operation.normativeRatePerHydrant,
    krerResourceCode: operation.krerResourceCode,
    normativeTrace: [{
      sourceId: FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_ID,
      source_id: FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_ID,
      normId: FIRE_HYDRANT_INSTALLATION_KRER22_NORM_ID,
      norm_id: FIRE_HYDRANT_INSTALLATION_KRER22_NORM_ID,
      normVersion: FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_METADATA.source_document_version,
      source_title: FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_METADATA.source_title,
      exact_locator: FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_METADATA.exact_locator,
      source_definition_hash: FIRE_HYDRANT_INSTALLATION_KRER22_ARTIFACT_SHA256,
    }],
    excludedAdjacentScope: [
      "external pipeline and fittings outside the hydrant rate",
      "well or chamber construction",
      "excavation, backfill and road restoration",
      "network pressure testing and flushing",
      "fire column, hydrant sign and location marker",
      "internal fire-hose cabinet or sprinkler system",
      "invented market price",
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

export const FIRE_HYDRANT_INSTALLATION_KRER22_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  OPERATIONS.map((operation, ordinal) => resource(operation, ordinal)),
);

const INDEPENDENT_REQUIRED_COMPONENTS = Object.freeze([
  { operationId: "install_fire_hydrant", rowId: "f09:fire_hydrant_installation_operation", category: "construction_work", specification: "Установка и соединение фланцев подземного пожарного гидранта", unitId: "pcs", formulaId: "fire_hydrant_count_v1", priceRelation: "INCLUDED_IN_PARENT" },
  { operationId: "construction_labor", rowId: "f09:fire_hydrant_installation_labor", category: "construction_work", specification: "Рабочие-строители среднего разряда 3,0", unitId: "man_hour", formulaId: "fire_hydrant_labor_v1", priceRelation: "OWN_COST" },
  { operationId: "machinist_labor_aggregate", rowId: "f09:fire_hydrant_machinist_labor_aggregate", category: "construction_work", specification: "Справочная сумма труда машинистов без повторной оплаты", unitId: "man_hour", formulaId: "fire_hydrant_machinist_labor_v1", priceRelation: "INFORMATIONAL_SCOPE" },
  { operationId: "truck_crane_10t", rowId: "f09:fire_hydrant_truck_crane_10t", category: "equipment", specification: "Автомобильный кран 10 т", unitId: "machine_hour", formulaId: "fire_hydrant_crane_10t_v1", priceRelation: "OWN_COST" },
  { operationId: "onboard_truck_5t", rowId: "f09:fire_hydrant_onboard_truck_5t", category: "equipment", specification: "Бортовой автомобиль до 5 т", unitId: "machine_hour", formulaId: "fire_hydrant_onboard_truck_5t_v1", priceRelation: "OWN_COST" },
  { operationId: "bolts_d16", rowId: "f09:fire_hydrant_bolts_d16", category: "material", specification: "Болты, гайки и шайбы диаметром 16 мм", unitId: "t", formulaId: "fire_hydrant_bolts_d16_v1", priceRelation: "OWN_COST" },
  { operationId: "pressed_rubber_gasket", rowId: "f09:fire_hydrant_pressed_rubber_gasket", category: "material", specification: "Прокладка из прессованной технической резины", unitId: "kg", formulaId: "fire_hydrant_rubber_gasket_v1", priceRelation: "OWN_COST" },
  { operationId: "underground_fire_hydrant_product", rowId: "f09:fire_hydrant_dn125_product", category: "material", specification: "Подземный пожарный гидрант DN125, 1,0 МПа, 500–2500 мм", unitId: "pcs", formulaId: "fire_hydrant_count_v1", priceRelation: "OWN_COST" },
]);

export const FIRE_HYDRANT_INSTALLATION_KRER22_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "NORMATIVE_OPERATION_MAP",
  rateTable: "KRER_22_03_011_03",
  generatedFromCurrentRows: false,
  evidenceSha256: FIRE_HYDRANT_INSTALLATION_KRER22_ARTIFACT_SHA256,
  evidenceReferences: [
    FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_METADATA.official_url,
    "КРЕР 22, печатные/PDF страницы 109–110, колонка 22-03-011-03",
  ],
  entries: INDEPENDENT_REQUIRED_COMPONENTS.map((component) => ({
    operationId: component.operationId,
    expectedResourceId: `required-operation:${component.operationId}`,
    category: component.category,
    specification: component.specification,
    condition: "selected_exact_krer_rate_22_03_011_03",
    sourceId: FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_ID,
    unitId: component.unitId,
    quantityRule: "HYDRANT_COUNT_MULTIPLIED_BY_EXACT_KRER_COLUMN_RATE",
    detailPrinciple: "EXACT_OFFICIAL_UNIT_RATE_WITHOUT_ADJACENT_SCOPE",
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

export function validateFireHydrantInstallationKrer22Completeness(
  resources: readonly CanonicalEstimateResourceDefinition[] =
  FIRE_HYDRANT_INSTALLATION_KRER22_RESOURCES,
): true {
  const actual = new Set(resources.map((row) => row.row_id));
  const expected = FIRE_HYDRANT_INSTALLATION_KRER22_INDEPENDENT_COMPLETENESS_MAP.entries;
  if (actual.size !== expected.length) {
    throw new Error("FIRE_HYDRANT_INSTALLATION_KRER22_COMPLETENESS_COUNT_MISMATCH");
  }
  for (const entry of expected) {
    if (!actual.has(entry.resolution.rowId)) {
      throw new Error(
        `FIRE_HYDRANT_INSTALLATION_KRER22_COMPLETENESS_ROW_MISSING:${entry.resolution.rowId}`,
      );
    }
  }
  return true;
}

export const FIRE_HYDRANT_INSTALLATION_KRER22_SHORT_INPUT = Object.freeze({
  hydrant_count: 1,
});

export const FIRE_HYDRANT_INSTALLATION_KRER22_ACCEPTANCE_INPUT = Object.freeze({
  hydrant_count: 10,
});

export async function compileFireHydrantInstallationKrer22R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? FIRE_HYDRANT_INSTALLATION_KRER22_CATALOG_ID;
  if (catalogId !== FIRE_HYDRANT_INSTALLATION_KRER22_CATALOG_ID) {
    throw new Error(`FIRE_HYDRANT_INSTALLATION_KRER22_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  validateFireHydrantInstallationKrer22Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.fire-hydrant-installation-krer22-r1",
    catalogId,
    primaryMeasureParameterId: "hydrant_count",
    parameterDefinitions: [...FIRE_HYDRANT_INSTALLATION_KRER22_PARAMETERS],
    formulaDefinitions: [...FIRE_HYDRANT_INSTALLATION_KRER22_FORMULAS],
    resourceDefinitions: [...FIRE_HYDRANT_INSTALLATION_KRER22_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: FIRE_HYDRANT_INSTALLATION_KRER22_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
