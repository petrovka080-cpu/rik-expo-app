import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_FORMULAS,
  ADDRESSABLE_SMOKE_DETECTOR_NORM_ID,
  ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS,
  ADDRESSABLE_SMOKE_DETECTOR_RESOURCES,
  ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_SOURCE_ID,
  ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA,
} from "./addressableSmokeDetectorR1";

export const ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_VARIANTS = Object.freeze({
  high_load: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_install_high_load",
    catalogVariant: "HIGH_LOAD_SEARCH_IDENTITY",
    canonicalNameRu:
      "Монтаж адресных дымовых пожарных извещателей для зоны высокой плотности устройств",
    aliasesRu: [
      "монтаж адресных дымовых извещателей высокая нагрузка",
      "установка извещателей АПС высокой плотности",
    ],
  }),
  large_area: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_install_large_area",
    catalogVariant: "LARGE_AREA_SEARCH_IDENTITY",
    canonicalNameRu:
      "Монтаж адресных дымовых пожарных извещателей на большой площади",
    aliasesRu: [
      "монтаж адресных дымовых извещателей большая площадь",
      "установка извещателей АПС большого объекта",
    ],
  }),
  small_area: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_install_small_area",
    catalogVariant: "SMALL_AREA_SEARCH_IDENTITY",
    canonicalNameRu:
      "Монтаж адресных дымовых пожарных извещателей на малой площади",
    aliasesRu: [
      "монтаж адресных дымовых извещателей малая площадь",
      "установка извещателей АПС небольшого объекта",
    ],
  }),
  technical_room: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_install_technical_room",
    catalogVariant: "TECHNICAL_ROOM_SEARCH_IDENTITY",
    canonicalNameRu:
      "Монтаж адресных дымовых пожарных извещателей в техническом помещении",
    aliasesRu: [
      "монтаж адресных дымовых извещателей техническое помещение",
      "установка извещателей АПС в техпомещении",
    ],
  }),
  wet_zone: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_install_wet_zone",
    catalogVariant: "WET_ZONE_SEARCH_IDENTITY",
    canonicalNameRu:
      "Монтаж адресных дымовых пожарных извещателей во влажной зоне",
    aliasesRu: [
      "монтаж адресных дымовых извещателей влажная зона",
      "установка извещателей АПС во влажном помещении",
    ],
  }),
});

export type AddressableSmokeDetectorClassifiedVariantKey =
  keyof typeof ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_VARIANTS;

export const ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_PARAMETERS =
  ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS;
export const ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_FORMULAS =
  ADDRESSABLE_SMOKE_DETECTOR_FORMULAS;
export const ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_RESOURCES =
  ADDRESSABLE_SMOKE_DETECTOR_RESOURCES;
export const ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_SHORT_INPUT =
  ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT;
export const ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_ACCEPTANCE_INPUT =
  ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT;
export const ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_SOURCE_ID =
  ADDRESSABLE_SMOKE_DETECTOR_SOURCE_ID;
export const ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_NORM_ID =
  ADDRESSABLE_SMOKE_DETECTOR_NORM_ID;
export const ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_SOURCE_METADATA =
  ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA;

export function resolveAddressableSmokeDetectorClassifiedVariant(
  variantKey: string,
): (typeof ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_VARIANTS)[
  AddressableSmokeDetectorClassifiedVariantKey
] {
  if (!Object.prototype.hasOwnProperty.call(
    ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_VARIANTS,
    variantKey,
  )) {
    throw new Error(`ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_VARIANTS[
    variantKey as AddressableSmokeDetectorClassifiedVariantKey
  ];
}

export async function compileAddressableSmokeDetectorClassifiedVariantR1(
  variantKey: AddressableSmokeDetectorClassifiedVariantKey,
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const variant = ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_VARIANTS[variantKey];
  const catalogId = options.catalogId ?? variant.catalogId;
  if (catalogId !== variant.catalogId) {
    throw new Error(`ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion:
      `canonical-estimate-compiler.addressable-smoke-detector-${variantKey}-r1`,
    catalogId,
    primaryMeasureParameterId: "detector_count",
    parameterDefinitions: [...ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_PARAMETERS],
    formulaDefinitions: [...ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_FORMULAS],
    resourceDefinitions: [...ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 40,
    hashJson: async (value) => JSON.stringify(value),
  });
}
