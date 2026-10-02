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

export const ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_CATALOG_ID =
  "canonical-work:base:demolition_interior_flooring_dismantle_standard" as const;
export const ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_CATALOG_ID,
    catalogVariant: "STANDARD_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu: "Разборка асфальтового или асфальтобетонного покрытия пола",
  }),
  large_area: Object.freeze({
    catalogId:
      "canonical-work:base:demolition_interior_flooring_dismantle_large_area",
    catalogVariant: "LARGE_AREA_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu:
      "Разборка асфальтового или асфальтобетонного покрытия пола — большая площадь",
  }),
  small_area: Object.freeze({
    catalogId:
      "canonical-work:base:demolition_interior_flooring_dismantle_small_area",
    catalogVariant: "SMALL_AREA_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu:
      "Разборка асфальтового или асфальтобетонного покрытия пола — малая площадь",
  }),
  wet_zone: Object.freeze({
    catalogId:
      "canonical-work:base:demolition_interior_flooring_dismantle_wet_zone",
    catalogVariant: "WET_ZONE_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu:
      "Разборка асфальтового или асфальтобетонного покрытия пола — влажная зона",
  }),
} as const);
export type AsphaltFloorCoveringDemolitionKrer46VariantKey =
  keyof typeof ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_VARIANTS;
export const ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_VARIANTS).map((variant) =>
    variant.catalogId),
);

export function resolveAsphaltFloorCoveringDemolitionKrer46Variant(
  variantKey: AsphaltFloorCoveringDemolitionKrer46VariantKey,
) {
  const variant = ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}
export const ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_ID =
  "kg_krer_46_2015_reconstruction_official" as const;
export const ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_NORM_ID =
  "norm:kg:krer:46-04-010-01:2015" as const;
export const ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256 =
  "21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471" as const;
export const ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_PROFILE_ID =
  "KRER_46_04_010_01_ASPHALT_ASPHALT_CONCRETE_FLOOR_COVERING" as const;

export const ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_METADATA = Object.freeze({
  source_title:
    "КРЕР 46-2015 «Работы при реконструкции зданий и сооружений», таблица 46-04-010",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
  source_document_version: "КРЕР 46-2015; введён в действие с 1 января 2016 года",
  definition_hash: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
  exact_locator:
    "Техническая часть, п. 1.1, PDF/печатная стр. 5; таблица КРЕР 46-04-010, состав работ, измеритель и нормы ресурсов на PDF/печатных стр. 57–58, колонка 46-04-010-01",
  use_restriction:
    "Только разборка подтверждённого существующего покрытия пола из асфальта или асфальтобетона по колонке 46-04-010-01 и подтверждённой площади: 23,78 чел.-ч рабочих, 4,71 чел.-ч машинистов справочно, 4,71 маш.-ч передвижного компрессора и 9,42 маш.-ч пневматических отбойных молотков на 100 м². Уборка, вертикальное перемещение и переноска мусора до 50 м включены; основание пола, другие покрытия и внеобъектовый вывоз не включены.",
  source_kind: "OFFICIAL_KG_UNIT_RATE",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/459/show",
  artifact_sha256: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
  effective_from: "2016-01-01",
});

const PARAMETER_SPECS = Object.freeze([
  ["floor_covering_area_m2", "Площадь существующего асфальтового или асфальтобетонного покрытия пола", "decimal", "m2"],
  ["existing_floor_covering_profile", "Выбранная колонка КРЕР для существующего покрытия пола", "enum", null],
  ["existing_asphalt_floor_covering_confirmed", "Подтверждено покрытие пола из асфальта или асфальтобетона", "boolean", null],
] as const);

export type AsphaltFloorCoveringDemolitionParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
    truth_metadata: Json;
  };

