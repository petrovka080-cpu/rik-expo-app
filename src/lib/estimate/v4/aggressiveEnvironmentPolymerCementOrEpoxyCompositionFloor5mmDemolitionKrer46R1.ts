import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SOURCE_ID,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SOURCE_METADATA,
} from "./aggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1";

type Json = Record<string, unknown>;

const FAMILY_KEY =
  "demolition_aggressive_environment_polymer_cement_or_epoxy_composition_floor_5mm";
const CATALOG_PREFIX = `canonical-work:master:${FAMILY_KEY}`;

export const AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_CATALOG_ID =
  `${CATALOG_PREFIX}_standard` as const;
export const AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_CATALOG_ID,
    sourceIdentity: `master-work:${FAMILY_KEY}_standard`,
    catalogVariant: "STANDARD_CONFIRMED_COMPOSITION_FLOOR",
    canonicalNameRu: "Разборка покрытия пола из полимерцементной или эпоксидной композиции толщиной 5 мм в агрессивной среде",
  }),
  large_area: Object.freeze({
    catalogId: `${CATALOG_PREFIX}_large_area`,
    sourceIdentity: `master-work:${FAMILY_KEY}_large_area`,
    catalogVariant: "LARGE_AREA_CONFIRMED_COMPOSITION_FLOOR",
    canonicalNameRu: "Разборка покрытия пола из полимерцементной или эпоксидной композиции толщиной 5 мм в агрессивной среде — большая площадь",
  }),
  small_area: Object.freeze({
    catalogId: `${CATALOG_PREFIX}_small_area`,
    sourceIdentity: `master-work:${FAMILY_KEY}_small_area`,
    catalogVariant: "SMALL_AREA_CONFIRMED_COMPOSITION_FLOOR",
    canonicalNameRu: "Разборка покрытия пола из полимерцементной или эпоксидной композиции толщиной 5 мм в агрессивной среде — малая площадь",
  }),
  wet_zone: Object.freeze({
    catalogId: `${CATALOG_PREFIX}_wet_zone`,
    sourceIdentity: `master-work:${FAMILY_KEY}_wet_zone`,
    catalogVariant: "WET_ZONE_CONFIRMED_COMPOSITION_FLOOR",
    canonicalNameRu: "Разборка покрытия пола из полимерцементной или эпоксидной композиции толщиной 5 мм в агрессивной среде — влажная зона",
  }),
} as const);

export type AggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46VariantKey =
  keyof typeof AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_VARIANTS;

export const AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_CATALOG_IDS = Object.freeze(
  Object.values(AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_VARIANTS)
    .map((variant) => variant.catalogId),
);

export function resolveAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46Variant(
  variantKey: AggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46VariantKey,
) {
  const variant = AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_VARIANTS[variantKey];
  if (!variant) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return variant;
}

