import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { unresolvedApplicationNormTruthR1 } from "./automaticConstructionOwnerR1";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type Json = Record<string, unknown>;

export const STONE_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_ID =
  "canonical-work:base:demolition_interior_flooring_remove_standard" as const;
export const STONE_TILE_FLOOR_DEMOLITION_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: STONE_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_ID,
    catalogVariant: "STANDARD_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu: "Разборка покрытия пола из каменной шашки",
  }),
  large_area: Object.freeze({
    catalogId: "canonical-work:base:demolition_interior_flooring_remove_large_area",
    catalogVariant: "LARGE_AREA_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu: "Разборка покрытия пола из каменной шашки — большая площадь",
  }),
  small_area: Object.freeze({
    catalogId: "canonical-work:base:demolition_interior_flooring_remove_small_area",
    catalogVariant: "SMALL_AREA_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu: "Разборка покрытия пола из каменной шашки — малая площадь",
  }),
  wet_zone: Object.freeze({
    catalogId: "canonical-work:base:demolition_interior_flooring_remove_wet_zone",
    catalogVariant: "WET_ZONE_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    canonicalNameRu: "Разборка покрытия пола из каменной шашки — влажная зона",
  }),
} as const);
export type StoneTileFloorDemolitionKrer46VariantKey =
  keyof typeof STONE_TILE_FLOOR_DEMOLITION_KRER46_VARIANTS;
export const STONE_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(STONE_TILE_FLOOR_DEMOLITION_KRER46_VARIANTS).map((variant) =>
    variant.catalogId),
);

