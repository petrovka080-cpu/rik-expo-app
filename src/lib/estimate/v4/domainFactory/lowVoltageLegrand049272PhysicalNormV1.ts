import lowVoltageNormPack from "../../../../../data/estimate-norms/professional/low_voltage.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const APPLICABILITY_VERSION = "professional-physical-norm-applicability:v1" as const;

export const LEGRAND_049272_BUS_SCS_PRODUCT_PROFILE_ID =
  "manufacturer-profile:legrand-049272:bus-scs-nurse-call:v1" as const;
export const LEGRAND_049272_BUS_SCS_NORM_ID =
  "low_voltage_legrand_049272_cable_linear_m_route_v1" as const;
export const LEGRAND_049272_BUS_SCS_SOURCE_ID =
  `src_professional_norm_pack_${LEGRAND_049272_BUS_SCS_NORM_ID}` as const;

export const LEGRAND_049272_BUS_SCS_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "approved_route_length_linear_m",
  "circuit_count_and_point_to_point_schedule",
  "bus_scs_system_compatibility_confirmed",
  "exact_cable_product_reference",
  "routing_environment",
  "power_cable_segregation_confirmed",
  "device_and_panel_termination_allowance_m",
  "service_loop_allowance_m",
  "vertical_drop_and_riser_allowance_m",
  "reusable_reel_remnant_plan",
  "fire_class_requirement",
  "selected_reel_length_m",
  "project_cutting_allowance_percent",
  "installed_circuit_test_and_certification_scope",
] as const);

const legrand049272Norm = (() => {
  const found = lowVoltageNormPack.norm_items.find(
    (item) => item.norm_id === LEGRAND_049272_BUS_SCS_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${LEGRAND_049272_BUS_SCS_NORM_ID}`);
  }
  return found;
})();

if (
  lowVoltageNormPack.work_group !== "low_voltage" ||
  lowVoltageNormPack.review_status !== "reviewed" ||
  legrand049272Norm.unit !== "linear_m" ||
  legrand049272Norm.rate.value !== 1 ||
  legrand049272Norm.rate.unit !== "geometric cable linear m/approved BUS-SCS circuit route linear m before terminations, service loops, drops and reel cut plan; not a published consumption norm" ||
  legrand049272Norm.applicability.manufacturer_reference !== "Legrand 049272" ||
  legrand049272Norm.applicability.ean !== "3414971327986" ||
  legrand049272Norm.applicability.system !== "BUS-SCS" ||
  legrand049272Norm.applicability.manufacturer_catalogue_context !== "nurse_call_system_accessory" ||
  legrand049272Norm.applicability.conductor_cross_section_mm2 !== 0.56 ||
  legrand049272Norm.applicability.cores !== 2 ||
  legrand049272Norm.applicability.manufacturer_delivery_reel_m !== 200 ||
  legrand049272Norm.applicability.reaction_to_fire_class !== "Cca-s1b,d1,a1" ||
  legrand049272Norm.applicability.power_circuit_above_50_v_coinstallation_forbidden !== true ||
  legrand049272Norm.applicability.underground_suitability_requires_current_project_confirmation_due_source_revision_conflict !== true ||
  legrand049272Norm.applicability.rate_is_geometric_identity_not_manufacturer_consumption_norm !== true ||
  legrand049272Norm.applicability.additional_waste_not_published !== true ||
  legrand049272Norm.parameters.length !== LEGRAND_049272_BUS_SCS_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  LEGRAND_049272_BUS_SCS_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !legrand049272Norm.parameters.includes(parameterId),
  ) ||
  legrand049272Norm.waste_percent_default !== 0 ||
  legrand049272Norm.rounding.package_size !== 200 ||
  legrand049272Norm.rounding.mode !== "aggregate_approved_bus_scs_circuits_before_explicit_reel_cut_plan"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${LEGRAND_049272_BUS_SCS_NORM_ID}`);
}

export const LEGRAND_049272_BUS_SCS_SOURCE_METADATA = Object.freeze({
  source_id: LEGRAND_049272_BUS_SCS_SOURCE_ID,
  norm_id: LEGRAND_049272_BUS_SCS_NORM_ID,
  source_document_version: lowVoltageNormPack.source_pack_version,
  source_title: legrand049272Norm.source.title,
  source_url: legrand049272Norm.source.url,
  exact_locator: legrand049272Norm.source.page,
  rate_value: legrand049272Norm.rate.value,
  rate_unit: legrand049272Norm.rate.unit,
  manufacturer_reference: legrand049272Norm.applicability.manufacturer_reference,
  ean: legrand049272Norm.applicability.ean,
  system: legrand049272Norm.applicability.system,
  manufacturer_catalogue_context: legrand049272Norm.applicability.manufacturer_catalogue_context,
  conductor_cross_section_mm2: legrand049272Norm.applicability.conductor_cross_section_mm2,
  cores: legrand049272Norm.applicability.cores,
  manufacturer_delivery_reel_m: legrand049272Norm.applicability.manufacturer_delivery_reel_m,
  reaction_to_fire_class: legrand049272Norm.applicability.reaction_to_fire_class,
  definition_hash: estimateDeterministicHash({
    work_group: lowVoltageNormPack.work_group,
    source_pack_version: lowVoltageNormPack.source_pack_version,
    norm_item: legrand049272Norm,
  }),
});

export const LEGRAND_049272_BUS_SCS_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: LEGRAND_049272_BUS_SCS_NORM_ID,
  work_group: "low_voltage",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "LOW_VOLTAGE_BUS_SCS",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: LEGRAND_049272_BUS_SCS_PRODUCT_PROFILE_ID,
  source_id: LEGRAND_049272_BUS_SCS_SOURCE_ID,
  source_document_version: LEGRAND_049272_BUS_SCS_SOURCE_METADATA.source_document_version,
  source_definition_hash: LEGRAND_049272_BUS_SCS_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: LEGRAND_049272_BUS_SCS_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["legrand_049272_design_cable_quantity_linear_m"] as const,
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
  return value.value.trim() || null;
}