function asRate11<T>(value: T): T {
  const replacements = [
    ["demolition_aggressive_environment_brick_floor_cement_acid_resistant_mortar_or_acid_resistant_putty", FAMILY_KEY],
    ["aggressive_environment_brick_floor_on_cement_acid_resistant_mortar_or_acid_resistant_putty_demolition", "aggressive_environment_polymer_cement_or_epoxy_composition_floor_5mm_demolition"],
    ["brick_floor_on_cement_acid_resistant_mortar_or_acid_resistant_putty", "polymer_cement_or_epoxy_composition_floor_5mm"],
    ["brick-floor-on-cement-acid-resistant-mortar-or-acid-resistant-putty", "polymer-cement-or-epoxy-composition-floor-5mm"],
    ["BRICK_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY", "POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM"],
    ["CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY", "POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM"],
    ["кирпичного покрытия пола на цементном кислотоупорном растворе или кислотоупорных замазках", "покрытия пола из полимерцементной или эпоксидной композиции толщиной 5 мм"],
    ["кирпичное покрытие именно на цементном кислотоупорном растворе или кислотоупорных замазках", "покрытие из полимерцементной или эпоксидной композиции толщиной 5 мм"],
    ["существующее кирпичное покрытие на цементном кислотоупорном растворе или кислотоупорных замазках", "существующее покрытие из полимерцементной или эпоксидной композиции толщиной 5 мм"],
    ["кирпич на цементном кислотоупорном растворе или кислотоупорных замазках", "полимерцементная или эпоксидная композиция толщиной 5 мм"],
    ["кирпичного покрытия на цементном кислотоупорном растворе или кислотоупорных замазках", "покрытия из полимерцементной или эпоксидной композиции толщиной 5 мм"],
    ["существующего кирпичного покрытия", "существующего покрытия из полимерцементной или эпоксидной композиции толщиной 5 мм"],
    ["CONFIRMED_BRICK_FLOOR_AREA", "CONFIRMED_COMPOSITION_FLOOR_AREA"],
    ["brick_floor_in_aggressive_environment", "composition_floor_5mm_in_aggressive_environment"],
    ["46_04_011_08", "46_04_011_11"],
    ["46-04-011-08", "46-04-011-11"],
    ["колонка 08", "колонка 11"],
    ["construction_labor_grade_3_6", "construction_labor_grade_3_1"],
    ["000-1003-6", "000-1003-1"],
    ["104.52", "5.27"],
    ["104,52", "5,27"],
    ["разряда 3,6", "разряда 3,1"],
    ["1.91", "1.10"],
    ["1,91", "1,10"],
    ["3.82", "2.20"],
    ["3,82", "2,20"],
  ] as const;
  let serialized = JSON.stringify(value);
  for (const [from, to] of replacements) serialized = serialized.replaceAll(from, to);
  return JSON.parse(serialized) as T;
}

export const AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_ID =
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SOURCE_ID;
export const AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_NORM_ID =
  "norm:kg:krer:46-04-011-11:2015" as const;
export const AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_ARTIFACT_SHA256 =
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_ARTIFACT_SHA256;
export const AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_PROFILE_ID =
  "KRER_46_04_011_11_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_AGGRESSIVE_ENVIRONMENT" as const;

const RATE_11_EXACT_LOCATOR =
  "Техническая часть, п. 1.1, PDF/печатная стр. 5; таблица КРЕР 46-04-011, состав работ и измеритель на PDF/печатной стр. 58, ресурсы колонки 46-04-011-11 на стр. 59–60";

export const AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_METADATA = Object.freeze({
  ...asRate11(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SOURCE_METADATA),
  exact_locator: RATE_11_EXACT_LOCATOR,
  use_restriction: "Только разборка подтверждённого существующего покрытия пола из полимерцементной или эпоксидной композиции толщиной 5 мм в агрессивной среде по колонке 46-04-011-11 и подтверждённой площади: труд рабочих 5,27 чел.-ч, справочный труд машинистов 1,10 чел.-ч, компрессор 1,10 маш.-ч и пневматические отбойные молотки 2,20 маш.-ч на 100 м². Очистка годных плиток или кирпича к сплошному композиционному покрытию неприменима; внутриобъектовое перемещение включено, внеобъектовый вывоз исключён.",
});

export const AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_PARAMETERS = Object.freeze(
  asRate11(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_PARAMETERS)
    .map((parameter) => Object.freeze({ ...parameter })),
);
export const AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_FORMULAS = Object.freeze(
  asRate11(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_FORMULAS)
    .map((formula) => Object.freeze({ ...formula })),
);
export const AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  asRate11(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_RESOURCES)
    .map((resource) => {
      const sourceMetadata = resource.source_metadata as Json;
      const includedInRate = Array.isArray(sourceMetadata.includedInRate)
        ? sourceMetadata.includedInRate.filter((item) => !String(item).includes("кирпича от раствора"))
        : sourceMetadata.includedInRate;
      const normativeTrace = Array.isArray(sourceMetadata.normativeTrace)
        ? sourceMetadata.normativeTrace.map((trace) => ({
          ...(trace as Json),
          exact_locator: RATE_11_EXACT_LOCATOR,
        }))
        : sourceMetadata.normativeTrace;
      const resourceWithoutHash = {
        ...resource,
        source_metadata: { ...sourceMetadata, includedInRate, normativeTrace },
        row_sha256: undefined,
      };
      return Object.freeze({
        ...resourceWithoutHash,
        row_sha256: estimateDeterministicHash({
          exactRate: "46-04-011-11",
          resource: resourceWithoutHash,
        }),
      });
    }),
);

