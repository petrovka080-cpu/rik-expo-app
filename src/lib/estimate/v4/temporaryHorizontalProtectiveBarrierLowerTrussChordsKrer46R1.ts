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

const FAMILY_KEY = "temporary_horizontal_protective_barrier_lower_truss_chords";

export const TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_CATALOG_ID =
  `canonical-work:master:${FAMILY_KEY}_standard` as const;
export const TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_CATALOG_ID,
    sourceIdentity: `master-work:${FAMILY_KEY}_standard`,
    catalogVariant: "STANDARD_CONFIRMED_HORIZONTAL_BARRIER_LOWER_TRUSS_CHORDS",
    canonicalNameRu: "Устройство временного горизонтального защитного ограждения с настилом по нижним поясам ферм",
  }),
  large_area: Object.freeze({
    catalogId: `canonical-work:master:${FAMILY_KEY}_large_area`,
    sourceIdentity: `master-work:${FAMILY_KEY}_large_area`,
    catalogVariant: "LARGE_AREA_CONFIRMED_HORIZONTAL_BARRIER_LOWER_TRUSS_CHORDS",
    canonicalNameRu:
      "Устройство временного горизонтального защитного ограждения с настилом по нижним поясам ферм — большая площадь",
  }),
  small_area: Object.freeze({
    catalogId: `canonical-work:master:${FAMILY_KEY}_small_area`,
    sourceIdentity: `master-work:${FAMILY_KEY}_small_area`,
    catalogVariant: "SMALL_AREA_CONFIRMED_HORIZONTAL_BARRIER_LOWER_TRUSS_CHORDS",
    canonicalNameRu:
      "Устройство временного горизонтального защитного ограждения с настилом по нижним поясам ферм — малая площадь",
  }),
  wet_zone: Object.freeze({
    catalogId: `canonical-work:master:${FAMILY_KEY}_wet_zone`,
    sourceIdentity: `master-work:${FAMILY_KEY}_wet_zone`,
    catalogVariant: "WET_ZONE_CONFIRMED_HORIZONTAL_BARRIER_LOWER_TRUSS_CHORDS",
    canonicalNameRu:
      "Устройство временного горизонтального защитного ограждения с настилом по нижним поясам ферм — влажная зона",
  }),
} as const);
export type TemporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46VariantKey =
  keyof typeof TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_VARIANTS;
export const TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_VARIANTS).map((variant) =>
    variant.catalogId),
);

export function resolveTemporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46Variant(
  variantKey: TemporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46VariantKey,
) {
  const variant = TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}
export const TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_ID =
  "kg_krer_46_2015_reconstruction_official" as const;
export const TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_NORM_ID =
  "norm:kg:krer:46-05-001-01:2015" as const;
export const TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_ARTIFACT_SHA256 =
  "21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471" as const;
export const TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_PROFILE_ID =
  "KRER_46_05_001_01_HORIZONTAL_LOWER_TRUSS_CHORDS_CONTINUOUS_BOARD_DECKING" as const;

export const TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_METADATA = Object.freeze({
  source_title:
    "КРЕР 46-2015 «Работы при реконструкции зданий и сооружений», таблица 46-05-001",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
  source_document_version: "КРЕР 46-2015; введён в действие с 1 января 2016 года",
  definition_hash: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_ARTIFACT_SHA256,
  exact_locator:
    "Техническая часть, PDF/печатная стр. 5; таблица КРЕР 46-05-001, состав работ и измеритель на PDF/печатной стр. 62, колонка 46-05-001-01 и нормы ресурсов на PDF/печатной стр. 63",
  use_restriction:
    "Только устройство и последующая разборка временного горизонтального защитного ограждения с непрерывным дощатым настилом по нижним поясам ферм по колонке 46-05-001-01 и подтверждённой площади горизонтальной проекции. Нормы 02 для ограждения на балках по стойкам и 03 для вертикального ограждения не подменяются.",
  source_kind: "OFFICIAL_KG_UNIT_RATE",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/459/show",
  artifact_sha256: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_ARTIFACT_SHA256,
  effective_from: "2016-01-01",
});