export function resolveStoneTileFloorDemolitionKrer46Variant(
  variantKey: StoneTileFloorDemolitionKrer46VariantKey,
) {
  const variant = STONE_TILE_FLOOR_DEMOLITION_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`STONE_TILE_FLOOR_DEMOLITION_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}
export const STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID =
  "kg_krer_46_2015_reconstruction_official" as const;
export const STONE_TILE_FLOOR_DEMOLITION_KRER46_NORM_ID =
  "norm:kg:krer:46-04-010-05:2015" as const;
export const STONE_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256 =
  "21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471" as const;
export const STONE_TILE_FLOOR_DEMOLITION_KRER46_PROFILE_ID =
  "KRER_46_04_010_05_STONE_CUBES" as const;

export const STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA = Object.freeze({
  source_title:
    "КРЕР 46-2015 «Работы при реконструкции зданий и сооружений», таблица 46-04-010",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
  source_document_version: "КРЕР 46-2015; введён в действие с 1 января 2016 года",
  definition_hash: STONE_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  exact_locator:
    "Техническая часть, п. 1.1, PDF/печатная стр. 5; таблица КРЕР 46-04-010, состав работ и измеритель на PDF/печатной стр. 57, колонка 46-04-010-05 и норма труда на PDF/печатной стр. 58",
  use_restriction:
    "Только разборка существующего покрытия пола из каменной шашки по подтверждённой площади; 39,18 чел.-ч на 100 м². Новое покрытие, основание пола, внеобъектовый вывоз и размещение отходов не включены.",
  source_kind: "OFFICIAL_KG_UNIT_RATE",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/459/show",
  artifact_sha256: STONE_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  effective_from: "2016-01-01",
});

export const STONE_CUBES_SOURCE_SCOPE_VALUE = "Каменная шашка по КРЕР 46-04-010-05; обследование подтверждает материал и границы нормы";
export const STONE_CUBES_SOURCE_GAPS = Object.freeze([
  {id:"packaging", parameter:"open_qty_packaging", title:"Упаковка отходов: вид тары и количество по отдельному заданию", category:"material", unit:"pcs", reason:"Колонка 05 не задаёт тару, её вместимость и количество; необходимость упаковки определяют по принятой схеме обращения с отходами."},
  {id:"other-descent", parameter:"open_qty_other_descent", title:"Спуск отходов в мешках или на носилках: отдельная применимость и труд", category:"construction_work", unit:"man_hour", reason:"Норма включает спуск через окно в лотках. Для иного способа нужны отдельные схема и норма без повторной оплаты включённого труда."},
  {id:"offsite-haul", parameter:"open_qty_offsite_haul", title:"Внеобъектовый вывоз отходов: масса, маршрут и отдельная услуга", category:"service", unit:"t_km", reason:"Внешний вывоз не включён. Источник не задаёт массу отходов, расстояние, автомобиль и число рейсов; площадь не заменяет эти данные."},
  {id:"disposal", parameter:"open_qty_disposal", title:"Приём и размещение отходов на согласованном объекте: отдельная услуга", category:"service", unit:"t", reason:"Нужны подтверждённые состав и масса отходов, объект приёма и условия услуги; отсутствие этой нормы не означает неприменимость."},
] as const);
const PARAMETER_SPECS = Object.freeze([
  ["floor_covering_area_m2", "Площадь покрытия пола из каменной шашки", "decimal", "m2"],
  ["existing_covering_profile", "Выбранная колонка КРЕР для существующего покрытия", "enum", null],
  ["existing_stone_tile_covering_confirmed", "Подтверждено существующее покрытие из каменной шашки", "boolean", null],
  ["stone_cubes_source_scope_confirmed", "Повторное подтверждение обследования: именно каменная шашка и границы КРЕР", "enum", null],
] as const);

export type StoneTileFloorDemolitionParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
    truth_metadata: Json;
  };

export const STONE_TILE_FLOOR_DEMOLITION_KRER46_PARAMETERS:
readonly StoneTileFloorDemolitionParameter[] = Object.freeze(
  [...PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: parameterId === "floor_covering_area_m2"
      ? { min: 0.000_001 }
      : parameterId === "existing_covering_profile"
        ? { values: [STONE_TILE_FLOOR_DEMOLITION_KRER46_PROFILE_ID] }
        : parameterId === "stone_cubes_source_scope_confirmed"
          ? { values: [STONE_CUBES_SOURCE_SCOPE_VALUE] } : {},
    truth_metadata: {
      contract: "rik-expo-app.stone-tile-floor-demolition-krer46-r1",
      semantic_parameter_key: `stone-tile-floor-demolition:${parameterId}`,
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
          : parameterId === "existing_covering_profile"
            ? "ENUM_DECISION_RULE"
            : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "floor_covering_area_m2"
          ? "Укажите чистую фактическую площадь снимаемого покрытия без автоматически добавленного запаса."
          : "Подтвердите по обследованию именно существующее покрытие из каменной шашки; для другого материала выберите другую колонку нормы.",
        source_role: "OFFICIAL_KG_UNIT_RATE_AND_EXISTING_CONDITION_SURVEY",
        source_document: STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
        source_locator: STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
        guide_version: "stone-tile-floor-demolition-krer46-r1",
        source_snapshot_hash: STONE_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
        applicability:
          "Только таблица 46-04-010, колонка 05: разборка покрытия пола из каменной шашки.",
        verified_at: "2026-10-10T12:00:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_APPLICABILITY_REJECT_WRONG_MATERIAL_OR_PROFILE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
  ...STONE_CUBES_SOURCE_GAPS.map((gap, index) => ({parameter_id:gap.parameter,ordinal:PARAMETER_SPECS.length+index,
    value_type:"decimal" as const,unit_id:gap.unit,title_ru:gap.title,required:false,default_value:null,constraints_json:{min:0},
    truth_metadata:unresolvedApplicationNormTruthR1({},gap.reason)}))],
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

export const STONE_TILE_FLOOR_DEMOLITION_KRER46_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("stone_tile_floor_demolition_area_v1", "m2", "floor_covering_area_m2"),
  formula(
    "stone_tile_floor_demolition_labor_krer_46_04_010_05_v1",
    "man_hour",
    "floor_covering_area_m2 * 39.18 / 100",
  ),
  ...STONE_CUBES_SOURCE_GAPS.map(gap=>formula(`stone_cubes_gap_${gap.id}`,gap.unit,gap.parameter)),
]);

const applicable = {
  kind: "and",
  operands: [
    {kind:"equals",parameterId:"stone_cubes_source_scope_confirmed",value:STONE_CUBES_SOURCE_SCOPE_VALUE},
    {
      kind: "equals",
      parameterId: "existing_covering_profile",
      value: STONE_TILE_FLOOR_DEMOLITION_KRER46_PROFILE_ID,
    },
    {
      kind: "equals",
      parameterId: "existing_stone_tile_covering_confirmed",
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
    semanticOwnerId: `stone-tile-floor-demolition:${input.rowId}`,
    costOwner: input.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: input.costTreatment,
    payable: input.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "floor_covering_area_m2",
    quantityBasis: input.rowId.endsWith(":operation")
      ? "CONFIRMED_EXISTING_STONE_CUBES_COVERING_AREA"
      : "AREA_MULTIPLIED_BY_39_18_MAN_HOURS_PER_100_M2",
    scopeContextParameterIds: [
      "floor_covering_area_m2",
      "existing_covering_profile",
      "existing_stone_tile_covering_confirmed",
      "stone_cubes_source_scope_confirmed",
    ],
    ...(input.parentRowId ? { parentCostOwnerId: input.parentRowId } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "OFFICIAL_KG_UNIT_RATE",
    krerResourceCode: input.rowId.endsWith(":labor") ? "000-1002-0" : null,
    normativeRatePer100M2: input.rowId.endsWith(":labor") ? 39.18 : 100,
    normativeTrace: [{
      sourceId: STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
      source_id: STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
      normId: STONE_TILE_FLOOR_DEMOLITION_KRER46_NORM_ID,
      norm_id: STONE_TILE_FLOOR_DEMOLITION_KRER46_NORM_ID,
      normVersion:
        STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.source_document_version,
      source_title: STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.source_title,
      exact_locator: STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      source_definition_hash: STONE_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
    }],
    includedInRate: [
      "разборка существующего покрытия пола из каменной шашки",
      "уборка материалов и отходов от разборки",
      "сортировка и штабелирование пригодных материалов",
      "спуск через окно в лотках; горизонтальное перемещение до 130 м суммарно, включая до 50 м от объекта",
    ],
    excludedAdjacentScope: [
      "демонтаж бетонного основания или стяжки под покрытием",
      "новое покрытие, клей, раствор, основание и отделочные слои",
      "внеобъектовый вывоз и размещение отходов",
      "другие материалы покрытия и соседние колонки таблицы 46-04-010",
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

const LABOR_ROW_ID = "f09:stone_tile_floor_demolition:labor";

export const STONE_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({
    rowId: "f09:stone_tile_floor_demolition:operation",
    ordinal: 0,
    titleRu: "Разборка существующего покрытия пола из каменной шашки",
    unitId: "m2",
    formulaId: "stone_tile_floor_demolition_area_v1",
    costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
    parentRowId: LABOR_ROW_ID,
  }),
  resource({
    rowId: LABOR_ROW_ID,
    ordinal: 1,
    titleRu: "Труд рабочих-строителей среднего разряда 2,0",
    unitId: "man_hour",
    formulaId: "stone_tile_floor_demolition_labor_krer_46_04_010_05_v1",
    costTreatment: "OWN_COST",
  }),
  ...STONE_CUBES_SOURCE_GAPS.map((gap,index)=>{
    const base=resource({rowId:`f09:stone_tile_floor_demolition:${gap.id}`,ordinal:index+2,titleRu:gap.title,unitId:gap.unit,
      formulaId:`stone_cubes_gap_${gap.id}`,costTreatment:"OWN_COST"});
    const {row_sha256:_old,...content}=base;
    const corrected={...content,category:gap.category,section:"Дополнительное обращение с отходами — требуется отдельное обоснование",
      resource_graph:{...base.resource_graph,quantityBasis:"UNRESOLVED_SEPARATE_APPLICABILITY_AND_QUANTITY",normativeLaborNotDuplicated:true,
        operationCompositionV1:{contractVersion:"canonical-operation-resource/v1",groupId:"stone-cubes-waste-plan",groupTitleRu:"Дополнительное обращение с отходами",operationId:gap.id,operationTitleRu:gap.title,operationOrdinal:index+1},
        additionalDetailsRu:[gap.reason]},source_metadata:{...base.source_metadata,normativeTrace:[],krerResourceCode:null,normativeRatePer100M2:null,
          sourceRole:"UNRESOLVED_SEPARATE_WASTE_SCOPE",includedInRate:[],reasonRu:gap.reason,full_technical_acceptance:false}};
    return {...corrected,row_sha256:estimateDeterministicHash(corrected)};
  }),
]);

export const STONE_TILE_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "NORMATIVE_OPERATION_MAP",
    rateTable: "KRER_46_04_010_05",
    generatedFromCurrentRows: false,
    evidenceSha256: STONE_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
    evidenceReferences: [
      STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.official_url,
      "КРЕР 46-2015, PDF/печатные страницы 5, 57 и 58",
    ],
    entries: [
      {
        operationId: "stone_tile_floor_covering_demolition",
        expectedResourceId: "required-operation:stone-tile-floor-demolition",
        category: "construction_work",
        specification: "Разборка покрытия пола из каменной шашки",
        condition: "confirmed_krer_46_04_010_05",
        sourceId: STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "m2",
        quantityRule: "CONFIRMED_NET_AREA_ONE_TO_ONE",
        detailPrinciple: "EXACT_OFFICIAL_RATE_COLUMN_WITHOUT_AREA_FACTOR",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: "stone_tile_floor_demolition_area_v1",
        resolution: {
          kind: "INCLUDED_COMPONENT_ROW",
          rowId: "f09:stone_tile_floor_demolition:operation",
          parentRowId: LABOR_ROW_ID,
        },
      },
      {
        operationId: "construction_labor_grade_2_0",
        expectedResourceId: "required-resource:construction-labor-grade-2-0",
        category: "construction_work",
        specification: "39,18 чел.-ч на 100 м²",
        condition: "confirmed_krer_46_04_010_05",
        sourceId: STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "AREA_MULTIPLIED_BY_39_18_PER_100_M2",
        detailPrinciple: "EXACT_OFFICIAL_RATE_COLUMN_WITHOUT_AREA_FACTOR",
        priceRelation: "OWN_COST",
        formulaId: "stone_tile_floor_demolition_labor_krer_46_04_010_05_v1",
        resolution: { kind: "ROW", rowId: LABOR_ROW_ID },
      },
      {
        operationId: "internal_debris_handling_within_object",
        expectedResourceId: "required-operation:internal-debris-handling-within-object",
        category: "construction_work",
        specification: "Уборка, сортировка, штабелирование; спуск через окно в лотках; горизонтальное перемещение до 130 м суммарно, включая до 50 м от объекта",
        condition: "selected_krer_46_reconstruction_rate",
        sourceId: STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
        unitId: "man_hour",
        quantityRule: "INCLUDED_IN_OFFICIAL_LABOR_RATE",
        detailPrinciple: "NO_SEPARATE_DUPLICATE_ROW",
        priceRelation: "INCLUDED_IN_PARENT",
        formulaId: "stone_tile_floor_demolition_labor_krer_46_04_010_05_v1",
        resolution: { kind: "INCLUDED_IN_PARENT", parentRowId: LABOR_ROW_ID },
      },
      ...STONE_CUBES_SOURCE_GAPS.map(gap=>({operationId:gap.id,expectedResourceId:`separate-waste:${gap.id}`,
        category:gap.category,specification:gap.title,condition:"SEPARATE_APPLICABILITY_AND_SOURCE_REQUIRED",sourceId:STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
        unitId:gap.unit,quantityRule:"OPEN_NO_ASSUMED_QUANTITY",detailPrinciple:"EXCLUDED_FROM_NORM_IS_NOT_NOT_APPLICABLE",priceRelation:"SEPARATE_IF_APPLICABLE",
        formulaId:`stone_cubes_gap_${gap.id}`,resolution:{kind:"ROW",rowId:`f09:stone_tile_floor_demolition:${gap.id}`}})),
    ],
  });

export function validateStoneTileFloorDemolitionKrer46Completeness(
  resources: readonly CanonicalEstimateResourceDefinition[] =
  STONE_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES,
): true {
  const actual = new Set(resources.map((row) => row.row_id));
  for (const rowId of [
    "f09:stone_tile_floor_demolition:operation",
    LABOR_ROW_ID,
    ...STONE_CUBES_SOURCE_GAPS.map(gap=>`f09:stone_tile_floor_demolition:${gap.id}`),
  ]) {
    if (!actual.has(rowId)) {
      throw new Error(`STONE_TILE_FLOOR_DEMOLITION_KRER46_ROW_MISSING:${rowId}`);
    }
  }
  if (actual.size !== 6) {
    throw new Error("STONE_TILE_FLOOR_DEMOLITION_KRER46_ROW_COUNT_MISMATCH");
  }
  return true;
}

export const STONE_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT = Object.freeze({
  floor_covering_area_m2: 100,
  existing_covering_profile: STONE_TILE_FLOOR_DEMOLITION_KRER46_PROFILE_ID,
  existing_stone_tile_covering_confirmed: true,
  stone_cubes_source_scope_confirmed: STONE_CUBES_SOURCE_SCOPE_VALUE,
});

export const STONE_TILE_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  floor_covering_area_m2: 35.5,
  existing_covering_profile: STONE_TILE_FLOOR_DEMOLITION_KRER46_PROFILE_ID,
  existing_stone_tile_covering_confirmed: true,
  stone_cubes_source_scope_confirmed: STONE_CUBES_SOURCE_SCOPE_VALUE,
});

export async function compileStoneTileFloorDemolitionKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? STONE_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_ID;
  if (!(STONE_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_IDS as readonly string[])
    .includes(catalogId)) {
    throw new Error(`STONE_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters.existing_covering_profile != null
    && submittedParameters.existing_covering_profile
      !== STONE_TILE_FLOOR_DEMOLITION_KRER46_PROFILE_ID) {
    throw new Error("STONE_TILE_FLOOR_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters.existing_stone_tile_covering_confirmed === false) {
    throw new Error("STONE_TILE_FLOOR_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
  }
  validateStoneTileFloorDemolitionKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.stone-tile-floor-demolition-krer46-r1",
    catalogId,
    primaryMeasureParameterId: "floor_covering_area_m2",
    parameterDefinitions: [...STONE_TILE_FLOOR_DEMOLITION_KRER46_PARAMETERS],
    formulaDefinitions: [...STONE_TILE_FLOOR_DEMOLITION_KRER46_FORMULAS],
    resourceDefinitions: [...STONE_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 8,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_SUMMARY = Object.freeze({
  sourceId: STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
  normId: STONE_TILE_FLOOR_DEMOLITION_KRER46_NORM_ID,
  exactRate: "46-04-010-05",
  formula: "area_m2 * 39.18 man-hour / 100 m2",
  offsiteWasteHaulIncluded: false,
});
