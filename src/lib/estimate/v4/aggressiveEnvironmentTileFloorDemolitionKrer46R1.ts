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

export const AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_ID =
  "canonical-work:base:demolition_interior_tile_dismantle_standard" as const;
export const AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_ID,
    catalogVariant: "STANDARD_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu: "Разборка плиточного покрытия на битумной мастике в агрессивной среде",
  }),
  large_area: Object.freeze({
    catalogId:
      "canonical-work:base:demolition_interior_tile_dismantle_large_area",
    catalogVariant: "LARGE_AREA_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu:
      "Разборка плиточного покрытия на битумной мастике в агрессивной среде — большая площадь",
  }),
  small_area: Object.freeze({
    catalogId:
      "canonical-work:base:demolition_interior_tile_dismantle_small_area",
    catalogVariant: "SMALL_AREA_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu:
      "Разборка плиточного покрытия на битумной мастике в агрессивной среде — малая площадь",
  }),
  wet_zone: Object.freeze({
    catalogId:
      "canonical-work:base:demolition_interior_tile_dismantle_wet_zone",
    catalogVariant: "WET_ZONE_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu:
      "Разборка плиточного покрытия на битумной мастике в агрессивной среде — влажная зона",
  }),
} as const);
export type AggressiveEnvironmentTileFloorDemolitionKrer46VariantKey =
  keyof typeof AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_VARIANTS;
export const AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_VARIANTS).map((variant) =>
    variant.catalogId),
);

export function resolveAggressiveEnvironmentTileFloorDemolitionKrer46Variant(
  variantKey: AggressiveEnvironmentTileFloorDemolitionKrer46VariantKey,
) {
  const variant = AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}
export const AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID =
  "kg_krer_46_2015_reconstruction_official" as const;
export const AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_NORM_ID =
  "norm:kg:krer:46-04-011-01:2015" as const;
export const AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256 =
  "21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471" as const;
export const AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_PROFILE_ID =
  "KRER_46_04_011_01_TILE_ON_BITUMINOUS_MASTIC_AGGRESSIVE_ENVIRONMENT" as const;

export const AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA = Object.freeze({
  source_title:
    "КРЕР 46-2015 «Работы при реконструкции зданий и сооружений», таблица 46-04-011",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
  source_document_version: "КРЕР 46-2015; введён в действие с 1 января 2016 года",
  definition_hash: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  exact_locator:
    "Техническая часть, п. 1.1, PDF/печатная стр. 5; таблица КРЕР 46-04-011, состав работ и измеритель на PDF/печатной стр. 58, нормы ресурсов колонки 46-04-011-01 на стр. 59",
  use_restriction:
    "Только разборка подтверждённого существующего покрытия пола из плиток, уложенных на битумной мастике, в здании или сооружении с агрессивной средой по колонке 46-04-011-01 и подтверждённой площади: 46,63 чел.-ч рабочих, 0,36 чел.-ч машинистов справочно, 0,36 маш.-ч передвижного компрессора и 0,72 маш.-ч пневматических отбойных молотков на 100 м². Очистка годных плиток и кирпича от раствора, а также внутриобъектовое перемещение отходов включены; другие основания/замазки, обычная среда и внеобъектовый вывоз не включены.",
  source_kind: "OFFICIAL_KG_UNIT_RATE",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/459/show",
  artifact_sha256: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  effective_from: "2016-01-01",
});

const PARAMETER_SPECS = Object.freeze([
  ["floor_covering_area_m2", "Площадь существующего плиточного покрытия пола в агрессивной среде", "decimal", "m2"],
  ["existing_aggressive_environment_tile_floor_profile", "Выбранная колонка КРЕР для плиточного покрытия в агрессивной среде", "enum", null],
  ["existing_tile_on_bituminous_mastic_aggressive_environment_confirmed", "Подтверждены плитки на битумной мастике и агрессивная среда", "boolean", null],
] as const);

export type AggressiveEnvironmentTileFloorDemolitionParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
    truth_metadata: Json;
  };

