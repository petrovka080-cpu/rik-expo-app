import deliveryNormPack from "../../../../../data/estimate-norms/professional/delivery.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const APPLICABILITY_VERSION = "professional-physical-norm-applicability:v1" as const;
export const FORD_TRANSIT_V363_DELIVERY_PRODUCT_PROFILE_ID =
  "manufacturer-profile:ford-transit-v363:500-l4-h3:selected-derivative:v1" as const;
export const FORD_TRANSIT_V363_DELIVERY_NORM_ID =
  "delivery_ford_transit_v363_max_payload_trip_per_kg_v1" as const;
export const FORD_TRANSIT_V363_DELIVERY_SOURCE_ID =
  `src_professional_norm_pack_${FORD_TRANSIT_V363_DELIVERY_NORM_ID}` as const;

export const FORD_TRANSIT_V363_DELIVERY_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "cargo_weight_kg", "cargo_volume_m3", "selected_vehicle_model_and_derivative",
  "selected_verified_usable_payload_kg", "selected_verified_usable_loadspace_m3",
  "selected_verified_kerb_mass_kg", "driver_crew_options_and_accessories_weight_kg",
  "payload_margin_for_error_kg", "axle_load_limits_confirmed",
  "load_securing_and_compatibility_confirmed", "route_and_access_confirmed",
  "supplier_billing_scope",
] as const);

const deliveryNorm = (() => {
  const found = deliveryNormPack.norm_items.find(
    (item) => item.norm_id === FORD_TRANSIT_V363_DELIVERY_NORM_ID,
  );
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${FORD_TRANSIT_V363_DELIVERY_NORM_ID}`);
  return found;
})();

if (
  deliveryNormPack.work_group !== "delivery" || deliveryNormPack.review_status !== "reviewed" ||
  deliveryNorm.unit !== "trip" || deliveryNorm.rate.value !== 0.0004242681 ||
  deliveryNorm.applicability.vehicle_family !== "Ford Transit V363 van" ||
  deliveryNorm.applicability.manufacturer_headline_payload_kg !== 2357 ||
  deliveryNorm.applicability.manufacturer_headline_max_loadspace_m3 !== 15.1 ||
  deliveryNorm.applicability.selected_vehicle_derivative_payload_and_volume_required !== true ||
  deliveryNorm.applicability.headline_values_must_not_be_applied_to_an_arbitrary_transit_variant !== true ||
  deliveryNorm.applicability.driver_crew_options_and_accessories_reduce_usable_payload !== true ||
  deliveryNorm.applicability.axle_limits_and_actual_vehicle_legal_compliance_required !== true ||
  deliveryNorm.applicability.route_access_and_load_compatibility_required !== true ||
  deliveryNorm.applicability.reference_rate_not_for_automatic_production_binding !== true ||
  deliveryNorm.parameters.length !== FORD_TRANSIT_V363_DELIVERY_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  FORD_TRANSIT_V363_DELIVERY_REQUIRED_EXPLICIT_PARAMETER_IDS.some((id) => !deliveryNorm.parameters.includes(id)) ||
  deliveryNorm.waste_percent_default !== 0 || deliveryNorm.rounding.package_size !== 1 ||
  deliveryNorm.rounding.mode !== "ceil_after_selected_payload_and_volume_constraints"
) throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${FORD_TRANSIT_V363_DELIVERY_NORM_ID}`);

export const FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA = Object.freeze({
  source_id: FORD_TRANSIT_V363_DELIVERY_SOURCE_ID,
  norm_id: FORD_TRANSIT_V363_DELIVERY_NORM_ID,
  source_document_version: deliveryNormPack.source_pack_version,
  source_title: deliveryNorm.source.title,
  source_url: deliveryNorm.source.url,
  exact_locator: deliveryNorm.source.page,
  rate_value: deliveryNorm.rate.value,
  rate_unit: deliveryNorm.rate.unit,
  calculation: deliveryNorm.applicability.calculation,
  definition_hash: estimateDeterministicHash({
    work_group: deliveryNormPack.work_group,
    source_pack_version: deliveryNormPack.source_pack_version,
    norm_item: deliveryNorm,
  }),
});

export const FORD_TRANSIT_V363_DELIVERY_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: FORD_TRANSIT_V363_DELIVERY_NORM_ID,
  work_group: "delivery",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "MATERIAL_DELIVERY",
  operation_class: "TRANSPORT",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: FORD_TRANSIT_V363_DELIVERY_PRODUCT_PROFILE_ID,
  source_id: FORD_TRANSIT_V363_DELIVERY_SOURCE_ID,
  source_document_version: FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA.source_document_version,
  source_definition_hash: FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: FORD_TRANSIT_V363_DELIVERY_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["ford_transit_required_trip_count"] as const,
});

