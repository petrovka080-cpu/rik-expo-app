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

const FAMILY_KEY = "temporary_truss_node_strengthening_devices";
const COUNT_PARAMETER_ID = "truss_node_count";
const PROFILE_PARAMETER_ID = "truss_node_strengthening_devices_profile";
const CONFIRMED_PARAMETER_ID = "truss_node_strengthening_devices_confirmed";
const ROW_PREFIX = "f09:temporary_truss_node_strengthening_devices";
const LABOR_ROW_ID = `${ROW_PREFIX}:labor`;

export const TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_CATALOG_ID =
  `canonical-work:master:${FAMILY_KEY}_standard` as const;

export const TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_CATALOG_ID,
    sourceIdentity: `master-work:${FAMILY_KEY}_standard`,
    catalogVariant: "STANDARD_CONFIRMED_TRUSS_NODE_STRENGTHENING_DEVICES",
    canonicalNameRu: "Установка устройств при усилении узлов ферм",
  }),
  large_area: Object.freeze({
    catalogId: `canonical-work:master:${FAMILY_KEY}_large_area`,
    sourceIdentity: `master-work:${FAMILY_KEY}_large_area`,
    catalogVariant: "LARGE_AREA_CONFIRMED_TRUSS_NODE_STRENGTHENING_DEVICES",
    canonicalNameRu: "Установка устройств при усилении узлов ферм — большое количество узлов",
  }),
  small_area: Object.freeze({
    catalogId: `canonical-work:master:${FAMILY_KEY}_small_area`,
    sourceIdentity: `master-work:${FAMILY_KEY}_small_area`,
    catalogVariant: "SMALL_AREA_CONFIRMED_TRUSS_NODE_STRENGTHENING_DEVICES",
    canonicalNameRu: "Установка устройств при усилении узлов ферм — локальный объём",
  }),
  wet_zone: Object.freeze({
    catalogId: `canonical-work:master:${FAMILY_KEY}_wet_zone`,
    sourceIdentity: `master-work:${FAMILY_KEY}_wet_zone`,
    catalogVariant: "WET_ZONE_CONFIRMED_TRUSS_NODE_STRENGTHENING_DEVICES",
    canonicalNameRu: "Установка устройств при усилении узлов ферм — влажная зона",
  }),
} as const);

export type TemporaryTrussNodeStrengtheningDevicesKrer46VariantKey =
  keyof typeof TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_VARIANTS;

export const TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_VARIANTS)
    .map((variant) => variant.catalogId),
);

export function resolveTemporaryTrussNodeStrengtheningDevicesKrer46Variant(
  variantKey: TemporaryTrussNodeStrengtheningDevicesKrer46VariantKey,
) {
  const variant = TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}

export const TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_ID =
  "kg_krer_46_2015_reconstruction_official" as const;
export const TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_NORM_ID =
  "norm:kg:krer:46-05-004:2015" as const;
export const TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256 =
  "21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471" as const;
export const TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_PROFILE_ID =
  "KRER_46_05_004_01_TRUSS_NODE_ACCESS_AND_RIGGING_DEVICES" as const;

export const TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA = Object.freeze({
  source_title: "КРЕР 46-2015 «Работы при реконструкции зданий и сооружений», таблица 46-05-004",
  source_authority: "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
  source_document_version: "КРЕР 46-2015; введён в действие с 1 января 2016 года",
  definition_hash: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
  exact_locator: "Техническая часть, PDF/печатная стр. 5; таблица КРЕР 46-05-004, состав работ и измеритель на PDF/печатной стр. 64, ресурсы колонки 46-05-004-01 на PDF/печатной стр. 65",
  use_restriction: "Только установка, перестановка и снятие временных устройств при усилении узлов ферм; нормы по длине фермы 46-05-002 и по отдельным элементам решётки 46-05-003 не подменяют эту таблицу.",
  source_kind: "OFFICIAL_KG_UNIT_RATE",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/459/show",
  artifact_sha256: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
  effective_from: "2016-01-01",
});

export type TemporaryTrussNodeStrengtheningDevicesParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
    truth_metadata: Json;
  };

const PARAMETER_SPECS = Object.freeze([
  [COUNT_PARAMETER_ID, "Количество узлов ферм, подлежащих усилению", "integer", "piece"],
  [PROFILE_PARAMETER_ID, "Подтверждена таблица КРЕР 46-05-004-01 для узлов ферм", "enum", null],
  [CONFIRMED_PARAMETER_ID, "Подтверждено усиление узлов ферм с временными устройствами", "boolean", null],
] as const);

