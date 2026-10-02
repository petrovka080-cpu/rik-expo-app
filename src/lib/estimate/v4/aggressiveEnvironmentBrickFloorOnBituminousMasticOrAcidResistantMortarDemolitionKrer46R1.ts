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

const FAMILY_KEY =
  "demolition_aggressive_environment_brick_floor_bituminous_mastic_or_acid_resistant_mortar";
const CATALOG_PREFIX = `canonical-work:master:${FAMILY_KEY}`;

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_CATALOG_ID =
  `${CATALOG_PREFIX}_standard` as const;
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_CATALOG_ID,
    sourceIdentity: `master-work:${FAMILY_KEY}_standard`,
    catalogVariant: "STANDARD_CONFIRMED_BRICK_FLOOR",
    canonicalNameRu: "Разборка кирпичного покрытия пола на битумной мастике или кислотоупорном растворе в агрессивной среде",
  }),
  large_area: Object.freeze({
    catalogId: `${CATALOG_PREFIX}_large_area`,
    sourceIdentity: `master-work:${FAMILY_KEY}_large_area`,
    catalogVariant: "LARGE_AREA_CONFIRMED_BRICK_FLOOR",
    canonicalNameRu: "Разборка кирпичного покрытия пола на битумной мастике или кислотоупорном растворе в агрессивной среде — большая площадь",
  }),
  small_area: Object.freeze({
    catalogId: `${CATALOG_PREFIX}_small_area`,
    sourceIdentity: `master-work:${FAMILY_KEY}_small_area`,
    catalogVariant: "SMALL_AREA_CONFIRMED_BRICK_FLOOR",
    canonicalNameRu: "Разборка кирпичного покрытия пола на битумной мастике или кислотоупорном растворе в агрессивной среде — малая площадь",
  }),
  wet_zone: Object.freeze({
    catalogId: `${CATALOG_PREFIX}_wet_zone`,
    sourceIdentity: `master-work:${FAMILY_KEY}_wet_zone`,
    catalogVariant: "WET_ZONE_CONFIRMED_BRICK_FLOOR",
    canonicalNameRu: "Разборка кирпичного покрытия пола на битумной мастике или кислотоупорном растворе в агрессивной среде — влажная зона",
  }),
} as const);

export type AggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46VariantKey =
  keyof typeof AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_VARIANTS;

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_VARIANTS)
    .map((variant) => variant.catalogId),
);

