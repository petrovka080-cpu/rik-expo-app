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

const FAMILY_KEY = "temporary_vertical_protective_barrier_board_frame";
const AREA_PARAMETER_ID = "barrier_vertical_area_m2";
const PROFILE_PARAMETER_ID = "temporary_protective_barrier_profile";
const CONFIRMED_PARAMETER_ID = "vertical_barrier_board_frame_confirmed";
const ROW_PREFIX = "f09:temporary_vertical_protective_barrier_board_frame";
const LABOR_ROW_ID = `${ROW_PREFIX}:labor`;

export const TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_CATALOG_ID =
  `canonical-work:master:${FAMILY_KEY}_standard` as const;

export const TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_CATALOG_ID,
    sourceIdentity: `master-work:${FAMILY_KEY}_standard`,
    catalogVariant: "STANDARD_CONFIRMED_VERTICAL_BARRIER_BOARD_FRAME",
    canonicalNameRu: "Устройство временного вертикального защитного ограждения с обшивкой по каркасу из досок",
  }),
  large_area: Object.freeze({
    catalogId: `canonical-work:master:${FAMILY_KEY}_large_area`,
    sourceIdentity: `master-work:${FAMILY_KEY}_large_area`,
    catalogVariant: "LARGE_AREA_CONFIRMED_VERTICAL_BARRIER_BOARD_FRAME",
    canonicalNameRu: "Устройство временного вертикального защитного ограждения с обшивкой по каркасу из досок — большая площадь",
  }),
  small_area: Object.freeze({
    catalogId: `canonical-work:master:${FAMILY_KEY}_small_area`,
    sourceIdentity: `master-work:${FAMILY_KEY}_small_area`,
    catalogVariant: "SMALL_AREA_CONFIRMED_VERTICAL_BARRIER_BOARD_FRAME",
    canonicalNameRu: "Устройство временного вертикального защитного ограждения с обшивкой по каркасу из досок — малая площадь",
  }),
  wet_zone: Object.freeze({
    catalogId: `canonical-work:master:${FAMILY_KEY}_wet_zone`,
    sourceIdentity: `master-work:${FAMILY_KEY}_wet_zone`,
    catalogVariant: "WET_ZONE_CONFIRMED_VERTICAL_BARRIER_BOARD_FRAME",
    canonicalNameRu: "Устройство временного вертикального защитного ограждения с обшивкой по каркасу из досок — влажная зона",
  }),
} as const);

export type TemporaryVerticalProtectiveBarrierBoardFrameKrer46VariantKey =
  keyof typeof TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_VARIANTS;

export const TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_VARIANTS)
    .map((variant) => variant.catalogId),
);

export function resolveTemporaryVerticalProtectiveBarrierBoardFrameKrer46Variant(
  variantKey: TemporaryVerticalProtectiveBarrierBoardFrameKrer46VariantKey,
) {
  const variant = TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}

export const TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_ID =
  "kg_krer_46_2015_reconstruction_official" as const;
export const TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_NORM_ID =
  "norm:kg:krer:46-05-001-03:2015" as const;
export const TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ARTIFACT_SHA256 =
  "21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471" as const;
export const TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_PROFILE_ID =
  "KRER_46_05_001_03_VERTICAL_BOARD_FRAME_FACING_ONE_ROOFING_FELT_LAYER" as const;

export const TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_METADATA = Object.freeze({
  source_title: "КРЕР 46-2015 «Работы при реконструкции зданий и сооружений», таблица 46-05-001",
  source_authority: "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
  source_document_version: "КРЕР 46-2015; введён в действие с 1 января 2016 года",
  definition_hash: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ARTIFACT_SHA256,
  exact_locator: "Техническая часть, PDF/печатная стр. 5; таблица КРЕР 46-05-001, состав работ и измеритель на PDF/печатной стр. 62, колонка 46-05-001-03 и нормы ресурсов на PDF/печатной стр. 63",
  use_restriction: "Только устройство и последующая разборка временного вертикального защитного ограждения с обшивкой каркаса досками и толем в один слой по колонке 46-05-001-03 и подтверждённой площади ограждения. Горизонтальные ограждения по колонкам 01 и 02 не подменяются.",
  source_kind: "OFFICIAL_KG_UNIT_RATE",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/459/show",
  artifact_sha256: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ARTIFACT_SHA256,
  effective_from: "2016-01-01",
});

export type TemporaryVerticalProtectiveBarrierBoardFrameParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
    truth_metadata: Json;
  };

