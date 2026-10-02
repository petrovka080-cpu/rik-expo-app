import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_ID,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_IDS,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_NORM_ID,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PROFILE_ID,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_ID,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_METADATA,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_VARIANTS,
} from "./aggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46R1";

type Json = Record<string, unknown>;

const AREA_PARAMETER_ID = "floor_covering_area_m2";
const PROFILE_PARAMETER_ID = "existing_aggressive_environment_cement_or_concrete_floor_25mm_profile";
const CONFIRMED_PARAMETER_ID = "existing_cement_or_concrete_floor_25mm_aggressive_environment_confirmed";
export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID =
  "cement_or_concrete_floor_thickness_adjustment_steps_5mm" as const;
export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_NORM_ID =
  "norm:kg:krer:46-04-011-13:2015" as const;

const RATE_12_AND_13_EXACT_LOCATOR =
  "Техническая часть, п. 1.1, PDF/печатная стр. 5; таблица КРЕР 46-04-011, описание расценок 12–13 на PDF/печатной стр. 58, ресурсы колонок 46-04-011-12 и 46-04-011-13 на стр. 59–60";

const BASE_RATE_PER_100_M2 = Object.freeze([100, 28.54, 5.58, 5.58, 11.16]);
const ADJUSTMENT_RATE_PER_5_MM_PER_100_M2 = Object.freeze([0, 3.5, 1.1, 1.1, 2.2]);

export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SOURCE_METADATA = Object.freeze({
  ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_METADATA,
  exact_locator: RATE_12_AND_13_EXACT_LOCATOR,
  use_restriction: "Только разборка подтверждённого существующего цементного или бетонного покрытия из кислото- или жароупорного бетона в агрессивной среде: базовая толщина 25 мм рассчитывается по 46-04-011-12; на каждый целый шаг изменения толщины на 5 мм ресурсы изменяются по 46-04-011-13. Минимальная допустимая толщина — 5 мм. Поправка не является самостоятельной физической работой и не создаёт дублирующую строку.",
});

const THICKNESS_PARAMETER = Object.freeze({
  parameter_id: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID,
  ordinal: 3,
  value_type: "integer",
  unit_id: "one",
  title_ru: "Изменение толщины покрытия относительно 25 мм, шагов по 5 мм",
  required: false,
  default_value: null,
  constraints_json: { min: -4 },
  truth_metadata: {
    contract: "rik-expo-app.aggressive-environment-cement-or-concrete-floor-thickness-adjustment-krer46-r2",
    semantic_parameter_key: "aggressive-environment-cement-or-concrete-floor-demolition:thickness-adjustment-steps-5mm",
    visibility_role: "USER_INPUT",
    value_source_role: "USER_OR_APPROVED_EXISTING_CONDITION_SURVEY_WITH_OFFICIAL_NEUTRAL_BASE",
    input_origin_class: "KNOWN_WORK_SCOPE",
    preliminary_compilation_allowed: true,
    source_confirmation_required: false,
    neutral_value: 0,
    neutral_value_meaning_ru: "Базовая толщина 25 мм; поправка 46-04-011-13 не начисляется.",
    guide: {
      guide_kind: "NORMATIVE_RANGE",
      guide_short_ru: "Укажите целое число шагов по 5 мм: 0 — 25 мм, +1 — 30 мм, −1 — 20 мм. Минимум −4, то есть 5 мм.",
      source_role: "OFFICIAL_KG_UNIT_RATE_AND_EXISTING_CONDITION_SURVEY",
      source_document: "kg_krer_46_2015_reconstruction_official",
      source_locator: RATE_12_AND_13_EXACT_LOCATOR,
      guide_version: "aggressive-environment-cement-or-concrete-floor-thickness-adjustment-krer46-r2",
      source_snapshot_hash: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
      applicability: "Только как знаковая поправка 46-04-011-13 к базовой расценке 46-04-011-12 на каждые полные 5 мм изменения толщины.",
      verified_at: "2026-09-24T10:59:00+06:00",
      guide_validation_policy: "INTEGER_STEPS_ONLY_MINIMUM_FINAL_THICKNESS_5_MM",
    },
    hidden_default_forbidden: false,
    synthetic: false,
  },
});

