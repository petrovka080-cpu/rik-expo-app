import heatingNormPack from "../../../../../data/estimate-norms/professional/heating.json";
import ventilationNormPack from "../../../../../data/estimate-norms/professional/ventilation.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type {
  ProfessionalEstimateScopeModeV4,
  ProfessionalParameterValueV4,
} from "../professionalProjectAssemblyV4";

export const PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1 =
  "professional-physical-norm-applicability:v1" as const;

export const UPONOR_UFH_150MM_PRODUCT_PROFILE_ID =
  "manufacturer-profile:uponor-underfloor-heating:150mm:v1" as const;

export const UPONOR_UFH_150MM_NORM_ID =
  "heating_uponor_ufh_pipe_m_m2_150mm_spacing_v1" as const;

export const UPONOR_UFH_150MM_SOURCE_ID =
  `src_professional_norm_pack_${UPONOR_UFH_150MM_NORM_ID}` as const;

export const LINDAB_VSR_PRODUCT_PROFILE_ID =
  "manufacturer-profile:lindab-vsr-ventiduct:v1" as const;

export const LINDAB_VSR_NORM_ID =
  "ventilation_lindab_vsr_duct_linear_m_route_v1" as const;

export const LINDAB_VSR_SOURCE_ID =
  `src_professional_norm_pack_${LINDAB_VSR_NORM_ID}` as const;

const uponorNorm = (() => {
  const found = heatingNormPack.norm_items.find((item) => item.norm_id === UPONOR_UFH_150MM_NORM_ID);
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${UPONOR_UFH_150MM_NORM_ID}`);
  return found;
})();
if (
  heatingNormPack.work_group !== "heating" ||
  uponorNorm.unit !== "linear_m" ||
  uponorNorm.rate.unit !== "pipe linear m/heated floor m2 at 150 mm spacing, excluding feed and tail lengths" ||
  uponorNorm.applicability.pipe_spacing_mm !== 150 ||
  uponorNorm.rounding.mode !== "ceil_after_loop_and_feed_tail_layout"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${UPONOR_UFH_150MM_NORM_ID}`);
}

export const UPONOR_UFH_150MM_SOURCE_METADATA = Object.freeze({
  source_id: UPONOR_UFH_150MM_SOURCE_ID,
  norm_id: UPONOR_UFH_150MM_NORM_ID,
  source_document_version: heatingNormPack.source_pack_version,
  source_title: uponorNorm.source.title,
  source_url: uponorNorm.source.url,
  exact_locator: uponorNorm.source.page,
  rate_value: uponorNorm.rate.value,
  rate_unit: uponorNorm.rate.unit,
  pipe_spacing_mm: uponorNorm.applicability.pipe_spacing_mm,
  definition_hash: estimateDeterministicHash({
    work_group: heatingNormPack.work_group,
    source_pack_version: heatingNormPack.source_pack_version,
    norm_item: uponorNorm,
  }),
});

const lindabVsrNorm = (() => {
  const found = ventilationNormPack.norm_items.find((item) => item.norm_id === LINDAB_VSR_NORM_ID);
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${LINDAB_VSR_NORM_ID}`);
  return found;
})();

if (
  ventilationNormPack.work_group !== "ventilation" ||
  lindabVsrNorm.unit !== "linear_m" ||
  lindabVsrNorm.rate.unit !== "duct linear m/approved straight route linear m" ||
  lindabVsrNorm.rate.value !== 1 ||
  lindabVsrNorm.rounding.mode !== "ceil_after_fitting_and_nozzle_layout"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${LINDAB_VSR_NORM_ID}`);
}

export const LINDAB_VSR_SOURCE_METADATA = Object.freeze({
  source_id: LINDAB_VSR_SOURCE_ID,
  norm_id: LINDAB_VSR_NORM_ID,
  source_document_version: ventilationNormPack.source_pack_version,
  source_title: lindabVsrNorm.source.title,
  source_url: lindabVsrNorm.source.url,
  exact_locator: lindabVsrNorm.source.page,
  rate_value: lindabVsrNorm.rate.value,
  rate_unit: lindabVsrNorm.rate.unit,
  available_diameter_range_mm: lindabVsrNorm.applicability.available_diameter_range_mm,
  maximum_standard_length_m: lindabVsrNorm.applicability.maximum_standard_length_m,
  definition_hash: estimateDeterministicHash({
    work_group: ventilationNormPack.work_group,
    source_pack_version: ventilationNormPack.source_pack_version,
    norm_item: lindabVsrNorm,
  }),
});

const REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "zone_area_m2",
  "designed_pipe_spacing_mm",
  "manifold_location",
  "feed_tail_length_linear_m",
  "loop_length_limit",
  "hydraulic_loop_design_reference",
  "circuit_count",
  "manifold_outlet_count",
  "longest_circuit_length_m",
] as const);

const LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "route_length_m",
  "duct_diameter_mm",
  "nozzle_pattern",
  "air_distribution_design",
  "fitting_schedule",
  "cooled_supply_air_confirmed",
] as const);

export const CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1 = Object.freeze([{
  norm_id: UPONOR_UFH_150MM_NORM_ID,
  work_group: "heating",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "WARM_FLOOR_SYSTEM",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: UPONOR_UFH_150MM_PRODUCT_PROFILE_ID,
  source_id: UPONOR_UFH_150MM_SOURCE_ID,
  source_document_version: UPONOR_UFH_150MM_SOURCE_METADATA.source_document_version,
  source_definition_hash: UPONOR_UFH_150MM_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["circuit_length_m"] as const,
}, {
  norm_id: LINDAB_VSR_NORM_ID,
  work_group: "ventilation",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "DUCT_NETWORK",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: LINDAB_VSR_PRODUCT_PROFILE_ID,
  source_id: LINDAB_VSR_SOURCE_ID,
  source_document_version: LINDAB_VSR_SOURCE_METADATA.source_document_version,
  source_definition_hash: LINDAB_VSR_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["primary_resource_units_per_output", "procurement_factor"] as const,
}]);

type AppliedPhysicalNormResolutionV1 = {
  status: "APPLIED";
  applicability_version: typeof PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1;
  product_profile_id: string;
  source_id: string;
  norm_id: string;
  source_document_version: string;
  source_url: string;
  exact_locator: string;
  source_definition_hash: string;
  consumed_parameter_ids: readonly string[];
  produced_parameter_ids: readonly string[];
  calculated_pipe_length_m?: number;
  calculated_resource_quantity_m?: number;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
  blockers: readonly [];
  deterministic_hash: string;
};

type NonAppliedPhysicalNormResolutionV1 = {
  status: "NOT_REQUESTED" | "BLOCKED_REQUIRED_INPUTS" | "BLOCKED_NOT_APPLICABLE";
  applicability_version: typeof PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1;
  product_profile_id: string | null;
  source_id: string;
  norm_id: string;
  source_document_version: string;
  source_url: string;
  exact_locator: string;
  source_definition_hash: string;
  consumed_parameter_ids: readonly string[];
  produced_parameter_ids: readonly [];
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
  blockers: readonly string[];
  deterministic_hash: string;
};

export type ProfessionalPhysicalNormApplicabilityResolutionV1 =
  | AppliedPhysicalNormResolutionV1
  | NonAppliedPhysicalNormResolutionV1;

export type AppliedProfessionalPhysicalNormResolutionV1 = AppliedPhysicalNormResolutionV1;

function primitiveString(value: ProfessionalParameterValueV4 | undefined): string | null {
  if (typeof value?.value !== "string") return null;
  const normalized = value.value.trim();
  return normalized.length > 0 ? normalized : null;
}

function explicitValue(
  values: Readonly<Record<string, ProfessionalParameterValueV4>>,
  parameterId: string,
): ProfessionalParameterValueV4 | null {
  const value = values[parameterId];
  if (!value || value.source_type === "VISIBLE_BASELINE_ASSUMPTION") return null;
  if (typeof value.value === "string" && value.value.trim().length === 0) return null;
  return value;
}