const PARAMETER_SPECS = Object.freeze([
  ["barrier_horizontal_projection_area_m2", "Площадь горизонтальной проекции временного защитного ограждения", "decimal", "m2"],
  ["temporary_protective_barrier_profile", "Выбранная колонка КРЕР для временного защитного ограждения", "enum", null],
  ["horizontal_barrier_lower_truss_chords_confirmed", "Подтверждено горизонтальное ограждение с непрерывным дощатым настилом по нижним поясам ферм", "boolean", null],
] as const);

export type TemporaryHorizontalProtectiveBarrierLowerTrussChordsParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
    truth_metadata: Json;
  };

export const TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_PARAMETERS:
readonly TemporaryHorizontalProtectiveBarrierLowerTrussChordsParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: parameterId === "barrier_horizontal_projection_area_m2"
      ? { min: 0.000_001 }
      : parameterId === "temporary_protective_barrier_profile"
        ? { values: [TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_PROFILE_ID] }
        : {},
    truth_metadata: {
      contract: "rik-expo-app.temporary-horizontal-protective-barrier-lower-truss-chords-krer46-r1",
      semantic_parameter_key: `temporary-horizontal-protective-barrier-lower-truss-chords:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "USER_OR_APPROVED_TEMPORARY_WORKS_PLAN",
      input_origin_class: parameterId === "barrier_horizontal_projection_area_m2"
        ? "KNOWN_WORK_SCOPE"
        : "TEMPORARY_WORKS_METHOD_AND_RATE_APPLICABILITY_CONFIRMATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: parameterId !== "barrier_horizontal_projection_area_m2",
      guide: {
        guide_kind: parameterId === "barrier_horizontal_projection_area_m2"
          ? "MEASUREMENT_RULE"
          : parameterId === "temporary_protective_barrier_profile"
            ? "ENUM_DECISION_RULE"
            : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "barrier_horizontal_projection_area_m2"
          ? "Укажите проектную площадь горизонтальной проекции временного ограждения с настилом по нижним поясам ферм без коэффициента зоны или запаса."
          : "Подтвердите планом временных работ горизонтальное ограждение с непрерывным дощатым настилом по нижним поясам ферм и колонку 46-05-001-01; ограждения по стойкам и вертикальные ограждения относятся к отдельным колонкам.",
        source_role: "OFFICIAL_KG_UNIT_RATE_AND_APPROVED_TEMPORARY_WORKS_PLAN",
        source_document: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_ID,
        source_locator: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_METADATA.exact_locator,
        guide_version: "temporary-horizontal-protective-barrier-lower-truss-chords-krer46-r1",
        source_snapshot_hash: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_ARTIFACT_SHA256,
        applicability:
          "Только таблица 46-05-001, колонка 01: временное горизонтальное защитное ограждение с непрерывным настилом по нижним поясам ферм; колонки 02 и 03 не подменяются.",
        verified_at: "2026-09-24T11:45:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_APPLICABILITY_REJECT_WRONG_TEMPORARY_BARRIER_PROFILE",
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

export const TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("temporary_horizontal_protective_barrier_lower_truss_chords_area_v1", "m2", "barrier_horizontal_projection_area_m2"),
  formula(
    "temporary_horizontal_protective_barrier_lower_truss_chords_labor_krer_46_05_001_01_v1",
    "man_hour",
    "barrier_horizontal_projection_area_m2 * 85.23 / 100",
  ),
  formula(
    "temporary_horizontal_protective_barrier_lower_truss_chords_machinist_labor_krer_46_05_001_01_v1",
    "man_hour",
    "barrier_horizontal_projection_area_m2 * 0.44 / 100",
  ),
  formula("temporary_horizontal_protective_barrier_lower_truss_chords_crane_krer_46_05_001_01_v1", "machine_hour", "barrier_horizontal_projection_area_m2 * 0.44 / 100"),
  formula("temporary_horizontal_protective_barrier_lower_truss_chords_winch_krer_46_05_001_01_v1", "machine_hour", "barrier_horizontal_projection_area_m2 * 1.31 / 100"),
  formula("temporary_horizontal_protective_barrier_lower_truss_chords_truck_krer_46_05_001_01_v1", "machine_hour", "barrier_horizontal_projection_area_m2 * 0.65 / 100"),
  formula("temporary_horizontal_protective_barrier_lower_truss_chords_construction_nails_krer_46_05_001_01_v1", "t", "barrier_horizontal_projection_area_m2 * 0.015 / 100"),
  formula("temporary_horizontal_protective_barrier_lower_truss_chords_roofing_nails_krer_46_05_001_01_v1", "t", "barrier_horizontal_projection_area_m2 * 0.003 / 100"),
  formula("temporary_horizontal_protective_barrier_lower_truss_chords_logs_krer_46_05_001_01_v1", "m3", "barrier_horizontal_projection_area_m2 * 0.98 / 100"),
  formula("temporary_horizontal_protective_barrier_lower_truss_chords_boards_32_40mm_krer_46_05_001_01_v1", "m3", "barrier_horizontal_projection_area_m2 * 0.14 / 100"),
  formula("temporary_horizontal_protective_barrier_lower_truss_chords_boards_44mm_plus_krer_46_05_001_01_v1", "m3", "barrier_horizontal_projection_area_m2 * 1.4 / 100"),
  formula("temporary_horizontal_protective_barrier_lower_truss_chords_roofing_felt_krer_46_05_001_01_v1", "m2", "barrier_horizontal_projection_area_m2 * 230 / 100"),
  formula("temporary_horizontal_protective_barrier_lower_truss_chords_wire_rod_krer_46_05_001_01_v1", "t", "barrier_horizontal_projection_area_m2 * 0.073 / 100"),
]);

const applicable = {
  kind: "and",
  operands: [
    {
      kind: "equals",
      parameterId: "temporary_protective_barrier_profile",
      value: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_PROFILE_ID,
    },
    {
      kind: "equals",
      parameterId: "horizontal_barrier_lower_truss_chords_confirmed",
      value: true,
    },
  ],
};

type CostTreatment = "OWN_COST" | "INCLUDED_IN_RESOURCE_ROWS" | "INFORMATIONAL_SCOPE";

function resource(input: Readonly<{
  rowId: string;
  ordinal: number;
  section: string;
  category: "construction_work" | "equipment" | "material";
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
    semanticOwnerId: `temporary-horizontal-protective-barrier-lower-truss-chords:${input.rowId}`,
    costOwner: input.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: input.costTreatment,
    payable: input.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "barrier_horizontal_projection_area_m2",
    quantityBasis: "CONFIRMED_HORIZONTAL_PROJECTION_AREA_TIMES_EXACT_KRER_RATE_PER_100_M2",
    ...(input.parentRowId ? { parentCostOwnerId: input.parentRowId } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "OFFICIAL_KG_RESOURCE_NORM",
    krerResourceCode: input.krerResourceCode,
    normativeRatePer100M2: input.normativeRatePer100M2,
    normativeTrace: [{
      sourceId: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_ID,
      source_id: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_ID,
      normId: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_NORM_ID,
      norm_id: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_NORM_ID,
      normVersion:
        TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_METADATA.source_document_version,
      source_title: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_METADATA.source_title,
      exact_locator: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_METADATA.exact_locator,
      source_definition_hash: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_ARTIFACT_SHA256,
    }],
    excludedAdjacentScope: [
      "horizontal temporary barrier on beams supported by log posts (46-05-001-02)",
      "vertical temporary protective barrier with board-frame facing (46-05-001-03)",
      "permanent fence, road guardrail or unrelated safety system",
      "unlisted reuse credit, salvage recovery or disposal allowance",
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

const LABOR_ROW_ID = "f09:temporary_horizontal_protective_barrier_lower_truss_chords:labor";

export const TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({
    rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:operation",
    ordinal: 0,
    section: "Состав работ",
    category: "construction_work",
    titleRu: "Устройство и разборка временного горизонтального защитного ограждения с непрерывным дощатым настилом по нижним поясам ферм",
    unitId: "m2",
    formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_area_v1",
    costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
    parentRowId: LABOR_ROW_ID,
    krerResourceCode: "46-05-001-01",
    normativeRatePer100M2: 100,
  }),
  resource({
    rowId: LABOR_ROW_ID,
    ordinal: 1,
    section: "Труд",
    category: "construction_work",
    titleRu: "Труд рабочих-строителей среднего разряда 2,6",
    unitId: "man_hour",
    formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_labor_krer_46_05_001_01_v1",
    costTreatment: "OWN_COST",
    krerResourceCode: "000-1002-6",
    normativeRatePer100M2: 85.23,
  }),
  resource({
    rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:machinist_labor",
    ordinal: 2,
    section: "Справочный состав машин",
    category: "construction_work",
    titleRu: "Затраты труда машинистов по расценке",
    unitId: "man_hour",
    formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_machinist_labor_krer_46_05_001_01_v1",
    costTreatment: "INFORMATIONAL_SCOPE",
    krerResourceCode: "KRER_AGGREGATE_MACHINIST_LABOR",
    normativeRatePer100M2: 0.44,
  }),
  resource({
    rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:truck_crane_10t",
    ordinal: 3,
    section: "Машины и механизмы",
    category: "equipment",
    titleRu: "Кран на автомобильном ходу при работе на других видах строительства, 10 т",
    unitId: "machine_hour",
    formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_crane_krer_46_05_001_01_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "02-0075",
    normativeRatePer100M2: 0.44,
  }),
  resource({
    rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:electric_winch_19_62kn",
    ordinal: 4,
    section: "Машины и механизмы",
    category: "equipment",
    titleRu: "Лебёдка электрическая тяговым усилием 19,62 кН (2 тс)",
    unitId: "machine_hour",
    formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_winch_krer_46_05_001_01_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "03-0160",
    normativeRatePer100M2: 1.31,
  }),
  resource({
    rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:truck_5t",
    ordinal: 5,
    section: "Машины и механизмы",
    category: "equipment",
    titleRu: "Автомобиль бортовой грузоподъёмностью до 5 т",
    unitId: "machine_hour",
    formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_truck_krer_46_05_001_01_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "40-0001",
    normativeRatePer100M2: 0.65,
  }),
  resource({
    rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:construction_nails",
    ordinal: 6,
    section: "Материалы",
    category: "material",
    titleRu: "Гвозди строительные",
    unitId: "t",
    formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_construction_nails_krer_46_05_001_01_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "01-1110-0002",
    normativeRatePer100M2: 0.015,
  }),
  resource({
    rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:roofing_nails",
    ordinal: 7,
    section: "Материалы",
    category: "material",
    titleRu: "Гвозди толевые круглые 2,0×25 мм",
    unitId: "t",
    formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_roofing_nails_krer_46_05_001_01_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "01-1113-0002",
    normativeRatePer100M2: 0.003,
  }),
  resource({
    rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:softwood_logs_14_24cm",
    ordinal: 8,
    section: "Материалы",
    category: "material",
    titleRu: "Лесоматериалы круглые хвойных пород для строительства, длина 3–6,5 м, диаметр 14–24 см",
    unitId: "m3",
    formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_logs_krer_46_05_001_01_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "01-4201-0027",
    normativeRatePer100M2: 0.98,
  }),
  resource({
    rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:softwood_unedged_boards_32_40mm_grade4",
    ordinal: 9,
    section: "Материалы",
    category: "material",
    titleRu: "Доски хвойных пород необрезные, длина 4–6,5 м, ширина любая, толщина 32–40 мм, IV сорт",
    unitId: "m3",
    formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_boards_32_40mm_krer_46_05_001_01_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "01-6304-0075",
    normativeRatePer100M2: 0.14,
  }),
  resource({
    rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:softwood_unedged_boards_44mm_plus_grade3",
    ordinal: 10,
    section: "Материалы",
    category: "material",
    titleRu: "Доски хвойных пород необрезные, длина 4–6,5 м, ширина любая, толщина 44 мм и более, III сорт",
    unitId: "m3",
    formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_boards_44mm_plus_krer_46_05_001_01_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "01-6304-0079",
    normativeRatePer100M2: 1.4,
  }),
  resource({
    rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:roofing_felt_tk350",
    ordinal: 11,
    section: "Материалы",
    category: "material",
    titleRu: "Толь с крупнозернистой посыпкой, гидроизоляционный ТК-350",
    unitId: "m2",
    formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_roofing_felt_krer_46_05_001_01_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "01-7413-0001",
    normativeRatePer100M2: 230,
  }),
  resource({
    rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:wire_rod_6_3_6_5mm",
    ordinal: 12,
    section: "Материалы",
    category: "material",
    titleRu: "Катанка горячекатаная в мотках диаметром 6,3–6,5 мм",
    unitId: "t",
    formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_wire_rod_krer_46_05_001_01_v1",
    costTreatment: "OWN_COST",
    procurementEligible: true,
    krerResourceCode: "10-0105-0001",
    normativeRatePer100M2: 0.073,
  }),
]);

const COMPONENTS = Object.freeze([
  { operationId: "temporary_horizontal_protective_barrier_lower_truss_chords", rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:operation", category: "construction_work", specification: "Устройство и разборка временного горизонтального защитного ограждения с настилом по нижним поясам ферм", unitId: "m2", formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_area_v1", priceRelation: "INCLUDED_IN_PARENT" },
  { operationId: "construction_labor_grade_2_6", rowId: LABOR_ROW_ID, category: "construction_work", specification: "85,23 чел.-ч на 100 м²", unitId: "man_hour", formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_labor_krer_46_05_001_01_v1", priceRelation: "OWN_COST" },
  { operationId: "machinist_labor_aggregate", rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:machinist_labor", category: "construction_work", specification: "0,44 чел.-ч на 100 м², справочно без повторной оплаты", unitId: "man_hour", formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_machinist_labor_krer_46_05_001_01_v1", priceRelation: "INFORMATIONAL_SCOPE" },
  { operationId: "truck_crane_10t", rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:truck_crane_10t", category: "equipment", specification: "0,44 маш.-ч на 100 м²", unitId: "machine_hour", formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_crane_krer_46_05_001_01_v1", priceRelation: "OWN_COST" },
  { operationId: "electric_winch_19_62kn", rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:electric_winch_19_62kn", category: "equipment", specification: "1,31 маш.-ч на 100 м²", unitId: "machine_hour", formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_winch_krer_46_05_001_01_v1", priceRelation: "OWN_COST" },
  { operationId: "truck_5t", rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:truck_5t", category: "equipment", specification: "0,65 маш.-ч на 100 м²", unitId: "machine_hour", formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_truck_krer_46_05_001_01_v1", priceRelation: "OWN_COST" },
  { operationId: "construction_nails", rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:construction_nails", category: "material", specification: "0,015 т на 100 м²", unitId: "t", formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_construction_nails_krer_46_05_001_01_v1", priceRelation: "OWN_COST" },
  { operationId: "roofing_nails", rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:roofing_nails", category: "material", specification: "0,003 т на 100 м²", unitId: "t", formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_roofing_nails_krer_46_05_001_01_v1", priceRelation: "OWN_COST" },
  { operationId: "softwood_logs_14_24cm", rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:softwood_logs_14_24cm", category: "material", specification: "0,98 м³ на 100 м²", unitId: "m3", formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_logs_krer_46_05_001_01_v1", priceRelation: "OWN_COST" },
  { operationId: "softwood_unedged_boards_32_40mm_grade4", rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:softwood_unedged_boards_32_40mm_grade4", category: "material", specification: "0,14 м³ на 100 м²", unitId: "m3", formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_boards_32_40mm_krer_46_05_001_01_v1", priceRelation: "OWN_COST" },
  { operationId: "softwood_unedged_boards_44mm_plus_grade3", rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:softwood_unedged_boards_44mm_plus_grade3", category: "material", specification: "1,4 м³ на 100 м²", unitId: "m3", formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_boards_44mm_plus_krer_46_05_001_01_v1", priceRelation: "OWN_COST" },
  { operationId: "roofing_felt_tk350", rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:roofing_felt_tk350", category: "material", specification: "230 м² на 100 м²", unitId: "m2", formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_roofing_felt_krer_46_05_001_01_v1", priceRelation: "OWN_COST" },
  { operationId: "wire_rod_6_3_6_5mm", rowId: "f09:temporary_horizontal_protective_barrier_lower_truss_chords:wire_rod_6_3_6_5mm", category: "material", specification: "0,073 т на 100 м²", unitId: "t", formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_wire_rod_krer_46_05_001_01_v1", priceRelation: "OWN_COST" },
]);

export const TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "NORMATIVE_OPERATION_MAP",
    rateTable: "KRER_46_05_001_01",
    generatedFromCurrentRows: false,
    evidenceSha256: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_ARTIFACT_SHA256,
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
        condition: "confirmed_krer_46_05_001_01_horizontal_barrier_lower_truss_chords",
        sourceId: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_ID,
        unitId: component.unitId,
        quantityRule: "CONFIRMED_HORIZONTAL_PROJECTION_AREA_MULTIPLIED_BY_EXACT_KRER_RATE_PER_100_M2",
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
        condition: "selected_krer_46_05_001_01_rate",
        sourceId: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "INCLUDED_IN_OFFICIAL_INSTALL_AND_DISMANTLE_LABOR_RATE",
        detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: "temporary_horizontal_protective_barrier_lower_truss_chords_labor_krer_46_05_001_01_v1",
        resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
      },
      {
        expectedResourceId: "adjacent-operation:permanent-fence-or-road-guardrail",
        operationId: "permanent_fence_or_road_guardrail",
        category: "construction_work",
        specification: "Постоянный забор или дорожное ограждение",
        condition: "not_in_krer_46_05_001_01",
        sourceId: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_ID,
        unitId: "m2",
        quantityRule: "SEPARATE_PHYSICAL_WORK_REQUIRED",
        detailPrinciple: "EXCLUDED_FROM_RATE",
        priceRelation: "NOT_INCLUDED",
        resolution: {
          kind: "NOT_APPLICABLE",
          reasonRu: "КРЕР 46-05-001-01 относится только к временному защитному ограждению на период работ и его последующей разборке.",
        },
      },
    ],
  });

export function validateTemporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46Completeness(): true {
  const expected = new Set(COMPONENTS.map((component) => component.rowId));
  const actual = new Set(TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_RESOURCES.map((row) =>
    row.row_id));
  for (const rowId of expected) {
    if (!actual.has(rowId)) {
      throw new Error(`TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_MISSING_ROW:${rowId}`);
    }
  }
  if (actual.size !== 13) {
    throw new Error("TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_ROW_COUNT_MISMATCH");
  }
  return true;
}

export const TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SHORT_INPUT = Object.freeze({
  barrier_horizontal_projection_area_m2: 100,
  temporary_protective_barrier_profile: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_PROFILE_ID,
  horizontal_barrier_lower_truss_chords_confirmed: true,
});

export const TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  barrier_horizontal_projection_area_m2: 35.5,
  temporary_protective_barrier_profile: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_PROFILE_ID,
  horizontal_barrier_lower_truss_chords_confirmed: true,
});

export async function compileTemporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_CATALOG_ID;
  if (!(TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_CATALOG_IDS as readonly string[])
    .includes(catalogId)) {
    throw new Error(`TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters.temporary_protective_barrier_profile != null
    && submittedParameters.temporary_protective_barrier_profile
      !== TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_PROFILE_ID) {
    throw new Error("TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters.horizontal_barrier_lower_truss_chords_confirmed === false) {
    throw new Error("TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_PROFILE_NOT_CONFIRMED");
  }
  validateTemporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.temporary-horizontal-protective-barrier-lower-truss-chords-krer46-r1",
    catalogId,
    primaryMeasureParameterId: "barrier_horizontal_projection_area_m2",
    parameterDefinitions: [...TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_PARAMETERS],
    formulaDefinitions: [...TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_FORMULAS],
    resourceDefinitions: [...TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    priceItems: [],
    currencyCode: "KGS",
    maximumResourceRows: 100,
    hashJson: estimateDeterministicHash,
  });
}
