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

export const ROLLED_ROOF_COVERING_DEMOLITION_KRER46_CATALOG_ID =
  "canonical-work:base:demolition_interior_roof_layer_dismantle_standard" as const;
export const ROLLED_ROOF_COVERING_DEMOLITION_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_CATALOG_ID,
    catalogVariant: "STANDARD_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu: "Разборка рулонного кровельного покрытия",
  }),
  wet_zone: Object.freeze({
    catalogId:
      "canonical-work:base:demolition_interior_roof_layer_dismantle_wet_zone",
    catalogVariant: "WET_ZONE_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu:
      "Разборка рулонного кровельного покрытия — влажная зона",
  }),
} as const);
export type RolledRoofCoveringDemolitionKrer46VariantKey =
  keyof typeof ROLLED_ROOF_COVERING_DEMOLITION_KRER46_VARIANTS;
export const ROLLED_ROOF_COVERING_DEMOLITION_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(ROLLED_ROOF_COVERING_DEMOLITION_KRER46_VARIANTS).map((variant) =>
    variant.catalogId),
);

export function resolveRolledRoofCoveringDemolitionKrer46Variant(
  variantKey: RolledRoofCoveringDemolitionKrer46VariantKey,
) {
  const variant = ROLLED_ROOF_COVERING_DEMOLITION_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`ROLLED_ROOF_COVERING_DEMOLITION_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}
export const ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_ID =
  "kg_krer_46_2015_reconstruction_official" as const;
export const ROLLED_ROOF_COVERING_DEMOLITION_KRER46_NORM_ID =
  "norm:kg:krer:46-04-008-01:2015" as const;
export const ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256 =
  "21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471" as const;
export const ROLLED_ROOF_COVERING_DEMOLITION_KRER46_PROFILE_ID =
  "KRER_46_04_008_01_ROLLED_ROOF_COVERING" as const;

export const ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_METADATA = Object.freeze({
  source_title:
    "КРЕР 46-2015 «Работы при реконструкции зданий и сооружений», таблица 46-04-008",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
  source_document_version: "КРЕР 46-2015; введён в действие с 1 января 2016 года",
  definition_hash: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
  exact_locator:
    "Техническая часть, п. 1.1, PDF/печатная стр. 5; таблица КРЕР 46-04-008, состав работ, измеритель и нормы ресурсов на PDF/печатной стр. 57, колонка 46-04-008-01",
  use_restriction:
    "Только разборка подтверждённого существующего кровельного покрытия из рулонных материалов по колонке 46-04-008-01 и подтверждённой площади: 14,38 чел.-ч рабочих и 6,22 маш.-ч электрической лебёдки тяговым усилием 19,62 (2) кН (т) на 100 м². Сворачивание снятого материала в рулоны включено; отдельная строка труда машинистов в таблице отсутствует. Новая кровля, иные материалы колонок 02–04 и внеобъектовый вывоз не включены.",
  source_kind: "OFFICIAL_KG_UNIT_RATE",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/459/show",
  artifact_sha256: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
  effective_from: "2016-01-01",
});

const PARAMETER_SPECS = Object.freeze([
  ["roof_covering_area_m2", "Площадь существующего рулонного кровельного покрытия", "decimal", "m2"],
  ["existing_roof_covering_profile", "Выбранная колонка КРЕР для существующего кровельного покрытия", "enum", null],
  ["existing_rolled_roof_covering_confirmed", "Подтверждено кровельное покрытие из рулонных материалов", "boolean", null],
] as const);

export type RolledRoofCoveringDemolitionParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
    truth_metadata: Json;
  };

export const ROLLED_ROOF_COVERING_DEMOLITION_KRER46_PARAMETERS:
readonly RolledRoofCoveringDemolitionParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: parameterId === "roof_covering_area_m2"
      ? { min: 0.000_001 }
      : parameterId === "existing_roof_covering_profile"
        ? { values: [ROLLED_ROOF_COVERING_DEMOLITION_KRER46_PROFILE_ID] }
        : {},
    truth_metadata: {
      contract: "rik-expo-app.rolled-roof-covering-demolition-krer46-r1",
      semantic_parameter_key: `rolled-roof-covering-demolition:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "USER_OR_APPROVED_EXISTING_CONDITION_SURVEY",
      input_origin_class: parameterId === "roof_covering_area_m2"
        ? "KNOWN_WORK_SCOPE"
        : "EXISTING_CONDITION_AND_RATE_APPLICABILITY_CONFIRMATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: parameterId !== "roof_covering_area_m2",
      guide: {
        guide_kind: parameterId === "roof_covering_area_m2"
          ? "MEASUREMENT_RULE"
          : parameterId === "existing_roof_covering_profile"
            ? "ENUM_DECISION_RULE"
            : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "roof_covering_area_m2"
          ? "Укажите фактическую площадь разбираемого рулонного кровельного покрытия без коэффициента зоны или запаса."
          : "Подтвердите обследованием покрытие из рулонных материалов и применимость колонки 46-04-008-01; для листовой стали, асбестоцементных плит, черепицы или волнистых листов выберите отдельную норму.",
        source_role: "OFFICIAL_KG_UNIT_RATE_AND_EXISTING_CONDITION_SURVEY",
        source_document: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_ID,
        source_locator: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
        guide_version: "rolled-roof-covering-demolition-krer46-r1",
        source_snapshot_hash: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
        applicability:
          "Только таблица 46-04-008, колонка 01: кровельное покрытие из рулонных материалов; колонки 02–04 для листовой стали, асбестоцементных плит, черепицы и волнистых листов не подменяются.",
        verified_at: "2026-09-24T06:55:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_APPLICABILITY_REJECT_WRONG_ROOF_COVERING_TYPE_OR_PROFILE",
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

export const ROLLED_ROOF_COVERING_DEMOLITION_KRER46_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("rolled_roof_covering_demolition_area_v1", "m2", "roof_covering_area_m2"),
  formula(
    "rolled_roof_covering_demolition_labor_krer_46_04_008_01_v1",
    "man_hour",
    "roof_covering_area_m2 * 14.38 / 100",
  ),
  formula(
    "rolled_roof_covering_demolition_electric_winch_krer_46_04_008_01_v1",
    "machine_hour",
    "roof_covering_area_m2 * 6.22 / 100",
  ),
]);

