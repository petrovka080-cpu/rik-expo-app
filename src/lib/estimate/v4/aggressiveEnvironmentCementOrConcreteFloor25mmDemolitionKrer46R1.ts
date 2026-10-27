import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_ID,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_METADATA,
} from "./aggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1";

type Json = Record<string, unknown>;

const FAMILY_KEY = "demolition_aggressive_environment_cement_or_concrete_floor_25mm";
const CATALOG_PREFIX = `canonical-work:master:${FAMILY_KEY}`;
const OPERATION_KEY = "aggressive_environment_cement_or_concrete_floor_25mm_demolition";

export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_ID =
  `${CATALOG_PREFIX}_standard` as const;
export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_ID,
    sourceIdentity: `master-work:${FAMILY_KEY}_standard`,
    catalogVariant: "STANDARD_CONFIRMED_CEMENT_OR_CONCRETE_FLOOR_25MM",
    canonicalNameRu: "Разборка цементного или бетонного покрытия пола толщиной 25 мм в агрессивной среде",
  }),
  wet_zone: Object.freeze({
    catalogId: `${CATALOG_PREFIX}_wet_zone`,
    sourceIdentity: `master-work:${FAMILY_KEY}_wet_zone`,
    catalogVariant: "WET_ZONE_CONFIRMED_CEMENT_OR_CONCRETE_FLOOR_25MM",
    canonicalNameRu: "Разборка цементного или бетонного покрытия пола толщиной 25 мм в агрессивной среде — влажная зона",
  }),
} as const);

export type AggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46VariantKey =
  keyof typeof AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_VARIANTS;

export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_VARIANTS)
    .map((variant) => variant.catalogId),
);

export function resolveAggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46Variant(
  variantKey: AggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46VariantKey,
) {
  const variant = AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}

function asRate12<T>(value: T): T {
  const replacements = [
    ["demolition_aggressive_environment_polymer_cement_or_epoxy_composition_floor_5mm", FAMILY_KEY],
    ["aggressive_environment_polymer_cement_or_epoxy_composition_floor_5mm_demolition", OPERATION_KEY],
    ["polymer_cement_or_epoxy_composition_floor_5mm", "cement_or_concrete_floor_25mm"],
    ["polymer-cement-or-epoxy-composition-floor-5mm", "cement-or-concrete-floor-25mm"],
    ["POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM", "CEMENT_OR_CONCRETE_FLOOR_25MM"],
    ["CONFIRMED_COMPOSITION_FLOOR_AREA", "CONFIRMED_CEMENT_OR_CONCRETE_FLOOR_25MM_AREA"],
    ["CONFIRMED_COMPOSITION_FLOOR", "CONFIRMED_CEMENT_OR_CONCRETE_FLOOR_25MM"],
    ["composition_floor_5mm_in_aggressive_environment", "cement_or_concrete_floor_25mm_in_aggressive_environment"],
    ["покрытия пола из полимерцементной или эпоксидной композиции толщиной 5 мм", "цементного или бетонного покрытия пола толщиной 25 мм из кислото- или жароупорного бетона"],
    ["существующего покрытия из полимерцементной или эпоксидной композиции толщиной 5 мм", "существующего цементного или бетонного покрытия толщиной 25 мм из кислото- или жароупорного бетона"],
    ["покрытия из полимерцементной или эпоксидной композиции толщиной 5 мм", "цементного или бетонного покрытия толщиной 25 мм из кислото- или жароупорного бетона"],
    ["покрытие из полимерцементной или эпоксидной композиции толщиной 5 мм", "цементное или бетонное покрытие толщиной 25 мм из кислото- или жароупорного бетона"],
    ["полимерцементная или эпоксидная композиция толщиной 5 мм", "цементное или бетонное покрытие толщиной 25 мм из кислото- или жароупорного бетона"],
    ["сплошной полимерцементной или эпоксидной композицией", "сплошным цементным или бетонным покрытием"],
    ["46_04_011_11", "46_04_011_12"],
    ["46-04-011-11", "46-04-011-12"],
    ["колонки 46-04-011-11", "колонки 46-04-011-12"],
    ["колонка 11", "колонка 12"],
    ["5,27 чел.-ч", "28,54 чел.-ч"],
    ["1,10 чел.-ч", "5,58 чел.-ч"],
    ["1,10 маш.-ч", "5,58 маш.-ч"],
    ["2,20 маш.-ч", "11,16 маш.-ч"],
  ] as const;
  let serialized = JSON.stringify(value);
  for (const [from, to] of replacements) serialized = serialized.replaceAll(from, to);
  return JSON.parse(serialized) as T;
}