export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_PARAMETERS = Object.freeze([
  ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PARAMETERS,
  THICKNESS_PARAMETER,
]);

function adjustedFormula(
  formula: CanonicalEstimateFormulaDefinition,
  ordinal: number,
): CanonicalEstimateFormulaDefinition {
  if (ordinal === 0) return Object.freeze({ ...formula });
  const baseRate = BASE_RATE_PER_100_M2[ordinal];
  const adjustmentRate = ADJUSTMENT_RATE_PER_5_MM_PER_100_M2[ordinal];
  const compiled = compileFormulaGraph(
    `${AREA_PARAMETER_ID} * (${baseRate} + ${AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID} * ${adjustmentRate}) / 100`,
  );
  return Object.freeze({
    ...formula,
    formula_id: formula.formula_id.replace(/_v1$/u, "_with_rate_13_v2"),
    expression_source: compiled.source,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  });
}

export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_FORMULAS.map(adjustedFormula),
);

const formulaIdByOldFormulaId = new Map(
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_FORMULAS.map((formula, ordinal) => [
    formula.formula_id,
    AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_FORMULAS[ordinal].formula_id,
  ]),
);

export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_RESOURCES.map((resource, ordinal) => {
    if (ordinal === 0) return Object.freeze({ ...resource });
    const sourceMetadata = resource.source_metadata as Json;
    const baseTrace = Array.isArray(sourceMetadata.normativeTrace)
      ? sourceMetadata.normativeTrace.map((trace) => ({
        ...(trace as Json),
        exact_locator: RATE_12_AND_13_EXACT_LOCATOR,
      }))
      : [];
    const resourceGraph = resource.resource_graph as Json;
    const scopeContextParameterIds = Array.isArray(resourceGraph.scopeContextParameterIds)
      ? resourceGraph.scopeContextParameterIds
      : [];
    const formulaId = formulaIdByOldFormulaId.get(resource.formula_id) ?? resource.formula_id;
    const resourceWithoutHash = {
      ...resource,
      formula_id: formulaId,
      resource_graph: {
        ...resourceGraph,
        formulaId,
        quantityBasis: "CONFIRMED_AREA_TIMES_BASE_RATE_12_PLUS_SIGNED_RATE_13_PER_5_MM_STEP_PER_100_M2",
        scopeContextParameterIds: [...scopeContextParameterIds, AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID],
      },
      source_metadata: {
        ...sourceMetadata,
        normativeRatePer100M2: BASE_RATE_PER_100_M2[ordinal],
        baseRatePer100M2: BASE_RATE_PER_100_M2[ordinal],
        thicknessAdjustmentRatePer5MmPer100M2: ADJUSTMENT_RATE_PER_5_MM_PER_100_M2[ordinal],
        thicknessAdjustmentSourceRate: "46-04-011-13",
        normativeRateExpression: `46-04-011-12 + signed_steps_5mm * 46-04-011-13`,
        normativeTrace: [
          ...baseTrace,
          {
            sourceId: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_ID,
            source_id: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_ID,
            normId: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_NORM_ID,
            norm_id: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_NORM_ID,
            normVersion: "КРЕР 46-2015; введён в действие с 1 января 2016 года",
            source_title: "КРЕР 46-2015 «Работы при реконструкции зданий и сооружений», таблица 46-04-011",
            exact_locator: RATE_12_AND_13_EXACT_LOCATOR,
            source_definition_hash: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
          },
        ],
      },
      row_sha256: undefined,
    };
    return Object.freeze({
      ...resourceWithoutHash,
      row_sha256: estimateDeterministicHash({
        exactRates: ["46-04-011-12", "46-04-011-13"],
        resource: resourceWithoutHash,
      }),
    });
  }),
);