function finiteNumber(value: ProfessionalParameterValueV4 | null): number | null {
  if (!value) return null;
  const numeric = typeof value.value === "number"
    ? value.value
    : Number(String(value.value).replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function nonApplied(
  status: NonAppliedPhysicalNormResolutionV1["status"],
  productProfileId: string | null,
  parameterValues: Readonly<Record<string, ProfessionalParameterValueV4>>,
  blockers: readonly string[],
  consumedParameterIds: readonly string[] = [],
  sourceMetadata: {
    source_id: string;
    norm_id: string;
    source_document_version: string;
    source_url: string;
    exact_locator: string;
    definition_hash: string;
  } = UPONOR_UFH_150MM_SOURCE_METADATA,
): NonAppliedPhysicalNormResolutionV1 {
  const withoutHash = {
    status,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: sourceMetadata.source_id,
    norm_id: sourceMetadata.norm_id,
    source_document_version: sourceMetadata.source_document_version,
    source_url: sourceMetadata.source_url,
    exact_locator: sourceMetadata.exact_locator,
    source_definition_hash: sourceMetadata.definition_hash,
    consumed_parameter_ids: [...consumedParameterIds].sort(),
    produced_parameter_ids: [] as const,
    parameter_values: parameterValues,
    blockers: [...new Set(blockers)].sort(),
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveLindabVsr(
  productProfileId: typeof LINDAB_VSR_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
    parameterId,
    explicitValue(parameterValuesInput, parameterId),
  ]));
  const missing = LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS,
      LINDAB_VSR_SOURCE_METADATA,
    );
  }

  const routeLengthM = finiteNumber(explicit.route_length_m);
  const diameterMm = finiteNumber(explicit.duct_diameter_mm);
  const [minimumDiameterMm, maximumDiameterMm] = LINDAB_VSR_SOURCE_METADATA.available_diameter_range_mm;
  const invalidNumeric = [
    routeLengthM === null || routeLengthM <= 0 ? "PROJECT_VALUE_INVALID:route_length_m" : "",
    diameterMm === null || diameterMm < minimumDiameterMm || diameterMm > maximumDiameterMm
      ? `PHYSICAL_NORM_NOT_APPLICABLE:${LINDAB_VSR_NORM_ID}:duct_diameter_mm=${diameterMm}`
      : "",
  ].filter(Boolean);
  if (invalidNumeric.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      invalidNumeric,
      LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS,
      LINDAB_VSR_SOURCE_METADATA,
    );
  }
  if (explicit.cooled_supply_air_confirmed?.value !== true) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [`PHYSICAL_NORM_NOT_APPLICABLE:${LINDAB_VSR_NORM_ID}:cooled_supply_air_confirmed=false`],
      LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS,
      LINDAB_VSR_SOURCE_METADATA,
    );
  }

  const packageSize = lindabVsrNorm.rounding.package_size;
  const calculatedResourceQuantityM = Math.ceil(
    routeLengthM! * LINDAB_VSR_SOURCE_METADATA.rate_value / packageSize,
  ) * packageSize;
  const resourceUnitsPerOutput = LINDAB_VSR_SOURCE_METADATA.rate_value;
  const procurementFactor = calculatedResourceQuantityM / (routeLengthM! * resourceUnitsPerOutput);
  if (procurementFactor > 3) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [`PHYSICAL_NORM_RUNTIME_RANGE_EXCEEDED:procurement_factor=${procurementFactor}:maximum=3`],
      LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS,
      LINDAB_VSR_SOURCE_METADATA,
    );
  }
  const explicitUnitsPerOutput = finiteNumber(explicitValue(parameterValuesInput, "primary_resource_units_per_output"));
  const explicitProcurementFactor = finiteNumber(explicitValue(parameterValuesInput, "procurement_factor"));
  const conflicts = [
    explicitUnitsPerOutput !== null && Math.abs(explicitUnitsPerOutput - resourceUnitsPerOutput) > 1e-9
      ? `PHYSICAL_NORM_VALUE_CONFLICT:primary_resource_units_per_output=${explicitUnitsPerOutput}:norm_value=${resourceUnitsPerOutput}`
      : "",
    explicitProcurementFactor !== null && Math.abs(explicitProcurementFactor - procurementFactor) > 1e-9
      ? `PHYSICAL_NORM_VALUE_CONFLICT:procurement_factor=${explicitProcurementFactor}:norm_value=${procurementFactor}`
      : "",
  ].filter(Boolean);
  if (conflicts.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      conflicts,
      [...LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS, "primary_resource_units_per_output", "procurement_factor"],
      LINDAB_VSR_SOURCE_METADATA,
    );
  }

  const capturedAt = LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${LINDAB_VSR_PRODUCT_PROFILE_ID}`,
    `route_length_m=${routeLengthM}`,
    `duct_diameter_mm=${diameterMm}`,
    `cooled_supply_air_confirmed=true`,
    `nozzle_pattern=${primitiveString(explicit.nozzle_pattern!)}`,
    `air_distribution_design=${primitiveString(explicit.air_distribution_design!)}`,
    `fitting_schedule=${primitiveString(explicit.fitting_schedule!)}`,
    `formula=ceil(route_length_m*${resourceUnitsPerOutput}/${packageSize})*${packageSize}`,
    "bends_transitions_supports_seals_and_cutting_are_separate=true",
  ].join(";");
  const sourceManagedValue = (
    value: number,
    unitId: string,
  ): ProfessionalParameterValueV4 => ({
    value,
    unit_id: unitId,
    source_type: "APPLICABLE_NORM",
    source_id: LINDAB_VSR_SOURCE_ID,
    captured_at: capturedAt,
    confidence: "high",
    applicability,
  });
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    primary_resource_units_per_output: sourceManagedValue(resourceUnitsPerOutput, "ratio"),
    procurement_factor: sourceManagedValue(procurementFactor, "ratio"),
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: LINDAB_VSR_SOURCE_ID,
    norm_id: LINDAB_VSR_NORM_ID,
    source_document_version: LINDAB_VSR_SOURCE_METADATA.source_document_version,
    source_url: LINDAB_VSR_SOURCE_METADATA.source_url,
    exact_locator: LINDAB_VSR_SOURCE_METADATA.exact_locator,
    source_definition_hash: LINDAB_VSR_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["primary_resource_units_per_output", "procurement_factor"],
    calculated_resource_quantity_m: calculatedResourceQuantityM,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function resolveProfessionalPhysicalNormParameterValuesV1(input: {
  technology_class: string;
  operation_class: string;
  scope_mode: ProfessionalEstimateScopeModeV4;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const profileValue = explicitValue(input.parameter_values, "product_profile_id");
  const productProfileId = primitiveString(profileValue ?? undefined);
  if (productProfileId === LINDAB_VSR_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "DUCT_NETWORK" &&
      input.operation_class === "INSTALL" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveLindabVsr(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      LINDAB_VSR_SOURCE_METADATA,
    );
  }
  if (
    input.technology_class !== "WARM_FLOOR_SYSTEM" ||
    input.operation_class !== "INSTALL" ||
    input.scope_mode !== "FULL_APPLICABLE_SCOPE" ||
    productProfileId !== UPONOR_UFH_150MM_PRODUCT_PROFILE_ID
  ) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }

  const explicit = Object.fromEntries(REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
    parameterId,
    explicitValue(input.parameter_values, parameterId),
  ]));
  const missing = REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      missing,
      REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const areaM2 = finiteNumber(explicit.zone_area_m2);
  const spacingMm = finiteNumber(explicit.designed_pipe_spacing_mm);
  const feedTailM = finiteNumber(explicit.feed_tail_length_linear_m);
  const loopLimitM = finiteNumber(explicit.loop_length_limit);
  const circuitCount = finiteNumber(explicit.circuit_count);
  const manifoldOutletCount = finiteNumber(explicit.manifold_outlet_count);
  const longestCircuitM = finiteNumber(explicit.longest_circuit_length_m);
  const numericErrors = [
    ["zone_area_m2", areaM2, (value: number) => value > 0],
    ["designed_pipe_spacing_mm", spacingMm, (value: number) => value > 0],
    ["feed_tail_length_linear_m", feedTailM, (value: number) => value >= 0],
    ["loop_length_limit", loopLimitM, (value: number) => value > 0],
    ["circuit_count", circuitCount, (value: number) => Number.isInteger(value) && value > 0],
    ["manifold_outlet_count", manifoldOutletCount, (value: number) => Number.isInteger(value) && value > 0],
    ["longest_circuit_length_m", longestCircuitM, (value: number) => value > 0],
  ] as const;
  const invalidNumeric = numericErrors
    .filter(([, value, predicate]) => value === null || !predicate(value))
    .map(([parameterId]) => `PROJECT_VALUE_INVALID:${parameterId}`);
  if (invalidNumeric.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      invalidNumeric,
      REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  if (spacingMm !== UPONOR_UFH_150MM_SOURCE_METADATA.pipe_spacing_mm) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [`PHYSICAL_NORM_NOT_APPLICABLE:${UPONOR_UFH_150MM_NORM_ID}:designed_pipe_spacing_mm=${spacingMm}`],
      REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }
  if (longestCircuitM! > loopLimitM!) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [`PHYSICAL_NORM_LAYOUT_LIMIT_EXCEEDED:longest_circuit_length_m=${longestCircuitM}:loop_length_limit=${loopLimitM}`],
      REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }
  if (manifoldOutletCount! < circuitCount!) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [`PHYSICAL_NORM_MANIFOLD_OUTLETS_INSUFFICIENT:circuit_count=${circuitCount}:manifold_outlet_count=${manifoldOutletCount}`],
      REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const rawPipeLengthM = areaM2! * UPONOR_UFH_150MM_SOURCE_METADATA.rate_value + feedTailM!;
  const packageSize = uponorNorm.rounding.package_size;
  const calculatedPipeLengthM = Math.ceil(rawPipeLengthM / packageSize) * packageSize;
  const explicitCircuitLengthM = finiteNumber(explicitValue(input.parameter_values, "circuit_length_m"));
  if (explicitCircuitLengthM !== null && explicitCircuitLengthM !== calculatedPipeLengthM) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [`PHYSICAL_NORM_VALUE_CONFLICT:circuit_length_m=${explicitCircuitLengthM}:calculated_pipe_length_m=${calculatedPipeLengthM}`],
      [...REQUIRED_EXPLICIT_PARAMETER_IDS, "circuit_length_m"],
    );
  }
  const capturedAt = REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const parameterValues = Object.freeze({
    ...input.parameter_values,
    circuit_length_m: {
      value: calculatedPipeLengthM,
      unit_id: "m",
      source_type: "APPLICABLE_NORM",
      source_id: UPONOR_UFH_150MM_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high",
      applicability: [
        `product_profile_id=${UPONOR_UFH_150MM_PRODUCT_PROFILE_ID}`,
        `designed_pipe_spacing_mm=${spacingMm}`,
        `zone_area_m2=${areaM2}`,
        `feed_tail_length_linear_m=${feedTailM}`,
        `loop_length_limit=${loopLimitM}`,
        `hydraulic_loop_design_reference=${primitiveString(explicit.hydraulic_loop_design_reference!)}`,
        `manifold_location=${primitiveString(explicit.manifold_location!)}`,
        `formula=ceil((zone_area_m2*${UPONOR_UFH_150MM_SOURCE_METADATA.rate_value}+feed_tail_length_linear_m)/${packageSize})*${packageSize}`,
      ].join(";"),
    } satisfies ProfessionalParameterValueV4,
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: UPONOR_UFH_150MM_PRODUCT_PROFILE_ID,
    source_id: UPONOR_UFH_150MM_SOURCE_ID,
    norm_id: UPONOR_UFH_150MM_NORM_ID,
    source_document_version: UPONOR_UFH_150MM_SOURCE_METADATA.source_document_version,
    source_url: UPONOR_UFH_150MM_SOURCE_METADATA.source_url,
    exact_locator: UPONOR_UFH_150MM_SOURCE_METADATA.exact_locator,
    source_definition_hash: UPONOR_UFH_150MM_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["circuit_length_m"] as const,
    calculated_pipe_length_m: calculatedPipeLengthM,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
