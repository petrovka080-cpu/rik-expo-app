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

export const AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_ID =
  "canonical-work:base:demolition_interior_ceiling_dismantle_standard" as const;
export const AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_ID,
    catalogVariant: "STANDARD_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu: "Разборка деревянного подвесного потолка из плит «Акмигран»",
  }),
  large_area: Object.freeze({
    catalogId:
      "canonical-work:base:demolition_interior_ceiling_dismantle_large_area",
    catalogVariant: "LARGE_AREA_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu:
      "Разборка деревянного подвесного потолка из плит «Акмигран» — большая площадь",
  }),
  small_area: Object.freeze({
    catalogId:
      "canonical-work:base:demolition_interior_ceiling_dismantle_small_area",
    catalogVariant: "SMALL_AREA_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu:
      "Разборка деревянного подвесного потолка из плит «Акмигран» — малая площадь",
  }),
  wet_zone: Object.freeze({
    catalogId:
      "canonical-work:base:demolition_interior_ceiling_dismantle_wet_zone",
    catalogVariant: "WET_ZONE_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu:
      "Разборка деревянного подвесного потолка из плит «Акмигран» — влажная зона",
  }),
} as const);
export type AkmigranSuspendedCeilingDemolitionKrer46VariantKey =
  keyof typeof AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_VARIANTS;
export const AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_VARIANTS).map((variant) =>
    variant.catalogId),
);

export function resolveAkmigranSuspendedCeilingDemolitionKrer46Variant(
  variantKey: AkmigranSuspendedCeilingDemolitionKrer46VariantKey,
) {
  const variant = AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}
export const AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID =
  "kg_krer_46_2015_reconstruction_official" as const;
export const AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_NORM_ID =
  "norm:kg:krer:46-04-007-06:2015" as const;
export const AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256 =
  "21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471" as const;
export const AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_PROFILE_ID =
  "KRER_46_04_007_06_WOODEN_SUSPENDED_CEILING_AKMIGRAN_PANEL" as const;

export const AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_METADATA = Object.freeze({
  source_title:
    "КРЕР 46-2015 «Работы при реконструкции зданий и сооружений», таблица 46-04-007",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
  source_document_version: "КРЕР 46-2015; введён в действие с 1 января 2016 года",
  definition_hash: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
  exact_locator:
    "Техническая часть, п. 1.1, PDF/печатная стр. 5; таблица КРЕР 46-04-007, состав работ и измеритель на PDF/печатных стр. 55–56, колонка 46-04-007-06 и нормы ресурсов на стр. 56",
  use_restriction:
    "Только разборка подтверждённого существующего деревянного подвесного потолка из плит «Акмигран» по колонке 46-04-007-06 и подтверждённой площади: 66,87 чел.-ч рабочих, 2,20 чел.-ч машинистов и 2,20 маш.-ч подъёмника на 100 м². Разболчивание несущих балок и направляющих, снятие плит, гребёнок и подвесов включены; новый потолок, восстановление примыканий и внеобъектовый вывоз не включены.",
  source_kind: "OFFICIAL_KG_UNIT_RATE",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/459/show",
  artifact_sha256: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
  effective_from: "2016-01-01",
});

const PARAMETER_SPECS = Object.freeze([
  ["ceiling_area_m2", "Площадь существующего деревянного подвесного потолка", "decimal", "m2"],
  ["existing_suspended_ceiling_profile", "Выбранная колонка КРЕР для существующего подвесного потолка", "enum", null],
  ["existing_wooden_suspended_ceiling_akmigran_panel_confirmed", "Подтверждён деревянный подвесной потолок из плит «Акмигран»", "boolean", null],
] as const);

export type AkmigranSuspendedCeilingDemolitionParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
    truth_metadata: Json;
  };

