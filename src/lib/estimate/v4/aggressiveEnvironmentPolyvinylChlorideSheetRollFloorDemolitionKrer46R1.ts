import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_ID,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_METADATA,
} from "./aggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46R1";

type Json = Record<string, unknown>;

const FAMILY_KEY = "demolition_aggressive_environment_polyvinyl_chloride_sheet_roll_floor";
const CATALOG_PREFIX = `canonical-work:master:${FAMILY_KEY}`;
const OPERATION_KEY = "aggressive_environment_polyvinyl_chloride_sheet_roll_floor_demolition";

export const AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_CATALOG_ID =
  `${CATALOG_PREFIX}_standard` as const;
export const AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_CATALOG_ID,
    sourceIdentity: `master-work:${FAMILY_KEY}_standard`,
    catalogVariant: "STANDARD_CONFIRMED_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR",
    canonicalNameRu: "Разборка покрытия пола из поливинилхлоридных листовых рулонных материалов в агрессивной среде",
  }),
  large_area: Object.freeze({
    catalogId: `${CATALOG_PREFIX}_large_area`,
    sourceIdentity: `master-work:${FAMILY_KEY}_large_area`,
    catalogVariant: "LARGE_AREA_CONFIRMED_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR",
    canonicalNameRu: "Разборка покрытия пола из поливинилхлоридных листовых рулонных материалов в агрессивной среде — большая площадь",
  }),
  small_area: Object.freeze({
    catalogId: `${CATALOG_PREFIX}_small_area`,
    sourceIdentity: `master-work:${FAMILY_KEY}_small_area`,
    catalogVariant: "SMALL_AREA_CONFIRMED_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR",
    canonicalNameRu: "Разборка покрытия пола из поливинилхлоридных листовых рулонных материалов в агрессивной среде — малая площадь",
  }),
  wet_zone: Object.freeze({
    catalogId: `${CATALOG_PREFIX}_wet_zone`,
    sourceIdentity: `master-work:${FAMILY_KEY}_wet_zone`,
    catalogVariant: "WET_ZONE_CONFIRMED_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR",
    canonicalNameRu: "Разборка покрытия пола из поливинилхлоридных листовых рулонных материалов в агрессивной среде — влажная зона",
  }),
} as const);

export type AggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46VariantKey =
  keyof typeof AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_VARIANTS;

export const AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_VARIANTS)
    .map((variant) => variant.catalogId),
);

export function resolveAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46Variant(
  variantKey: AggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46VariantKey,
) {
  const variant = AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}

function asRate14<T>(value: T): T {
  const replacements = [
    ["demolition_aggressive_environment_cement_or_concrete_floor_25mm", FAMILY_KEY],
    ["aggressive_environment_cement_or_concrete_floor_25mm_demolition", OPERATION_KEY],
    ["cement_or_concrete_floor_25mm", "polyvinyl_chloride_sheet_roll_floor"],
    ["cement-or-concrete-floor-25mm", "polyvinyl-chloride-sheet-roll-floor"],
    ["CEMENT_OR_CONCRETE_FLOOR_25MM", "POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR"],
    ["CONFIRMED_CEMENT_OR_CONCRETE_FLOOR_25MM_AREA", "CONFIRMED_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_AREA"],
    ["CONFIRMED_CEMENT_OR_CONCRETE_FLOOR_25MM", "CONFIRMED_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR"],
    ["cement_or_concrete_floor_25mm_in_aggressive_environment", "polyvinyl_chloride_sheet_roll_floor_in_aggressive_environment"],
    ["существующего цементного или бетонного покрытия пола толщиной 25 мм из кислото- или жароупорного бетона", "существующего покрытия пола из поливинилхлоридных листовых рулонных материалов"],
    ["цементного или бетонного покрытия пола толщиной 25 мм из кислото- или жароупорного бетона", "покрытия пола из поливинилхлоридных листовых рулонных материалов"],
    ["цементного или бетонного покрытия толщиной 25 мм из кислото- или жароупорного бетона", "покрытия из поливинилхлоридных листовых рулонных материалов"],
    ["цементное или бетонное покрытие толщиной 25 мм из кислото- или жароупорного бетона", "покрытие из поливинилхлоридных листовых рулонных материалов"],
    ["сплошным цементным или бетонным покрытием", "покрытием из поливинилхлоридных листовых рулонных материалов"],
    ["46_04_011_12", "46_04_011_14"],
    ["46-04-011-12", "46-04-011-14"],
    ["колонки 46-04-011-12", "колонки 46-04-011-14"],
    ["колонка 12", "колонка 14"],
  ] as const;
  let serialized = JSON.stringify(value);
  for (const [from, to] of replacements) serialized = serialized.replaceAll(from, to);
  return JSON.parse(serialized) as T;
}