function explicitValue(values: Readonly<Record<string, ProfessionalParameterValueV4>>, id: string) {
  const value = values[id];
  if (!value || value.source_type === "VISIBLE_BASELINE_ASSUMPTION") return null;
  if (typeof value.value === "string" && value.value.trim().length === 0) return null;
  return value;
}
function primitiveString(value: ProfessionalParameterValueV4 | null): string | null {
  return typeof value?.value === "string" ? value.value.trim() || null : null;
}
function finiteNumber(value: ProfessionalParameterValueV4 | null): number | null {
  if (!value) return null;
  const numeric = typeof value.value === "number" ? value.value : Number(String(value.value).replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}
function booleanValue(value: ProfessionalParameterValueV4 | null): boolean | null {
  return typeof value?.value === "boolean" ? value.value : null;
}
function nonApplied(
  status: "NOT_REQUESTED" | "BLOCKED_REQUIRED_INPUTS" | "BLOCKED_NOT_APPLICABLE",
  profile: string | null,
  values: Readonly<Record<string, ProfessionalParameterValueV4>>,
  blockers: readonly string[],
  consumed: readonly string[] = [],
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const withoutHash = {
    status, applicability_version: APPLICABILITY_VERSION, product_profile_id: profile,
    source_id: FORD_TRANSIT_V363_DELIVERY_SOURCE_ID, norm_id: FORD_TRANSIT_V363_DELIVERY_NORM_ID,
    source_document_version: FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA.source_document_version,
    source_url: FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA.source_url,
    exact_locator: FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA.exact_locator,
    source_definition_hash: FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...consumed].sort(), produced_parameter_ids: [] as const,
    parameter_values: values, blockers: [...new Set(blockers)].sort(),
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function resolveFordTransitV363DeliveryPhysicalNormV1(input: {
  technology_class: string; operation_class: string; material_system?: string; scope_mode: string;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const profile = primitiveString(explicitValue(input.parameter_values, "product_profile_id"));
  if (profile !== FORD_TRANSIT_V363_DELIVERY_PRODUCT_PROFILE_ID) return nonApplied("NOT_REQUESTED", profile, input.parameter_values, []);
  if (input.technology_class !== "MATERIAL_DELIVERY" || input.operation_class !== "TRANSPORT" ||
    input.material_system !== "FORD_TRANSIT_V363_500_L4_H3" || input.scope_mode !== "FULL_APPLICABLE_SCOPE") {
    return nonApplied("NOT_REQUESTED", profile, input.parameter_values, []);
  }
  const explicit = Object.fromEntries(FORD_TRANSIT_V363_DELIVERY_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (id) => [id, explicitValue(input.parameter_values, id)],
  ));
  const missing = FORD_TRANSIT_V363_DELIVERY_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((id) => explicit[id] === null).map((id) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${id}`);
  if (missing.length) return nonApplied("BLOCKED_REQUIRED_INPUTS", profile, input.parameter_values, missing, FORD_TRANSIT_V363_DELIVERY_REQUIRED_EXPLICIT_PARAMETER_IDS);

  const cargoKg = finiteNumber(explicit.cargo_weight_kg);
  const cargoM3 = finiteNumber(explicit.cargo_volume_m3);
  const model = primitiveString(explicit.selected_vehicle_model_and_derivative)?.toUpperCase();
  const payloadKg = finiteNumber(explicit.selected_verified_usable_payload_kg);
  const loadspaceM3 = finiteNumber(explicit.selected_verified_usable_loadspace_m3);
  const kerbKg = finiteNumber(explicit.selected_verified_kerb_mass_kg);
  const occupantsOptionsKg = finiteNumber(explicit.driver_crew_options_and_accessories_weight_kg);
  const marginKg = finiteNumber(explicit.payload_margin_for_error_kg);
  const axleConfirmed = booleanValue(explicit.axle_load_limits_confirmed);
  const securingConfirmed = booleanValue(explicit.load_securing_and_compatibility_confirmed);
  const routeConfirmed = booleanValue(explicit.route_and_access_confirmed);
  const billingScope = primitiveString(explicit.supplier_billing_scope);
  const expectedMarginKg = kerbKg === null ? null : Math.round(kerbKg * 0.05 * 1000) / 1000;
  const effectivePayloadKg = payloadKg === null || occupantsOptionsKg === null || marginKg === null
    ? null : payloadKg - occupantsOptionsKg - marginKg;
  const blockers = [
    cargoKg !== null && cargoKg > 0 ? "" : "PROJECT_VALUE_INVALID:cargo_weight_kg",
    cargoM3 !== null && cargoM3 > 0 ? "" : "PROJECT_VALUE_INVALID:cargo_volume_m3",
    model === "FORD_TRANSIT_V363_500_L4_H3" ? "" : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_vehicle_model_and_derivative=${model}`,
    payloadKg !== null && payloadKg >= 2357 && payloadKg <= 2412 ? "" : "PROJECT_VALUE_INVALID:selected_verified_usable_payload_kg",
    loadspaceM3 !== null && loadspaceM3 > 0 && loadspaceM3 <= 15.1 ? "" : "PROJECT_VALUE_INVALID:selected_verified_usable_loadspace_m3",
    kerbKg !== null && kerbKg > 0 ? "" : "PROJECT_VALUE_INVALID:selected_verified_kerb_mass_kg",
    occupantsOptionsKg !== null && occupantsOptionsKg >= 0 ? "" : "PROJECT_VALUE_INVALID:driver_crew_options_and_accessories_weight_kg",
    marginKg !== null && expectedMarginKg !== null && Math.abs(marginKg - expectedMarginKg) <= 0.001 ? "" : "PROJECT_VALUE_INVALID:payload_margin_for_error_kg",
    effectivePayloadKg !== null && effectivePayloadKg > 0 ? "" : "PROJECT_VALUE_INVALID:effective_usable_payload_kg",
    axleConfirmed === true ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:axle_load_limits_confirmed",
    securingConfirmed === true ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:load_securing_and_compatibility_confirmed",
    routeConfirmed === true ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:route_and_access_confirmed",
    billingScope?.startsWith("SUPPLIER_SCOPE:") ? "" : "PROJECT_VALUE_INVALID:supplier_billing_scope",
  ].filter(Boolean);
  if (blockers.length) return nonApplied("BLOCKED_NOT_APPLICABLE", profile, input.parameter_values, blockers, FORD_TRANSIT_V363_DELIVERY_REQUIRED_EXPLICIT_PARAMETER_IDS);

  const weightTrips = Math.ceil(cargoKg! / effectivePayloadKg!);
  const volumeTrips = Math.ceil(cargoM3! / loadspaceM3!);
  const trips = Math.max(weightTrips, volumeTrips);
  const output = finiteNumber(explicitValue(input.parameter_values, "ford_transit_required_trip_count"));
  if (output !== null && output !== trips) return nonApplied("BLOCKED_NOT_APPLICABLE", profile, input.parameter_values,
    [`PHYSICAL_NORM_VALUE_CONFLICT:ford_transit_required_trip_count=${output}:norm_value=${trips}`],
    [...FORD_TRANSIT_V363_DELIVERY_REQUIRED_EXPLICIT_PARAMETER_IDS, "ford_transit_required_trip_count"]);
  const capturedAt = FORD_TRANSIT_V363_DELIVERY_REQUIRED_EXPLICIT_PARAMETER_IDS.map((id) => explicit[id]!.captured_at).sort().at(-1)!;
  const applicability = [
    `product_profile_id=${profile}`, `cargo_weight_kg=${cargoKg}`, `cargo_volume_m3=${cargoM3}`,
    `selected_verified_usable_payload_kg=${payloadKg}`, `driver_crew_options_and_accessories_weight_kg=${occupantsOptionsKg}`,
    `payload_margin_for_error_kg=${marginKg}`, `effective_usable_payload_kg=${effectivePayloadKg}`,
    `selected_verified_usable_loadspace_m3=${loadspaceM3}`, `weight_trip_count=${weightTrips}`,
    `volume_trip_count=${volumeTrips}`, `ford_transit_required_trip_count=${trips}`,
    "formula=ceil(max(cargo/effective_payload,cargo_volume/selected_loadspace))",
    "headline_payload_as_universal_rate=false", "supplier_billing_price_separate=true", "automatic_generic_binding=false",
  ].join(";");
  const parameterValues = Object.freeze({ ...input.parameter_values, ford_transit_required_trip_count: {
    value: trips, unit_id: "trip", source_type: "APPLICABLE_NORM" as const,
    source_id: FORD_TRANSIT_V363_DELIVERY_SOURCE_ID, captured_at: capturedAt,
    confidence: "high" as const, applicability,
  }});
  const withoutHash = {
    status: "APPLIED" as const, applicability_version: APPLICABILITY_VERSION, product_profile_id: profile,
    source_id: FORD_TRANSIT_V363_DELIVERY_SOURCE_ID, norm_id: FORD_TRANSIT_V363_DELIVERY_NORM_ID,
    source_document_version: FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA.source_document_version,
    source_url: FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA.source_url,
    exact_locator: FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA.exact_locator,
    source_definition_hash: FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...FORD_TRANSIT_V363_DELIVERY_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["ford_transit_required_trip_count"] as const,
    calculated_ford_transit_required_trip_count: trips,
    parameter_values: parameterValues, blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