export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_ID =
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_ID;
export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_NORM_ID =
  "norm:kg:krer:46-04-011-12:2015" as const;
export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ARTIFACT_SHA256 =
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_ARTIFACT_SHA256;
export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PROFILE_ID =
  "KRER_46_04_011_12_CEMENT_OR_CONCRETE_FLOOR_25MM_AGGRESSIVE_ENVIRONMENT" as const;

const RATE_12_EXACT_LOCATOR =
  "Техническая часть, п. 1.1, PDF/печатная стр. 5; таблица КРЕР 46-04-011, описание расценки 12 на PDF/печатной стр. 58, ресурсы колонки 46-04-011-12 на стр. 59–60";

export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_METADATA = Object.freeze({
  ...asRate12(AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_METADATA),
  exact_locator: RATE_12_EXACT_LOCATOR,
  use_restriction: "Только разборка подтверждённого существующего цементного или бетонного покрытия пола толщиной 25 мм из кислото- или жароупорного бетона в агрессивной среде по колонке 46-04-011-12 и подтверждённой площади: труд рабочих 28,54 чел.-ч, справочный труд машинистов 5,58 чел.-ч, компрессор 5,58 маш.-ч и пневматические отбойные молотки 11,16 маш.-ч на 100 м². Расценка 46-04-011-13 для изменения толщины в эту базовую норму не включена. Очистка годных плиток или кирпича неприменима; внутриобъектовое перемещение включено, внеобъектовый вывоз исключён.",
});

export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PARAMETERS = Object.freeze(
  asRate12(AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_PARAMETERS)
    .map((parameter) => {
      const truthMetadata = parameter.truth_metadata as Json;
      const guide = truthMetadata.guide as Json;
      return Object.freeze({
        ...parameter,
        truth_metadata: {
          ...truthMetadata,
          guide: { ...guide, source_locator: RATE_12_EXACT_LOCATOR },
        },
      });
    }),
);

const RATE_PER_100_M2 = Object.freeze([100, 28.54, 5.58, 5.58, 11.16]);
export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(
  asRate12(AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_FORMULAS)
    .map((formula, ordinal) => {
      if (ordinal === 0) return Object.freeze({ ...formula });
      const rate = RATE_PER_100_M2[ordinal];
      const expression = `floor_covering_area_m2 * ${rate} / 100` as const;
      const compiled = compileFormulaGraph(expression);
      return Object.freeze({
        ...formula,
        expression_source: expression,
        ast: compiled.ast,
        input_parameter_ids: compiled.inputParameterIds,
      });
    }),
);

export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  asRate12(AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_RESOURCES)
    .map((resource, ordinal) => {
      const sourceMetadata = resource.source_metadata as Json;
      const normativeTrace = Array.isArray(sourceMetadata.normativeTrace)
        ? sourceMetadata.normativeTrace.map((trace) => ({
          ...(trace as Json),
          exact_locator: RATE_12_EXACT_LOCATOR,
        }))
        : sourceMetadata.normativeTrace;
      const resourceWithoutHash = {
        ...resource,
        source_metadata: {
          ...sourceMetadata,
          krerResourceCode: ordinal === 0 ? "46-04-011-12" : sourceMetadata.krerResourceCode,
          normativeRatePer100M2: RATE_PER_100_M2[ordinal],
          normativeTrace,
        },
        row_sha256: undefined,
      };
      return Object.freeze({
        ...resourceWithoutHash,
        row_sha256: estimateDeterministicHash({ exactRate: "46-04-011-12", resource: resourceWithoutHash }),
      });
    }),
);