export const ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_PARAMETERS:
readonly AsphaltFloorCoveringDemolitionParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: parameterId === "floor_covering_area_m2"
      ? { min: 0.000_001 }
      : parameterId === "existing_floor_covering_profile"
        ? { values: [ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_PROFILE_ID] }
        : {},
    truth_metadata: {
      contract: "rik-expo-app.asphalt-floor-covering-demolition-krer46-r1",
      semantic_parameter_key: `asphalt-floor-covering-demolition:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "USER_OR_APPROVED_EXISTING_CONDITION_SURVEY",
      input_origin_class: parameterId === "floor_covering_area_m2"
        ? "KNOWN_WORK_SCOPE"
        : "EXISTING_CONDITION_AND_RATE_APPLICABILITY_CONFIRMATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: parameterId !== "floor_covering_area_m2",
      guide: {
        guide_kind: parameterId === "floor_covering_area_m2"
          ? "MEASUREMENT_RULE"
          : parameterId === "existing_floor_covering_profile"
            ? "ENUM_DECISION_RULE"
            : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "floor_covering_area_m2"
          ? "Укажите фактическую площадь разбираемого асфальтового или асфальтобетонного покрытия пола без коэффициента зоны или запаса."
          : "Подтвердите обследованием покрытие пола из асфальта или асфальтобетона и применимость колонки 46-04-010-01; для бетонного основания или другого покрытия выберите отдельную норму.",
        source_role: "OFFICIAL_KG_UNIT_RATE_AND_EXISTING_CONDITION_SURVEY",
        source_document: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_ID,
        source_locator: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
        guide_version: "asphalt-floor-covering-demolition-krer46-r1",
        source_snapshot_hash: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
        applicability:
          "Только таблица 46-04-010, колонка 01: покрытие пола из асфальта или асфальтобетона; бетонное основание таблицы 46-04-009 и другие покрытия колонок 02–07 не подменяются.",
        verified_at: "2026-09-24T07:35:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_APPLICABILITY_REJECT_WRONG_FLOOR_COVERING_TYPE_OR_PROFILE",
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

export const ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("asphalt_floor_covering_demolition_area_v1", "m2", "floor_covering_area_m2"),
  formula(
    "asphalt_floor_covering_demolition_labor_krer_46_04_010_01_v1",
    "man_hour",
    "floor_covering_area_m2 * 23.78 / 100",
  ),
  formula(
    "asphalt_floor_covering_demolition_machinist_labor_krer_46_04_010_01_v1",
    "man_hour",
    "floor_covering_area_m2 * 4.71 / 100",
  ),
  formula(
    "asphalt_floor_covering_demolition_compressor_krer_46_04_010_01_v1",
    "machine_hour",
    "floor_covering_area_m2 * 4.71 / 100",
  ),
  formula(
    "asphalt_floor_covering_demolition_pneumatic_breaker_krer_46_04_010_01_v1",
    "machine_hour",
    "floor_covering_area_m2 * 9.42 / 100",
  ),
]);

const applicable = {
  kind: "and",
  operands: [
    {
      kind: "equals",
      parameterId: "existing_floor_covering_profile",
      value: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_PROFILE_ID,
    },
    {
      kind: "equals",
      parameterId: "existing_asphalt_floor_covering_confirmed",
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
    semanticOwnerId: `asphalt-floor-covering-demolition:${input.rowId}`,
    costOwner: input.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: input.costTreatment,
    payable: input.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "floor_covering_area_m2",
    quantityBasis: "CONFIRMED_FLOOR_COVERING_AREA_TIMES_EXACT_KRER_RATE_PER_100_M2",
    ...(input.parentRowId ? { parentCostOwnerId: input.parentRowId } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "OFFICIAL_KG_RESOURCE_NORM",
    krerResourceCode: input.krerResourceCode,
    normativeRatePer100M2: input.normativeRatePer100M2,
    normativeTrace: [{
      sourceId: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_ID,
      source_id: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_ID,
      normId: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_NORM_ID,
      norm_id: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_NORM_ID,
      normVersion:
        ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_METADATA.source_document_version,
      source_title: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_METADATA.source_title,
      exact_locator: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      source_definition_hash: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
    }],
    excludedAdjacentScope: [
      "new floor covering, screed, base, underlay or finishing",
      "repair or reinstatement of the floor base and junctions",
      "concrete floor base from KRER 46-04-009 or another covering from columns 02–07",
      "offsite waste haul and disposal",
      "invented area-class factor or market price",
    ],  };
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

const LABOR_ROW_ID = "f09:asphalt_floor_covering_demolition:labor";

export const ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({
    rowId: "f09:asphalt_floor_covering_demolition:operation",
    ordinal: 0,
    section: "Состав работ",
    category: "construction_work",
    titleRu: "Разборка асфальтового или асфальтобетонного покрытия пола",
    unitId: "m2",
    formulaId: "asphalt_floor_covering_demolition_area_v1",
    costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
    parentRowId: LABOR_ROW_ID,
    krerResourceCode: "46-04-010-01",
    normativeRatePer100M2: 100,
  }),
  resource({
    rowId: LABOR_ROW_ID,
    ordinal: 1,
    section: "Труд",
    category: "construction_work",
    titleRu: "Труд рабочих-строителей среднего разряда 3,6",
    unitId: "man_hour",
    formulaId: "asphalt_floor_covering_demolition_labor_krer_46_04_010_01_v1",
    costTreatment: "OWN_COST",
    krerResourceCode: "000-1003-6",
    normativeRatePer100M2: 23.78,
  }),
  resource({
    rowId: "f09:asphalt_floor_covering_demolition:machinist_labor",
    ordinal: 2,
    section: "Справочный состав машин",
    category: "construction_work",
    titleRu: "Затраты труда машинистов по расценке",
    unitId: "man_hour",
    formulaId: "asphalt_floor_covering_demolition_machinist_labor_krer_46_04_010_01_v1",
    costTreatment: "INFORMATIONAL_SCOPE",
    krerResourceCode: "KRER_AGGREGATE_MACHINIST_LABOR",
    normativeRatePer100M2: 4.71,
  }),
  resource({
    rowId: "f09:asphalt_floor_covering_demolition:compressor_5m3_min_686kpa",
    ordinal: 3,
    section: "Машины и механизмы",
    category: "equipment",
    titleRu: "Компрессор передвижной с двигателем внутреннего сгорания, давление до 686 кПа (7 атм), производительность 5 м³/мин",
    unitId: "machine_hour",
    formulaId: "asphalt_floor_covering_demolition_compressor_krer_46_04_010_01_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "05-0005",
    normativeRatePer100M2: 4.71,
  }),
  resource({
    rowId: "f09:asphalt_floor_covering_demolition:pneumatic_breaker",
    ordinal: 4,
    section: "Машины и механизмы",
    category: "equipment",
    titleRu: "Молоток отбойный пневматический",
    unitId: "machine_hour",
    formulaId: "asphalt_floor_covering_demolition_pneumatic_breaker_krer_46_04_010_01_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "33-0384",
    normativeRatePer100M2: 9.42,
  }),
]);

const COMPONENTS = Object.freeze([
  { operationId: "asphalt_floor_covering_demolition", rowId: "f09:asphalt_floor_covering_demolition:operation", category: "construction_work", specification: "Разборка асфальтового или асфальтобетонного покрытия пола", unitId: "m2", formulaId: "asphalt_floor_covering_demolition_area_v1", priceRelation: "INCLUDED_IN_PARENT" },
  { operationId: "construction_labor_grade_3_6", rowId: LABOR_ROW_ID, category: "construction_work", specification: "23,78 чел.-ч на 100 м²", unitId: "man_hour", formulaId: "asphalt_floor_covering_demolition_labor_krer_46_04_010_01_v1", priceRelation: "OWN_COST" },
  { operationId: "machinist_labor_aggregate", rowId: "f09:asphalt_floor_covering_demolition:machinist_labor", category: "construction_work", specification: "4,71 чел.-ч на 100 м², справочно без повторной оплаты", unitId: "man_hour", formulaId: "asphalt_floor_covering_demolition_machinist_labor_krer_46_04_010_01_v1", priceRelation: "INFORMATIONAL_SCOPE" },
  { operationId: "portable_compressor_5m3_min_686kpa", rowId: "f09:asphalt_floor_covering_demolition:compressor_5m3_min_686kpa", category: "equipment", specification: "4,71 маш.-ч на 100 м²", unitId: "machine_hour", formulaId: "asphalt_floor_covering_demolition_compressor_krer_46_04_010_01_v1", priceRelation: "OWN_COST" },
  { operationId: "pneumatic_breaker", rowId: "f09:asphalt_floor_covering_demolition:pneumatic_breaker", category: "equipment", specification: "9,42 маш.-ч на 100 м²", unitId: "machine_hour", formulaId: "asphalt_floor_covering_demolition_pneumatic_breaker_krer_46_04_010_01_v1", priceRelation: "OWN_COST" },
]);

export const ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "NORMATIVE_OPERATION_MAP",
    rateTable: "KRER_46_04_010_01",
    generatedFromCurrentRows: false,
    evidenceSha256: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
    evidenceReferences: [
      "https://minstroy.gov.kg/ru/kyzmat/459/show",
      "КРЕР 46-2015, PDF/печатные страницы 5, 57 и 58",
    ],
    entries: [
      ...COMPONENTS.map((component) => ({
        expectedResourceId: `required-resource:${component.operationId}`,
        operationId: component.operationId,
        category: component.category,
        specification: component.specification,
        condition: "confirmed_krer_46_04_010_01_asphalt_or_asphalt_concrete_floor_covering",
        sourceId: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_ID,
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
        sourceId: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "INCLUDED_IN_OFFICIAL_LABOR_RATE",
        detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: "asphalt_floor_covering_demolition_labor_krer_46_04_010_01_v1",
        resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
      },
      {
        expectedResourceId: "adjacent-operation:offsite-waste-haul",
        operationId: "offsite_waste_haul",
        category: "service",
        specification: "Внеобъектовый вывоз отходов",
        condition: "not_in_krer_46_04_010_01",
        sourceId: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_ID,
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

export function validateAsphaltFloorCoveringDemolitionKrer46Completeness(): true {
  const expected = new Set(COMPONENTS.map((component) => component.rowId));
  const actual = new Set(ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_RESOURCES.map((row) =>
    row.row_id));
  for (const rowId of expected) {
    if (!actual.has(rowId)) {
      throw new Error(`ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_MISSING_ROW:${rowId}`);
    }
  }
  if (actual.size !== 5) {
    throw new Error("ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ROW_COUNT_MISMATCH");
  }
  return true;
}

export const ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SHORT_INPUT = Object.freeze({
  floor_covering_area_m2: 100,
  existing_floor_covering_profile: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_PROFILE_ID,
  existing_asphalt_floor_covering_confirmed: true,
});

export const ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  floor_covering_area_m2: 35.5,
  existing_floor_covering_profile: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_PROFILE_ID,
  existing_asphalt_floor_covering_confirmed: true,
});

export async function compileAsphaltFloorCoveringDemolitionKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_CATALOG_ID;
  if (!(ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_CATALOG_IDS as readonly string[])
    .includes(catalogId)) {
    throw new Error(`ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters.existing_floor_covering_profile != null
    && submittedParameters.existing_floor_covering_profile
      !== ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_PROFILE_ID) {
    throw new Error("ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters.existing_asphalt_floor_covering_confirmed === false) {
    throw new Error("ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_FLOOR_COVERING_TYPE_NOT_CONFIRMED");
  }
  validateAsphaltFloorCoveringDemolitionKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.asphalt-floor-covering-demolition-krer46-r1",
    catalogId,
    primaryMeasureParameterId: "floor_covering_area_m2",
    parameterDefinitions: [...ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_PARAMETERS],
    formulaDefinitions: [...ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_FORMULAS],
    resourceDefinitions: [...ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    priceItems: [],
    currencyCode: "KGS",
    maximumResourceRows: 100,
    hashJson: estimateDeterministicHash,
  });
}