export const AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_PARAMETERS:
readonly AggressiveEnvironmentTileFloorDemolitionParameter[] = Object.freeze(
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
      : parameterId === "existing_aggressive_environment_tile_floor_profile"
        ? { values: [AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_PROFILE_ID] }
        : {},
    truth_metadata: {
      contract: "rik-expo-app.aggressive-environment-tile-floor-demolition-krer46-r1",
      semantic_parameter_key: `aggressive-environment-tile-floor-demolition:${parameterId}`,
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
          : parameterId === "existing_aggressive_environment_tile_floor_profile"
            ? "ENUM_DECISION_RULE"
            : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "floor_covering_area_m2"
          ? "Укажите фактическую площадь разбираемого плиточного покрытия на битумной мастике в подтверждённой агрессивной среде без коэффициента зоны или запаса."
          : "Подтвердите обследованием плиточное покрытие на битумной мастике, агрессивную среду и применимость колонки 46-04-011-01; для раствора, другой замазки или обычной среды выберите отдельную норму.",
        source_role: "OFFICIAL_KG_UNIT_RATE_AND_EXISTING_CONDITION_SURVEY",
        source_document: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
        source_locator: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
        guide_version: "aggressive-environment-tile-floor-demolition-krer46-r1",
        source_snapshot_hash: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
        applicability:
          "Только таблица 46-04-011, колонка 01: плитки на битумной мастике в агрессивной среде; колонки 02–14 и обычная среда не подменяются.",
        verified_at: "2026-09-24T07:48:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_APPLICABILITY_REJECT_WRONG_TILE_BEDDING_ENVIRONMENT_OR_PROFILE",
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

export const AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("aggressive_environment_tile_floor_demolition_area_v1", "m2", "floor_covering_area_m2"),
  formula(
    "aggressive_environment_tile_floor_demolition_labor_krer_46_04_011_01_v1",
    "man_hour",
    "floor_covering_area_m2 * 46.63 / 100",
  ),
  formula(
    "aggressive_environment_tile_floor_demolition_machinist_labor_krer_46_04_011_01_v1",
    "man_hour",
    "floor_covering_area_m2 * 0.36 / 100",
  ),
  formula(
    "aggressive_environment_tile_floor_demolition_compressor_krer_46_04_011_01_v1",
    "machine_hour",
    "floor_covering_area_m2 * 0.36 / 100",
  ),
  formula(
    "aggressive_environment_tile_floor_demolition_pneumatic_breaker_krer_46_04_011_01_v1",
    "machine_hour",
    "floor_covering_area_m2 * 0.72 / 100",
  ),
]);

