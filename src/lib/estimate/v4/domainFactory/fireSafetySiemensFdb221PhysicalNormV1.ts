import fireSafetyNormPack from "../../../../../data/estimate-norms/professional/fire_safety.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const APPLICABILITY_VERSION = "professional-physical-norm-applicability:v1" as const;

export const SIEMENS_SINTESO_FDB221_PRODUCT_PROFILE_ID =
  "manufacturer-profile:siemens-sinteso-fdb221:a5q00001664:v1" as const;
export const SIEMENS_SINTESO_FDB221_NORM_ID =
  "fire_safety_siemens_sinteso_base_piece_per_detector_point_v1" as const;
export const SIEMENS_SINTESO_FDB221_SOURCE_ID =
  `src_professional_norm_pack_${SIEMENS_SINTESO_FDB221_NORM_ID}` as const;

export const SIEMENS_SINTESO_FDB221_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "designed_detector_point_count",
  "approved_fire_alarm_design_and_code_basis",
  "selected_detector_product_number",
  "selected_base_reference",
  "detector_base_compatibility_document_revision",
  "installation_environment",
  "surface_or_recessed_supply_method",
  "surface_cable_diameter_mm",
  "conductor_cross_section_mm2",
  "humid_or_wet_base_attachment_scope",
  "auxiliary_terminal_scope",
  "detector_heating_scope",
  "locking_and_designation_plate_scope",
  "project_spare_quantity",
  "commissioning_and_acceptance_scope",
] as const);