export const AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SOURCE_ID =
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_ID;
export const AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_NORM_ID =
  "norm:kg:krer:46-04-011-14:2015" as const;
export const AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256 =
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ARTIFACT_SHA256;
export const AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_PROFILE_ID =
  "KRER_46_04_011_14_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_AGGRESSIVE_ENVIRONMENT" as const;

const RATE_14_EXACT_LOCATOR =
  "Техническая часть, п. 1.1, PDF/печатная стр. 5; таблица КРЕР 46-04-011, описание расценки 14 на PDF/печатных стр. 58–59, ресурсы колонки 46-04-011-14 на стр. 60";

export const AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA = Object.freeze({
  ...asRate14(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_METADATA),
  exact_locator: RATE_14_EXACT_LOCATOR,
  use_restriction: "Только разборка подтверждённого существующего покрытия пола из поливинилхлоридных листовых рулонных материалов в агрессивной среде по колонке 46-04-011-14 и подтверждённой площади: труд рабочих среднего разряда 2,0 — 33,00 чел.-ч на 100 м²; труд машинистов и машины отсутствуют. Очистка годных плиток или кирпича неприменима; внутриобъектовое перемещение включено, внеобъектовый вывоз исключён.",
});

export const AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_PARAMETERS = Object.freeze(
  asRate14(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PARAMETERS)
    .map((parameter) => {
      const truthMetadata = parameter.truth_metadata as Json;
      const guide = truthMetadata.guide as Json;
      return Object.freeze({
        ...parameter,
        truth_metadata: {
          ...truthMetadata,
          guide: { ...guide, source_locator: RATE_14_EXACT_LOCATOR },
        },
      });
    }),
);

const baseFormulas = asRate14(
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_FORMULAS,
);
const laborCompiled = compileFormulaGraph("floor_covering_area_m2 * 33 / 100");
export const AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  Object.freeze({ ...baseFormulas[0] }),
  Object.freeze({
    ...baseFormulas[1],
    expression_source: laborCompiled.source,
    ast: laborCompiled.ast,
    input_parameter_ids: laborCompiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  }),
]);

const baseResources = asRate14(
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_RESOURCES,
);
export const AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  baseResources.slice(0, 2).map((resource, ordinal) => {
    const sourceMetadata = resource.source_metadata as Json;
    const normativeTrace = Array.isArray(sourceMetadata.normativeTrace)
      ? sourceMetadata.normativeTrace.map((trace) => ({
        ...(trace as Json),
        exact_locator: RATE_14_EXACT_LOCATOR,
        normId: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_NORM_ID,
        norm_id: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_NORM_ID,
      }))
      : sourceMetadata.normativeTrace;
    const resourceWithoutHash = {
      ...resource,
      ...(ordinal === 1 ? { title_ru: "Труд рабочих-строителей среднего разряда 2,0" } : {}),
      source_metadata: {
        ...sourceMetadata,
        krerResourceCode: ordinal === 0 ? "46-04-011-14" : "000-1002-0",
        normativeRatePer100M2: ordinal === 0 ? 100 : 33,
        normativeTrace,
      },
      row_sha256: undefined,
    };
    return Object.freeze({
      ...resourceWithoutHash,
      row_sha256: estimateDeterministicHash({ exactRate: "46-04-011-14", resource: resourceWithoutHash }),
    });
  }),
);