const applicable = {
  kind: "and",
  operands: [
    {
      kind: "equals",
      parameterId: "existing_aggressive_environment_tile_floor_profile",
      value: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_PROFILE_ID,
    },
    {
      kind: "equals",
      parameterId: "existing_tile_on_bituminous_mastic_aggressive_environment_confirmed",
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
    semanticOwnerId: `aggressive-environment-tile-floor-demolition:${input.rowId}`,
    costOwner: input.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: input.costTreatment,
    payable: input.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "floor_covering_area_m2",
    quantityBasis: "CONFIRMED_AGGRESSIVE_ENVIRONMENT_TILE_AREA_TIMES_EXACT_KRER_RATE_PER_100_M2",
    ...(input.parentRowId ? { parentCostOwnerId: input.parentRowId } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "OFFICIAL_KG_RESOURCE_NORM",
    krerResourceCode: input.krerResourceCode,
    normativeRatePer100M2: input.normativeRatePer100M2,
    normativeTrace: [{
      sourceId: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
      source_id: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
      normId: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_NORM_ID,
      norm_id: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_NORM_ID,
      normVersion:
        AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.source_document_version,
      source_title: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.source_title,
      exact_locator: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      source_definition_hash: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
    }],
    excludedAdjacentScope: [
      "new tile covering, bedding, screed, base or finishing",
      "repair or reinstatement of the floor base and junctions",
      "ordinary non-aggressive environment",
      "tile on mortar or another bedding, brick, polymer-cement or concrete covering from columns 02–14",
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

const LABOR_ROW_ID = "f09:aggressive_environment_tile_floor_demolition:labor";

export const AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({
    rowId: "f09:aggressive_environment_tile_floor_demolition:operation",
    ordinal: 0,
    section: "Состав работ",
    category: "construction_work",
    titleRu: "Разборка плиточного покрытия на битумной мастике в агрессивной среде",
    unitId: "m2",
    formulaId: "aggressive_environment_tile_floor_demolition_area_v1",
    costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
    parentRowId: LABOR_ROW_ID,
    krerResourceCode: "46-04-011-01",
    normativeRatePer100M2: 100,
  }),
  resource({
    rowId: LABOR_ROW_ID,
    ordinal: 1,
    section: "Труд",
    category: "construction_work",
    titleRu: "Труд рабочих-строителей среднего разряда 3,8",
    unitId: "man_hour",
    formulaId: "aggressive_environment_tile_floor_demolition_labor_krer_46_04_011_01_v1",
    costTreatment: "OWN_COST",
    krerResourceCode: "000-1003-8",
    normativeRatePer100M2: 46.63,
  }),
  resource({
    rowId: "f09:aggressive_environment_tile_floor_demolition:machinist_labor",
    ordinal: 2,
    section: "Справочный состав машин",
    category: "construction_work",
    titleRu: "Затраты труда машинистов по расценке",
    unitId: "man_hour",
    formulaId: "aggressive_environment_tile_floor_demolition_machinist_labor_krer_46_04_011_01_v1",
    costTreatment: "INFORMATIONAL_SCOPE",
    krerResourceCode: "KRER_AGGREGATE_MACHINIST_LABOR",
    normativeRatePer100M2: 0.36,
  }),
  resource({
    rowId: "f09:aggressive_environment_tile_floor_demolition:compressor_5m3_min_686kpa",
    ordinal: 3,
    section: "Машины и механизмы",
    category: "equipment",
    titleRu: "Компрессор передвижной с двигателем внутреннего сгорания, давление до 686 кПа (7 атм), производительность 5 м³/мин",
    unitId: "machine_hour",
    formulaId: "aggressive_environment_tile_floor_demolition_compressor_krer_46_04_011_01_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "05-0005",
    normativeRatePer100M2: 0.36,
  }),
  resource({
    rowId: "f09:aggressive_environment_tile_floor_demolition:pneumatic_breaker",
    ordinal: 4,
    section: "Машины и механизмы",
    category: "equipment",
    titleRu: "Молоток отбойный пневматический",
    unitId: "machine_hour",
    formulaId: "aggressive_environment_tile_floor_demolition_pneumatic_breaker_krer_46_04_011_01_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "33-0384",
    normativeRatePer100M2: 0.72,
  }),
]);

const COMPONENTS = Object.freeze([
  { operationId: "aggressive_environment_tile_floor_demolition", rowId: "f09:aggressive_environment_tile_floor_demolition:operation", category: "construction_work", specification: "Разборка плиточного покрытия на битумной мастике в агрессивной среде", unitId: "m2", formulaId: "aggressive_environment_tile_floor_demolition_area_v1", priceRelation: "INCLUDED_IN_PARENT" },
  { operationId: "construction_labor_grade_3_8", rowId: LABOR_ROW_ID, category: "construction_work", specification: "46,63 чел.-ч на 100 м²", unitId: "man_hour", formulaId: "aggressive_environment_tile_floor_demolition_labor_krer_46_04_011_01_v1", priceRelation: "OWN_COST" },
  { operationId: "machinist_labor_aggregate", rowId: "f09:aggressive_environment_tile_floor_demolition:machinist_labor", category: "construction_work", specification: "0,36 чел.-ч на 100 м², справочно без повторной оплаты", unitId: "man_hour", formulaId: "aggressive_environment_tile_floor_demolition_machinist_labor_krer_46_04_011_01_v1", priceRelation: "INFORMATIONAL_SCOPE" },
  { operationId: "portable_compressor_5m3_min_686kpa", rowId: "f09:aggressive_environment_tile_floor_demolition:compressor_5m3_min_686kpa", category: "equipment", specification: "0,36 маш.-ч на 100 м²", unitId: "machine_hour", formulaId: "aggressive_environment_tile_floor_demolition_compressor_krer_46_04_011_01_v1", priceRelation: "OWN_COST" },
  { operationId: "pneumatic_breaker", rowId: "f09:aggressive_environment_tile_floor_demolition:pneumatic_breaker", category: "equipment", specification: "0,72 маш.-ч на 100 м²", unitId: "machine_hour", formulaId: "aggressive_environment_tile_floor_demolition_pneumatic_breaker_krer_46_04_011_01_v1", priceRelation: "OWN_COST" },
]);

export const AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "NORMATIVE_OPERATION_MAP",
    rateTable: "KRER_46_04_011_01",
    generatedFromCurrentRows: false,
    evidenceSha256: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
    evidenceReferences: [
      "https://minstroy.gov.kg/ru/kyzmat/459/show",
      "КРЕР 46-2015, PDF/печатные страницы 5, 58 и 59",
    ],
    entries: [
      ...COMPONENTS.map((component) => ({
        expectedResourceId: `required-resource:${component.operationId}`,
        operationId: component.operationId,
        category: component.category,
        specification: component.specification,
        condition: "confirmed_krer_46_04_011_01_tile_on_bituminous_mastic_in_aggressive_environment",
        sourceId: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
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
        expectedResourceId: "required-operation:clean-salvageable-tiles-and-bricks",
        operationId: "clean_salvageable_tiles_and_bricks_from_mortar",
        category: "construction_work",
        specification: "Очистка годных плиток и кирпича от раствора",
        condition: "confirmed_krer_46_04_011_01_tile_on_bituminous_mastic_in_aggressive_environment",
        sourceId: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "INCLUDED_IN_OFFICIAL_LABOR_RATE",
        detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: "aggressive_environment_tile_floor_demolition_labor_krer_46_04_011_01_v1",
        resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
      },
      {
        expectedResourceId: "required-operation:internal-debris-handling-within-object",
        operationId: "internal_debris_handling_within_object",
        category: "construction_work",
        specification: "Уборка, вертикальное перемещение и переноска до 50 м",
        condition: "selected_krer_46_reconstruction_rate",
        sourceId: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "INCLUDED_IN_OFFICIAL_LABOR_RATE",
        detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: "aggressive_environment_tile_floor_demolition_labor_krer_46_04_011_01_v1",
        resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
      },
      {
        expectedResourceId: "adjacent-operation:offsite-waste-haul",
        operationId: "offsite_waste_haul",
        category: "service",
        specification: "Внеобъектовый вывоз отходов",
        condition: "not_in_krer_46_04_011_01",
        sourceId: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
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

export function validateAggressiveEnvironmentTileFloorDemolitionKrer46Completeness(): true {
  const expected = new Set(COMPONENTS.map((component) => component.rowId));
  const actual = new Set(AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES.map((row) =>
    row.row_id));
  for (const rowId of expected) {
    if (!actual.has(rowId)) {
      throw new Error(`AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_MISSING_ROW:${rowId}`);
    }
  }
  if (actual.size !== 5) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_ROW_COUNT_MISMATCH");
  }
  return true;
}

export const AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT = Object.freeze({
  floor_covering_area_m2: 100,
  existing_aggressive_environment_tile_floor_profile: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_PROFILE_ID,
  existing_tile_on_bituminous_mastic_aggressive_environment_confirmed: true,
});

export const AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  floor_covering_area_m2: 35.5,
  existing_aggressive_environment_tile_floor_profile: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_PROFILE_ID,
  existing_tile_on_bituminous_mastic_aggressive_environment_confirmed: true,
});

export async function compileAggressiveEnvironmentTileFloorDemolitionKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_ID;
  if (!(AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_IDS as readonly string[])
    .includes(catalogId)) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters.existing_aggressive_environment_tile_floor_profile != null
    && submittedParameters.existing_aggressive_environment_tile_floor_profile
      !== AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_PROFILE_ID) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters.existing_tile_on_bituminous_mastic_aggressive_environment_confirmed === false) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_TILE_BEDDING_ENVIRONMENT_NOT_CONFIRMED");
  }
  validateAggressiveEnvironmentTileFloorDemolitionKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.aggressive-environment-tile-floor-demolition-krer46-r1",
    catalogId,
    primaryMeasureParameterId: "floor_covering_area_m2",
    parameterDefinitions: [...AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_PARAMETERS],
    formulaDefinitions: [...AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_FORMULAS],
    resourceDefinitions: [...AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    priceItems: [],
    currencyCode: "KGS",
    maximumResourceRows: 100,
    hashJson: estimateDeterministicHash,
  });
}
