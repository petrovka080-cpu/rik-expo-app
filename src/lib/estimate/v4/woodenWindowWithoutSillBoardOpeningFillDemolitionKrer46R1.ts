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

const FAMILY_KEY = "demolition_wooden_window_without_sill_board_opening_fill";

export const WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_CATALOG_ID =
  "canonical-work:master:demolition_wooden_window_without_sill_board_opening_fill_standard" as const;
export const WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_CATALOG_ID,
    sourceIdentity: `master-work:${FAMILY_KEY}_standard`,
    catalogVariant: "STANDARD_CONFIRMED_WOODEN_WINDOW_WITHOUT_SILL_BOARD",
    canonicalNameRu: "Разборка деревянного оконного заполнения проёма без подоконной доски",
  }),
  wet_zone: Object.freeze({
    catalogId:
      "canonical-work:master:demolition_wooden_window_without_sill_board_opening_fill_wet_zone",
    sourceIdentity: `master-work:${FAMILY_KEY}_wet_zone`,
    catalogVariant: "WET_ZONE_CONFIRMED_WOODEN_WINDOW_WITHOUT_SILL_BOARD",
    canonicalNameRu:
      "Разборка деревянного оконного заполнения без подоконной доски — влажная зона",
  }),
} as const);
export type WoodenWindowWithoutSillBoardFillDemolitionKrer46VariantKey =
  keyof typeof WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_VARIANTS;
export const WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_VARIANTS).map((variant) =>
    variant.catalogId),
);

export function resolveWoodenWindowWithoutSillBoardFillDemolitionKrer46Variant(
  variantKey: WoodenWindowWithoutSillBoardFillDemolitionKrer46VariantKey,
) {
  const variant = WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}
export const WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_ID =
  "kg_krer_46_2015_reconstruction_official" as const;
export const WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_NORM_ID =
  "norm:kg:krer:46-04-012-02:2015" as const;
export const WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256 =
  "21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471" as const;
export const WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_PROFILE_ID =
  "KRER_46_04_012_02_WOODEN_WINDOW_WITHOUT_SILL_BOARD" as const;

export const WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_METADATA = Object.freeze({
  source_title:
    "КРЕР 46-2015 «Работы при реконструкции зданий и сооружений», таблица 46-04-012",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
  source_document_version: "КРЕР 46-2015; введён в действие с 1 января 2016 года",
  definition_hash: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
  exact_locator:
    "Техническая часть, п. 1.1, PDF/печатная стр. 5; таблица КРЕР 46-04-012, состав работ, измеритель, колонка 46-04-012-02 и нормы ресурсов на PDF/печатной стр. 60",
  use_restriction:
    "Только разборка подтверждённого существующего деревянного оконного заполнения проёма без подоконной доски по колонке 46-04-012-02 и подтверждённой площади: 172,76 чел.-ч рабочих, 7,74 чел.-ч машинистов и 7,74 маш.-ч подъёмника на 100 м². Новые блоки, восстановление откосов и внеобъектовый вывоз не включены.",
  source_kind: "OFFICIAL_KG_UNIT_RATE",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/459/show",
  artifact_sha256: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
  effective_from: "2016-01-01",
});

const PARAMETER_SPECS = Object.freeze([
  ["opening_fill_area_m2", "Площадь деревянного оконного заполнения проёма без подоконной доски", "decimal", "m2"],
  ["existing_opening_fill_profile", "Выбранная колонка КРЕР для существующего заполнения проёма", "enum", null],
  ["existing_wooden_window_without_sill_board_confirmed", "Подтверждено существующее деревянное оконное заполнение проёма без подоконной доски", "boolean", null],
] as const);

export type WoodenWindowWithoutSillBoardFillDemolitionParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
    truth_metadata: Json;
  };