const baseCompleteness = asRate14(
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
);
const includedOperationIds = new Set([
  OPERATION_KEY,
  "construction_labor_grade_3_1",
  "clean_salvageable_brick_from_mortar",
  "internal_debris_handling_within_object",
  "offsite_waste_haul",
]);
export const AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  ...baseCompleteness,
  rateTable: "KRER_46_04_011_14",
  evidenceReferences: Object.freeze([
    AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.official_url,
    "КРЕР 46-2015, PDF/печатные страницы 5, 58, 59 и 60",
  ]),
  entries: Object.freeze(baseCompleteness.entries
    .filter((entry) => includedOperationIds.has(entry.operationId))
    .map((entry) => {
      if (entry.operationId === "construction_labor_grade_3_1") {
        return {
          ...entry,
          expectedResourceId: "required-resource:construction_labor_grade_2_0",
          operationId: "construction_labor_grade_2_0",
          specification: "33,00 чел.-ч на 100 м²",
        };
      }
      if (entry.operationId === "clean_salvageable_brick_from_mortar") {
        return {
          ...entry,
          condition: "not_applicable_to_polyvinyl_chloride_sheet_roll_floor",
          quantityRule: "NOT_APPLICABLE_TO_CONFIRMED_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR",
          detailPrinciple: "REVIEWED_EXCLUSION",
          priceRelation: "NOT_APPLICABLE",
          formulaId: undefined,
          resolution: {
            kind: "NOT_APPLICABLE",
            reasonRu: "Покрытие выполнено из поливинилхлоридных листовых рулонных материалов; годные плитки и кирпич отсутствуют.",
          },
        };
      }
      return entry;
    })),
});

const AREA_PARAMETER_ID = "floor_covering_area_m2";
const PROFILE_PARAMETER_ID = "existing_aggressive_environment_polyvinyl_chloride_sheet_roll_floor_profile";
const CONFIRMED_PARAMETER_ID = "existing_polyvinyl_chloride_sheet_roll_floor_aggressive_environment_confirmed";

export const AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SHORT_INPUT = Object.freeze({
  [AREA_PARAMETER_ID]: 100,
  [PROFILE_PARAMETER_ID]: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_PROFILE_ID,
  [CONFIRMED_PARAMETER_ID]: true,
});
export const AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  [AREA_PARAMETER_ID]: 35.5,
  [PROFILE_PARAMETER_ID]: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_PROFILE_ID,
  [CONFIRMED_PARAMETER_ID]: true,
});

export function validateAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46Completeness(): true {
  if (AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_PARAMETERS.length !== 3
    || AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_FORMULAS.length !== 2
    || AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_RESOURCES.length !== 2
    || AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries.length !== 5) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_COMPLETENESS_MISMATCH");
  }
  const formulaIds = new Set(
    AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_FORMULAS.map((formula) => formula.formula_id),
  );
  if (!AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_RESOURCES
    .every((resource) => formulaIds.has(resource.formula_id))) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_FORMULA_ORPHAN");
  }
  return true;
}

export async function compileAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId
    ?? AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_CATALOG_ID;
  if (!(AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_CATALOG_IDS as readonly string[]).includes(catalogId)) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters[PROFILE_PARAMETER_ID] != null
    && submittedParameters[PROFILE_PARAMETER_ID]
      !== AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_PROFILE_ID) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters[CONFIRMED_PARAMETER_ID] === false) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
  }
  validateAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.aggressive-environment-polyvinyl-chloride-sheet-roll-floor-demolition-krer46-r1",
    catalogId,
    primaryMeasureParameterId: AREA_PARAMETER_ID,
    parameterDefinitions: [...AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_PARAMETERS],
    formulaDefinitions: [...AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_FORMULAS],
    resourceDefinitions: [...AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 2,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SOURCE_SUMMARY = Object.freeze({
  sourceId: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
  normId: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_NORM_ID,
  exactRate: "46-04-011-14",
  formula: "area_m2 * exact resource rate / 100 m2",
  constructionLaborGrade: 2,
  constructionLaborHoursPer100M2: 33,
  machineResourcesIncluded: false,
  salvageableTileOrBrickCleaningApplicable: false,
  offsiteWasteHaulIncluded: false,
});