const applicable = {
  kind: "and",
  operands: [
    {
      kind: "equals",
      parameterId: "existing_roof_covering_profile",
      value: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_PROFILE_ID,
    },
    {
      kind: "equals",
      parameterId: "existing_rolled_roof_covering_confirmed",
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
    semanticOwnerId: `rolled-roof-covering-demolition:${input.rowId}`,
    costOwner: input.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: input.costTreatment,
    payable: input.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "roof_covering_area_m2",
    quantityBasis: "CONFIRMED_ROOF_COVERING_AREA_TIMES_EXACT_KRER_RATE_PER_100_M2",
    ...(input.parentRowId ? { parentCostOwnerId: input.parentRowId } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "OFFICIAL_KG_RESOURCE_NORM",
    krerResourceCode: input.krerResourceCode,
    normativeRatePer100M2: input.normativeRatePer100M2,
    normativeTrace: [{
      sourceId: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_ID,
      source_id: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_ID,
      normId: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_NORM_ID,
      norm_id: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_NORM_ID,
      normVersion:
        ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_METADATA.source_document_version,
      source_title: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_METADATA.source_title,
      exact_locator: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      source_definition_hash: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
    }],
    excludedAdjacentScope: [
      "new roof covering, substrate, insulation, flashings or finishing",
      "repair or reinstatement of roof substrate and junctions",
      "sheet steel, asbestos-cement tile, roof tile, corrugated asbestos-cement sheet or another covering",
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

const LABOR_ROW_ID = "f09:rolled_roof_covering_demolition:labor";

export const ROLLED_ROOF_COVERING_DEMOLITION_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({
    rowId: "f09:rolled_roof_covering_demolition:operation",
    ordinal: 0,
    section: "Состав работ",
    category: "construction_work",
    titleRu: "Разборка рулонного кровельного покрытия",
    unitId: "m2",
    formulaId: "rolled_roof_covering_demolition_area_v1",
    costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
    parentRowId: LABOR_ROW_ID,
    krerResourceCode: "46-04-008-01",
    normativeRatePer100M2: 100,
  }),
  resource({
    rowId: LABOR_ROW_ID,
    ordinal: 1,
    section: "Труд",
    category: "construction_work",
    titleRu: "Труд рабочих-строителей среднего разряда 2,0",
    unitId: "man_hour",
    formulaId: "rolled_roof_covering_demolition_labor_krer_46_04_008_01_v1",
    costTreatment: "OWN_COST",
    krerResourceCode: "000-1002-0",
    normativeRatePer100M2: 14.38,
  }),
  resource({
    rowId: "f09:rolled_roof_covering_demolition:electric_winch_19_62kn",
    ordinal: 2,
    section: "Машины и механизмы",
    category: "equipment",
    titleRu: "Лебёдка электрическая тяговым усилием 19,62 (2) кН (т)",
    unitId: "machine_hour",
    formulaId: "rolled_roof_covering_demolition_electric_winch_krer_46_04_008_01_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "03-0160",
    normativeRatePer100M2: 6.22,
  }),
]);

const COMPONENTS = Object.freeze([
  { operationId: "rolled_roof_covering_demolition", rowId: "f09:rolled_roof_covering_demolition:operation", category: "construction_work", specification: "Разборка рулонного кровельного покрытия", unitId: "m2", formulaId: "rolled_roof_covering_demolition_area_v1", priceRelation: "INCLUDED_IN_PARENT" },
  { operationId: "construction_labor_grade_2_0", rowId: LABOR_ROW_ID, category: "construction_work", specification: "14,38 чел.-ч на 100 м²", unitId: "man_hour", formulaId: "rolled_roof_covering_demolition_labor_krer_46_04_008_01_v1", priceRelation: "OWN_COST" },
  { operationId: "electric_winch_19_62kn", rowId: "f09:rolled_roof_covering_demolition:electric_winch_19_62kn", category: "equipment", specification: "6,22 маш.-ч на 100 м²", unitId: "machine_hour", formulaId: "rolled_roof_covering_demolition_electric_winch_krer_46_04_008_01_v1", priceRelation: "OWN_COST" },
]);

export const ROLLED_ROOF_COVERING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "NORMATIVE_OPERATION_MAP",
    rateTable: "KRER_46_04_008_01",
    generatedFromCurrentRows: false,
    evidenceSha256: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
    evidenceReferences: [
      "https://minstroy.gov.kg/ru/kyzmat/459/show",
      "КРЕР 46-2015, PDF/печатные страницы 5 и 57",
    ],
    entries: [
      ...COMPONENTS.map((component) => ({
        expectedResourceId: `required-resource:${component.operationId}`,
        operationId: component.operationId,
        category: component.category,
        specification: component.specification,
        condition: "confirmed_krer_46_04_008_01_rolled_roof_covering",
        sourceId: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_ID,
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
        expectedResourceId: "required-operation:roll-dismantled-roofing-material",
        operationId: "roll_dismantled_roofing_material",
        category: "construction_work",
        specification: "Сворачивание снятого рулонного кровельного материала в рулоны",
        condition: "confirmed_krer_46_04_008_01_rolled_roof_covering",
        sourceId: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "INCLUDED_IN_OFFICIAL_LABOR_RATE",
        detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: "rolled_roof_covering_demolition_labor_krer_46_04_008_01_v1",
        resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
      },
      {
        expectedResourceId: "required-operation:internal-debris-handling-within-object",
        operationId: "internal_debris_handling_within_object",
        category: "construction_work",
        specification: "Уборка, вертикальное перемещение и переноска до 50 м",
        condition: "selected_krer_46_reconstruction_rate",
        sourceId: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "INCLUDED_IN_OFFICIAL_LABOR_RATE",
        detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: "rolled_roof_covering_demolition_labor_krer_46_04_008_01_v1",
        resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
      },
      {
        expectedResourceId: "adjacent-operation:offsite-waste-haul",
        operationId: "offsite_waste_haul",
        category: "service",
        specification: "Внеобъектовый вывоз отходов",
        condition: "not_in_krer_46_04_008_01",
        sourceId: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_ID,
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

export function validateRolledRoofCoveringDemolitionKrer46Completeness(): true {
  const expected = new Set(COMPONENTS.map((component) => component.rowId));
  const actual = new Set(ROLLED_ROOF_COVERING_DEMOLITION_KRER46_RESOURCES.map((row) =>
    row.row_id));
  for (const rowId of expected) {
    if (!actual.has(rowId)) {
      throw new Error(`ROLLED_ROOF_COVERING_DEMOLITION_KRER46_MISSING_ROW:${rowId}`);
    }
  }
  if (actual.size !== 3) {
    throw new Error("ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ROW_COUNT_MISMATCH");
  }
  return true;
}

export const ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SHORT_INPUT = Object.freeze({
  roof_covering_area_m2: 100,
  existing_roof_covering_profile: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_PROFILE_ID,
  existing_rolled_roof_covering_confirmed: true,
});

export const ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  roof_covering_area_m2: 35.5,
  existing_roof_covering_profile: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_PROFILE_ID,
  existing_rolled_roof_covering_confirmed: true,
});

export async function compileRolledRoofCoveringDemolitionKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? ROLLED_ROOF_COVERING_DEMOLITION_KRER46_CATALOG_ID;
  if (!(ROLLED_ROOF_COVERING_DEMOLITION_KRER46_CATALOG_IDS as readonly string[])
    .includes(catalogId)) {
    throw new Error(`ROLLED_ROOF_COVERING_DEMOLITION_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters.existing_roof_covering_profile != null
    && submittedParameters.existing_roof_covering_profile
      !== ROLLED_ROOF_COVERING_DEMOLITION_KRER46_PROFILE_ID) {
    throw new Error("ROLLED_ROOF_COVERING_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters.existing_rolled_roof_covering_confirmed === false) {
    throw new Error("ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ROOF_COVERING_TYPE_NOT_CONFIRMED");
  }
  validateRolledRoofCoveringDemolitionKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.rolled-roof-covering-demolition-krer46-r1",
    catalogId,
    primaryMeasureParameterId: "roof_covering_area_m2",
    parameterDefinitions: [...ROLLED_ROOF_COVERING_DEMOLITION_KRER46_PARAMETERS],
    formulaDefinitions: [...ROLLED_ROOF_COVERING_DEMOLITION_KRER46_FORMULAS],
    resourceDefinitions: [...ROLLED_ROOF_COVERING_DEMOLITION_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    priceItems: [],
    currencyCode: "KGS",
    maximumResourceRows: 100,
    hashJson: estimateDeterministicHash,
  });
}
