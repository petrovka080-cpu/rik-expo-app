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

export const AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_CATALOG_ID =
  "canonical-work:base:demolition_interior_flooring_open_standard" as const;
export const AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_CATALOG_ID,
    catalogVariant: "STANDARD_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu: "Разборка плиточного покрытия на разных подстилающих слоях с расшивкой швов арзамит- или пласт-замазками в агрессивной среде",
  }),
  large_area: Object.freeze({
    catalogId: "canonical-work:base:demolition_interior_flooring_open_large_area",
    catalogVariant: "LARGE_AREA_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu: "Разборка плиточного покрытия на разных подстилающих слоях с расшивкой швов арзамит- или пласт-замазками в агрессивной среде — большая площадь",
  }),
  small_area: Object.freeze({
    catalogId: "canonical-work:base:demolition_interior_flooring_open_small_area",
    catalogVariant: "SMALL_AREA_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu: "Разборка плиточного покрытия на разных подстилающих слоях с расшивкой швов арзамит- или пласт-замазками в агрессивной среде — малая площадь",
  }),
  wet_zone: Object.freeze({
    catalogId: "canonical-work:base:demolition_interior_flooring_open_wet_zone",
    catalogVariant: "WET_ZONE_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu: "Разборка плиточного покрытия на разных подстилающих слоях с расшивкой швов арзамит- или пласт-замазками в агрессивной среде — влажная зона",
  }),
} as const);
export type AggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46VariantKey =
  keyof typeof AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_VARIANTS;
export const AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_VARIANTS).map((variant) =>
    variant.catalogId),
);

export function resolveAggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46Variant(
  variantKey: AggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46VariantKey,
) {
  const variant = AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}
export const AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_ID =
  "kg_krer_46_2015_reconstruction_official" as const;
export const AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_NORM_ID =
  "norm:kg:krer:46-04-011-06:2015" as const;
export const AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256 =
  "21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471" as const;
export const AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_PROFILE_ID =
  "KRER_46_04_011_06_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_AGGRESSIVE_ENVIRONMENT" as const;

export const AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA = Object.freeze({
  source_title:
    "КРЕР 46-2015 «Работы при реконструкции зданий и сооружений», таблица 46-04-011",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
  source_document_version: "КРЕР 46-2015; введён в действие с 1 января 2016 года",
  definition_hash: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  exact_locator:
    "Техническая часть, п. 1.1, PDF/печатная стр. 5; таблица КРЕР 46-04-011, состав работ и измеритель на PDF/печатной стр. 58, норма труда колонки 46-04-011-06 на стр. 59",
  use_restriction:
    "Только разборка подтверждённого существующего покрытия пола из плиток на разных подстилающих слоях с расшивкой швов арзамит- или пласт-замазками в здании или сооружении с агрессивной средой по колонке 46-04-011-06 и подтверждённой площади: 24,00 чел.-ч рабочих на 100 м². Очистка годных плиток и кирпича от раствора и внутриобъектовое перемещение отходов включены. Машины, материалы, другие основания/замазки, обычная среда и внеобъектовый вывоз не включены.",
  source_kind: "OFFICIAL_KG_UNIT_RATE",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/459/show",
  artifact_sha256: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  effective_from: "2016-01-01",
});

const PARAMETER_SPECS = Object.freeze([
  ["floor_covering_area_m2", "Площадь плиточного покрытия на разных подстилающих слоях с расшивкой швов арзамит- или пласт-замазками в агрессивной среде", "decimal", "m2"],
  ["existing_aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_profile", "Выбранная колонка КРЕР для существующего покрытия", "enum", null],
  ["existing_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_aggressive_environment_confirmed", "Подтверждено существующее плиточное покрытие на разных подстилающих слоях с расшивкой швов арзамит- или пласт-замазками в агрессивной среде", "boolean", null],
] as const);

export type AggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
    truth_metadata: Json;
  };

export const AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_PARAMETERS:
readonly AggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionParameter[] = Object.freeze(
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
      : parameterId === "existing_aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_profile"
        ? { values: [AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_PROFILE_ID] }
        : {},
    truth_metadata: {
      contract: "rik-expo-app.aggressive-environment-tile-on-different-bedding-layers-with-arzamite-or-plastic-putty-joints-floor-demolition-krer46-r1",
      semantic_parameter_key: `aggressive-environment-tile-on-different-bedding-layers-with-arzamite-or-plastic-putty-joints-floor-demolition:${parameterId}`,
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
          : parameterId === "existing_aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_profile"
            ? "ENUM_DECISION_RULE"
            : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "floor_covering_area_m2"
          ? "Укажите чистую фактическую площадь снимаемого покрытия без автоматически добавленного запаса."
          : "Подтвердите по обследованию именно существующее плиточное покрытие на разных подстилающих слоях с расшивкой швов арзамит- или пласт-замазками в агрессивной среде; для другого материала выберите другую колонку нормы.",
        source_role: "OFFICIAL_KG_UNIT_RATE_AND_EXISTING_CONDITION_SURVEY",
        source_document: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
        source_locator: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
        guide_version: "aggressive-environment-tile-on-different-bedding-layers-with-arzamite-or-plastic-putty-joints-floor-demolition-krer46-r1",
        source_snapshot_hash: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
        applicability:
          "Только таблица 46-04-011, колонка 06: плитки на разных подстилающих слоях с расшивкой швов арзамит- или пласт-замазками в агрессивной среде; колонки 01–05, 07–14 и обычная среда не подменяются.",
        verified_at: "2026-09-24T08:46:00+06:00",
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

export const AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition_area_v1", "m2", "floor_covering_area_m2"),
  formula(
    "aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition_labor_krer_46_04_011_06_v1",
    "man_hour",
    "floor_covering_area_m2 * 24.00 / 100",
  ),
]);