const fdb221Norm = (() => {
  const found = fireSafetyNormPack.norm_items.find(
    (item) => item.norm_id === SIEMENS_SINTESO_FDB221_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${SIEMENS_SINTESO_FDB221_NORM_ID}`);
  }
  return found;
})();

if (
  fireSafetyNormPack.work_group !== "fire_safety" ||
  fireSafetyNormPack.review_status !== "reviewed" ||
  fdb221Norm.unit !== "piece" ||
  fdb221Norm.rate.value !== 1 ||
  fdb221Norm.rate.unit !== "FDB221 addressable detector base/approved compatible detector point" ||
  fdb221Norm.applicability.manufacturer !== "Siemens" ||
  fdb221Norm.applicability.system_family !== "Sinteso" ||
  fdb221Norm.applicability.order_number !== "A5Q00001664" ||
  fdb221Norm.applicability.product_number !== "FDB221" ||
  fdb221Norm.applicability.product_type !== "addressable_detector_base" ||
  fdb221Norm.applicability.maximum_surface_supply_cable_diameter_mm !== 6 ||
  fdb221Norm.applicability.connection_cable_capacity_mm2[0] !== 0.2 ||
  fdb221Norm.applicability.connection_cable_capacity_mm2[1] !== 1.5 ||
  fdb221Norm.applicability.package_quantity_piece !== 1 ||
  fdb221Norm.applicability.exact_detector_compatibility_confirmation_required !== true ||
  fdb221Norm.applicability.approved_fire_design_and_local_code_point_count_required !== true ||
  fdb221Norm.applicability.automatic_area_based_detector_count_forbidden !== true ||
  fdb221Norm.applicability.project_spares_must_be_explicit !== true ||
  fdb221Norm.parameters.length !== SIEMENS_SINTESO_FDB221_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  SIEMENS_SINTESO_FDB221_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !fdb221Norm.parameters.includes(parameterId),
  ) ||
  fdb221Norm.waste_percent_default !== 0 ||
  fdb221Norm.rounding.package_size !== 1 ||
  fdb221Norm.rounding.mode !== "exact_approved_compatible_point_count_plus_explicit_project_spares"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${SIEMENS_SINTESO_FDB221_NORM_ID}`);
}

export const SIEMENS_SINTESO_FDB221_SOURCE_METADATA = Object.freeze({
  source_id: SIEMENS_SINTESO_FDB221_SOURCE_ID,
  norm_id: SIEMENS_SINTESO_FDB221_NORM_ID,
  source_document_version: fireSafetyNormPack.source_pack_version,
  source_title: fdb221Norm.source.title,
  source_url: fdb221Norm.source.url,
  exact_locator: fdb221Norm.source.page,
  rate_value: fdb221Norm.rate.value,
  rate_unit: fdb221Norm.rate.unit,
  manufacturer: fdb221Norm.applicability.manufacturer,
  system_family: fdb221Norm.applicability.system_family,
  order_number: fdb221Norm.applicability.order_number,
  product_number: fdb221Norm.applicability.product_number,
  product_type: fdb221Norm.applicability.product_type,
  maximum_surface_supply_cable_diameter_mm:
    fdb221Norm.applicability.maximum_surface_supply_cable_diameter_mm,
  connection_cable_capacity_mm2: fdb221Norm.applicability.connection_cable_capacity_mm2,
  package_quantity_piece: fdb221Norm.applicability.package_quantity_piece,
  definition_hash: estimateDeterministicHash({
    work_group: fireSafetyNormPack.work_group,
    source_pack_version: fireSafetyNormPack.source_pack_version,
    norm_item: fdb221Norm,
  }),
});

export const SIEMENS_SINTESO_FDB221_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: SIEMENS_SINTESO_FDB221_NORM_ID,
  work_group: "fire_safety",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "FIRE_ALARM_DETECTION",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: SIEMENS_SINTESO_FDB221_PRODUCT_PROFILE_ID,
  source_id: SIEMENS_SINTESO_FDB221_SOURCE_ID,
  source_document_version: SIEMENS_SINTESO_FDB221_SOURCE_METADATA.source_document_version,
  source_definition_hash: SIEMENS_SINTESO_FDB221_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: SIEMENS_SINTESO_FDB221_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["siemens_fdb221_base_quantity_piece"] as const,
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
    source_id: SIEMENS_SINTESO_FDB221_SOURCE_ID,
    norm_id: SIEMENS_SINTESO_FDB221_NORM_ID,
    source_document_version: SIEMENS_SINTESO_FDB221_SOURCE_METADATA.source_document_version,
    source_url: SIEMENS_SINTESO_FDB221_SOURCE_METADATA.source_url,
    exact_locator: SIEMENS_SINTESO_FDB221_SOURCE_METADATA.exact_locator,
    source_definition_hash: SIEMENS_SINTESO_FDB221_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...consumedParameterIds].sort(),
    produced_parameter_ids: [] as const,
    parameter_values: parameterValues,
    blockers: [...new Set(blockers)].sort(),
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function resolveSiemensSintesoFdb221PhysicalNormV1(input: {
  technology_class: string;
  operation_class: string;
  material_system?: string;
  scope_mode: string;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const productProfileId = primitiveString(explicitValue(input.parameter_values, "product_profile_id"));
  if (productProfileId !== SIEMENS_SINTESO_FDB221_PRODUCT_PROFILE_ID) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }
  if (
    input.technology_class !== "FIRE_ALARM_DETECTION" ||
    input.operation_class !== "INSTALL" ||
    input.material_system !== "SIEMENS_SINTESO_FDB221_BASE" ||
    input.scope_mode !== "FULL_APPLICABLE_SCOPE"
  ) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }

  const explicit = Object.fromEntries(SIEMENS_SINTESO_FDB221_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(input.parameter_values, parameterId)],
  ));
  const missing = SIEMENS_SINTESO_FDB221_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      missing,
      SIEMENS_SINTESO_FDB221_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const pointCount = finiteNumber(explicit.designed_detector_point_count);
  const designBasis = primitiveString(explicit.approved_fire_alarm_design_and_code_basis);
  const detectorProduct = primitiveString(explicit.selected_detector_product_number);
  const baseReference = primitiveString(explicit.selected_base_reference)?.toUpperCase();
  const compatibilityDocument = primitiveString(explicit.detector_base_compatibility_document_revision);
  const installationEnvironment = primitiveString(explicit.installation_environment)?.toUpperCase();
  const supplyMethod = primitiveString(explicit.surface_or_recessed_supply_method)?.toUpperCase();
  const surfaceCableDiameterMm = finiteNumber(explicit.surface_cable_diameter_mm);
  const conductorCrossSectionMm2 = finiteNumber(explicit.conductor_cross_section_mm2);
  const attachmentScope = primitiveString(explicit.humid_or_wet_base_attachment_scope)?.toUpperCase();
  const auxiliaryTerminalScope = primitiveString(explicit.auxiliary_terminal_scope)?.toUpperCase();
  const detectorHeatingScope = primitiveString(explicit.detector_heating_scope)?.toUpperCase();
  const lockingScope = primitiveString(explicit.locking_and_designation_plate_scope)?.toUpperCase();
  const spareQuantity = finiteNumber(explicit.project_spare_quantity);
  const commissioningScope = primitiveString(explicit.commissioning_and_acceptance_scope);
  const blockers = [
    pointCount !== null && Number.isInteger(pointCount) && pointCount > 0
      ? ""
      : "PROJECT_VALUE_INVALID:designed_detector_point_count",
    designBasis ? "" : "PROJECT_VALUE_INVALID:approved_fire_alarm_design_and_code_basis",
    detectorProduct && !/^(?:FDB221|A5Q00001664)$/iu.test(detectorProduct)
      ? ""
      : "PROJECT_VALUE_INVALID:selected_detector_product_number_must_identify_detector_not_base",
    baseReference === "FDB221/A5Q00001664"
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_base_reference=${baseReference}`,
    compatibilityDocument ? "" : "PROJECT_VALUE_INVALID:detector_base_compatibility_document_revision",
    installationEnvironment === "DRY_INDOOR"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:installation_environment=${installationEnvironment}`,
    supplyMethod === "SURFACE" || supplyMethod === "RECESSED"
      ? ""
      : `PROJECT_VALUE_INVALID:surface_or_recessed_supply_method=${supplyMethod}`,
    supplyMethod === "SURFACE"
      ? surfaceCableDiameterMm !== null && surfaceCableDiameterMm > 0 && surfaceCableDiameterMm <= 6
        ? ""
        : `PHYSICAL_NORM_NOT_APPLICABLE:surface_cable_diameter_mm=${surfaceCableDiameterMm}`
      : surfaceCableDiameterMm === 0
        ? ""
        : `PROJECT_VALUE_INVALID:surface_cable_diameter_mm=${surfaceCableDiameterMm}:expected_zero_for_recessed`,
    conductorCrossSectionMm2 !== null && conductorCrossSectionMm2 >= 0.2 && conductorCrossSectionMm2 <= 1.5
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:conductor_cross_section_mm2=${conductorCrossSectionMm2}`,
    attachmentScope === "NOT_REQUIRED_DRY_INDOOR"
      ? ""
      : `SEPARATE_ACCESSORY_SCOPE_REQUIRED:humid_or_wet_base_attachment_scope=${attachmentScope}`,
    auxiliaryTerminalScope === "NOT_INCLUDED"
      ? ""
      : `SEPARATE_ACCESSORY_SCOPE_REQUIRED:auxiliary_terminal_scope=${auxiliaryTerminalScope}`,
    detectorHeatingScope === "NOT_INCLUDED"
      ? ""
      : `SEPARATE_ACCESSORY_SCOPE_REQUIRED:detector_heating_scope=${detectorHeatingScope}`,
    lockingScope === "NOT_INCLUDED"
      ? ""
      : `SEPARATE_ACCESSORY_SCOPE_REQUIRED:locking_and_designation_plate_scope=${lockingScope}`,
    spareQuantity !== null && Number.isInteger(spareQuantity) && spareQuantity >= 0
      ? ""
      : "PROJECT_VALUE_INVALID:project_spare_quantity",
    commissioningScope ? "" : "PROJECT_VALUE_INVALID:commissioning_and_acceptance_scope",
  ].filter(Boolean);
  if (blockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      blockers,
      SIEMENS_SINTESO_FDB221_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const exactBaseQuantityPiece = pointCount! + spareQuantity!;
  const explicitOutput = finiteNumber(explicitValue(
    input.parameter_values,
    "siemens_fdb221_base_quantity_piece",
  ));
  if (explicitOutput !== null && explicitOutput !== exactBaseQuantityPiece) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:siemens_fdb221_base_quantity_piece=${explicitOutput}:norm_value=${exactBaseQuantityPiece}`,
      ],
      [...SIEMENS_SINTESO_FDB221_REQUIRED_EXPLICIT_PARAMETER_IDS, "siemens_fdb221_base_quantity_piece"],
    );
  }

  const capturedAt = SIEMENS_SINTESO_FDB221_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${productProfileId}`,
    `designed_detector_point_count=${pointCount}`,
    `approved_fire_alarm_design_and_code_basis=${designBasis}`,
    `selected_detector_product_number=${detectorProduct}`,
    `selected_base_reference=${baseReference}`,
    `detector_base_compatibility_document_revision=${compatibilityDocument}`,
    `installation_environment=${installationEnvironment}`,
    `surface_or_recessed_supply_method=${supplyMethod}`,
    `surface_cable_diameter_mm=${surfaceCableDiameterMm}`,
    `conductor_cross_section_mm2=${conductorCrossSectionMm2}`,
    `project_spare_quantity=${spareQuantity}`,
    `commissioning_and_acceptance_scope=${commissioningScope}`,
    `siemens_fdb221_base_quantity_piece=${exactBaseQuantityPiece}`,
    "formula=designed_detector_point_count+project_spare_quantity",
    "base_is_not_detector=true",
    "automatic_area_based_detector_count=false",
    "automatic_generic_binding=false",
  ].join(";");
  const parameterValues = Object.freeze({
    ...input.parameter_values,
    siemens_fdb221_base_quantity_piece: {
      value: exactBaseQuantityPiece,
      unit_id: "piece",
      source_type: "APPLICABLE_NORM" as const,
      source_id: SIEMENS_SINTESO_FDB221_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: APPLICABILITY_VERSION,
    product_profile_id: productProfileId,
    source_id: SIEMENS_SINTESO_FDB221_SOURCE_ID,
    norm_id: SIEMENS_SINTESO_FDB221_NORM_ID,
    source_document_version: SIEMENS_SINTESO_FDB221_SOURCE_METADATA.source_document_version,
    source_url: SIEMENS_SINTESO_FDB221_SOURCE_METADATA.source_url,
    exact_locator: SIEMENS_SINTESO_FDB221_SOURCE_METADATA.exact_locator,
    source_definition_hash: SIEMENS_SINTESO_FDB221_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...SIEMENS_SINTESO_FDB221_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["siemens_fdb221_base_quantity_piece"] as const,
    calculated_siemens_fdb221_base_quantity_piece: exactBaseQuantityPiece,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