const PARAMETER_SPECS = Object.freeze([
  [AREA_PARAMETER_ID, "Площадь временного вертикального защитного ограждения", "decimal", "m2"],
  [PROFILE_PARAMETER_ID, "Выбранная колонка КРЕР для временного защитного ограждения", "enum", null],
  [CONFIRMED_PARAMETER_ID, "Подтверждено вертикальное ограждение с обшивкой по каркасу из досок", "boolean", null],
] as const);

export const TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_PARAMETERS:
readonly TemporaryVerticalProtectiveBarrierBoardFrameParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: parameterId === AREA_PARAMETER_ID
      ? { min: 0.000_001 }
      : parameterId === PROFILE_PARAMETER_ID
        ? { values: [TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_PROFILE_ID] }
        : {},
    truth_metadata: {
      contract: "rik-expo-app.temporary-vertical-protective-barrier-board-frame-krer46-r1",
      semantic_parameter_key: `temporary-vertical-protective-barrier-board-frame:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "USER_OR_APPROVED_TEMPORARY_WORKS_PLAN",
      input_origin_class: parameterId === AREA_PARAMETER_ID
        ? "KNOWN_WORK_SCOPE"
        : "TEMPORARY_WORKS_METHOD_AND_RATE_APPLICABILITY_CONFIRMATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: parameterId !== AREA_PARAMETER_ID,
      guide: {
        guide_kind: parameterId === AREA_PARAMETER_ID
          ? "MEASUREMENT_RULE"
          : parameterId === PROFILE_PARAMETER_ID
            ? "ENUM_DECISION_RULE"
            : "PROJECT_DEFINED",
        guide_short_ru: parameterId === AREA_PARAMETER_ID
          ? "Укажите проектную площадь вертикального ограждения без коэффициента зоны или запаса."
          : "Подтвердите планом временных работ вертикальное ограждение и колонку 46-05-001-03; горизонтальные ограждения относятся к отдельным колонкам.",
        source_role: "OFFICIAL_KG_UNIT_RATE_AND_APPROVED_TEMPORARY_WORKS_PLAN",
        source_document: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_ID,
        source_locator: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_METADATA.exact_locator,
        guide_version: "temporary-vertical-protective-barrier-board-frame-krer46-r1",
        source_snapshot_hash: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ARTIFACT_SHA256,
        applicability: "Только таблица 46-05-001, колонка 03: временное вертикальное защитное ограждение с обшивкой по каркасу из досок; колонки 01 и 02 не подменяются.",
        verified_at: "2026-09-24T12:20:00+06:00",
        guide_validation_policy: "DEFER_MISSING_APPLICABILITY_REJECT_WRONG_TEMPORARY_BARRIER_PROFILE",
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
  { key: "operation", code: "46-05-001-03", rate: 100, unitId: "m2", category: "construction_work", section: "Состав работ", titleRu: "Устройство и разборка временного вертикального защитного ограждения с обшивкой по каркасу из досок", costTreatment: "INCLUDED_IN_RESOURCE_ROWS" },
  { key: "labor", code: "000-1002-2", rate: 52.44, unitId: "man_hour", category: "construction_work", section: "Труд", titleRu: "Труд рабочих-строителей среднего разряда 2,2", costTreatment: "OWN_COST" },
  { key: "machinist_labor", code: "KRER_AGGREGATE_MACHINIST_LABOR", rate: 0.19, unitId: "man_hour", category: "construction_work", section: "Справочный состав машин", titleRu: "Затраты труда машинистов по расценке", costTreatment: "INFORMATIONAL_SCOPE" },
  { key: "truck_crane_10t", code: "02-0075", rate: 0.19, unitId: "machine_hour", category: "equipment", section: "Машины и механизмы", titleRu: "Кран на автомобильном ходу при работе на других видах строительства, 10 т", costTreatment: "OWN_COST", procurementEligible: true },
  { key: "electric_winch_19_62kn", code: "03-0160", rate: 0.56, unitId: "machine_hour", category: "equipment", section: "Машины и механизмы", titleRu: "Лебёдка электрическая тяговым усилием 19,62 кН (2 тс)", costTreatment: "OWN_COST", procurementEligible: true },
  { key: "truck_5t", code: "40-0001", rate: 0.27, unitId: "machine_hour", category: "equipment", section: "Машины и механизмы", titleRu: "Автомобиль бортовой грузоподъёмностью до 5 т", costTreatment: "OWN_COST", procurementEligible: true },
  { key: "construction_nails", code: "01-1110-0002", rate: 0.0141, unitId: "t", category: "material", section: "Материалы", titleRu: "Гвозди строительные", costTreatment: "OWN_COST", procurementEligible: true },
  { key: "roofing_nails", code: "01-1113-0002", rate: 0.003, unitId: "t", category: "material", section: "Материалы", titleRu: "Гвозди толевые круглые 2,0×25 мм", costTreatment: "OWN_COST", procurementEligible: true },
  { key: "softwood_unedged_boards_32_40mm_grade4", code: "01-6304-0075", rate: 0.86, unitId: "m3", category: "material", section: "Материалы", titleRu: "Доски хвойных пород необрезные, длина 4–6,5 м, толщина 32–40 мм, IV сорт", costTreatment: "OWN_COST", procurementEligible: true },
  { key: "softwood_unedged_boards_44mm_plus_grade3", code: "01-6304-0079", rate: 0.25, unitId: "m3", category: "material", section: "Материалы", titleRu: "Доски хвойных пород необрезные, длина 4–6,5 м, толщина 44 мм и более, III сорт", costTreatment: "OWN_COST", procurementEligible: true },
  { key: "roofing_felt_tk350", code: "01-7413-0001", rate: 115, unitId: "m2", category: "material", section: "Материалы", titleRu: "Толь с крупнозернистой посыпкой, гидроизоляционный ТК-350", costTreatment: "OWN_COST", procurementEligible: true },
]);

function formulaId(row: RowSpec): string {
  return row.key === "operation"
    ? "temporary_vertical_protective_barrier_board_frame_area_v1"
    : `temporary_vertical_protective_barrier_board_frame_${row.key}_krer_46_05_001_03_v1`;
}

function formula(row: RowSpec) {
  const expression = row.key === "operation"
    ? AREA_PARAMETER_ID
    : `${AREA_PARAMETER_ID} * ${row.rate} / 100`;
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

export const TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(ROWS.map(formula));

const applicable = {
  kind: "and",
  operands: [
    { kind: "equals", parameterId: PROFILE_PARAMETER_ID, value: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_PROFILE_ID },
    { kind: "equals", parameterId: CONFIRMED_PARAMETER_ID, value: true },
  ],
};

function resource(row: RowSpec, ordinal: number): CanonicalEstimateResourceDefinition {
  const rowId = `${ROW_PREFIX}:${row.key}`;
  const resourceGraph = {
    formulaId: formulaId(row),
    normalizedUom: row.unitId,
    semanticOwnerId: `temporary-vertical-protective-barrier-board-frame:${rowId}`,
    costOwner: row.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: row.costTreatment,
    payable: row.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: AREA_PARAMETER_ID,
    quantityBasis: "CONFIRMED_VERTICAL_AREA_TIMES_EXACT_KRER_RATE_PER_100_M2",
    ...(row.key === "operation" ? { parentCostOwnerId: LABOR_ROW_ID } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "OFFICIAL_KG_RESOURCE_NORM",
    krerResourceCode: row.code,
    normativeRatePer100M2: row.rate,
    normativeTrace: [{
      sourceId: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_ID,
      source_id: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_ID,
      normId: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_NORM_ID,
      norm_id: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_NORM_ID,
      normVersion: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_METADATA.source_document_version,
      source_title: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_METADATA.source_title,
      exact_locator: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_METADATA.exact_locator,
      source_definition_hash: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ARTIFACT_SHA256,
    }],
    excludedAdjacentScope: [
      "horizontal temporary barrier along lower truss chords (46-05-001-01)",
      "horizontal temporary barrier on beams and log posts (46-05-001-02)",
      "logs, square timber pieces and wire absent from rate column 03",
      "permanent fence, road guardrail or unrelated safety system",
      "unlisted reuse credit, salvage recovery, disposal allowance or market price",
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

export const TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(ROWS.map(resource));

const COMPONENTS = Object.freeze(ROWS.map((row) => ({
  operationId: row.key === "operation" ? FAMILY_KEY : row.key === "labor" ? "construction_labor_grade_2_2" : row.key,
  rowId: `${ROW_PREFIX}:${row.key}`,
  category: row.category,
  specification: row.key === "operation" ? row.titleRu : `${String(row.rate).replace(".", ",")} ${row.unitId} на 100 м²`,
  unitId: row.unitId,
  formulaId: formulaId(row),
  priceRelation: row.key === "operation"
    ? "INCLUDED_IN_PARENT"
    : row.costTreatment === "INFORMATIONAL_SCOPE"
      ? "INFORMATIONAL_SCOPE"
      : "OWN_COST",
})));

export const TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "NORMATIVE_OPERATION_MAP",
    rateTable: "KRER_46_05_001_03",
    generatedFromCurrentRows: false,
    evidenceSha256: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ARTIFACT_SHA256,
    evidenceReferences: [
      "https://minstroy.gov.kg/ru/kyzmat/459/show",
      "КРЕР 46-2015, PDF/печатные страницы 62 и 63",
    ],
    entries: [
      ...COMPONENTS.map((component) => ({
        expectedResourceId: `required-resource:${component.operationId}`,
        operationId: component.operationId,
        category: component.category,
        specification: component.specification,
        condition: "confirmed_krer_46_05_001_03_vertical_barrier_board_frame",
        sourceId: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_ID,
        unitId: component.unitId,
        quantityRule: "CONFIRMED_VERTICAL_AREA_MULTIPLIED_BY_EXACT_KRER_RATE_PER_100_M2",
        detailPrinciple: "EXACT_OFFICIAL_RATE_COLUMN_WITHOUT_AREA_FACTOR",
        priceRelation: component.priceRelation,
        formulaId: component.formulaId,
        resolution: component.priceRelation === "INCLUDED_IN_PARENT"
          ? { kind: "INCLUDED_COMPONENT_ROW", rowId: component.rowId, parentRowId: LABOR_ROW_ID }
          : { kind: "ROW", rowId: component.rowId },
      })),
      {
        expectedResourceId: "required-operation:temporary-barrier-dismantling",
        operationId: "temporary_barrier_dismantling",
        category: "construction_work",
        specification: "Разборка временного защитного ограждения после окончания работ",
        condition: "selected_krer_46_05_001_03_rate",
        sourceId: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "INCLUDED_IN_OFFICIAL_INSTALL_AND_DISMANTLE_LABOR_RATE",
        detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: formulaId(ROWS[1]!),
        resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
      },
      {
        expectedResourceId: "adjacent-operation:horizontal-temporary-protective-barrier",
        operationId: "horizontal_temporary_protective_barrier",
        category: "construction_work",
        specification: "Горизонтальное временное защитное ограждение",
        condition: "not_in_krer_46_05_001_03",
        sourceId: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_ID,
        unitId: "m2",
        quantityRule: "SEPARATE_PHYSICAL_WORK_REQUIRED",
        detailPrinciple: "EXCLUDED_FROM_RATE",
        priceRelation: "NOT_INCLUDED",
        resolution: {
          kind: "NOT_APPLICABLE",
          reasonRu: "КРЕР 46-05-001-03 относится только к вертикальному временному защитному ограждению и его последующей разборке.",
        },
      },
    ],
  });

export function validateTemporaryVerticalProtectiveBarrierBoardFrameKrer46Completeness(): true {
  const expected = new Set(COMPONENTS.map((component) => component.rowId));
  const actual = new Set(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_RESOURCES
    .map((row) => row.row_id));
  for (const rowId of expected) {
    if (!actual.has(rowId)) {
      throw new Error(`TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_MISSING_ROW:${rowId}`);
    }
  }
  if (actual.size !== 11) {
    throw new Error("TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ROW_COUNT_MISMATCH");
  }
  return true;
}

export const TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SHORT_INPUT = Object.freeze({
  [AREA_PARAMETER_ID]: 100,
  [PROFILE_PARAMETER_ID]: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_PROFILE_ID,
  [CONFIRMED_PARAMETER_ID]: true,
});

export const TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  [AREA_PARAMETER_ID]: 35.5,
  [PROFILE_PARAMETER_ID]: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_PROFILE_ID,
  [CONFIRMED_PARAMETER_ID]: true,
});

export async function compileTemporaryVerticalProtectiveBarrierBoardFrameKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_CATALOG_ID;
  if (!(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_CATALOG_IDS as readonly string[])
    .includes(catalogId)) {
    throw new Error(`TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters[PROFILE_PARAMETER_ID] != null
    && submittedParameters[PROFILE_PARAMETER_ID]
      !== TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_PROFILE_ID) {
    throw new Error("TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters[CONFIRMED_PARAMETER_ID] === false) {
    throw new Error("TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_PROFILE_NOT_CONFIRMED");
  }
  validateTemporaryVerticalProtectiveBarrierBoardFrameKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.temporary-vertical-protective-barrier-board-frame-krer46-r1",
    catalogId,
    primaryMeasureParameterId: AREA_PARAMETER_ID,
    parameterDefinitions: [...TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_PARAMETERS],
    formulaDefinitions: [...TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_FORMULAS],
    resourceDefinitions: [...TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    priceItems: [],
    currencyCode: "KGS",
    maximumResourceRows: 100,
    hashJson: estimateDeterministicHash,
  });
}