export const TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_PARAMETERS:
readonly TemporaryTrussNodeStrengtheningDevicesParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: parameterId === COUNT_PARAMETER_ID
      ? { min: 1 }
      : parameterId === PROFILE_PARAMETER_ID
        ? { values: [TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_PROFILE_ID] }
        : {},
    truth_metadata: {
      contract: "rik-expo-app.temporary-truss-node-strengthening-devices-krer46-r1",
      semantic_parameter_key: `temporary-truss-node-strengthening-devices:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "USER_OR_APPROVED_TEMPORARY_WORKS_PLAN",
      input_origin_class: parameterId === COUNT_PARAMETER_ID
        ? "KNOWN_WORK_SCOPE"
        : "TEMPORARY_WORKS_METHOD_AND_RATE_APPLICABILITY_CONFIRMATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: parameterId !== COUNT_PARAMETER_ID,
      guide: {
        guide_kind: parameterId === COUNT_PARAMETER_ID
          ? "MEASUREMENT_RULE"
          : parameterId === PROFILE_PARAMETER_ID
            ? "ENUM_DECISION_RULE"
            : "PROJECT_DEFINED",
        guide_short_ru: parameterId === COUNT_PARAMETER_ID
          ? "Укажите целое количество узлов ферм: каждая строка таблицы 46-05-004-01 умножается на это количество."
          : "Подтвердите проектом усиление именно узлов ферм и применение таблицы 46-05-004-01.",
        source_role: "OFFICIAL_KG_UNIT_RATE_AND_APPROVED_TEMPORARY_WORKS_PLAN",
        source_document: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
        source_locator: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.exact_locator,
        guide_version: "temporary-truss-node-strengthening-devices-krer46-r1",
        source_snapshot_hash: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
        applicability: "Только таблица 46-05-004-01 с измерителем «узел фермы».",
        verified_at: "2026-09-24T13:22:00+06:00",
        guide_validation_policy: "DEFER_MISSING_APPLICABILITY_REJECT_WRONG_TRUSS_DEVICE_PROFILE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
);

type RowSpec = Readonly<{
  key: string;
  code: string;
  rate: number;
  unitId: string;
  category: "construction_work" | "equipment" | "material";
  section: string;
  titleRu: string;
  costTreatment: "OWN_COST" | "INCLUDED_IN_RESOURCE_ROWS" | "INFORMATIONAL_SCOPE";
  procurementEligible?: boolean;
}>;

const ROWS: readonly RowSpec[] = Object.freeze([
  { key: "operation", code: "46-05-004-01", rate: 1, unitId: "piece", category: "construction_work", section: "Состав работ", titleRu: "Установка и снятие временных устройств при усилении узлов ферм", costTreatment: "INCLUDED_IN_RESOURCE_ROWS" },
  { key: "labor", code: "000-1003-0", rate: 35.64, unitId: "man_hour", category: "construction_work", section: "Труд", titleRu: "Труд рабочих-строителей среднего разряда 3,0", costTreatment: "OWN_COST" },
  { key: "machinist_labor", code: "KRER_AGGREGATE_MACHINIST_LABOR", rate: 0.04, unitId: "man_hour", category: "construction_work", section: "Справочный состав машин", titleRu: "Затраты труда машинистов по расценке", costTreatment: "INFORMATIONAL_SCOPE" },
  { key: "truck_crane_10t", code: "02-0075", rate: 0.04, unitId: "machine_hour", category: "equipment", section: "Машины и механизмы", titleRu: "Кран на автомобильном ходу при работе на других видах строительства, 10 т", costTreatment: "OWN_COST", procurementEligible: true },
  { key: "electric_winch_19_62kn", code: "03-0160", rate: 3.48, unitId: "machine_hour", category: "equipment", section: "Машины и механизмы", titleRu: "Лебёдка электрическая тяговым усилием 19,62 кН (2 тс)", costTreatment: "OWN_COST", procurementEligible: true },
  { key: "truck_5t", code: "40-0001", rate: 0.07, unitId: "machine_hour", category: "equipment", section: "Машины и механизмы", titleRu: "Автомобиль бортовой грузоподъёмностью до 5 т", costTreatment: "OWN_COST", procurementEligible: true },
  { key: "square_timber_pieces_1_8kg", code: "01-6901-0001", rate: 0.00515, unitId: "t", category: "material", section: "Материалы", titleRu: "Поковки из квадратных заготовок массой 1,8 кг", costTreatment: "OWN_COST", procurementEligible: true },
  { key: "impregnated_hemp_rope", code: "01-7211-0001", rate: 0.00006, unitId: "t", category: "material", section: "Материалы", titleRu: "Канаты пеньковые пропитанные", costTreatment: "OWN_COST", procurementEligible: true },
  { key: "three_strand_kapron_rope", code: "01-7211-0002", rate: 0.00004, unitId: "t", category: "material", section: "Материалы", titleRu: "Канаты трёхпрядные из капроновых нитей", costTreatment: "OWN_COST", procurementEligible: true },
  { key: "hot_rolled_wire_rod_6_3_6_5mm", code: "10-0105-0001", rate: 0.00012, unitId: "t", category: "material", section: "Материалы", titleRu: "Катанка горячекатаная в мотках диаметром 6,3–6,5 мм", costTreatment: "OWN_COST", procurementEligible: true },
  { key: "decking_shields", code: "12-0704-0005", rate: 0.49, unitId: "m2", category: "material", section: "Материалы", titleRu: "Щиты настила", costTreatment: "OWN_COST", procurementEligible: true },
]);

function formulaId(row: RowSpec): string {
  return row.key === "operation"
    ? "temporary_truss_node_strengthening_devices_count_v1"
    : `temporary_truss_node_strengthening_devices_${row.key}_krer_46_05_004_01_v1`;
}

function formula(row: RowSpec) {
  const expression = row.key === "operation"
    ? COUNT_PARAMETER_ID
    : `${COUNT_PARAMETER_ID} * ${row.rate}`;
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: formulaId(row),
    output_unit_id: row.unitId,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

export const TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(ROWS.map(formula));

const applicable = {
  kind: "and",
  operands: [
    { kind: "equals", parameterId: PROFILE_PARAMETER_ID, value: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_PROFILE_ID },
    { kind: "equals", parameterId: CONFIRMED_PARAMETER_ID, value: true },
  ],
};

function resource(row: RowSpec, ordinal: number): CanonicalEstimateResourceDefinition {
  const rowId = `${ROW_PREFIX}:${row.key}`;
  const resourceGraph = {
    formulaId: formulaId(row),
    normalizedUom: row.unitId,
    semanticOwnerId: `temporary-truss-node-strengthening-devices:${rowId}`,
    costOwner: row.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: row.costTreatment,
    payable: row.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: COUNT_PARAMETER_ID,
    quantityBasis: "OFFICIAL_RATE_PER_TRUSS_NODE",
    ...(row.key === "operation" ? { parentCostOwnerId: LABOR_ROW_ID } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "OFFICIAL_KG_RESOURCE_NORM",
    krerResourceCode: row.code,
    normativeRatePerTrussNode: row.rate,
    normativeTrace: [{
      sourceId: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
      source_id: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
      normId: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_NORM_ID,
      norm_id: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_NORM_ID,
      normVersion: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.source_document_version,
      source_title: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.source_title,
      exact_locator: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.exact_locator,
      source_definition_hash: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
    }],
    excludedAdjacentScope: [
      "length-based truss chord or lattice devices (46-05-002)",
      "individual truss lattice element devices (46-05-003)",
      "upper or lower beam chord devices (46-05-005)",
      "strengthening of the truss structure itself",
    ],
  };
  return {
    id: `resource-${rowId.replace(/:/gu, "-")}`,
    row_id: rowId,
    ordinal,
    section: row.section,
    category: row.category,
    title_ru: row.titleRu,
    unit_id: row.unitId,
    formula_id: formulaId(row),
    inclusion_ast: applicable,
    resource_graph: resourceGraph,
    procurement_eligible: row.procurementEligible ?? false,
    cost_owner_id: rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ row, resourceGraph, sourceMetadata }),
  };
}

export const TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(ROWS.map(resource));

const COMPONENTS = Object.freeze(ROWS.map((row) => ({
  operationId: row.key === "operation" ? FAMILY_KEY : row.key === "labor" ? "construction_labor_grade_3_0" : row.key,
  rowId: `${ROW_PREFIX}:${row.key}`,
  category: row.category,
  specification: `${row.rate} ${row.unitId} на один узел фермы`,
  unitId: row.unitId,
  formulaId: formulaId(row),
  priceRelation: row.key === "operation"
    ? "INCLUDED_IN_PARENT"
    : row.costTreatment === "INFORMATIONAL_SCOPE"
      ? "INFORMATIONAL_SCOPE"
      : "OWN_COST",
})));

export const TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "NORMATIVE_OPERATION_MAP",
    rateTable: "KRER_46_05_004_01",
    generatedFromCurrentRows: false,
    evidenceSha256: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
    evidenceReferences: [
      "https://minstroy.gov.kg/ru/kyzmat/459/show",
      "КРЕР 46-2015, PDF/печатные страницы 64–65",
    ],
    entries: [
      ...COMPONENTS.map((component) => ({
        expectedResourceId: `required-resource:${component.operationId}`,
        operationId: component.operationId,
        category: component.category,
        specification: component.specification,
        condition: "confirmed_krer_46_05_004_01_truss_node",
        sourceId: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
        unitId: component.unitId,
        quantityRule: "OFFICIAL_RATE_PER_TRUSS_NODE_TIMES_INTEGER_NODE_COUNT",
        detailPrinciple: "EXACT_OFFICIAL_SINGLE_COLUMN_WITHOUT_ADJACENT_RATE_SUBSTITUTION",
        priceRelation: component.priceRelation,
        formulaId: component.formulaId,
        resolution: component.priceRelation === "INCLUDED_IN_PARENT"
          ? { kind: "INCLUDED_COMPONENT_ROW", rowId: component.rowId, parentRowId: LABOR_ROW_ID }
          : { kind: "ROW", rowId: component.rowId },
      })),
      {
        expectedResourceId: "required-operation:strengthening-devices-removal",
        operationId: "strengthening_devices_removal",
        category: "construction_work",
        specification: "Снятие лебёдок, такелажной оснастки, лестниц, полок, подмостей и страховочного каната",
        condition: "selected_krer_46_05_004_01_rate",
        sourceId: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "INCLUDED_IN_OFFICIAL_INSTALL_REARRANGE_AND_REMOVE_LABOR_RATE",
        detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: formulaId(ROWS[1]!),
        resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
      },
      {
        expectedResourceId: "adjacent-operation:length-based-truss-strengthening-devices",
        operationId: "length_based_truss_strengthening_devices",
        category: "construction_work",
        specification: "Устройства по длине фермы по таблице 46-05-002",
        condition: "not_in_krer_46_05_004_01",
        sourceId: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
        unitId: "m",
        quantityRule: "SEPARATE_PHYSICAL_WORK_REQUIRED",
        detailPrinciple: "EXCLUDED_FROM_RATE",
        priceRelation: "NOT_INCLUDED",
        resolution: { kind: "NOT_APPLICABLE", reasonRu: "Таблица 46-05-004 измеряется узлами ферм, а не длиной фермы." },
      },
      {
        expectedResourceId: "adjacent-operation:individual-truss-lattice-element-devices",
        operationId: "individual_truss_lattice_element_devices",
        category: "construction_work",
        specification: "Устройства для отдельных элементов решётки ферм по таблице 46-05-003",
        condition: "not_in_krer_46_05_004_01",
        sourceId: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
        unitId: "piece",
        quantityRule: "SEPARATE_PHYSICAL_WORK_REQUIRED",
        detailPrinciple: "EXCLUDED_FROM_RATE",
        priceRelation: "NOT_INCLUDED",
        resolution: { kind: "NOT_APPLICABLE", reasonRu: "Отдельный элемент решётки фермы не равен узлу фермы." },
      },
    ],
  });

export function validateTemporaryTrussNodeStrengtheningDevicesKrer46Completeness(): true {
  const expected = new Set(COMPONENTS.map((component) => component.rowId));
  const actual = new Set(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES
    .map((row) => row.row_id));
  for (const rowId of expected) {
    if (!actual.has(rowId)) {
      throw new Error(`TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_MISSING_ROW:${rowId}`);
    }
  }
  if (actual.size !== 11) {
    throw new Error("TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ROW_COUNT_MISMATCH");
  }
  return true;
}

export const TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT = Object.freeze({
  [COUNT_PARAMETER_ID]: 1,
  [PROFILE_PARAMETER_ID]: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_PROFILE_ID,
  [CONFIRMED_PARAMETER_ID]: true,
});

export const TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  [COUNT_PARAMETER_ID]: 3,
  [PROFILE_PARAMETER_ID]: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_PROFILE_ID,
  [CONFIRMED_PARAMETER_ID]: true,
});

export async function compileTemporaryTrussNodeStrengtheningDevicesKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_CATALOG_ID;
  if (!(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS as readonly string[])
    .includes(catalogId)) {
    throw new Error(`TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters[PROFILE_PARAMETER_ID] != null
    && submittedParameters[PROFILE_PARAMETER_ID]
      !== TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_PROFILE_ID) {
    throw new Error("TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters[CONFIRMED_PARAMETER_ID] === false) {
    throw new Error("TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_PROFILE_NOT_CONFIRMED");
  }
  validateTemporaryTrussNodeStrengtheningDevicesKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.temporary-truss-node-strengthening-devices-krer46-r1",
    catalogId,
    primaryMeasureParameterId: COUNT_PARAMETER_ID,
    parameterDefinitions: [...TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_PARAMETERS],
    formulaDefinitions: [...TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_FORMULAS],
    resourceDefinitions: [...TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    priceItems: [],
    currencyCode: "KGS",
    maximumResourceRows: 100,
    hashJson: estimateDeterministicHash,
  });
}
