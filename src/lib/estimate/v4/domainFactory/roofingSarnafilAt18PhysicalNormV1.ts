import roofingNormPack from "../../../../../data/estimate-norms/professional/roofing.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const APPLICABILITY_VERSION = "professional-physical-norm-applicability:v1" as const;

export const SARNAFIL_AT18_FIELD_80MM_PRODUCT_PROFILE_ID =
  "manufacturer-profile:sika-sarnafil-at18:2m-field-80mm-overlap:v1" as const;

export const SARNAFIL_AT18_FIELD_80MM_NORM_ID =
  "roofing_sarnafil_at18_field_overlap_m2_m2_v1" as const;

export const SARNAFIL_AT18_FIELD_80MM_SOURCE_ID =
  `src_professional_norm_pack_${SARNAFIL_AT18_FIELD_80MM_NORM_ID}` as const;

export const SARNAFIL_AT18_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "net_rectangular_field_area_m2",
  "fixing_method",
  "roll_orientation",
  "field_course_count",
  "field_course_lengths_m",
  "end_lap_design",
  "details_and_upstands_area_m2",
  "selected_package_variation",
  "sika_project_specific_fastening_calculation",
] as const);

const sarnafilAt18Norm = (() => {
  const found = roofingNormPack.norm_items.find(
    (item) => item.norm_id === SARNAFIL_AT18_FIELD_80MM_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${SARNAFIL_AT18_FIELD_80MM_NORM_ID}`);
  }
  return found;
})();

if (
  roofingNormPack.work_group !== "roofing" ||
  roofingNormPack.review_status !== "reviewed" ||
  sarnafilAt18Norm.unit !== "m2" ||
  sarnafilAt18Norm.rate.value !== 1.0416667 ||
  sarnafilAt18Norm.rate.unit !==
    "preliminary repeated-course gross field membrane m2/net rectangular field m2; geometry-derived as 2.00 m / (2.00 m - 0.08 m)" ||
  sarnafilAt18Norm.applicability.product !== "Sarnafil AT-18" ||
  sarnafilAt18Norm.applicability.roll_width_m !== 2 ||
  sarnafilAt18Norm.applicability.roll_length_m !== 15 ||
  sarnafilAt18Norm.applicability.roll_area_m2 !== 30 ||
  sarnafilAt18Norm.applicability.field_overlap_m !== 0.08 ||
  sarnafilAt18Norm.applicability.effective_course_width_m !== 1.92 ||
  sarnafilAt18Norm.applicability.field_overlap_factor_is_geometry_derived_not_manufacturer_consumption_rate !== true ||
  sarnafilAt18Norm.applicability.spot_fastened_120_mm_overlap_excluded !== true ||
  sarnafilAt18Norm.applicability.end_laps_upstands_penetrations_details_and_cutting_excluded !== true ||
  sarnafilAt18Norm.applicability.fastener_spacing_requires_project_specific_sika_calculation !== true ||
  sarnafilAt18Norm.applicability.final_roll_takeoff_requires_complete_course_and_detail_layout !== true ||
  sarnafilAt18Norm.parameters.length !== SARNAFIL_AT18_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  SARNAFIL_AT18_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !sarnafilAt18Norm.parameters.includes(parameterId),
  ) ||
  sarnafilAt18Norm.waste_percent_default !== 0 ||
  sarnafilAt18Norm.rounding.package_unit !== "30_m2_roll" ||
  sarnafilAt18Norm.rounding.package_size !== 30 ||
  sarnafilAt18Norm.rounding.mode !==
    "gross_field_area_only_no_roll_rounding_before_complete_layout"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${SARNAFIL_AT18_FIELD_80MM_NORM_ID}`);
}

export const SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA = Object.freeze({
  source_id: SARNAFIL_AT18_FIELD_80MM_SOURCE_ID,
  norm_id: SARNAFIL_AT18_FIELD_80MM_NORM_ID,
  source_document_version: roofingNormPack.source_pack_version,
  source_title: sarnafilAt18Norm.source.title,
  source_url: sarnafilAt18Norm.source.url,
  exact_locator: sarnafilAt18Norm.source.page,
  rate_value: sarnafilAt18Norm.rate.value,
  rate_unit: sarnafilAt18Norm.rate.unit,
  product: sarnafilAt18Norm.applicability.product,
  roll_width_m: sarnafilAt18Norm.applicability.roll_width_m,
  roll_length_m: sarnafilAt18Norm.applicability.roll_length_m,
  roll_area_m2: sarnafilAt18Norm.applicability.roll_area_m2,
  field_overlap_m: sarnafilAt18Norm.applicability.field_overlap_m,
  effective_course_width_m: sarnafilAt18Norm.applicability.effective_course_width_m,
  definition_hash: estimateDeterministicHash({
    work_group: roofingNormPack.work_group,
    source_pack_version: roofingNormPack.source_pack_version,
    norm_item: sarnafilAt18Norm,
  }),
});

export const SARNAFIL_AT18_FIELD_80MM_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: SARNAFIL_AT18_FIELD_80MM_NORM_ID,
  work_group: "roofing",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "ROOF_WATERPROOFING",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: SARNAFIL_AT18_FIELD_80MM_PRODUCT_PROFILE_ID,
  source_id: SARNAFIL_AT18_FIELD_80MM_SOURCE_ID,
  source_document_version: SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.source_document_version,
  source_definition_hash: SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: SARNAFIL_AT18_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["sarnafil_at18_gross_field_membrane_m2"] as const,
});

