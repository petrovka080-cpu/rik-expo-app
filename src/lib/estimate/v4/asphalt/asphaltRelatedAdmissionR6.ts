import type {
  CanonicalEstimateParameterGuideKind,
  CanonicalEstimateParameterValueSourceRole,
  CanonicalEstimateParameterVisibilityRole,
} from "../../backendPlatform/contracts";

export const ASPHALT_RELATED_RUNTIME_ADMISSION_CONTRACT_R6 =
  "asphalt-related-runtime-admission:r6.v1" as const;

export type AsphaltRelatedAdmissionPolicyR6 = {
  parameterId: string;
  visibilityRole: CanonicalEstimateParameterVisibilityRole;
  valueSourceRole: CanonicalEstimateParameterValueSourceRole;
  guideKind: CanonicalEstimateParameterGuideKind;
  baselineClassification: "VALIDATION_FIXTURE";
  preliminaryCompilationAllowed: true;
  requiresSourceConfirmation: boolean;
  runtimeValue: null;
};

const MATERIAL_OR_PRODUCT_SOURCE = /(?:density|mix_type|material_type|fraction|geotextile_type|waterproofing_type|material_destination|parking_purpose|vehicle_type)/u;

const TECHNICAL_SOURCE = /(?:productivity|(?:^|_)rate(?:_|$)|(?:^|_)factor(?:_|$)|(?:^|_)percent(?:_|$)|interval|utilization|turnaround|average_speed|water_l_m2|concrete_m3_per_|consumable_kg_|compound_kg_|beads_kg_|sealant_kg_)/u;

const PROJECT_LOGISTICS_SOURCE = /(?:turnaround|average_speed)/u;
const PROJECT_QUALITY_SOURCE = /(?:control_interval|sampling_interval|test_interval|geometry_control_interval)/u;
const SELECTED_MACHINE_PRODUCTIVITY_SOURCE = /productivity_.+_per_machine_hour$/u;
const PROJECT_EXECUTION_LABOR_PRODUCTIVITY_SOURCE = /productivity_.+_per_man_hour$/u;
const PROJECT_WASTE_ALLOWANCE_SOURCE = /(?:^|_)waste_(?:factor|percent)(?:_|$)/u;
const PROJECT_OR_PRODUCT_CONSUMPTION_SOURCE = /(?:emulsion_rate|tack_coat|joint_sealant|primer_rate|marking_(?:glass_beads|material)_rate|(?:^|_)water_rate|water_l_m2|concrete_m3_per_|consumable_kg_|compound_kg_|beads_kg_|sealant_kg_|compaction_factor)/u;

const MEASURED_GEOMETRY = /(?:^area_m2$|^removal_area_m2$|^total_area_m2$|(?:^|_)length_m$|(?:^|_)area_m2$|(?:^|_)distance_km$|(?:^|_)depth_mm$|(?:^|_)thickness_mm$)/u;

/**
 * Admission for the nine asphalt-related owners outside Roadworks Wave A.
 * Historical values remain useful as deterministic validation fixtures, but
 * no fixture is permitted to become an effective value in a new estimate.
 */
export function asphaltRelatedAdmissionPolicyR6(
  parameterId: string,
): AsphaltRelatedAdmissionPolicyR6 {
  const requiresSourceConfirmation = MATERIAL_OR_PRODUCT_SOURCE.test(parameterId)
    || TECHNICAL_SOURCE.test(parameterId);
  const valueSourceRole: CanonicalEstimateParameterValueSourceRole =
    MATERIAL_OR_PRODUCT_SOURCE.test(parameterId)
      ? "MANUFACTURER_CONFIRMED"
      : PROJECT_LOGISTICS_SOURCE.test(parameterId)
        || PROJECT_QUALITY_SOURCE.test(parameterId)
        ? "PROJECT_DOCUMENTATION"
        : SELECTED_MACHINE_PRODUCTIVITY_SOURCE.test(parameterId)
          ? "SELECTED_EQUIPMENT_PASSPORT"
          : PROJECT_EXECUTION_LABOR_PRODUCTIVITY_SOURCE.test(parameterId)
            || PROJECT_WASTE_ALLOWANCE_SOURCE.test(parameterId)
            ? "PROJECT_DOCUMENTATION"
          : PROJECT_OR_PRODUCT_CONSUMPTION_SOURCE.test(parameterId)
            ? "MANUFACTURER_CONFIRMED"
      : TECHNICAL_SOURCE.test(parameterId)
        ? "NORM_REQUIRED_BUT_PROJECT_SELECTED"
        : MEASURED_GEOMETRY.test(parameterId)
          ? "USER_MEASURED"
          : "PROJECT_DOCUMENTATION";
  const guideKind: CanonicalEstimateParameterGuideKind =
    MATERIAL_OR_PRODUCT_SOURCE.test(parameterId)
      ? "MANUFACTURER_RANGE"
      : valueSourceRole === "PROJECT_DOCUMENTATION"
        ? "PROJECT_DEFINED"
        : valueSourceRole === "SELECTED_EQUIPMENT_PASSPORT"
          || valueSourceRole === "MANUFACTURER_CONFIRMED"
          ? "MANUFACTURER_RANGE"
      : TECHNICAL_SOURCE.test(parameterId)
        ? "NORMATIVE_RANGE"
        : MEASURED_GEOMETRY.test(parameterId)
          ? "MEASUREMENT_RULE"
          : "PROJECT_DEFINED";
  return Object.freeze({
    parameterId,
    visibilityRole: "USER_INPUT",
    valueSourceRole,
    guideKind,
    baselineClassification: "VALIDATION_FIXTURE",
    preliminaryCompilationAllowed: true,
    requiresSourceConfirmation,
    runtimeValue: null,
  });
}
