import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  FIRE_ALARM_COMMISSIONING_STANDARD_ACCEPTANCE_INPUT,
  FIRE_ALARM_COMMISSIONING_STANDARD_FORMULAS,
  FIRE_ALARM_COMMISSIONING_STANDARD_INDEPENDENT_COMPLETENESS_MAP,
  FIRE_ALARM_COMMISSIONING_STANDARD_NORM_ID,
  FIRE_ALARM_COMMISSIONING_STANDARD_PARAMETERS,
  FIRE_ALARM_COMMISSIONING_STANDARD_RESOURCES,
  FIRE_ALARM_COMMISSIONING_STANDARD_SHORT_INPUT,
  FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_ID,
  FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA,
} from "./fireAlarmCommissioningStandardR1";

export const FIRE_ALARM_COMMISSIONING_CLASSIFIED_VARIANTS = Object.freeze({
  technical_room: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_commission_technical_room",
    catalogVariant: "TECHNICAL_ROOM_SEARCH_IDENTITY",
    canonicalNameRu: "Системная пусконаладка пожарной сигнализации технического помещения",
    aliasesRu: ["пусконаладка АПС технического помещения", "ПНР пожарной сигнализации техпомещения"],
  }),
  wet_zone: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_commission_wet_zone",
    catalogVariant: "WET_ZONE_SEARCH_IDENTITY",
    canonicalNameRu: "Системная пусконаладка пожарной сигнализации влажной зоны",
    aliasesRu: ["пусконаладка АПС влажной зоны", "ПНР пожарной сигнализации влажного помещения"],
  }),
});

export type FireAlarmCommissioningClassifiedVariantKey =
  keyof typeof FIRE_ALARM_COMMISSIONING_CLASSIFIED_VARIANTS;

export const FIRE_ALARM_COMMISSIONING_CLASSIFIED_PARAMETERS =
  FIRE_ALARM_COMMISSIONING_STANDARD_PARAMETERS;
export const FIRE_ALARM_COMMISSIONING_CLASSIFIED_FORMULAS =
  FIRE_ALARM_COMMISSIONING_STANDARD_FORMULAS;
export const FIRE_ALARM_COMMISSIONING_CLASSIFIED_RESOURCES =
  FIRE_ALARM_COMMISSIONING_STANDARD_RESOURCES;
export const FIRE_ALARM_COMMISSIONING_CLASSIFIED_SHORT_INPUT =
  FIRE_ALARM_COMMISSIONING_STANDARD_SHORT_INPUT;
export const FIRE_ALARM_COMMISSIONING_CLASSIFIED_ACCEPTANCE_INPUT =
  FIRE_ALARM_COMMISSIONING_STANDARD_ACCEPTANCE_INPUT;
export const FIRE_ALARM_COMMISSIONING_CLASSIFIED_SOURCE_ID =
  FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_ID;
export const FIRE_ALARM_COMMISSIONING_CLASSIFIED_NORM_ID =
  FIRE_ALARM_COMMISSIONING_STANDARD_NORM_ID;
export const FIRE_ALARM_COMMISSIONING_CLASSIFIED_SOURCE_METADATA =
  FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA;

export function resolveFireAlarmCommissioningClassifiedVariant(
  variantKey: string,
): (typeof FIRE_ALARM_COMMISSIONING_CLASSIFIED_VARIANTS)[FireAlarmCommissioningClassifiedVariantKey] {
  if (!Object.prototype.hasOwnProperty.call(
    FIRE_ALARM_COMMISSIONING_CLASSIFIED_VARIANTS,
    variantKey,
  )) {
    throw new Error(`FIRE_ALARM_COMMISSIONING_CLASSIFIED_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return FIRE_ALARM_COMMISSIONING_CLASSIFIED_VARIANTS[
    variantKey as FireAlarmCommissioningClassifiedVariantKey
  ];
}

export function fireAlarmCommissioningClassifiedCompletenessMap(
  variantKey: FireAlarmCommissioningClassifiedVariantKey,
) {
  const variant = FIRE_ALARM_COMMISSIONING_CLASSIFIED_VARIANTS[variantKey];
  return Object.freeze({
    ...FIRE_ALARM_COMMISSIONING_STANDARD_INDEPENDENT_COMPLETENESS_MAP,
    catalogVariant: `${variant.catalogVariant}_NO_HIDDEN_QUANTITY_FACTOR`,
  });
}

export async function compileFireAlarmCommissioningClassifiedVariantR1(
  variantKey: FireAlarmCommissioningClassifiedVariantKey,
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const variant = FIRE_ALARM_COMMISSIONING_CLASSIFIED_VARIANTS[variantKey];
  const catalogId = options.catalogId ?? variant.catalogId;
  if (catalogId !== variant.catalogId) {
    throw new Error(`FIRE_ALARM_COMMISSIONING_CLASSIFIED_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: `canonical-estimate-compiler.fire-alarm-commissioning-${variantKey}-r1`,
    catalogId,
    primaryMeasureParameterId: "device_point_count",
    parameterDefinitions: [...FIRE_ALARM_COMMISSIONING_CLASSIFIED_PARAMETERS],
    formulaDefinitions: [...FIRE_ALARM_COMMISSIONING_CLASSIFIED_FORMULAS],
    resourceDefinitions: [...FIRE_ALARM_COMMISSIONING_CLASSIFIED_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}