function explicitValue(
  values: Readonly<Record<string, ProfessionalParameterValueV4>>,
  parameterId: string,
): ProfessionalParameterValueV4 | null {
  const value = values[parameterId];
  if (!value || value.source_type === "VISIBLE_BASELINE_ASSUMPTION") return null;
  if (typeof value.value === "string" && value.value.trim().length === 0) return null;
  return value;
}

function primitiveString(value: ProfessionalParameterValueV4 | null): string | null {
  if (typeof value?.value !== "string") return null;
  const normalized = value.value.trim();
  return normalized || null;
}

function finiteNumber(value: ProfessionalParameterValueV4 | null): number | null {
  if (!value) return null;
  const numeric = typeof value.value === "number"
    ? value.value
    : Number(String(value.value).replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function parseCourseLengths(value: ProfessionalParameterValueV4 | null): number[] | null {
  if (!value) return null;
  const raw = String(value.value).trim();
  if (!raw) return null;
  const lengths = raw
    .split(/[;,|\s]+/u)
    .filter(Boolean)
    .map((item) => Number(item.replace(",", ".")));
  return lengths.length > 0 && lengths.every((item) => Number.isFinite(item) && item > 0)
    ? lengths
    : null;
}

function nonApplied(
  status: "NOT_REQUESTED" | "BLOCKED_REQUIRED_INPUTS" | "BLOCKED_NOT_APPLICABLE",
  productProfileId: string | null,
  parameterValues: Readonly<Record<string, ProfessionalParameterValueV4>>,
  blockers: readonly string[],
  consumedParameterIds: readonly string[] = [],
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const withoutHash = {
    status,
    applicability_version: APPLICABILITY_VERSION,
    product_profile_id: productProfileId,
    source_id: SARNAFIL_AT18_FIELD_80MM_SOURCE_ID,
    norm_id: SARNAFIL_AT18_FIELD_80MM_NORM_ID,
    source_document_version: SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.source_document_version,
    source_url: SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.source_url,
    exact_locator: SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.exact_locator,
    source_definition_hash: SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...consumedParameterIds].sort(),
    produced_parameter_ids: [] as const,
    parameter_values: parameterValues,
    blockers: [...new Set(blockers)].sort(),
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function resolveSarnafilAt18Field80MmPhysicalNormV1(input: {
  technology_class: string;
  operation_class: string;
  material_system?: string;
  scope_mode: string;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const productProfileId = primitiveString(explicitValue(input.parameter_values, "product_profile_id"));
  if (productProfileId !== SARNAFIL_AT18_FIELD_80MM_PRODUCT_PROFILE_ID) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }
  if (
    input.technology_class !== "ROOF_WATERPROOFING" ||
    input.operation_class !== "INSTALL" ||
    input.material_system !== "SARNAFIL_AT18_ROOF_MEMBRANE" ||
    input.scope_mode !== "FULL_APPLICABLE_SCOPE"
  ) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }

  const explicit = Object.fromEntries(SARNAFIL_AT18_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(input.parameter_values, parameterId)],
  ));
  const missing = SARNAFIL_AT18_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      missing,
      SARNAFIL_AT18_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const netAreaM2 = finiteNumber(explicit.net_rectangular_field_area_m2);
  const fixingMethod = primitiveString(explicit.fixing_method);
  const rollOrientation = primitiveString(explicit.roll_orientation);
  const courseCount = finiteNumber(explicit.field_course_count);
  const courseLengthsM = parseCourseLengths(explicit.field_course_lengths_m);
  const endLapDesign = primitiveString(explicit.end_lap_design);
  const detailsAreaM2 = finiteNumber(explicit.details_and_upstands_area_m2);
  const selectedVariation = primitiveString(explicit.selected_package_variation);
  const fasteningCalculation = primitiveString(explicit.sika_project_specific_fastening_calculation);
  const courseLengthM = courseLengthsM?.[0] ?? null;
  const courseLengthsEqual = Boolean(
    courseLengthsM && courseLengthM && courseLengthsM.every(
      (length) => Math.abs(length - courseLengthM) <= 1e-9,
    ),
  );
  const calculatedLayoutNetAreaM2 = courseCount && courseLengthM
    ? Number((courseLengthM * (
      SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.roll_width_m +
      (courseCount - 1) * SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.effective_course_width_m
    )).toFixed(9))
    : null;

  const blockers = [
    netAreaM2 !== null && netAreaM2 > 0
      ? ""
      : "PROJECT_VALUE_INVALID:net_rectangular_field_area_m2",
    fixingMethod === "FIELD_FASTENED"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${SARNAFIL_AT18_FIELD_80MM_NORM_ID}:fixing_method=${fixingMethod}`,
    rollOrientation === "PARALLEL_TO_LONG_EDGE"
      ? ""
      : `PHYSICAL_NORM_LAYOUT_NOT_APPLICABLE:roll_orientation=${rollOrientation}`,
    courseCount !== null && Number.isInteger(courseCount) && courseCount > 0
      ? ""
      : "PROJECT_VALUE_INVALID:field_course_count",
    courseLengthsM && courseCount === courseLengthsM.length
      ? ""
      : `PHYSICAL_NORM_LAYOUT_CONFLICT:field_course_lengths_count=${courseLengthsM?.length ?? "invalid"}:field_course_count=${courseCount}`,
    courseLengthsEqual
      ? ""
      : "PHYSICAL_NORM_LAYOUT_NOT_RECTANGULAR:field_course_lengths_m",
    endLapDesign === "NO_END_LAPS_WITHIN_FIELD"
      ? ""
      : `PHYSICAL_NORM_EXCLUDED_SCOPE_PRESENT:end_lap_design=${endLapDesign}`,
    detailsAreaM2 === 0
      ? ""
      : `PHYSICAL_NORM_EXCLUDED_SCOPE_PRESENT:details_and_upstands_area_m2=${detailsAreaM2}`,
    selectedVariation === "FIELD_FASTENED_80_MM_OVERLAP"
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_package_variation=${selectedVariation}`,
    fasteningCalculation
      ? ""
      : "PROJECT_VALUE_INVALID:sika_project_specific_fastening_calculation",
    calculatedLayoutNetAreaM2 !== null && netAreaM2 !== null &&
      Math.abs(calculatedLayoutNetAreaM2 - netAreaM2) <= 1e-6
      ? ""
      : `PHYSICAL_NORM_LAYOUT_AREA_CONFLICT:declared_m2=${netAreaM2}:layout_m2=${calculatedLayoutNetAreaM2}`,
  ].filter(Boolean);
  if (blockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      blockers,
      SARNAFIL_AT18_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const grossFieldMembraneM2 = Number((
    courseLengthsM!.reduce((sum, length) => sum + length, 0) *
    SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.roll_width_m
  ).toFixed(9));
  const explicitOutput = finiteNumber(explicitValue(
    input.parameter_values,
    "sarnafil_at18_gross_field_membrane_m2",
  ));
  if (explicitOutput !== null && Math.abs(explicitOutput - grossFieldMembraneM2) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:sarnafil_at18_gross_field_membrane_m2=${explicitOutput}:norm_value=${grossFieldMembraneM2}`,
      ],
      [...SARNAFIL_AT18_REQUIRED_EXPLICIT_PARAMETER_IDS, "sarnafil_at18_gross_field_membrane_m2"],
    );
  }

  const capturedAt = SARNAFIL_AT18_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${productProfileId}`,
    `net_rectangular_field_area_m2=${netAreaM2}`,
    `fixing_method=${fixingMethod}`,
    `roll_orientation=${rollOrientation}`,
    `field_course_count=${courseCount}`,
    `field_course_lengths_m=${courseLengthsM!.join(",")}`,
    `end_lap_design=${endLapDesign}`,
    `details_and_upstands_area_m2=${detailsAreaM2}`,
    `selected_package_variation=${selectedVariation}`,
    `sika_project_specific_fastening_calculation=${fasteningCalculation}`,
    "formula=sum(field_course_lengths_m)*2.00m_roll_width",
    `sarnafil_at18_gross_field_membrane_m2=${grossFieldMembraneM2}`,
    "roll_rounding=false",
    "end_laps_upstands_penetrations_details_cutting_excluded=true",
    "automatic_generic_binding=false",
  ].join(";");
  const parameterValues = Object.freeze({
    ...input.parameter_values,
    sarnafil_at18_gross_field_membrane_m2: {
      value: grossFieldMembraneM2,
      unit_id: "m2",
      source_type: "APPLICABLE_NORM" as const,
      source_id: SARNAFIL_AT18_FIELD_80MM_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: APPLICABILITY_VERSION,
    product_profile_id: productProfileId,
    source_id: SARNAFIL_AT18_FIELD_80MM_SOURCE_ID,
    norm_id: SARNAFIL_AT18_FIELD_80MM_NORM_ID,
    source_document_version: SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.source_document_version,
    source_url: SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.source_url,
    exact_locator: SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.exact_locator,
    source_definition_hash: SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...SARNAFIL_AT18_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["sarnafil_at18_gross_field_membrane_m2"] as const,
    calculated_sarnafil_at18_gross_field_membrane_m2: grossFieldMembraneM2,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
