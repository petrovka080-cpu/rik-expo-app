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

export const FIRE_ALARM_COMMISSIONING_LARGE_AREA_CATALOG_ID =
  "canonical-work:base:electrical_interior_fire_alarm_commission_large_area";

// The catalog suffix classifies the search identity. It is not a normative
// coefficient and must not change quantities without approved project data.
export const FIRE_ALARM_COMMISSIONING_LARGE_AREA_PARAMETERS =
  FIRE_ALARM_COMMISSIONING_STANDARD_PARAMETERS;
export const FIRE_ALARM_COMMISSIONING_LARGE_AREA_FORMULAS =
  FIRE_ALARM_COMMISSIONING_STANDARD_FORMULAS;
export const FIRE_ALARM_COMMISSIONING_LARGE_AREA_RESOURCES =
  FIRE_ALARM_COMMISSIONING_STANDARD_RESOURCES;
export const FIRE_ALARM_COMMISSIONING_LARGE_AREA_SHORT_INPUT =
  FIRE_ALARM_COMMISSIONING_STANDARD_SHORT_INPUT;
export const FIRE_ALARM_COMMISSIONING_LARGE_AREA_ACCEPTANCE_INPUT =
  FIRE_ALARM_COMMISSIONING_STANDARD_ACCEPTANCE_INPUT;
export const FIRE_ALARM_COMMISSIONING_LARGE_AREA_SOURCE_ID =
  FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_ID;
export const FIRE_ALARM_COMMISSIONING_LARGE_AREA_NORM_ID =
  FIRE_ALARM_COMMISSIONING_STANDARD_NORM_ID;
export const FIRE_ALARM_COMMISSIONING_LARGE_AREA_SOURCE_METADATA =
  FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA;
export const FIRE_ALARM_COMMISSIONING_LARGE_AREA_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    ...FIRE_ALARM_COMMISSIONING_STANDARD_INDEPENDENT_COMPLETENESS_MAP,
    catalogVariant: "LARGE_AREA_SEARCH_IDENTITY_NO_HIDDEN_QUANTITY_FACTOR",
  });

export async function compileFireAlarmCommissioningLargeAreaR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? FIRE_ALARM_COMMISSIONING_LARGE_AREA_CATALOG_ID;
  if (catalogId !== FIRE_ALARM_COMMISSIONING_LARGE_AREA_CATALOG_ID) {
    throw new Error(`FIRE_ALARM_COMMISSIONING_LARGE_AREA_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.fire-alarm-commissioning-large-area-r1",
    catalogId,
    primaryMeasureParameterId: "device_point_count",
    parameterDefinitions: [...FIRE_ALARM_COMMISSIONING_LARGE_AREA_PARAMETERS],
    formulaDefinitions: [...FIRE_ALARM_COMMISSIONING_LARGE_AREA_FORMULAS],
    resourceDefinitions: [...FIRE_ALARM_COMMISSIONING_LARGE_AREA_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}
