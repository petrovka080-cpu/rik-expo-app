import carpentryNormPack from "../../../../../data/estimate-norms/professional/carpentry.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const APPLICABILITY_VERSION = "professional-physical-norm-applicability:v1" as const;

export const SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_PRODUCT_PROFILE_ID =
  "manufacturer-profile:sikagard-wood-preserver:preventative:v1" as const;
export const SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID =
  "carpentry_sikagard_wood_preserver_l_m2_preventative_v1" as const;
export const SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_ID =
  `src_professional_norm_pack_${SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID}` as const;

export const SIKAGARD_WOOD_PRESERVER_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "treated_timber_surface_area_m2",
  "treatment_purpose",
  "timber_surface_condition",
  "application_method",
  "minimum_coat_count",
  "selected_package_mix_l",
] as const);

const woodPreserverNorm = (() => {
  const found = carpentryNormPack.norm_items.find(
    (item) => item.norm_id === SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID}`);
  }
  return found;
})();

if (
  carpentryNormPack.work_group !== "carpentry" ||
  carpentryNormPack.review_status !== "reviewed" ||
  woodPreserverNorm.unit !== "l" ||
  woodPreserverNorm.rate.value !== 0.25 ||
  woodPreserverNorm.rate.unit !== "l/m2 for the documented preventative treatment" ||
  woodPreserverNorm.applicability.product !== "Sikagard Wood Preserver" ||
  woodPreserverNorm.applicability.manufacturer_consumption_ml_m2 !== 250 ||
  woodPreserverNorm.applicability.minimum_coats_for_brush_or_spray !== 2 ||
  woodPreserverNorm.applicability.ready_to_use_do_not_dilute !== true ||
  woodPreserverNorm.applicability.external_use_requires_overcoat_or_varnish !== true ||
  woodPreserverNorm.applicability.food_preparation_surfaces_excluded !== true ||
  woodPreserverNorm.applicability.package_sizes_l[0] !== 1 ||
  woodPreserverNorm.applicability.package_sizes_l[1] !== 5 ||
  woodPreserverNorm.parameters.length !== SIKAGARD_WOOD_PRESERVER_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  SIKAGARD_WOOD_PRESERVER_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !woodPreserverNorm.parameters.includes(parameterId),
  ) ||
  woodPreserverNorm.waste_percent_default !== 0 ||
  woodPreserverNorm.rounding.package_size !== 1 ||
  woodPreserverNorm.rounding.mode !== "exact_litres_before_selected_1_l_and_5_l_procurement_mix"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID}`);
}

export const SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA = Object.freeze({
  source_id: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_ID,
  norm_id: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID,
  source_document_version: carpentryNormPack.source_pack_version,
  source_title: woodPreserverNorm.source.title,
  source_url: woodPreserverNorm.source.url,
  exact_locator: woodPreserverNorm.source.page,
  rate_value: woodPreserverNorm.rate.value,
  rate_unit: woodPreserverNorm.rate.unit,
  product: woodPreserverNorm.applicability.product,
  manufacturer_consumption_ml_m2: woodPreserverNorm.applicability.manufacturer_consumption_ml_m2,
  minimum_coats_for_brush_or_spray: woodPreserverNorm.applicability.minimum_coats_for_brush_or_spray,
  package_sizes_l: woodPreserverNorm.applicability.package_sizes_l,
  definition_hash: estimateDeterministicHash({
    work_group: carpentryNormPack.work_group,
    source_pack_version: carpentryNormPack.source_pack_version,
    norm_item: woodPreserverNorm,
  }),
});