const transformedCompletenessMap = asRate11(
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
);
export const AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  ...transformedCompletenessMap,
  evidenceReferences: Object.freeze([
    AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_METADATA.official_url,
    "КРЕР 46-2015, PDF/печатные страницы 5, 58, 59 и 60",
  ]),
  entries: Object.freeze(transformedCompletenessMap.entries.map((entry) => (
    entry.operationId === "clean_salvageable_brick_from_mortar"
      ? {
        ...entry,
        condition: "not_applicable_to_continuous_polymer_cement_or_epoxy_composition_floor",
        quantityRule: "NOT_APPLICABLE_TO_CONFIRMED_COMPOSITION_FLOOR",
        detailPrinciple: "REVIEWED_EXCLUSION",
        priceRelation: "NOT_APPLICABLE",
        formulaId: undefined,
        resolution: {
          kind: "NOT_APPLICABLE",
          reasonRu: "Покрытие является сплошной полимерцементной или эпоксидной композицией; годные плитки и кирпич отсутствуют.",
        },
      }
      : entry
  ))),
});

const AREA_PARAMETER_ID = "floor_covering_area_m2";
const PROFILE_PARAMETER_ID =
  "existing_aggressive_environment_polymer_cement_or_epoxy_composition_floor_5mm_profile";
const CONFIRMED_PARAMETER_ID =
  "existing_polymer_cement_or_epoxy_composition_floor_5mm_aggressive_environment_confirmed";

export const AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SHORT_INPUT = Object.freeze({
  [AREA_PARAMETER_ID]: 100,
  [PROFILE_PARAMETER_ID]: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_PROFILE_ID,
  [CONFIRMED_PARAMETER_ID]: true,
});
export const AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_ACCEPTANCE_INPUT = Object.freeze({
  [AREA_PARAMETER_ID]: 35.5,
  [PROFILE_PARAMETER_ID]: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_PROFILE_ID,
  [CONFIRMED_PARAMETER_ID]: true,
});

export function validateAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46Completeness(): true {
  if (AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_RESOURCES.length !== 5
    || AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries.length !== 8) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_COMPLETENESS_MISMATCH");
  }
  const formulaIds = new Set(
    AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_FORMULAS
      .map((formula) => formula.formula_id),
  );
  if (!AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_RESOURCES
    .every((resource) => formulaIds.has(resource.formula_id))) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_FORMULA_ORPHAN");
  }
  return true;
}

export async function compileAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId
    ?? AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_CATALOG_ID;
  if (!(AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_CATALOG_IDS as readonly string[]).includes(catalogId)) {
    throw new Error(`AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  if (submittedParameters[PROFILE_PARAMETER_ID] != null
    && submittedParameters[PROFILE_PARAMETER_ID]
      !== AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_PROFILE_ID) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  }
  if (submittedParameters[CONFIRMED_PARAMETER_ID] === false) {
    throw new Error("AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
  }
  validateAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.aggressive-environment-polymer-cement-or-epoxy-composition-floor-5mm-demolition-krer46-r1",
    catalogId,
    primaryMeasureParameterId: AREA_PARAMETER_ID,
    parameterDefinitions: [...AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_PARAMETERS],
    formulaDefinitions: [...AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_FORMULAS],
    resourceDefinitions: [...AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 5,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_SUMMARY = Object.freeze({
  sourceId: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_ID,
  normId: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_NORM_ID,
  exactRate: "46-04-011-11",
  formula: "area_m2 * exact resource rate / 100 m2",
  machineResourcesIncluded: true,
  salvageableTileOrBrickCleaningApplicable: false,
  offsiteWasteHaulIncluded: false,
});