const transformedCompletenessMap = asRate12(
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
);
export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  ...transformedCompletenessMap,
  evidenceReferences: Object.freeze([
    AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_METADATA.official_url,
    "КРЕР 46-2015, PDF/печатные страницы 5, 58, 59 и 60",
  ]),
  entries: Object.freeze(transformedCompletenessMap.entries.map((entry) => (
    entry.operationId === "clean_salvageable_brick_from_mortar"
      ? {
        ...entry,
        condition: "not_applicable_to_continuous_cement_or_concrete_floor_25mm",
        quantityRule: "NOT_APPLICABLE_TO_CONFIRMED_CEMENT_OR_CONCRETE_FLOOR_25MM",
        detailPrinciple: "REVIEWED_EXCLUSION",
        priceRelation: "NOT_APPLICABLE",
        formulaId: undefined,
        resolution: {
          kind: "NOT_APPLICABLE",
          reasonRu: "Покрытие является сплошным цементным или бетонным слоем; годные плитки и кирпич отсутствуют.",
        },
      }
      : entry
  ))),
});

const AREA_PARAMETER_ID = "floor_covering_area_m2";
const PROFILE_PARAMETER_ID = "existing_aggressive_environment_cement_or_concrete_floor_25mm_profile";
const CONFIRMED_PARAMETER_ID = "existing_cement_or_concrete_floor_25mm_aggressive_environment_confirmed";

export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SHORT_INPUT = Object.freeze({
  [AREA_PARAMETER_ID]: 100,
  [PROFILE_PARAMETER_ID]: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PROFILE_ID,
  [CONFIRMED_PARAMETER_ID]: true,
});
export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  [AREA_PARAMETER_ID]: 35.5,
  [PROFILE_PARAMETER_ID]: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PROFILE_ID,
  [CONFIRMED_PARAMETER_ID]: true,
});

export function validateAggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46Completeness(): true {
  if (AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_RESOURCES.length !== 5
    || AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries.length !== 8) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_COMPLETENESS_MISMATCH");
  }
  const formulaIds = new Set(
    AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_FORMULAS.map((formula) => formula.formula_id),
  );
  if (!AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_RESOURCES
    .every((resource) => formulaIds.has(resource.formula_id))) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_FORMULA_ORPHAN");
  }
  return true;
}

export async function compileAggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId
    ?? AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_ID;
  if (!(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_IDS as readonly string[]).includes(catalogId)) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters[PROFILE_PARAMETER_ID] != null
    && submittedParameters[PROFILE_PARAMETER_ID]
      !== AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PROFILE_ID) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters[CONFIRMED_PARAMETER_ID] === false) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
  }
  validateAggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.aggressive-environment-cement-or-concrete-floor-25mm-demolition-krer46-r1",
    catalogId,
    primaryMeasureParameterId: AREA_PARAMETER_ID,
    parameterDefinitions: [...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PARAMETERS],
    formulaDefinitions: [...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_FORMULAS],
    resourceDefinitions: [...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 5,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_SUMMARY = Object.freeze({
  sourceId: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_ID,
  normId: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_NORM_ID,
  exactRate: "46-04-011-12",
  formula: "area_m2 * exact resource rate / 100 m2",
  machineResourcesIncluded: true,
  salvageableTileOrBrickCleaningApplicable: false,
  thicknessAdjustmentRateIncluded: false,
  offsiteWasteHaulIncluded: false,
});