export const SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID,
  work_group: "carpentry",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "TIMBER_PRESERVATION",
  operation_class: "APPLY",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_PRODUCT_PROFILE_ID,
  source_id: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_ID,
  source_document_version: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA.source_document_version,
  source_definition_hash: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: SIKAGARD_WOOD_PRESERVER_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: [
    "sikagard_wood_preserver_net_quantity_l",
    "sikagard_wood_preserver_procurement_quantity_l",
  ] as const,
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
    source_id: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_ID,
    norm_id: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID,
    source_document_version: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA.source_document_version,
    source_url: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA.source_url,
    exact_locator: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA.exact_locator,
    source_definition_hash: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...consumedParameterIds].sort(),
    produced_parameter_ids: [] as const,
    parameter_values: parameterValues,
    blockers: [...new Set(blockers)].sort(),
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function resolveSikagardWoodPreserverPreventativePhysicalNormV1(input: {
  technology_class: string;
  operation_class: string;
  material_system?: string;
  scope_mode: string;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const productProfileId = primitiveString(explicitValue(input.parameter_values, "product_profile_id"));
  if (productProfileId !== SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_PRODUCT_PROFILE_ID) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }
  if (
    input.technology_class !== "TIMBER_PRESERVATION" ||
    input.operation_class !== "APPLY" ||
    input.material_system !== "SIKAGARD_WOOD_PRESERVER" ||
    input.scope_mode !== "FULL_APPLICABLE_SCOPE"
  ) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }

  const explicit = Object.fromEntries(SIKAGARD_WOOD_PRESERVER_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(input.parameter_values, parameterId)],
  ));
  const missing = SIKAGARD_WOOD_PRESERVER_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      missing,
      SIKAGARD_WOOD_PRESERVER_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const treatedAreaM2 = finiteNumber(explicit.treated_timber_surface_area_m2);
  const treatmentPurpose = primitiveString(explicit.treatment_purpose)?.toUpperCase();
  const surfaceCondition = primitiveString(explicit.timber_surface_condition)?.toUpperCase();
  const applicationMethod = primitiveString(explicit.application_method)?.toUpperCase();
  const coatCount = finiteNumber(explicit.minimum_coat_count);
  const selectedPackageMixL = finiteNumber(explicit.selected_package_mix_l);
  const calculatedNetQuantityL = treatedAreaM2 === null
    ? null
    : Number((treatedAreaM2 * 0.25).toFixed(9));
  const blockers = [
    treatedAreaM2 !== null && treatedAreaM2 > 0
      ? ""
      : "PROJECT_VALUE_INVALID:treated_timber_surface_area_m2",
    treatmentPurpose === "PREVENTATIVE_INSECTS_AND_WOOD_ROTTING_FUNGI"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:treatment_purpose=${treatmentPurpose}`,
    surfaceCondition === "CLEAN_DRY_BARE_TIMBER"
      ? ""
      : `PROJECT_VALUE_INVALID:timber_surface_condition=${surfaceCondition}`,
    applicationMethod === "BRUSH" || applicationMethod === "SPRAY"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:application_method=${applicationMethod}`,
    coatCount !== null && Number.isInteger(coatCount) && coatCount >= 2
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:minimum_coat_count=${coatCount}`,
    selectedPackageMixL !== null && Number.isInteger(selectedPackageMixL) &&
      calculatedNetQuantityL !== null && selectedPackageMixL >= calculatedNetQuantityL
      ? ""
      : `PROJECT_VALUE_INVALID:selected_package_mix_l=${selectedPackageMixL}:minimum=${calculatedNetQuantityL}`,
  ].filter(Boolean);
  if (blockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      blockers,
      SIKAGARD_WOOD_PRESERVER_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const explicitNetOutput = finiteNumber(explicitValue(
    input.parameter_values,
    "sikagard_wood_preserver_net_quantity_l",
  ));
  const explicitProcurementOutput = finiteNumber(explicitValue(
    input.parameter_values,
    "sikagard_wood_preserver_procurement_quantity_l",
  ));
  const conflicts = [
    explicitNetOutput !== null && Math.abs(explicitNetOutput - calculatedNetQuantityL!) > 1e-9
      ? `PHYSICAL_NORM_VALUE_CONFLICT:sikagard_wood_preserver_net_quantity_l=${explicitNetOutput}:norm_value=${calculatedNetQuantityL}`
      : "",
    explicitProcurementOutput !== null && explicitProcurementOutput !== selectedPackageMixL
      ? `PHYSICAL_NORM_VALUE_CONFLICT:sikagard_wood_preserver_procurement_quantity_l=${explicitProcurementOutput}:project_value=${selectedPackageMixL}`
      : "",
  ].filter(Boolean);
  if (conflicts.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      conflicts,
      [
        ...SIKAGARD_WOOD_PRESERVER_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "sikagard_wood_preserver_net_quantity_l",
        "sikagard_wood_preserver_procurement_quantity_l",
      ],
    );
  }

  const capturedAt = SIKAGARD_WOOD_PRESERVER_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${productProfileId}`,
    `treated_timber_surface_area_m2=${treatedAreaM2}`,
    `treatment_purpose=${treatmentPurpose}`,
    `timber_surface_condition=${surfaceCondition}`,
    `application_method=${applicationMethod}`,
    `minimum_coat_count=${coatCount}`,
    `selected_package_mix_l=${selectedPackageMixL}`,
    `sikagard_wood_preserver_net_quantity_l=${calculatedNetQuantityL}`,
    `sikagard_wood_preserver_procurement_quantity_l=${selectedPackageMixL}`,
    "formula=treated_timber_surface_area_m2*0.25",
    "dilution=false",
    "automatic_waste=false",
    "automatic_package_rounding=false",
    "automatic_generic_binding=false",
  ].join(";");
  const parameterValues = Object.freeze({
    ...input.parameter_values,
    sikagard_wood_preserver_net_quantity_l: {
      value: calculatedNetQuantityL!,
      unit_id: "l",
      source_type: "APPLICABLE_NORM" as const,
      source_id: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
    sikagard_wood_preserver_procurement_quantity_l: {
      value: selectedPackageMixL!,
      unit_id: "l",
      source_type: "USER_EXPLICIT" as const,
      source_id: "project-selected-package-mix",
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: APPLICABILITY_VERSION,
    product_profile_id: productProfileId,
    source_id: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_ID,
    norm_id: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID,
    source_document_version: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA.source_document_version,
    source_url: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA.source_url,
    exact_locator: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA.exact_locator,
    source_definition_hash: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...SIKAGARD_WOOD_PRESERVER_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: [
      "sikagard_wood_preserver_net_quantity_l",
      "sikagard_wood_preserver_procurement_quantity_l",
    ] as const,
    calculated_sikagard_wood_preserver_net_quantity_l: calculatedNetQuantityL!,
    calculated_sikagard_wood_preserver_procurement_quantity_l: selectedPackageMixL!,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