export function resolveAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46Variant(
  variantKey: AggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46VariantKey,
) {
  const variant = AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_ID =
  "kg_krer_46_2015_reconstruction_official" as const;
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_NORM_ID =
  "norm:kg:krer:46-04-011-07:2015" as const;
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ARTIFACT_SHA256 =
  "21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471" as const;
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_PROFILE_ID =
  "KRER_46_04_011_07_BRICK_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_AGGRESSIVE_ENVIRONMENT" as const;

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_METADATA = Object.freeze({
  source_title: "КРЕР 46-2015 «Работы при реконструкции зданий и сооружений», таблица 46-04-011",
  source_authority: "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
  source_document_version: "КРЕР 46-2015; введён в действие с 1 января 2016 года",
  definition_hash: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  exact_locator: "Техническая часть, п. 1.1, PDF/печатная стр. 5; таблица КРЕР 46-04-011, состав работ и измеритель на PDF/печатной стр. 58, ресурсы колонки 46-04-011-07 на стр. 59",
  use_restriction: "Только разборка подтверждённого существующего кирпичного покрытия пола на битумной мастике или кислотоупорном растворе в агрессивной среде по колонке 46-04-011-07 и подтверждённой площади: труд рабочих 152,89 чел.-ч, справочный труд машинистов 1,91 чел.-ч, компрессор 1,91 маш.-ч и пневматические отбойные молотки 3,82 маш.-ч на 100 м². Очистка годного кирпича от раствора и внутриобъектовое перемещение включены; внеобъектовый вывоз исключён.",
  source_kind: "OFFICIAL_KG_UNIT_RATE",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/459/show",
  artifact_sha256: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  effective_from: "2016-01-01",
});

const AREA_PARAMETER_ID = "floor_covering_area_m2";
const PROFILE_PARAMETER_ID =
  "existing_aggressive_environment_brick_floor_on_bituminous_mastic_or_acid_resistant_mortar_profile";
const CONFIRMED_PARAMETER_ID =
  "existing_brick_floor_on_bituminous_mastic_or_acid_resistant_mortar_aggressive_environment_confirmed";

const PARAMETER_SPECS = Object.freeze([
  [AREA_PARAMETER_ID, "Площадь кирпичного покрытия пола на битумной мастике или кислотоупорном растворе в агрессивной среде", "decimal", "m2"],
  [PROFILE_PARAMETER_ID, "Выбранная колонка КРЕР для существующего кирпичного покрытия", "enum", null],
  [CONFIRMED_PARAMETER_ID, "Подтверждено существующее кирпичное покрытие на битумной мастике или кислотоупорном растворе в агрессивной среде", "boolean", null],
] as const);

export type AggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
    truth_metadata: Json;
  };

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_PARAMETERS:
readonly AggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionParameter[] = Object.freeze(
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
        ? { values: [AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_PROFILE_ID] }
        : {},
    truth_metadata: {
      contract: "rik-expo-app.aggressive-environment-brick-floor-on-bituminous-mastic-or-acid-resistant-mortar-demolition-krer46-r1",
      semantic_parameter_key: `aggressive-environment-brick-floor-on-bituminous-mastic-or-acid-resistant-mortar-demolition:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "USER_OR_APPROVED_EXISTING_CONDITION_SURVEY",
      input_origin_class: parameterId === AREA_PARAMETER_ID
        ? "KNOWN_WORK_SCOPE"
        : "EXISTING_CONDITION_AND_RATE_APPLICABILITY_CONFIRMATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: parameterId !== AREA_PARAMETER_ID,
      guide: {
        guide_kind: parameterId === AREA_PARAMETER_ID
          ? "MEASUREMENT_RULE"
          : parameterId === PROFILE_PARAMETER_ID ? "ENUM_DECISION_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === AREA_PARAMETER_ID
          ? "Укажите чистую фактическую площадь снимаемого покрытия без автоматически добавленного запаса."
          : "Подтвердите по обследованию кирпичное покрытие именно на битумной мастике или кислотоупорном растворе в агрессивной среде.",
        source_role: "OFFICIAL_KG_UNIT_RATE_AND_EXISTING_CONDITION_SURVEY",
        source_document: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_ID,
        source_locator: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
        guide_version: "aggressive-environment-brick-floor-on-bituminous-mastic-or-acid-resistant-mortar-demolition-krer46-r1",
        source_snapshot_hash: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ARTIFACT_SHA256,
        applicability: "Только таблица 46-04-011, колонка 07: кирпич на битумной мастике или кислотоупорном растворе в агрессивной среде; другие покрытия и колонки не подменяются.",
        verified_at: "2026-09-24T09:45:00+06:00",
        guide_validation_policy: "DEFER_MISSING_APPLICABILITY_REJECT_WRONG_MATERIAL_BEDDING_ENVIRONMENT_OR_PROFILE",
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

const FORMULA_PREFIX =
  "aggressive_environment_brick_floor_on_bituminous_mastic_or_acid_resistant_mortar_demolition";
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula(`${FORMULA_PREFIX}_area_v1`, "m2", AREA_PARAMETER_ID),
  formula(`${FORMULA_PREFIX}_labor_krer_46_04_011_07_v1`, "man_hour", `${AREA_PARAMETER_ID} * 152.89 / 100`),
  formula(`${FORMULA_PREFIX}_machinist_labor_krer_46_04_011_07_v1`, "man_hour", `${AREA_PARAMETER_ID} * 1.91 / 100`),
  formula(`${FORMULA_PREFIX}_compressor_krer_46_04_011_07_v1`, "machine_hour", `${AREA_PARAMETER_ID} * 1.91 / 100`),
  formula(`${FORMULA_PREFIX}_pneumatic_breaker_krer_46_04_011_07_v1`, "machine_hour", `${AREA_PARAMETER_ID} * 3.82 / 100`),
]);

const applicable = {
  kind: "and",
  operands: [
    { kind: "equals", parameterId: PROFILE_PARAMETER_ID, value: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_PROFILE_ID },
    { kind: "equals", parameterId: CONFIRMED_PARAMETER_ID, value: true },
  ],
};

type CostTreatment = "OWN_COST" | "INCLUDED_IN_RESOURCE_ROWS" | "INFORMATIONAL_SCOPE";
type ResourceInput = Readonly<{
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
}>;

function resource(input: ResourceInput): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `${FAMILY_KEY}:${input.rowId}`,
    costOwner: input.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: input.costTreatment,
    payable: input.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: AREA_PARAMETER_ID,
    quantityBasis: "CONFIRMED_BRICK_FLOOR_AREA_TIMES_EXACT_KRER_RATE_PER_100_M2",
    scopeContextParameterIds: [AREA_PARAMETER_ID, PROFILE_PARAMETER_ID, CONFIRMED_PARAMETER_ID],
    ...(input.parentRowId ? { parentCostOwnerId: input.parentRowId } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "OFFICIAL_KG_RESOURCE_NORM",
    krerResourceCode: input.krerResourceCode,
    normativeRatePer100M2: input.normativeRatePer100M2,
    normativeTrace: [{
      sourceId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_ID,
      source_id: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_ID,
      normId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_NORM_ID,
      norm_id: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_NORM_ID,
      normVersion: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_METADATA.source_document_version,
      source_title: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_METADATA.source_title,
      exact_locator: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      source_definition_hash: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ARTIFACT_SHA256,
    }],
    includedInRate: [
      "разборка существующего кирпичного покрытия на битумной мастике или кислотоупорном растворе",
      "очистка годного кирпича от раствора",
      "уборка, вертикальное перемещение и переноска отходов до 50 м внутри объекта",
    ],
    excludedAdjacentScope: [
      "основание и новая конструкция пола",
      "другие покрытия, подстилающие слои и обычная среда",
      "внеобъектовый вывоз и размещение отходов",
      "скрытый коэффициент площади, запас или цена",
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

const ROW_PREFIX = "f09:aggressive_environment_brick_floor_on_bituminous_mastic_or_acid_resistant_mortar_demolition";
const LABOR_ROW_ID = `${ROW_PREFIX}:labor`;
const OPERATION_ROW_ID = `${ROW_PREFIX}:operation`;
const MACHINIST_ROW_ID = `${ROW_PREFIX}:machinist_labor`;
const COMPRESSOR_ROW_ID = `${ROW_PREFIX}:compressor_5m3_min_686kpa`;
const BREAKER_ROW_ID = `${ROW_PREFIX}:pneumatic_breaker`;

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: OPERATION_ROW_ID, ordinal: 0, section: "Состав работ", category: "construction_work", titleRu: "Разборка кирпичного покрытия пола на битумной мастике или кислотоупорном растворе в агрессивной среде", unitId: "m2", formulaId: `${FORMULA_PREFIX}_area_v1`, costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID, krerResourceCode: "46-04-011-07", normativeRatePer100M2: 100 }),
  resource({ rowId: LABOR_ROW_ID, ordinal: 1, section: "Труд", category: "construction_work", titleRu: "Труд рабочих-строителей среднего разряда 3,8", unitId: "man_hour", formulaId: `${FORMULA_PREFIX}_labor_krer_46_04_011_07_v1`, costTreatment: "OWN_COST", krerResourceCode: "000-1003-8", normativeRatePer100M2: 152.89 }),
  resource({ rowId: MACHINIST_ROW_ID, ordinal: 2, section: "Справочный состав машин", category: "construction_work", titleRu: "Затраты труда машинистов по расценке", unitId: "man_hour", formulaId: `${FORMULA_PREFIX}_machinist_labor_krer_46_04_011_07_v1`, costTreatment: "INFORMATIONAL_SCOPE", krerResourceCode: "KRER_AGGREGATE_MACHINIST_LABOR", normativeRatePer100M2: 1.91 }),
  resource({ rowId: COMPRESSOR_ROW_ID, ordinal: 3, section: "Машины и механизмы", category: "equipment", titleRu: "Компрессор передвижной с двигателем внутреннего сгорания, давление до 686 кПа (7 атм), производительность 5 м³/мин", unitId: "machine_hour", formulaId: `${FORMULA_PREFIX}_compressor_krer_46_04_011_07_v1`, costTreatment: "OWN_COST", procurementEligible: true, krerResourceCode: "05-0005", normativeRatePer100M2: 1.91 }),
  resource({ rowId: BREAKER_ROW_ID, ordinal: 4, section: "Машины и механизмы", category: "equipment", titleRu: "Молоток отбойный пневматический", unitId: "machine_hour", formulaId: `${FORMULA_PREFIX}_pneumatic_breaker_krer_46_04_011_07_v1`, costTreatment: "OWN_COST", procurementEligible: true, krerResourceCode: "33-0384", normativeRatePer100M2: 3.82 }),
]);

const COMPONENTS = Object.freeze([
  { operationId: "aggressive_environment_brick_floor_demolition", rowId: OPERATION_ROW_ID, category: "construction_work", specification: "Разборка кирпичного покрытия на битумной мастике или кислотоупорном растворе", unitId: "m2", formulaId: `${FORMULA_PREFIX}_area_v1`, priceRelation: "INCLUDED_IN_PARENT" },
  { operationId: "construction_labor_grade_3_8", rowId: LABOR_ROW_ID, category: "construction_work", specification: "152,89 чел.-ч на 100 м²", unitId: "man_hour", formulaId: `${FORMULA_PREFIX}_labor_krer_46_04_011_07_v1`, priceRelation: "OWN_COST" },
  { operationId: "machinist_labor_aggregate", rowId: MACHINIST_ROW_ID, category: "construction_work", specification: "1,91 чел.-ч на 100 м², справочно без повторной оплаты", unitId: "man_hour", formulaId: `${FORMULA_PREFIX}_machinist_labor_krer_46_04_011_07_v1`, priceRelation: "INFORMATIONAL_SCOPE" },
  { operationId: "portable_compressor_5m3_min_686kpa", rowId: COMPRESSOR_ROW_ID, category: "equipment", specification: "1,91 маш.-ч на 100 м²", unitId: "machine_hour", formulaId: `${FORMULA_PREFIX}_compressor_krer_46_04_011_07_v1`, priceRelation: "OWN_COST" },
  { operationId: "pneumatic_breaker", rowId: BREAKER_ROW_ID, category: "equipment", specification: "3,82 маш.-ч на 100 м²", unitId: "machine_hour", formulaId: `${FORMULA_PREFIX}_pneumatic_breaker_krer_46_04_011_07_v1`, priceRelation: "OWN_COST" },
]);

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "NORMATIVE_OPERATION_MAP",
  rateTable: "KRER_46_04_011_07",
  generatedFromCurrentRows: false,
  evidenceSha256: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  evidenceReferences: [
    AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_METADATA.official_url,
    "КРЕР 46-2015, PDF/печатные страницы 5, 58 и 59",
  ],
  entries: [
    ...COMPONENTS.map((component) => ({
      expectedResourceId: `required-resource:${component.operationId}`,
      operationId: component.operationId,
      category: component.category,
      specification: component.specification,
      condition: "confirmed_krer_46_04_011_07_brick_floor_in_aggressive_environment",
      sourceId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_ID,
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
      expectedResourceId: "required-operation:clean-salvageable-brick",
      operationId: "clean_salvageable_brick_from_mortar",
      category: "construction_work",
      specification: "Очистка годного кирпича от раствора",
      condition: "confirmed_krer_46_04_011_07_brick_floor_in_aggressive_environment",
      sourceId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_ID,
      unitId: "man_hour",
      quantityRule: "INCLUDED_IN_OFFICIAL_LABOR_RATE",
      detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
      priceRelation: "INCLUDED_IN_PARENT",
      formulaId: `${FORMULA_PREFIX}_labor_krer_46_04_011_07_v1`,
      resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
    },
    {
      expectedResourceId: "required-operation:internal-debris-handling-within-object",
      operationId: "internal_debris_handling_within_object",
      category: "construction_work",
      specification: "Уборка, вертикальное перемещение и переноска до 50 м",
      condition: "selected_krer_46_reconstruction_rate",
      sourceId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_ID,
      unitId: "man_hour",
      quantityRule: "INCLUDED_IN_OFFICIAL_LABOR_RATE",
      detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
      priceRelation: "INCLUDED_IN_PARENT",
      formulaId: `${FORMULA_PREFIX}_labor_krer_46_04_011_07_v1`,
      resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
    },
    {
      expectedResourceId: "adjacent-operation:offsite-waste-haul",
      operationId: "offsite_waste_haul",
      category: "service",
      specification: "Внеобъектовый вывоз отходов",
      condition: "not_in_krer_46_04_011_07",
      sourceId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_ID,
      unitId: "t_km",
      quantityRule: "PROJECT_WASTE_PLAN_REQUIRED",
      detailPrinciple: "EXCLUDED_FROM_RATE",
      priceRelation: "SEPARATE_IF_APPLICABLE",
      resolution: { kind: "NOT_APPLICABLE", reasonRu: "КРЕР 46, п. 1.1 прямо исключает вывоз строительного мусора." },
    },
  ],
});

export function validateAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46Completeness(): true {
  const expected = new Set(COMPONENTS.map((component) => component.rowId));
  const actual = new Set(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_RESOURCES.map((row) => row.row_id));
  for (const rowId of expected) {
    if (!actual.has(rowId)) {
      throw new Error(`AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_MISSING_ROW:${rowId}`);
    }
  }
  if (actual.size !== 5) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ROW_COUNT_MISMATCH");
  }
  return true;
}

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SHORT_INPUT = Object.freeze({
  [AREA_PARAMETER_ID]: 100,
  [PROFILE_PARAMETER_ID]: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_PROFILE_ID,
  [CONFIRMED_PARAMETER_ID]: true,
});

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  [AREA_PARAMETER_ID]: 35.5,
  [PROFILE_PARAMETER_ID]: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_PROFILE_ID,
  [CONFIRMED_PARAMETER_ID]: true,
});

export async function compileAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId
    ?? AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_CATALOG_ID;
  if (!(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_CATALOG_IDS as readonly string[]).includes(catalogId)) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters[PROFILE_PARAMETER_ID] != null
    && submittedParameters[PROFILE_PARAMETER_ID]
      !== AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_PROFILE_ID) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters[CONFIRMED_PARAMETER_ID] === false) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
  }
  validateAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.aggressive-environment-brick-floor-on-bituminous-mastic-or-acid-resistant-mortar-demolition-krer46-r1",
    catalogId,
    primaryMeasureParameterId: AREA_PARAMETER_ID,
    parameterDefinitions: [...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_PARAMETERS],
    formulaDefinitions: [...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_FORMULAS],
    resourceDefinitions: [...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 5,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_SUMMARY = Object.freeze({
  sourceId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_ID,
  normId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_NORM_ID,
  exactRate: "46-04-011-07",
  formula: "area_m2 * exact resource rate / 100 m2",
  machineResourcesIncluded: true,
  offsiteWasteHaulIncluded: false,
});

// Column 08 is a distinct physical work: the same brick covering is bedded on
// cement acid-resistant mortar or acid-resistant putty, not on the column-07
// bedding. Keep its identities, semantic keys and resource hashes separate
// while reusing only the table-wide structure that the official source proves
// to be common.
const RATE_08_FAMILY_KEY =
  "demolition_aggressive_environment_brick_floor_cement_acid_resistant_mortar_or_acid_resistant_putty";
const RATE_08_CATALOG_PREFIX = `canonical-work:master:${RATE_08_FAMILY_KEY}`;

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_CATALOG_ID =
  `${RATE_08_CATALOG_PREFIX}_standard` as const;
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_CATALOG_ID,
    sourceIdentity: `master-work:${RATE_08_FAMILY_KEY}_standard`,
    catalogVariant: "STANDARD_CONFIRMED_BRICK_FLOOR",
    canonicalNameRu: "Разборка кирпичного покрытия пола на цементном кислотоупорном растворе или кислотоупорных замазках в агрессивной среде",
  }),
  large_area: Object.freeze({
    catalogId: `${RATE_08_CATALOG_PREFIX}_large_area`,
    sourceIdentity: `master-work:${RATE_08_FAMILY_KEY}_large_area`,
    catalogVariant: "LARGE_AREA_CONFIRMED_BRICK_FLOOR",
    canonicalNameRu: "Разборка кирпичного покрытия пола на цементном кислотоупорном растворе или кислотоупорных замазках в агрессивной среде — большая площадь",
  }),
  small_area: Object.freeze({
    catalogId: `${RATE_08_CATALOG_PREFIX}_small_area`,
    sourceIdentity: `master-work:${RATE_08_FAMILY_KEY}_small_area`,
    catalogVariant: "SMALL_AREA_CONFIRMED_BRICK_FLOOR",
    canonicalNameRu: "Разборка кирпичного покрытия пола на цементном кислотоупорном растворе или кислотоупорных замазках в агрессивной среде — малая площадь",
  }),
  wet_zone: Object.freeze({
    catalogId: `${RATE_08_CATALOG_PREFIX}_wet_zone`,
    sourceIdentity: `master-work:${RATE_08_FAMILY_KEY}_wet_zone`,
    catalogVariant: "WET_ZONE_CONFIRMED_BRICK_FLOOR",
    canonicalNameRu: "Разборка кирпичного покрытия пола на цементном кислотоупорном растворе или кислотоупорных замазках в агрессивной среде — влажная зона",
  }),
} as const);

export type AggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46VariantKey =
  keyof typeof AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_VARIANTS;

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_VARIANTS)
    .map((variant) => variant.catalogId),
);

export function resolveAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46Variant(
  variantKey: AggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46VariantKey,
) {
  const variant = AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}

function asRate08<T>(value: T): T {
  const replacements = [
    ["demolition_aggressive_environment_brick_floor_bituminous_mastic_or_acid_resistant_mortar", "demolition_aggressive_environment_brick_floor_cement_acid_resistant_mortar_or_acid_resistant_putty"],
    ["brick_floor_on_bituminous_mastic_or_acid_resistant_mortar", "brick_floor_on_cement_acid_resistant_mortar_or_acid_resistant_putty"],
    ["brick-floor-on-bituminous-mastic-or-acid-resistant-mortar", "brick-floor-on-cement-acid-resistant-mortar-or-acid-resistant-putty"],
    ["BRICK_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR", "BRICK_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY"],
    ["BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR", "CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY"],
    ["на битумной мастике или кислотоупорном растворе", "на цементном кислотоупорном растворе или кислотоупорных замазках"],
    ["46_04_011_07", "46_04_011_08"],
    ["46-04-011-07", "46-04-011-08"],
    ["колонка 07", "колонка 08"],
    ["construction_labor_grade_3_8", "construction_labor_grade_3_6"],
    ["aggressive_environment_brick_floor_demolition", "aggressive_environment_brick_floor_on_cement_acid_resistant_mortar_or_acid_resistant_putty_demolition"],
    ["000-1003-8", "000-1003-6"],
    ["152.89", "104.52"],
    ["152,89", "104,52"],
    ["разряда 3,8", "разряда 3,6"],
  ] as const;
  let serialized = JSON.stringify(value);
  for (const [from, to] of replacements) serialized = serialized.replaceAll(from, to);
  return JSON.parse(serialized) as T;
}

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SOURCE_ID =
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_ID;
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_NORM_ID =
  "norm:kg:krer:46-04-011-08:2015" as const;
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_ARTIFACT_SHA256 =
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ARTIFACT_SHA256;
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_PROFILE_ID =
  "KRER_46_04_011_08_BRICK_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_AGGRESSIVE_ENVIRONMENT" as const;

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SOURCE_METADATA = Object.freeze({
  ...asRate08(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SOURCE_METADATA),
  exact_locator: "Техническая часть, п. 1.1, PDF/печатная стр. 5; таблица КРЕР 46-04-011, состав работ и измеритель на PDF/печатной стр. 58, ресурсы колонки 46-04-011-08 на стр. 59",
  use_restriction: "Только разборка подтверждённого существующего кирпичного покрытия пола на цементном кислотоупорном растворе или кислотоупорных замазках в агрессивной среде по колонке 46-04-011-08 и подтверждённой площади: труд рабочих 104,52 чел.-ч, справочный труд машинистов 1,91 чел.-ч, компрессор 1,91 маш.-ч и пневматические отбойные молотки 3,82 маш.-ч на 100 м². Очистка годного кирпича от раствора и внутриобъектовое перемещение включены; внеобъектовый вывоз исключён.",
});

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_PARAMETERS = Object.freeze(
  asRate08(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_PARAMETERS)
    .map((parameter) => Object.freeze({ ...parameter })),
);
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_FORMULAS = Object.freeze(
  asRate08(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_FORMULAS)
    .map((rateFormula) => Object.freeze({ ...rateFormula })),
);
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  asRate08(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_RESOURCES)
    .map((rateResource) => {
      const resourceWithoutHash = { ...rateResource, row_sha256: undefined };
      return Object.freeze({
        ...rateResource,
        row_sha256: estimateDeterministicHash({
          exactRate: "46-04-011-08",
          resource: resourceWithoutHash,
        }),
      });
    }),
);
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP = Object.freeze(
  asRate08(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP),
);

const RATE_08_AREA_PARAMETER_ID = "floor_covering_area_m2";
const RATE_08_PROFILE_PARAMETER_ID =
  "existing_aggressive_environment_brick_floor_on_cement_acid_resistant_mortar_or_acid_resistant_putty_profile";
const RATE_08_CONFIRMED_PARAMETER_ID =
  "existing_brick_floor_on_cement_acid_resistant_mortar_or_acid_resistant_putty_aggressive_environment_confirmed";

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SHORT_INPUT = Object.freeze({
  [RATE_08_AREA_PARAMETER_ID]: 100,
  [RATE_08_PROFILE_PARAMETER_ID]: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_PROFILE_ID,
  [RATE_08_CONFIRMED_PARAMETER_ID]: true,
});
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  [RATE_08_AREA_PARAMETER_ID]: 35.5,
  [RATE_08_PROFILE_PARAMETER_ID]: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_PROFILE_ID,
  [RATE_08_CONFIRMED_PARAMETER_ID]: true,
});

export function validateAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46Completeness(): true {
  if (AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_RESOURCES.length !== 5
    || AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries.length !== 8) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_COMPLETENESS_MISMATCH");
  }
  const resourceFormulaIds = new Set(
    AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_RESOURCES
      .map((resourceDefinition) => resourceDefinition.formula_id),
  );
  if (!AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_FORMULAS
    .every((rateFormula) => resourceFormulaIds.has(rateFormula.formula_id))) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_FORMULA_ORPHAN");
  }
  return true;
}

export async function compileAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId
    ?? AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_CATALOG_ID;
  if (!(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_CATALOG_IDS as readonly string[]).includes(catalogId)) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters[RATE_08_PROFILE_PARAMETER_ID] != null
    && submittedParameters[RATE_08_PROFILE_PARAMETER_ID]
      !== AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_PROFILE_ID) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters[RATE_08_CONFIRMED_PARAMETER_ID] === false) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
  }
  validateAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.aggressive-environment-brick-floor-on-cement-acid-resistant-mortar-or-acid-resistant-putty-demolition-krer46-r1",
    catalogId,
    primaryMeasureParameterId: RATE_08_AREA_PARAMETER_ID,
    parameterDefinitions: [...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_PARAMETERS],
    formulaDefinitions: [...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_FORMULAS],
    resourceDefinitions: [...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 5,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SOURCE_SUMMARY = Object.freeze({
  sourceId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SOURCE_ID,
  normId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_NORM_ID,
  exactRate: "46-04-011-08",
  formula: "area_m2 * exact resource rate / 100 m2",
  machineResourcesIncluded: true,
  offsiteWasteHaulIncluded: false,
});

// Column 09 is another distinct bedding technology. Unlike columns 07 and 08,
// the official resource table contains no machinist aggregate and no machines:
// only the measured operation and grade-3.1 construction labor are admissible.
const RATE_09_FAMILY_KEY =
  "demolition_aggressive_environment_brick_floor_sulfur_cement_or_plastic_or_arzamite_putty";
const RATE_09_CATALOG_PREFIX = `canonical-work:master:${RATE_09_FAMILY_KEY}`;

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_CATALOG_ID =
  `${RATE_09_CATALOG_PREFIX}_standard` as const;
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_CATALOG_ID,
    sourceIdentity: `master-work:${RATE_09_FAMILY_KEY}_standard`,
    catalogVariant: "STANDARD_CONFIRMED_BRICK_FLOOR",
    canonicalNameRu: "Разборка кирпичного покрытия пола на серном цементе, пластзамазках или арзамитзамазках в агрессивной среде",
  }),
  large_area: Object.freeze({
    catalogId: `${RATE_09_CATALOG_PREFIX}_large_area`,
    sourceIdentity: `master-work:${RATE_09_FAMILY_KEY}_large_area`,
    catalogVariant: "LARGE_AREA_CONFIRMED_BRICK_FLOOR",
    canonicalNameRu: "Разборка кирпичного покрытия пола на серном цементе, пластзамазках или арзамитзамазках в агрессивной среде — большая площадь",
  }),
  small_area: Object.freeze({
    catalogId: `${RATE_09_CATALOG_PREFIX}_small_area`,
    sourceIdentity: `master-work:${RATE_09_FAMILY_KEY}_small_area`,
    catalogVariant: "SMALL_AREA_CONFIRMED_BRICK_FLOOR",
    canonicalNameRu: "Разборка кирпичного покрытия пола на серном цементе, пластзамазках или арзамитзамазках в агрессивной среде — малая площадь",
  }),
  wet_zone: Object.freeze({
    catalogId: `${RATE_09_CATALOG_PREFIX}_wet_zone`,
    sourceIdentity: `master-work:${RATE_09_FAMILY_KEY}_wet_zone`,
    catalogVariant: "WET_ZONE_CONFIRMED_BRICK_FLOOR",
    canonicalNameRu: "Разборка кирпичного покрытия пола на серном цементе, пластзамазках или арзамитзамазках в агрессивной среде — влажная зона",
  }),
} as const);

export type AggressiveEnvironmentBrickFloorOnSulfurCementOrPlasticOrArzamitePuttyDemolitionKrer46VariantKey =
  keyof typeof AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_VARIANTS;

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_VARIANTS)
    .map((variant) => variant.catalogId),
);

export function resolveAggressiveEnvironmentBrickFloorOnSulfurCementOrPlasticOrArzamitePuttyDemolitionKrer46Variant(
  variantKey: AggressiveEnvironmentBrickFloorOnSulfurCementOrPlasticOrArzamitePuttyDemolitionKrer46VariantKey,
) {
  const variant = AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}

function asRate09<T>(value: T): T {
  const replacements = [
    ["demolition_aggressive_environment_brick_floor_cement_acid_resistant_mortar_or_acid_resistant_putty", "demolition_aggressive_environment_brick_floor_sulfur_cement_or_plastic_or_arzamite_putty"],
    ["brick_floor_on_cement_acid_resistant_mortar_or_acid_resistant_putty", "brick_floor_on_sulfur_cement_or_plastic_or_arzamite_putty"],
    ["brick-floor-on-cement-acid-resistant-mortar-or-acid-resistant-putty", "brick-floor-on-sulfur-cement-or-plastic-or-arzamite-putty"],
    ["BRICK_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY", "BRICK_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY"],
    ["CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY", "SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY"],
    ["на цементном кислотоупорном растворе или кислотоупорных замазках", "на серном цементе, пластзамазках или арзамитзамазках"],
    ["46_04_011_08", "46_04_011_09"],
    ["46-04-011-08", "46-04-011-09"],
    ["колонка 08", "колонка 09"],
    ["construction_labor_grade_3_6", "construction_labor_grade_3_1"],
    ["aggressive_environment_brick_floor_on_cement_acid_resistant_mortar_or_acid_resistant_putty_demolition", "aggressive_environment_brick_floor_on_sulfur_cement_or_plastic_or_arzamite_putty_demolition"],
    ["000-1003-6", "000-1003-1"],
    ["104.52", "66.10"],
    ["104,52", "66,10"],
    ["разряда 3,6", "разряда 3,1"],
  ] as const;
  let serialized = JSON.stringify(value);
  for (const [from, to] of replacements) serialized = serialized.replaceAll(from, to);
  return JSON.parse(serialized) as T;
}

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_SOURCE_ID =
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SOURCE_ID;
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_NORM_ID =
  "norm:kg:krer:46-04-011-09:2015" as const;
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_ARTIFACT_SHA256 =
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_ARTIFACT_SHA256;
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_PROFILE_ID =
  "KRER_46_04_011_09_BRICK_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_AGGRESSIVE_ENVIRONMENT" as const;

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_SOURCE_METADATA = Object.freeze({
  ...asRate09(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SOURCE_METADATA),
  exact_locator: "Техническая часть, п. 1.1, PDF/печатная стр. 5; таблица КРЕР 46-04-011, состав работ и измеритель на PDF/печатной стр. 58, ресурсы колонки 46-04-011-09 на стр. 59",
  use_restriction: "Только разборка подтверждённого существующего кирпичного покрытия пола на серном цементе, пластзамазках или арзамитзамазках в агрессивной среде по колонке 46-04-011-09 и подтверждённой площади: труд рабочих 66,10 чел.-ч на 100 м², без труда машинистов и машин. Очистка годного кирпича от раствора и внутриобъектовое перемещение включены; внеобъектовый вывоз исключён.",
});

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_PARAMETERS = Object.freeze(
  asRate09(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_PARAMETERS)
    .map((parameter) => Object.freeze({ ...parameter })),
);
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_FORMULAS = Object.freeze(
  asRate09(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_FORMULAS)
    .filter((rateFormula) => !/machinist|compressor|pneumatic_breaker/iu.test(rateFormula.formula_id))
    .map((rateFormula) => Object.freeze({ ...rateFormula })),
);
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  asRate09(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_RESOURCES)
    .filter((rateResource) => !/machinist|compressor|pneumatic_breaker/iu.test(rateResource.row_id))
    .map((rateResource) => {
      const resourceWithoutHash = { ...rateResource, row_sha256: undefined };
      return Object.freeze({
        ...rateResource,
        row_sha256: estimateDeterministicHash({
          exactRate: "46-04-011-09",
          resource: resourceWithoutHash,
        }),
      });
    }),
);
const rate09CompletenessMap = asRate09(
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
);
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  ...rate09CompletenessMap,
  entries: Object.freeze(rate09CompletenessMap.entries.filter((entry) => ![
    "machinist_labor_aggregate",
    "portable_compressor_5m3_min_686kpa",
    "pneumatic_breaker",
  ].includes(entry.operationId))),
});

const RATE_09_AREA_PARAMETER_ID = "floor_covering_area_m2";
const RATE_09_PROFILE_PARAMETER_ID =
  "existing_aggressive_environment_brick_floor_on_sulfur_cement_or_plastic_or_arzamite_putty_profile";
const RATE_09_CONFIRMED_PARAMETER_ID =
  "existing_brick_floor_on_sulfur_cement_or_plastic_or_arzamite_putty_aggressive_environment_confirmed";

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_SHORT_INPUT = Object.freeze({
  [RATE_09_AREA_PARAMETER_ID]: 100,
  [RATE_09_PROFILE_PARAMETER_ID]: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_PROFILE_ID,
  [RATE_09_CONFIRMED_PARAMETER_ID]: true,
});
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  [RATE_09_AREA_PARAMETER_ID]: 35.5,
  [RATE_09_PROFILE_PARAMETER_ID]: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_PROFILE_ID,
  [RATE_09_CONFIRMED_PARAMETER_ID]: true,
});

export function validateAggressiveEnvironmentBrickFloorOnSulfurCementOrPlasticOrArzamitePuttyDemolitionKrer46Completeness(): true {
  if (AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_RESOURCES.length !== 2
    || AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries.length !== 5) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_COMPLETENESS_MISMATCH");
  }
  const resourceFormulaIds = new Set(
    AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_RESOURCES
      .map((resourceDefinition) => resourceDefinition.formula_id),
  );
  if (!AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_FORMULAS
    .every((rateFormula) => resourceFormulaIds.has(rateFormula.formula_id))) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_FORMULA_ORPHAN");
  }
  return true;
}

export async function compileAggressiveEnvironmentBrickFloorOnSulfurCementOrPlasticOrArzamitePuttyDemolitionKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId
    ?? AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_CATALOG_ID;
  if (!(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_CATALOG_IDS as readonly string[]).includes(catalogId)) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters[RATE_09_PROFILE_PARAMETER_ID] != null
    && submittedParameters[RATE_09_PROFILE_PARAMETER_ID]
      !== AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_PROFILE_ID) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters[RATE_09_CONFIRMED_PARAMETER_ID] === false) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
  }
  validateAggressiveEnvironmentBrickFloorOnSulfurCementOrPlasticOrArzamitePuttyDemolitionKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.aggressive-environment-brick-floor-on-sulfur-cement-or-plastic-or-arzamite-putty-demolition-krer46-r1",
    catalogId,
    primaryMeasureParameterId: RATE_09_AREA_PARAMETER_ID,
    parameterDefinitions: [...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_PARAMETERS],
    formulaDefinitions: [...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_FORMULAS],
    resourceDefinitions: [...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 2,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_SOURCE_SUMMARY = Object.freeze({
  sourceId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_SOURCE_ID,
  normId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_NORM_ID,
  exactRate: "46-04-011-09",
  formula: "area_m2 * exact resource rate / 100 m2",
  machineResourcesIncluded: false,
  offsiteWasteHaulIncluded: false,
});

// Column 10 keeps the two-row resource shape of column 09 but describes a
// different physical construction: assorted bedding layers with Arzamite- or
// plastic-putty jointing. It therefore owns separate catalog identities.
const RATE_10_FAMILY_KEY =
  "demolition_aggressive_environment_brick_floor_different_bedding_layers_with_arzamite_or_plastic_putty_joints";
const RATE_10_CATALOG_PREFIX = `canonical-work:master:${RATE_10_FAMILY_KEY}`;

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_CATALOG_ID =
  `${RATE_10_CATALOG_PREFIX}_standard` as const;
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_CATALOG_ID,
    sourceIdentity: `master-work:${RATE_10_FAMILY_KEY}_standard`,
    catalogVariant: "STANDARD_CONFIRMED_BRICK_FLOOR",
    canonicalNameRu: "Разборка кирпичного покрытия пола на разных подстилающих слоях с расшивкой швов арзамит- или пластзамазками в агрессивной среде",
  }),
  large_area: Object.freeze({
    catalogId: `${RATE_10_CATALOG_PREFIX}_large_area`,
    sourceIdentity: `master-work:${RATE_10_FAMILY_KEY}_large_area`,
    catalogVariant: "LARGE_AREA_CONFIRMED_BRICK_FLOOR",
    canonicalNameRu: "Разборка кирпичного покрытия пола на разных подстилающих слоях с расшивкой швов арзамит- или пластзамазками в агрессивной среде — большая площадь",
  }),
  small_area: Object.freeze({
    catalogId: `${RATE_10_CATALOG_PREFIX}_small_area`,
    sourceIdentity: `master-work:${RATE_10_FAMILY_KEY}_small_area`,
    catalogVariant: "SMALL_AREA_CONFIRMED_BRICK_FLOOR",
    canonicalNameRu: "Разборка кирпичного покрытия пола на разных подстилающих слоях с расшивкой швов арзамит- или пластзамазками в агрессивной среде — малая площадь",
  }),
  wet_zone: Object.freeze({
    catalogId: `${RATE_10_CATALOG_PREFIX}_wet_zone`,
    sourceIdentity: `master-work:${RATE_10_FAMILY_KEY}_wet_zone`,
    catalogVariant: "WET_ZONE_CONFIRMED_BRICK_FLOOR",
    canonicalNameRu: "Разборка кирпичного покрытия пола на разных подстилающих слоях с расшивкой швов арзамит- или пластзамазками в агрессивной среде — влажная зона",
  }),
} as const);

export type AggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46VariantKey =
  keyof typeof AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_VARIANTS;

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_VARIANTS)
    .map((variant) => variant.catalogId),
);

export function resolveAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46Variant(
  variantKey: AggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46VariantKey,
) {
  const variant = AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}

function asRate10<T>(value: T): T {
  const replacements = [
    ["demolition_aggressive_environment_brick_floor_sulfur_cement_or_plastic_or_arzamite_putty", "demolition_aggressive_environment_brick_floor_different_bedding_layers_with_arzamite_or_plastic_putty_joints"],
    ["brick_floor_on_sulfur_cement_or_plastic_or_arzamite_putty", "brick_floor_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints"],
    ["brick-floor-on-sulfur-cement-or-plastic-or-arzamite-putty", "brick-floor-on-different-bedding-layers-with-arzamite-or-plastic-putty-joints"],
    ["BRICK_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY", "BRICK_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS"],
    ["SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY", "DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS"],
    ["на серном цементе, пластзамазках или арзамитзамазках", "на разных подстилающих слоях с расшивкой швов арзамит- или пластзамазками"],
    ["46_04_011_09", "46_04_011_10"],
    ["46-04-011-09", "46-04-011-10"],
    ["колонка 09", "колонка 10"],
    ["aggressive_environment_brick_floor_on_sulfur_cement_or_plastic_or_arzamite_putty_demolition", "aggressive_environment_brick_floor_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_demolition"],
    ["66.10", "67.10"],
    ["66,10", "67,10"],
    ["66.1", "67.1"],
  ] as const;
  let serialized = JSON.stringify(value);
  for (const [from, to] of replacements) serialized = serialized.replaceAll(from, to);
  return JSON.parse(serialized) as T;
}

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_SOURCE_ID =
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_SOURCE_ID;
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_NORM_ID =
  "norm:kg:krer:46-04-011-10:2015" as const;
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_ARTIFACT_SHA256 =
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_ARTIFACT_SHA256;
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_PROFILE_ID =
  "KRER_46_04_011_10_BRICK_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_AGGRESSIVE_ENVIRONMENT" as const;

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_SOURCE_METADATA = Object.freeze({
  ...asRate10(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_SOURCE_METADATA),
  exact_locator: "Техническая часть, п. 1.1, PDF/печатная стр. 5; таблица КРЕР 46-04-011, состав работ и измеритель на PDF/печатной стр. 58, ресурсы колонки 46-04-011-10 на стр. 59",
  use_restriction: "Только разборка подтверждённого существующего кирпичного покрытия пола на разных подстилающих слоях с расшивкой швов арзамит- или пластзамазками в агрессивной среде по колонке 46-04-011-10 и подтверждённой площади: труд рабочих 67,10 чел.-ч на 100 м², без труда машинистов и машин. Очистка годного кирпича от раствора и внутриобъектовое перемещение включены; внеобъектовый вывоз исключён.",
});

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_PARAMETERS = Object.freeze(
  asRate10(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_PARAMETERS)
    .map((parameter) => Object.freeze({ ...parameter })),
);
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_FORMULAS = Object.freeze(
  asRate10(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_FORMULAS)
    .map((rateFormula) => Object.freeze({ ...rateFormula })),
);
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  asRate10(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_RESOURCES)
    .map((rateResource) => {
      const resourceWithoutHash = { ...rateResource, row_sha256: undefined };
      return Object.freeze({
        ...rateResource,
        row_sha256: estimateDeterministicHash({
          exactRate: "46-04-011-10",
          resource: resourceWithoutHash,
        }),
      });
    }),
);
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP = Object.freeze(
  asRate10(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP),
);

const RATE_10_AREA_PARAMETER_ID = "floor_covering_area_m2";
const RATE_10_PROFILE_PARAMETER_ID =
  "existing_aggressive_environment_brick_floor_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_profile";
const RATE_10_CONFIRMED_PARAMETER_ID =
  "existing_brick_floor_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_aggressive_environment_confirmed";

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_SHORT_INPUT = Object.freeze({
  [RATE_10_AREA_PARAMETER_ID]: 100,
  [RATE_10_PROFILE_PARAMETER_ID]: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_PROFILE_ID,
  [RATE_10_CONFIRMED_PARAMETER_ID]: true,
});
export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  [RATE_10_AREA_PARAMETER_ID]: 35.5,
  [RATE_10_PROFILE_PARAMETER_ID]: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_PROFILE_ID,
  [RATE_10_CONFIRMED_PARAMETER_ID]: true,
});

export function validateAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46Completeness(): true {
  if (AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_RESOURCES.length !== 2
    || AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries.length !== 5) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_COMPLETENESS_MISMATCH");
  }
  const resourceFormulaIds = new Set(
    AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_RESOURCES
      .map((resourceDefinition) => resourceDefinition.formula_id),
  );
  if (!AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_FORMULAS
    .every((rateFormula) => resourceFormulaIds.has(rateFormula.formula_id))) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_FORMULA_ORPHAN");
  }
  return true;
}

export async function compileAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId
    ?? AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_CATALOG_ID;
  if (!(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_CATALOG_IDS as readonly string[]).includes(catalogId)) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters[RATE_10_PROFILE_PARAMETER_ID] != null
    && submittedParameters[RATE_10_PROFILE_PARAMETER_ID]
      !== AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_PROFILE_ID) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters[RATE_10_CONFIRMED_PARAMETER_ID] === false) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
  }
  validateAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.aggressive-environment-brick-floor-on-different-bedding-layers-with-arzamite-or-plastic-putty-joints-demolition-krer46-r1",
    catalogId,
    primaryMeasureParameterId: RATE_10_AREA_PARAMETER_ID,
    parameterDefinitions: [...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_PARAMETERS],
    formulaDefinitions: [...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_FORMULAS],
    resourceDefinitions: [...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 2,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_SOURCE_SUMMARY = Object.freeze({
  sourceId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_SOURCE_ID,
  normId: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_NORM_ID,
  exactRate: "46-04-011-10",
  formula: "area_m2 * exact resource rate / 100 m2",
  machineResourcesIncluded: false,
  offsiteWasteHaulIncluded: false,
});