const applicable = {
  kind: "and",
  operands: [
    {
      kind: "equals",
      parameterId: "existing_aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_profile",
      value: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_PROFILE_ID,
    },
    {
      kind: "equals",
      parameterId: "existing_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_aggressive_environment_confirmed",
      value: true,
    },
  ],
};

function resource(input: Readonly<{
  rowId: string;
  ordinal: number;
  titleRu: string;
  unitId: string;
  formulaId: string;
  costTreatment: "OWN_COST" | "INCLUDED_IN_RESOURCE_ROWS";
  parentRowId?: string;
}>): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `aggressive-environment-tile-on-different-bedding-layers-with-arzamite-or-plastic-putty-joints-floor-demolition:${input.rowId}`,
    costOwner: input.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: input.costTreatment,
    payable: input.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "floor_covering_area_m2",
    quantityBasis: input.rowId.endsWith(":operation")
      ? "CONFIRMED_EXISTING_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_AGGRESSIVE_ENVIRONMENT_COVERING_AREA"
      : "AREA_MULTIPLIED_BY_24_00_MAN_HOURS_PER_100_M2",
    scopeContextParameterIds: [
      "floor_covering_area_m2",
      "existing_aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_profile",
      "existing_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_aggressive_environment_confirmed",
    ],
    ...(input.parentRowId ? { parentCostOwnerId: input.parentRowId } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "OFFICIAL_KG_UNIT_RATE",
    krerResourceCode: input.rowId.endsWith(":labor") ? "000-1003-2" : null,
    normativeRatePer100M2: input.rowId.endsWith(":labor") ? 24.00 : 100,
    normativeTrace: [{
      sourceId: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
      source_id: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
      normId: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_NORM_ID,
      norm_id: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_NORM_ID,
      normVersion:
        AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.source_document_version,
      source_title: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.source_title,
      exact_locator: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      source_definition_hash: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
    }],
    includedInRate: [
      "разборка существующего плиточного покрытия на разных подстилающих слоях с расшивкой швов арзамит- или пласт-замазками в агрессивной среде",
      "очистка годных плиток и кирпича от раствора",
      "уборка материалов и отходов от разборки",
      "вертикальное перемещение и горизонтальная переноска до 50 м в пределах объекта",
    ],
    excludedAdjacentScope: [
      "демонтаж бетонного основания или стяжки под покрытием",
      "новое покрытие, клей, раствор, основание и отделочные слои",
      "компрессор, пневматический отбойный молоток и труд машиниста, отсутствующие в колонке 46-04-011-06",
      "внеобъектовый вывоз и размещение отходов",
      "колонки 46-04-011-01–05 и 46-04-011-07–14, другие замазки и обычная среда",
      "скрытый коэффициент площади, запас или цена",
    ],
  };
  return {
    id: `resource-${input.rowId.replace(/:/gu, "-")}`,
    row_id: input.rowId,
    ordinal: input.ordinal,
    section: "Демонтаж покрытия пола",
    category: "construction_work",
    title_ru: input.titleRu,
    unit_id: input.unitId,
    formula_id: input.formulaId,
    inclusion_ast: applicable,
    resource_graph: resourceGraph,
    procurement_eligible: false,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

const LABOR_ROW_ID = "f09:aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition:labor";

export const AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({
    rowId: "f09:aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition:operation",
    ordinal: 0,
    titleRu: "Разборка существующего плиточного покрытия на разных подстилающих слоях с расшивкой швов арзамит- или пласт-замазками в агрессивной среде",
    unitId: "m2",
    formulaId: "aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition_area_v1",
    costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
    parentRowId: LABOR_ROW_ID,
  }),
  resource({
    rowId: LABOR_ROW_ID,
    ordinal: 1,
    titleRu: "Труд рабочих-строителей среднего разряда 3,2",
    unitId: "man_hour",
    formulaId: "aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition_labor_krer_46_04_011_06_v1",
    costTreatment: "OWN_COST",
  }),
]);