function finiteNumber(value: ProfessionalParameterValueV4 | null): number | null {
  if (!value) return null;
  const numeric = typeof value.value === "number"
    ? value.value
    : Number(String(value.value).replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function explicitBoolean(value: ProfessionalParameterValueV4 | null): boolean | null {
  if (typeof value?.value === "boolean") return value.value;
  const normalized = primitiveString(value)?.toUpperCase();
  if (normalized === "TRUE" || normalized === "CONFIRMED") return true;
  if (normalized === "FALSE" || normalized === "NOT_CONFIRMED") return false;
  return null;
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
    source_id: LEGRAND_049272_BUS_SCS_SOURCE_ID,
    norm_id: LEGRAND_049272_BUS_SCS_NORM_ID,
    source_document_version: LEGRAND_049272_BUS_SCS_SOURCE_METADATA.source_document_version,
    source_url: LEGRAND_049272_BUS_SCS_SOURCE_METADATA.source_url,
    exact_locator: LEGRAND_049272_BUS_SCS_SOURCE_METADATA.exact_locator,
    source_definition_hash: LEGRAND_049272_BUS_SCS_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...consumedParameterIds].sort(),
    produced_parameter_ids: [] as const,
    parameter_values: parameterValues,
    blockers: [...new Set(blockers)].sort(),
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function resolveLegrand049272BusScsPhysicalNormV1(input: {
  technology_class: string;
  operation_class: string;
  material_system?: string;
  scope_mode: string;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const productProfileId = primitiveString(explicitValue(input.parameter_values, "product_profile_id"));
  if (productProfileId !== LEGRAND_049272_BUS_SCS_PRODUCT_PROFILE_ID) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }
  if (
    input.technology_class !== "LOW_VOLTAGE_BUS_SCS" ||
    input.operation_class !== "INSTALL" ||
    input.material_system !== "LEGRAND_049272_BUS_SCS_CABLE" ||
    input.scope_mode !== "FULL_APPLICABLE_SCOPE"
  ) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }

  const explicit = Object.fromEntries(LEGRAND_049272_BUS_SCS_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(input.parameter_values, parameterId)],
  ));
  const missing = LEGRAND_049272_BUS_SCS_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      missing,
      LEGRAND_049272_BUS_SCS_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const approvedRouteLengthM = finiteNumber(explicit.approved_route_length_linear_m);
  const circuitSchedule = primitiveString(explicit.circuit_count_and_point_to_point_schedule);
  const compatibilityConfirmed = explicitBoolean(explicit.bus_scs_system_compatibility_confirmed);
  const productReference = primitiveString(explicit.exact_cable_product_reference)?.toUpperCase();
  const routingEnvironment = primitiveString(explicit.routing_environment)?.toUpperCase();
  const segregationConfirmed = explicitBoolean(explicit.power_cable_segregation_confirmed);
  const terminationAllowanceM = finiteNumber(explicit.device_and_panel_termination_allowance_m);
  const serviceLoopAllowanceM = finiteNumber(explicit.service_loop_allowance_m);
  const verticalAllowanceM = finiteNumber(explicit.vertical_drop_and_riser_allowance_m);
  const remnantPlan = primitiveString(explicit.reusable_reel_remnant_plan);
  const fireClass = primitiveString(explicit.fire_class_requirement)?.replace(/\s+/g, "").toUpperCase();
  const selectedReelLengthM = finiteNumber(explicit.selected_reel_length_m);
  const cuttingAllowancePercent = finiteNumber(explicit.project_cutting_allowance_percent);
  const testingScope = primitiveString(explicit.installed_circuit_test_and_certification_scope);
  const nonNegative = (value: number | null) => value !== null && value >= 0;
  const blockers = [
    approvedRouteLengthM !== null && approvedRouteLengthM > 0
      ? ""
      : "PROJECT_VALUE_INVALID:approved_route_length_linear_m",
    circuitSchedule ? "" : "PROJECT_VALUE_INVALID:circuit_count_and_point_to_point_schedule",
    compatibilityConfirmed === true ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:bus_scs_system_compatibility_confirmed",
    productReference === "LEGRAND 049272/EAN3414971327986"
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:exact_cable_product_reference=${productReference}`,
    routingEnvironment === "INDOOR_ABOVE_GROUND"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:routing_environment=${routingEnvironment}`,
    segregationConfirmed === true ? "" : "SAFETY_SCOPE_REQUIRED:power_cable_segregation_confirmed",
    nonNegative(terminationAllowanceM) ? "" : "PROJECT_VALUE_INVALID:device_and_panel_termination_allowance_m",
    nonNegative(serviceLoopAllowanceM) ? "" : "PROJECT_VALUE_INVALID:service_loop_allowance_m",
    nonNegative(verticalAllowanceM) ? "" : "PROJECT_VALUE_INVALID:vertical_drop_and_riser_allowance_m",
    remnantPlan ? "" : "PROJECT_VALUE_INVALID:reusable_reel_remnant_plan",
    fireClass === "CCA-S1B,D1,A1"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:fire_class_requirement=${fireClass}`,
    selectedReelLengthM === 200
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_reel_length_m=${selectedReelLengthM}`,
    cuttingAllowancePercent !== null && cuttingAllowancePercent >= 0 && cuttingAllowancePercent < 100
      ? ""
      : "PROJECT_VALUE_INVALID:project_cutting_allowance_percent",
    testingScope ? "" : "PROJECT_VALUE_INVALID:installed_circuit_test_and_certification_scope",
  ].filter(Boolean);
  if (blockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      blockers,
      LEGRAND_049272_BUS_SCS_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const exactDesignCableQuantityLinearM = Number((
    (approvedRouteLengthM! + terminationAllowanceM! + serviceLoopAllowanceM! + verticalAllowanceM!) *
    (1 + cuttingAllowancePercent! / 100)
  ).toFixed(9));
  const explicitOutput = finiteNumber(explicitValue(
    input.parameter_values,
    "legrand_049272_design_cable_quantity_linear_m",
  ));
  if (explicitOutput !== null && Math.abs(explicitOutput - exactDesignCableQuantityLinearM) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:legrand_049272_design_cable_quantity_linear_m=${explicitOutput}:norm_value=${exactDesignCableQuantityLinearM}`,
      ],
      [...LEGRAND_049272_BUS_SCS_REQUIRED_EXPLICIT_PARAMETER_IDS, "legrand_049272_design_cable_quantity_linear_m"],
    );
  }

  const capturedAt = LEGRAND_049272_BUS_SCS_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${productProfileId}`,
    `approved_route_length_linear_m=${approvedRouteLengthM}`,
    `circuit_count_and_point_to_point_schedule=${circuitSchedule}`,
    `exact_cable_product_reference=${productReference}`,
    `routing_environment=${routingEnvironment}`,
    `device_and_panel_termination_allowance_m=${terminationAllowanceM}`,
    `service_loop_allowance_m=${serviceLoopAllowanceM}`,
    `vertical_drop_and_riser_allowance_m=${verticalAllowanceM}`,
    `reusable_reel_remnant_plan=${remnantPlan}`,
    `fire_class_requirement=${fireClass}`,
    `selected_reel_length_m=${selectedReelLengthM}`,
    `project_cutting_allowance_percent=${cuttingAllowancePercent}`,
    `installed_circuit_test_and_certification_scope=${testingScope}`,
    `legrand_049272_design_cable_quantity_linear_m=${exactDesignCableQuantityLinearM}`,
    "formula=(approved_route_length_linear_m+device_and_panel_termination_allowance_m+service_loop_allowance_m+vertical_drop_and_riser_allowance_m)*(1+project_cutting_allowance_percent/100)",
    "reel_rounding=false",
    "generic_utp_substitution=false",
    "automatic_generic_binding=false",
  ].join(";");
  const parameterValues = Object.freeze({
    ...input.parameter_values,
    legrand_049272_design_cable_quantity_linear_m: {
      value: exactDesignCableQuantityLinearM,
      unit_id: "linear_m",
      source_type: "APPLICABLE_NORM" as const,
      source_id: LEGRAND_049272_BUS_SCS_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: APPLICABILITY_VERSION,
    product_profile_id: productProfileId,
    source_id: LEGRAND_049272_BUS_SCS_SOURCE_ID,
    norm_id: LEGRAND_049272_BUS_SCS_NORM_ID,
    source_document_version: LEGRAND_049272_BUS_SCS_SOURCE_METADATA.source_document_version,
    source_url: LEGRAND_049272_BUS_SCS_SOURCE_METADATA.source_url,
    exact_locator: LEGRAND_049272_BUS_SCS_SOURCE_METADATA.exact_locator,
    source_definition_hash: LEGRAND_049272_BUS_SCS_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...LEGRAND_049272_BUS_SCS_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["legrand_049272_design_cable_quantity_linear_m"] as const,
    calculated_legrand_049272_design_cable_quantity_linear_m: exactDesignCableQuantityLinearM,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