export const WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_PARAMETERS:
readonly WoodenWindowWithoutSillBoardFillDemolitionParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: parameterId === "opening_fill_area_m2"
      ? { min: 0.000_001 }
      : parameterId === "existing_opening_fill_profile"
        ? { values: [WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_PROFILE_ID] }
        : {},
    truth_metadata: {
      contract: "rik-expo-app.wooden-window-without-sill-board-fill-demolition-krer46-r1",
      semantic_parameter_key: `wooden-window-without-sill-board-fill-demolition:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "USER_OR_APPROVED_EXISTING_CONDITION_SURVEY",
      input_origin_class: parameterId === "opening_fill_area_m2"
        ? "KNOWN_WORK_SCOPE"
        : "EXISTING_CONDITION_AND_RATE_APPLICABILITY_CONFIRMATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: parameterId !== "opening_fill_area_m2",
      guide: {
        guide_kind: parameterId === "opening_fill_area_m2"
          ? "MEASUREMENT_RULE"
          : parameterId === "existing_opening_fill_profile"
            ? "ENUM_DECISION_RULE"
            : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "opening_fill_area_m2"
          ? "Укажите фактическую площадь разбираемых деревянных оконных заполнений без подоконных досок, без коэффициента зоны или запаса."
          : "Подтвердите обследованием деревянное оконное заполнение проёма без подоконной доски и применимость колонки 46-04-012-02; для окна с подоконной доской, двери или другого материала выберите отдельную норму.",
        source_role: "OFFICIAL_KG_UNIT_RATE_AND_EXISTING_CONDITION_SURVEY",
        source_document: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_ID,
        source_locator: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
        guide_version: "wooden-window-without-sill-board-fill-demolition-krer46-r1",
        source_snapshot_hash: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
        applicability:
          "Только таблица 46-04-012, колонка 02: разборка деревянных оконных заполнений проёмов без подоконных досок; колонка 01 для окон с подоконными досками не подменяется.",
        verified_at: "2026-09-24T06:12:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_APPLICABILITY_REJECT_WRONG_OPENING_FILL_OR_PROFILE",
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

export const WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("wooden_window_without_sill_board_fill_demolition_area_v1", "m2", "opening_fill_area_m2"),
  formula(
    "wooden_window_without_sill_board_fill_demolition_labor_krer_46_04_012_02_v1",
    "man_hour",
    "opening_fill_area_m2 * 172.76 / 100",
  ),
  formula(
    "wooden_window_without_sill_board_fill_demolition_machinist_labor_krer_46_04_012_02_v1",
    "man_hour",
    "opening_fill_area_m2 * 7.74 / 100",
  ),
  formula(
    "wooden_window_without_sill_board_fill_demolition_lift_krer_46_04_012_02_v1",
    "machine_hour",
    "opening_fill_area_m2 * 7.74 / 100",
  ),
]);

const applicable = {
  kind: "and",
  operands: [
    {
      kind: "equals",
      parameterId: "existing_opening_fill_profile",
      value: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_PROFILE_ID,
    },
    {
      kind: "equals",
      parameterId: "existing_wooden_window_without_sill_board_confirmed",
      value: true,
    },
  ],
};

type CostTreatment = "OWN_COST" | "INCLUDED_IN_RESOURCE_ROWS" | "INFORMATIONAL_SCOPE";

function resource(input: Readonly<{
  rowId: string;
  ordinal: number;
  section: string;
  category: "construction_work" | "equipment";
  titleRu: string;
  unitId: string;
  formulaId: string;
  costTreatment: CostTreatment;
  parentRowId?: string;
  procurementEligible?: boolean;
  krerResourceCode: string;
  normativeRatePer100M2: number;
}>): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `wooden-window-without-sill-board-fill-demolition:${input.rowId}`,
    costOwner: input.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: input.costTreatment,
    payable: input.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "opening_fill_area_m2",
    quantityBasis: "CONFIRMED_OPENING_FILL_AREA_TIMES_EXACT_KRER_RATE_PER_100_M2",
    ...(input.parentRowId ? { parentCostOwnerId: input.parentRowId } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "OFFICIAL_KG_RESOURCE_NORM",
    krerResourceCode: input.krerResourceCode,
    normativeRatePer100M2: input.normativeRatePer100M2,
    normativeTrace: [{
      sourceId: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_ID,
      source_id: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_ID,
      normId: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_NORM_ID,
      norm_id: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_NORM_ID,
      normVersion:
        WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_METADATA.source_document_version,
      source_title: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_METADATA.source_title,
      exact_locator: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      source_definition_hash: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
    }],
    excludedAdjacentScope: [
      "new window fill, frame, sill board, hardware or finishing",
      "masonry opening repair and slope restoration",
      "wooden window fill with sill board, door fill or non-wooden opening fill",
      "offsite waste haul and disposal",
      "invented area-class factor or market price",
    ],
  };
  return {
    id: `resource-${input.rowId.replace(/:/gu, "-")}`,
    row_id: input.rowId,
    ordinal: input.ordinal,
    section: input.section,
    category: input.category,
    title_ru: input.titleRu,
    unit_id: input.unitId,
    formula_id: input.formulaId,
    inclusion_ast: applicable,
    resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible ?? false,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

const LABOR_ROW_ID = "f09:wooden_window_without_sill_board_fill_demolition:labor";

export const WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({
    rowId: "f09:wooden_window_without_sill_board_fill_demolition:operation",
    ordinal: 0,
    section: "Состав работ",
    category: "construction_work",
    titleRu: "Разборка деревянного оконного заполнения проёма без подоконной доски",
    unitId: "m2",
    formulaId: "wooden_window_without_sill_board_fill_demolition_area_v1",
    costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
    parentRowId: LABOR_ROW_ID,
    krerResourceCode: "46-04-012-02",
    normativeRatePer100M2: 100,
  }),
  resource({
    rowId: LABOR_ROW_ID,
    ordinal: 1,
    section: "Труд",
    category: "construction_work",
    titleRu: "Труд рабочих-строителей среднего разряда 2,4",
    unitId: "man_hour",
    formulaId: "wooden_window_without_sill_board_fill_demolition_labor_krer_46_04_012_02_v1",
    costTreatment: "OWN_COST",
    krerResourceCode: "000-1002-4",
    normativeRatePer100M2: 172.76,
  }),
  resource({
    rowId: "f09:wooden_window_without_sill_board_fill_demolition:machinist_labor",
    ordinal: 2,
    section: "Справочный состав машин",
    category: "construction_work",
    titleRu: "Затраты труда машинистов по расценке",
    unitId: "man_hour",
    formulaId: "wooden_window_without_sill_board_fill_demolition_machinist_labor_krer_46_04_012_02_v1",
    costTreatment: "INFORMATIONAL_SCOPE",
    krerResourceCode: "KRER_AGGREGATE_MACHINIST_LABOR",
    normativeRatePer100M2: 7.74,
  }),
  resource({
    rowId: "f09:wooden_window_without_sill_board_fill_demolition:lift_500kg",
    ordinal: 3,
    section: "Машины и механизмы",
    category: "equipment",
    titleRu: "Подъёмник грузоподъёмностью до 500 кг, одномачтовый, высота подъёма 45 м",
    unitId: "machine_hour",
    formulaId: "wooden_window_without_sill_board_fill_demolition_lift_krer_46_04_012_02_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "03-0327",
    normativeRatePer100M2: 7.74,
  }),
]);

const COMPONENTS = Object.freeze([
  { operationId: "wooden_window_without_sill_board_fill_demolition", rowId: "f09:wooden_window_without_sill_board_fill_demolition:operation", category: "construction_work", specification: "Разборка деревянного оконного заполнения проёма без подоконной доски", unitId: "m2", formulaId: "wooden_window_without_sill_board_fill_demolition_area_v1", priceRelation: "INCLUDED_IN_PARENT" },
  { operationId: "construction_labor_grade_2_4", rowId: LABOR_ROW_ID, category: "construction_work", specification: "172,76 чел.-ч на 100 м²", unitId: "man_hour", formulaId: "wooden_window_without_sill_board_fill_demolition_labor_krer_46_04_012_02_v1", priceRelation: "OWN_COST" },
  { operationId: "machinist_labor_aggregate", rowId: "f09:wooden_window_without_sill_board_fill_demolition:machinist_labor", category: "construction_work", specification: "7,74 чел.-ч на 100 м², справочно без повторной оплаты", unitId: "man_hour", formulaId: "wooden_window_without_sill_board_fill_demolition_machinist_labor_krer_46_04_012_02_v1", priceRelation: "INFORMATIONAL_SCOPE" },
  { operationId: "single_mast_lift_500kg_45m", rowId: "f09:wooden_window_without_sill_board_fill_demolition:lift_500kg", category: "equipment", specification: "7,74 маш.-ч на 100 м²", unitId: "machine_hour", formulaId: "wooden_window_without_sill_board_fill_demolition_lift_krer_46_04_012_02_v1", priceRelation: "OWN_COST" },
]);

export const WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "NORMATIVE_OPERATION_MAP",
    rateTable: "KRER_46_04_012_02",
    generatedFromCurrentRows: false,
    evidenceSha256: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
    evidenceReferences: [
      "https://minstroy.gov.kg/ru/kyzmat/459/show",
      "КРЕР 46-2015, PDF/печатные страницы 5 и 60",
    ],
    entries: [
      ...COMPONENTS.map((component) => ({
        expectedResourceId: `required-resource:${component.operationId}`,
        operationId: component.operationId,
        category: component.category,
        specification: component.specification,
        condition: "confirmed_krer_46_04_012_02_wooden_window_without_sill_board_fill",
        sourceId: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_ID,
        unitId: component.unitId,
        quantityRule: "CONFIRMED_AREA_MULTIPLIED_BY_EXACT_KRER_RATE_PER_100_M2",
        detailPrinciple: "EXACT_OFFICIAL_RATE_COLUMN_WITHOUT_AREA_FACTOR",
        priceRelation: component.priceRelation,
        formulaId: component.formulaId,
        resolution: component.priceRelation === "INCLUDED_IN_PARENT"
          ? { kind: "INCLUDED_COMPONENT_ROW", rowId: component.rowId, parentRowId: LABOR_ROW_ID }
          : { kind: "ROW", rowId: component.rowId },
      })),
      {
        expectedResourceId: "required-operation:internal-debris-handling-within-object",
        operationId: "internal_debris_handling_within_object",
        category: "construction_work",
        specification: "Уборка, вертикальное перемещение и переноска до 50 м",
        condition: "selected_krer_46_reconstruction_rate",
        sourceId: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "INCLUDED_IN_OFFICIAL_LABOR_RATE",
        detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: "wooden_window_without_sill_board_fill_demolition_labor_krer_46_04_012_02_v1",
        resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
      },
      {
        expectedResourceId: "adjacent-operation:offsite-waste-haul",
        operationId: "offsite_waste_haul",
        category: "service",
        specification: "Внеобъектовый вывоз отходов",
        condition: "not_in_krer_46_04_012_02",
        sourceId: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "t_km",
        quantityRule: "PROJECT_WASTE_PLAN_REQUIRED",
        detailPrinciple: "EXCLUDED_FROM_RATE",
        priceRelation: "SEPARATE_IF_APPLICABLE",
        resolution: {
          kind: "NOT_APPLICABLE",
          reasonRu: "КРЕР 46, п. 1.1 прямо исключает вывоз строительного мусора.",
        },
      },
    ],
  });

export function validateWoodenWindowWithoutSillBoardFillDemolitionKrer46Completeness(): true {
  const expected = new Set(COMPONENTS.map((component) => component.rowId));
  const actual = new Set(WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_RESOURCES.map((row) =>
    row.row_id));
  for (const rowId of expected) {
    if (!actual.has(rowId)) {
      throw new Error(`WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_MISSING_ROW:${rowId}`);
    }
  }
  if (actual.size !== 4) {
    throw new Error("WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ROW_COUNT_MISMATCH");
  }
  return true;
}

export const WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SHORT_INPUT = Object.freeze({
  opening_fill_area_m2: 100,
  existing_opening_fill_profile: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_PROFILE_ID,
  existing_wooden_window_without_sill_board_confirmed: true,
});

export const WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  opening_fill_area_m2: 35.5,
  existing_opening_fill_profile: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_PROFILE_ID,
  existing_wooden_window_without_sill_board_confirmed: true,
});

export async function compileWoodenWindowWithoutSillBoardFillDemolitionKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_CATALOG_ID;
  if (!(WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_CATALOG_IDS as readonly string[])
    .includes(catalogId)) {
    throw new Error(`WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters.existing_opening_fill_profile != null
    && submittedParameters.existing_opening_fill_profile
      !== WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_PROFILE_ID) {
    throw new Error("WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters.existing_wooden_window_without_sill_board_confirmed === false) {
    throw new Error("WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
  }
  validateWoodenWindowWithoutSillBoardFillDemolitionKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.wooden-window-without-sill-board-fill-demolition-krer46-r1",
    catalogId,
    primaryMeasureParameterId: "opening_fill_area_m2",
    parameterDefinitions: [...WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_PARAMETERS],
    formulaDefinitions: [...WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_FORMULAS],
    resourceDefinitions: [...WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    priceItems: [],
    currencyCode: "KGS",
    maximumResourceRows: 100,
    hashJson: estimateDeterministicHash,
  });
}