export const AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_PARAMETERS:
readonly AkmigranSuspendedCeilingDemolitionParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: parameterId === "ceiling_area_m2"
      ? { min: 0.000_001 }
      : parameterId === "existing_suspended_ceiling_profile"
        ? { values: [AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_PROFILE_ID] }
        : {},
    truth_metadata: {
      contract: "rik-expo-app.akmigran-suspended-ceiling-demolition-krer46-r1",
      semantic_parameter_key: `akmigran-suspended-ceiling-demolition:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "USER_OR_APPROVED_EXISTING_CONDITION_SURVEY",
      input_origin_class: parameterId === "ceiling_area_m2"
        ? "KNOWN_WORK_SCOPE"
        : "EXISTING_CONDITION_AND_RATE_APPLICABILITY_CONFIRMATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: parameterId !== "ceiling_area_m2",
      guide: {
        guide_kind: parameterId === "ceiling_area_m2"
          ? "MEASUREMENT_RULE"
          : parameterId === "existing_suspended_ceiling_profile"
            ? "ENUM_DECISION_RULE"
            : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "ceiling_area_m2"
          ? "Укажите фактическую площадь разбираемого подвесного потолка без коэффициента зоны или запаса."
          : "Подтвердите обследованием деревянный подвесной потолок из плит «Акмигран» и применимость колонки 46-04-007-06; для асбестоцементных плит или потолка другой конструкции выберите отдельную норму.",
        source_role: "OFFICIAL_KG_UNIT_RATE_AND_EXISTING_CONDITION_SURVEY",
        source_document: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID,
        source_locator: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
        guide_version: "akmigran-suspended-ceiling-demolition-krer46-r1",
        source_snapshot_hash: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
        applicability:
          "Только таблица 46-04-007, колонка 06: деревянный подвесной потолок из плит «Акмигран»; колонка 05 для асбестоцементных плит и колонки 01–04 для других перекрытий и покрытий не подменяются.",
        verified_at: "2026-09-24T06:12:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_APPLICABILITY_REJECT_WRONG_CEILING_TYPE_OR_PROFILE",
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

export const AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("akmigran_suspended_ceiling_demolition_area_v1", "m2", "ceiling_area_m2"),
  formula(
    "akmigran_suspended_ceiling_demolition_labor_krer_46_04_007_06_v1",
    "man_hour",
    "ceiling_area_m2 * 66.87 / 100",
  ),
  formula(
    "akmigran_suspended_ceiling_demolition_machinist_labor_krer_46_04_007_06_v1",
    "man_hour",
    "ceiling_area_m2 * 2.2 / 100",
  ),
  formula(
    "akmigran_suspended_ceiling_demolition_lift_krer_46_04_007_06_v1",
    "machine_hour",
    "ceiling_area_m2 * 2.2 / 100",
  ),
]);

const applicable = {
  kind: "and",
  operands: [
    {
      kind: "equals",
      parameterId: "existing_suspended_ceiling_profile",
      value: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_PROFILE_ID,
    },
    {
      kind: "equals",
      parameterId: "existing_wooden_suspended_ceiling_akmigran_panel_confirmed",
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
    semanticOwnerId: `akmigran-suspended-ceiling-demolition:${input.rowId}`,
    costOwner: input.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: input.costTreatment,
    payable: input.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "ceiling_area_m2",
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
      sourceId: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID,
      source_id: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID,
      normId: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_NORM_ID,
      norm_id: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_NORM_ID,
      normVersion:
        AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_METADATA.source_document_version,
      source_title: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_METADATA.source_title,
      exact_locator: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      source_definition_hash: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
    }],
    excludedAdjacentScope: [
      "new ceiling, frame, panels, suspension, guides or finishing",
      "repair or reinstatement of adjacent walls, floor or ceiling junctions",
      "asbestos-cement panel or another ceiling construction",
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

const LABOR_ROW_ID = "f09:akmigran_suspended_ceiling_demolition:labor";

export const AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({
    rowId: "f09:akmigran_suspended_ceiling_demolition:operation",
    ordinal: 0,
    section: "Состав работ",
    category: "construction_work",
    titleRu: "Разборка деревянного подвесного потолка из плит «Акмигран»",
    unitId: "m2",
    formulaId: "akmigran_suspended_ceiling_demolition_area_v1",
    costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
    parentRowId: LABOR_ROW_ID,
    krerResourceCode: "46-04-007-06",
    normativeRatePer100M2: 100,
  }),
  resource({
    rowId: LABOR_ROW_ID,
    ordinal: 1,
    section: "Труд",
    category: "construction_work",
    titleRu: "Труд рабочих-строителей среднего разряда 3,1",
    unitId: "man_hour",
    formulaId: "akmigran_suspended_ceiling_demolition_labor_krer_46_04_007_06_v1",
    costTreatment: "OWN_COST",
    krerResourceCode: "000-1003-1",
    normativeRatePer100M2: 66.87,
  }),
  resource({
    rowId: "f09:akmigran_suspended_ceiling_demolition:machinist_labor",
    ordinal: 2,
    section: "Справочный состав машин",
    category: "construction_work",
    titleRu: "Затраты труда машинистов по расценке",
    unitId: "man_hour",
    formulaId: "akmigran_suspended_ceiling_demolition_machinist_labor_krer_46_04_007_06_v1",
    costTreatment: "INFORMATIONAL_SCOPE",
    krerResourceCode: "KRER_AGGREGATE_MACHINIST_LABOR",
    normativeRatePer100M2: 2.2,
  }),
  resource({
    rowId: "f09:akmigran_suspended_ceiling_demolition:lift_500kg",
    ordinal: 3,
    section: "Машины и механизмы",
    category: "equipment",
    titleRu: "Подъёмник грузоподъёмностью до 500 кг, одномачтовый, высота подъёма 45 м",
    unitId: "machine_hour",
    formulaId: "akmigran_suspended_ceiling_demolition_lift_krer_46_04_007_06_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "03-0327",
    normativeRatePer100M2: 2.2,
  }),
]);

const COMPONENTS = Object.freeze([
  { operationId: "akmigran_suspended_ceiling_demolition", rowId: "f09:akmigran_suspended_ceiling_demolition:operation", category: "construction_work", specification: "Разборка деревянного подвесного потолка из плит «Акмигран»", unitId: "m2", formulaId: "akmigran_suspended_ceiling_demolition_area_v1", priceRelation: "INCLUDED_IN_PARENT" },
  { operationId: "construction_labor_grade_3_1", rowId: LABOR_ROW_ID, category: "construction_work", specification: "66,87 чел.-ч на 100 м²", unitId: "man_hour", formulaId: "akmigran_suspended_ceiling_demolition_labor_krer_46_04_007_06_v1", priceRelation: "OWN_COST" },
  { operationId: "machinist_labor_aggregate", rowId: "f09:akmigran_suspended_ceiling_demolition:machinist_labor", category: "construction_work", specification: "2,20 чел.-ч на 100 м², справочно без повторной оплаты", unitId: "man_hour", formulaId: "akmigran_suspended_ceiling_demolition_machinist_labor_krer_46_04_007_06_v1", priceRelation: "INFORMATIONAL_SCOPE" },
  { operationId: "single_mast_lift_500kg_45m", rowId: "f09:akmigran_suspended_ceiling_demolition:lift_500kg", category: "equipment", specification: "2,20 маш.-ч на 100 м²", unitId: "machine_hour", formulaId: "akmigran_suspended_ceiling_demolition_lift_krer_46_04_007_06_v1", priceRelation: "OWN_COST" },
]);

export const AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "NORMATIVE_OPERATION_MAP",
    rateTable: "KRER_46_04_007_06",
    generatedFromCurrentRows: false,
    evidenceSha256: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
    evidenceReferences: [
      "https://minstroy.gov.kg/ru/kyzmat/459/show",
      "КРЕР 46-2015, PDF/печатные страницы 5, 55 и 56",
    ],
    entries: [
      ...COMPONENTS.map((component) => ({
        expectedResourceId: `required-resource:${component.operationId}`,
        operationId: component.operationId,
        category: component.category,
        specification: component.specification,
        condition: "confirmed_krer_46_04_007_06_wooden_suspended_ceiling_akmigran_panel",
        sourceId: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID,
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
        expectedResourceId: "required-operation:release-ceiling-bearing-fasteners",
        operationId: "release_ceiling_bearing_fasteners",
        category: "construction_work",
        specification: "Вывинчивание шурупов и снятие болтов с несущих балок и деревянных направляющих брусков",
        condition: "confirmed_krer_46_04_007_06_wooden_suspended_ceiling_akmigran_panel",
        sourceId: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "INCLUDED_IN_OFFICIAL_LABOR_RATE",
        detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: "akmigran_suspended_ceiling_demolition_labor_krer_46_04_007_06_v1",
        resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
      },
      {
        expectedResourceId: "required-operation:dismantle-ceiling-panels-guides-and-suspensions",
        operationId: "dismantle_ceiling_panels_guides_and_suspensions",
        category: "construction_work",
        specification: "Снятие плит, алюминиевых гребёнок, подвесов и несущих уголков с разболчиванием",
        condition: "confirmed_krer_46_04_007_06_wooden_suspended_ceiling_akmigran_panel",
        sourceId: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "INCLUDED_IN_OFFICIAL_LABOR_RATE",
        detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: "akmigran_suspended_ceiling_demolition_labor_krer_46_04_007_06_v1",
        resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
      },
      {
        expectedResourceId: "required-operation:internal-debris-handling-within-object",
        operationId: "internal_debris_handling_within_object",
        category: "construction_work",
        specification: "Уборка, вертикальное перемещение и переноска до 50 м",
        condition: "selected_krer_46_reconstruction_rate",
        sourceId: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "INCLUDED_IN_OFFICIAL_LABOR_RATE",
        detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: "akmigran_suspended_ceiling_demolition_labor_krer_46_04_007_06_v1",
        resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
      },
      {
        expectedResourceId: "adjacent-operation:offsite-waste-haul",
        operationId: "offsite_waste_haul",
        category: "service",
        specification: "Внеобъектовый вывоз отходов",
        condition: "not_in_krer_46_04_007_06",
        sourceId: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID,
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

export function validateAkmigranSuspendedCeilingDemolitionKrer46Completeness(): true {
  const expected = new Set(COMPONENTS.map((component) => component.rowId));
  const actual = new Set(AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_RESOURCES.map((row) =>
    row.row_id));
  for (const rowId of expected) {
    if (!actual.has(rowId)) {
      throw new Error(`AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_MISSING_ROW:${rowId}`);
    }
  }
  if (actual.size !== 4) {
    throw new Error("AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ROW_COUNT_MISMATCH");
  }
  return true;
}

export const AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT = Object.freeze({
  ceiling_area_m2: 100,
  existing_suspended_ceiling_profile: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_PROFILE_ID,
  existing_wooden_suspended_ceiling_akmigran_panel_confirmed: true,
});

export const AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  ceiling_area_m2: 35.5,
  existing_suspended_ceiling_profile: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_PROFILE_ID,
  existing_wooden_suspended_ceiling_akmigran_panel_confirmed: true,
});

export async function compileAkmigranSuspendedCeilingDemolitionKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_ID;
  if (!(AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_IDS as readonly string[])
    .includes(catalogId)) {
    throw new Error(`AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters.existing_suspended_ceiling_profile != null
    && submittedParameters.existing_suspended_ceiling_profile
      !== AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_PROFILE_ID) {
    throw new Error("AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters.existing_wooden_suspended_ceiling_akmigran_panel_confirmed === false) {
    throw new Error("AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CEILING_TYPE_NOT_CONFIRMED");
  }
  validateAkmigranSuspendedCeilingDemolitionKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.akmigran-suspended-ceiling-demolition-krer46-r1",
    catalogId,
    primaryMeasureParameterId: "ceiling_area_m2",
    parameterDefinitions: [...AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_PARAMETERS],
    formulaDefinitions: [...AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_FORMULAS],
    resourceDefinitions: [...AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    priceItems: [],
    currencyCode: "KGS",
    maximumResourceRows: 100,
    hashJson: estimateDeterministicHash,
  });
}