export const AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "NORMATIVE_OPERATION_MAP",
    rateTable: "KRER_46_04_011_06",
    generatedFromCurrentRows: false,
    evidenceSha256: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
    evidenceReferences: [
      AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.official_url,
      "КРЕР 46-2015, PDF/печатные страницы 5, 58 и 59",
    ],
    entries: [
      {
        operationId: "aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition",
        expectedResourceId: "required-operation:aggressive-environment-tile-on-different-bedding-layers-with-arzamite-or-plastic-putty-joints-floor-demolition",
        category: "construction_work",
        specification: "Разборка плиточного покрытия на разных подстилающих слоях с расшивкой швов арзамит- или пласт-замазками в агрессивной среде",
        condition: "confirmed_krer_46_04_011_06",
        sourceId: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "m2",
        quantityRule: "CONFIRMED_NET_AREA_ONE_TO_ONE",
        detailPrinciple: "EXACT_OFFICIAL_RATE_COLUMN_WITHOUT_AREA_FACTOR",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: "aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition_area_v1",
        resolution: {
          kind: "INCLUDED_COMPONENT_ROW",
          rowId: "f09:aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition:operation",
          parentRowId: LABOR_ROW_ID,
        },
      },
      {
        operationId: "construction_labor_grade_3_2",
        expectedResourceId: "required-resource:construction-labor-grade-3-2",
        category: "construction_work",
        specification: "24,00 чел.-ч на 100 м²",
        condition: "confirmed_krer_46_04_011_06",
        sourceId: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "AREA_MULTIPLIED_BY_24_00_PER_100_M2",
        detailPrinciple: "EXACT_OFFICIAL_RATE_COLUMN_WITHOUT_AREA_FACTOR",
        priceRelation: "OWN_COST",
        formulaId: "aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition_labor_krer_46_04_011_06_v1",
        resolution: { kind: "ROW", rowId: LABOR_ROW_ID },
      },
      {
        operationId: "clean_salvageable_tiles_and_bricks_from_mortar",
        expectedResourceId: "required-operation:clean-salvageable-tiles-and-bricks",
        category: "construction_work",
        specification: "Очистка годных плиток и кирпича от раствора",
        condition: "confirmed_krer_46_04_011_06_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_in_aggressive_environment",
        sourceId: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "INCLUDED_IN_OFFICIAL_LABOR_RATE",
        detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: "aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition_labor_krer_46_04_011_06_v1",
        resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
      },
      {
        operationId: "internal_debris_handling_within_object",
        expectedResourceId: "required-operation:internal-debris-handling-within-object",
        category: "construction_work",
        specification: "Уборка, вертикальное перемещение и переноска до 50 м",
        condition: "selected_krer_46_reconstruction_rate",
        sourceId: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "INCLUDED_IN_OFFICIAL_LABOR_RATE",
        detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: "aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition_labor_krer_46_04_011_06_v1",
        resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
      },
      {
        operationId: "offsite_waste_haul",
        expectedResourceId: "adjacent-operation:offsite-waste-haul",
        category: "service",
        specification: "Внеобъектовый вывоз отходов",
        condition: "not_in_krer_46_04_011_06",
        sourceId: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
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

export function validateAggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46Completeness(
  resources: readonly CanonicalEstimateResourceDefinition[] =
  AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_RESOURCES,
): true {
  const actual = new Set(resources.map((row) => row.row_id));
  for (const rowId of [
    "f09:aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition:operation",
    LABOR_ROW_ID,
  ]) {
    if (!actual.has(rowId)) {
      throw new Error(`AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_ROW_MISSING:${rowId}`);
    }
  }
  if (actual.size !== 2) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_ROW_COUNT_MISMATCH");
  }
  return true;
}

export const AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SHORT_INPUT = Object.freeze({
  floor_covering_area_m2: 100,
  existing_aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_profile: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_PROFILE_ID,
  existing_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_aggressive_environment_confirmed: true,
});

export const AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  floor_covering_area_m2: 35.5,
  existing_aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_profile: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_PROFILE_ID,
  existing_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_aggressive_environment_confirmed: true,
});

export async function compileAggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_CATALOG_ID;
  if (!(AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_CATALOG_IDS as readonly string[])
    .includes(catalogId)) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters.existing_aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_profile != null
    && submittedParameters.existing_aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_profile
      !== AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_PROFILE_ID) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters.existing_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_aggressive_environment_confirmed === false) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
  }
  validateAggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.aggressive-environment-tile-on-different-bedding-layers-with-arzamite-or-plastic-putty-joints-floor-demolition-krer46-r1",
    catalogId,
    primaryMeasureParameterId: "floor_covering_area_m2",
    parameterDefinitions: [...AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_PARAMETERS],
    formulaDefinitions: [...AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_FORMULAS],
    resourceDefinitions: [...AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 2,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_SUMMARY = Object.freeze({
  sourceId: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
  normId: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_NORM_ID,
  exactRate: "46-04-011-06",
  formula: "area_m2 * 24.00 man-hour / 100 m2",
  machineResourcesIncluded: false,
  offsiteWasteHaulIncluded: false,
});
