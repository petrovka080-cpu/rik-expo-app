import {
  STRIP_FOUNDATION_AUTOMATIC_PROFILE_S2723_ID,
  deriveStripFoundationAutomaticInputS2723,
} from "../v4/stripFoundationAutomaticInputS2723";
import {
  ASPHALT_FULL_CYCLE_AUTOMATIC_PROFILE_S2723_ID,
  deriveAsphaltFullCycleAutomaticInputS2723,
} from "../v4/asphalt/asphaltFullCycleAutomaticInputS2723";

export const STRIP_FOUNDATION_FULL_SCOPE_CATALOG_ID_S2723 =
  "canonical-work:expanded:strip_foundation";
export const ASPHALT_FULL_CYCLE_CATALOG_ID_S2723 =
  "canonical-work:expanded:asphalt_concrete_pavement";
export const DRYWALL_CEILING_P113_FRAME_CATALOG_ID_S2723 =
  "canonical-work:base:drywall_ceiling_interior_drywall_ceiling_frame_large_area";
export const DRYWALL_CEILING_P113_AREA_ONLY_PROFILE_S2723_ID =
  "profile:drywall-ceiling-frame:p113-area-only-unknown-perimeter:s27-23";

export type CanonicalEstimateProfileInputResolutionS2723 = Readonly<{
  applied: boolean;
  profileId: string | null;
  confirmedParameters: Readonly<Record<string, unknown>>;
}>;

function scalarProfileOverrides(
  values: Readonly<Record<string, unknown>>,
): Readonly<Record<string, string | number | boolean>> {
  return Object.freeze(Object.fromEntries(Object.entries(values).filter(
    (entry): entry is [string, string | number | boolean] =>
      ["string", "number", "boolean"].includes(typeof entry[1]),
  )));
}

/**
 * Resolves profile-owned, recalculable assumptions before the one canonical
 * compiler runs. Explicit user facts are fed back as overrides, so a width,
 * height or specialist quantity entered by the user always wins.
 */
export function resolveCanonicalEstimateProfileInputsS2723(input: Readonly<{
  catalogId: string;
  confirmedParameters: Readonly<Record<string, unknown>>;
  effectiveUserParameters: Readonly<Record<string, unknown>>;
}>): CanonicalEstimateProfileInputResolutionS2723 {
  if (input.catalogId === DRYWALL_CEILING_P113_FRAME_CATALOG_ID_S2723) {
    const areaM2 = Number(
      input.effectiveUserParameters.area_m2
        ?? input.confirmedParameters.area_m2,
    );
    if (!Number.isFinite(areaM2) || areaM2 <= 0) {
      return {
        applied: false,
        profileId: null,
        confirmedParameters: input.confirmedParameters,
      };
    }
    const resolved = { ...input.confirmedParameters };
    const hasExplicitLength = Object.prototype.hasOwnProperty.call(
      input.effectiveUserParameters,
      "room_length_m",
    );
    const hasExplicitWidth = Object.prototype.hasOwnProperty.call(
      input.effectiveUserParameters,
      "room_width_m",
    );
    if (!hasExplicitLength) delete resolved.room_length_m;
    if (!hasExplicitWidth) delete resolved.room_width_m;
    return {
      applied: true,
      profileId: DRYWALL_CEILING_P113_AREA_ONLY_PROFILE_S2723_ID,
      confirmedParameters: Object.freeze(resolved),
    };
  }
  if (input.catalogId === ASPHALT_FULL_CYCLE_CATALOG_ID_S2723) {
    const areaM2 = Number(
      input.effectiveUserParameters.area_m2
        ?? input.confirmedParameters.area_m2,
    );
    if (!Number.isFinite(areaM2) || areaM2 <= 0) {
      return {
        applied: false,
        profileId: null,
        confirmedParameters: input.confirmedParameters,
      };
    }
    const wearingThicknessCandidate = Number(
      input.effectiveUserParameters.wearing_layer_thickness_mm
        ?? input.confirmedParameters.wearing_layer_thickness_mm,
    );
    const derived = deriveAsphaltFullCycleAutomaticInputS2723({
      area_m2: areaM2,
      ...(Number.isFinite(wearingThicknessCandidate) && wearingThicknessCandidate > 0
        ? { wearing_layer_thickness_mm: wearingThicknessCandidate }
        : {}),
      overrides: input.effectiveUserParameters,
    });
    return {
      applied: true,
      profileId: ASPHALT_FULL_CYCLE_AUTOMATIC_PROFILE_S2723_ID,
      confirmedParameters: Object.freeze({
        ...input.confirmedParameters,
        ...derived,
      }),
    };
  }
  if (input.catalogId !== STRIP_FOUNDATION_FULL_SCOPE_CATALOG_ID_S2723) {
    return {
      applied: false,
      profileId: null,
      confirmedParameters: input.confirmedParameters,
    };
  }
  const lengthM = Number(
    input.effectiveUserParameters.total_axis_length_m
      ?? input.confirmedParameters.total_axis_length_m,
  );
  if (!Number.isFinite(lengthM) || lengthM <= 0) {
    return {
      applied: false,
      profileId: null,
      confirmedParameters: input.confirmedParameters,
    };
  }
  const widthCandidate = Number(
    input.effectiveUserParameters.strip_width_m
      ?? input.confirmedParameters.strip_width_m,
  );
  const heightCandidate = Number(
    input.effectiveUserParameters.strip_height_m
      ?? input.confirmedParameters.strip_height_m,
  );
  const derivation = deriveStripFoundationAutomaticInputS2723({
    total_axis_length_m: lengthM,
    ...(Number.isFinite(widthCandidate) && widthCandidate > 0
      ? { strip_width_m: widthCandidate }
      : {}),
    ...(Number.isFinite(heightCandidate) && heightCandidate > 0
      ? { strip_height_m: heightCandidate }
      : {}),
    overrides: scalarProfileOverrides(input.effectiveUserParameters),
  });
  return {
    applied: true,
    profileId: STRIP_FOUNDATION_AUTOMATIC_PROFILE_S2723_ID,
    confirmedParameters: Object.freeze({
      ...input.confirmedParameters,
      ...derivation.input,
    }),
  };
}