export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  rateTable: "KRER_46_04_011_12_PLUS_13",
  evidenceReferences: Object.freeze([
    AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SOURCE_METADATA.official_url,
    "КРЕР 46-2015, PDF/печатные страницы 5, 58, 59 и 60",
  ]),
  entries: Object.freeze([
    ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries.map((entry) => {
      const formulaId = entry.formulaId ? formulaIdByOldFormulaId.get(entry.formulaId) ?? entry.formulaId : undefined;
      if (!["construction_labor_grade_3_1", "machinist_labor_aggregate", "portable_compressor_5m3_min_686kpa", "pneumatic_breaker", "internal_debris_handling_within_object"].includes(entry.operationId)) {
        return entry;
      }
      return {
        ...entry,
        quantityRule: "BASE_RATE_12_PLUS_SIGNED_RATE_13_PER_5_MM_STEP",
        detailPrinciple: "EXACT_OFFICIAL_BASE_AND_ADJUSTMENT_COLUMNS_WITHOUT_AREA_FACTOR",
        formulaId,
      };
    }),
    {
      expectedResourceId: "normative-modifier:krer_46_04_011_13_thickness_step_5mm",
      operationId: "thickness_adjustment_rate_13",
      category: "construction_work",
      specification: "Знаковая поправка ресурсов на каждые 5 мм изменения толщины относительно базовых 25 мм",
      condition: "integer_thickness_adjustment_steps_5mm_not_equal_zero",
      sourceId: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_ID,
      unitId: "one",
      quantityRule: "SIGNED_INTEGER_STEPS_MULTIPLIED_BY_EXACT_KRER_46_04_011_13_RESOURCE_RATES",
      detailPrinciple: "NORMATIVE_MODIFIER_INCLUDED_IN_EXISTING_RESOURCE_ROWS",
      priceRelation: "INCLUDED_IN_PARENT",
      formulaId: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_FORMULAS[1].formula_id,
      resolution: {
        kind: "INCLUDED_IN_PARENT",
        parentRowId: "f09:aggressive_environment_cement_or_concrete_floor_25mm_demolition:labor",
        reasonRu: "Расценка 13 изменяет количества тех же ресурсов расценки 12 и не является самостоятельной физической работой.",
      },
    },
  ]),
});

export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SHORT_INPUT = Object.freeze({
  ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SHORT_INPUT,
  [AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID]: 0,
});

export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  [AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID]: 1,
});

export function validateAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46Completeness(): true {
  if (AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_PARAMETERS.length !== 4
    || AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_FORMULAS.length !== 5
    || AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_RESOURCES.length !== 5
    || AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries.length !== 9) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_COMPLETENESS_MISMATCH");
  }
  const formulaIds = new Set(
    AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_FORMULAS.map((formula) => formula.formula_id),
  );
  if (!AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_RESOURCES
    .every((resource) => formulaIds.has(resource.formula_id))) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_FORMULA_ORPHAN");
  }
  return true;
}

export async function compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId
    ?? AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_ID;
  if (!(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_IDS as readonly string[]).includes(catalogId)) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters[PROFILE_PARAMETER_ID] != null
    && submittedParameters[PROFILE_PARAMETER_ID]
      !== AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PROFILE_ID) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters[CONFIRMED_PARAMETER_ID] === false) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_MATERIAL_NOT_CONFIRMED");
  }
  validateAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46Completeness();
  const normalizedSubmittedParameters = {
    ...submittedParameters,
    [AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID]:
      submittedParameters[AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID] ?? 0,
  };
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.aggressive-environment-cement-or-concrete-floor-thickness-adjustment-krer46-r2",
    catalogId,
    primaryMeasureParameterId: AREA_PARAMETER_ID,
    parameterDefinitions: [...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_PARAMETERS],
    formulaDefinitions: [...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_FORMULAS],
    resourceDefinitions: [...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_RESOURCES],
    submittedParameters: normalizedSubmittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 5,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SOURCE_SUMMARY = Object.freeze({
  sourceId: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_ID,
  normIds: [
    AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_NORM_ID,
    AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_NORM_ID,
  ],
  exactRates: ["46-04-011-12", "46-04-011-13"],
  formula: "area_m2 * (base rate 12 + signed 5 mm steps * adjustment rate 13) / 100 m2",
  baseThicknessMm: 25,
  minimumThicknessMm: 5,
  machineResourcesIncluded: true,
  salvageableTileOrBrickCleaningApplicable: false,
  thicknessAdjustmentRateIncluded: true,
  standaloneRate13WorkCreated: false,
  offsiteWasteHaulIncluded: false,
  variants: Object.keys(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_VARIANTS),
});
