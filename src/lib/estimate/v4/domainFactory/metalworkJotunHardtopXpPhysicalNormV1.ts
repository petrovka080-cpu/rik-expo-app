import metalworkNormPack from "../../../../../data/estimate-norms/professional/metalwork.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const APPLICABILITY_VERSION = "professional-physical-norm-applicability:v1" as const;

export const JOTUN_HARDTOP_XP_100UM_PRODUCT_PROFILE_ID =
  "manufacturer-profile:jotun-hardtop-xp:100um-theoretical:v1" as const;
export const JOTUN_HARDTOP_XP_100UM_NORM_ID =
  "metalwork_jotun_hardtop_xp_l_m2_100um_v1" as const;
export const JOTUN_HARDTOP_XP_100UM_SOURCE_ID =
  `src_professional_norm_pack_${JOTUN_HARDTOP_XP_100UM_NORM_ID}` as const;

export const JOTUN_HARDTOP_XP_100UM_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "coated_steel_area_m2",
  "specified_dry_film_thickness_um",
  "application_method",
  "surface_profile",
  "application_loss_factor",
  "selected_kit_size_l",
  "component_mixing_ratio_confirmed",
  "coating_system_approved",
] as const);

const hardtopXpNorm = (() => {
  const found = metalworkNormPack.norm_items.find(
    (item) => item.norm_id === JOTUN_HARDTOP_XP_100UM_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${JOTUN_HARDTOP_XP_100UM_NORM_ID}`);
  }
  return found;
})();

if (
  metalworkNormPack.work_group !== "metalwork" ||
  metalworkNormPack.review_status !== "reviewed" ||
  hardtopXpNorm.unit !== "l" ||
  hardtopXpNorm.rate.value !== 0.15873016 ||
  hardtopXpNorm.rate.unit !== "l/m2 theoretical at 100 um DFT; reciprocal of 6.3 m2/l" ||
  hardtopXpNorm.applicability.product !== "Jotun Hardtop XP" ||
  hardtopXpNorm.applicability.dry_film_thickness_um !== 100 ||
  hardtopXpNorm.applicability.wet_film_thickness_um !== 160 ||
  hardtopXpNorm.applicability.theoretical_spreading_rate_m2_l !== 6.3 ||
  hardtopXpNorm.applicability.calculation !== "coated_steel_area_m2 / 6.3" ||
  hardtopXpNorm.applicability.application_loss_not_included !== true ||
  hardtopXpNorm.applicability.mixing_ratio_component_a_to_b_by_volume !== "10:1" ||
  hardtopXpNorm.applicability.typical_combined_kit_sizes_l[0] !== 5 ||
  hardtopXpNorm.applicability.typical_combined_kit_sizes_l[1] !== 20 ||
  hardtopXpNorm.parameters.length !== JOTUN_HARDTOP_XP_100UM_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  JOTUN_HARDTOP_XP_100UM_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !hardtopXpNorm.parameters.includes(parameterId),
  ) ||
  hardtopXpNorm.waste_percent_default !== 0 ||
  hardtopXpNorm.rounding.package_size !== 5 ||
  hardtopXpNorm.rounding.mode !== "theoretical_litres_before_application_loss_and_selected_5_l_or_20_l_kit_rounding"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${JOTUN_HARDTOP_XP_100UM_NORM_ID}`);
}

export const JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA = Object.freeze({
  source_id: JOTUN_HARDTOP_XP_100UM_SOURCE_ID,
  norm_id: JOTUN_HARDTOP_XP_100UM_NORM_ID,
  source_document_version: metalworkNormPack.source_pack_version,
  source_title: hardtopXpNorm.source.title,
  source_url: hardtopXpNorm.source.url,
  exact_locator: hardtopXpNorm.source.page,
  rate_value: hardtopXpNorm.rate.value,
  rate_unit: hardtopXpNorm.rate.unit,
  product: hardtopXpNorm.applicability.product,
  dry_film_thickness_um: hardtopXpNorm.applicability.dry_film_thickness_um,
  wet_film_thickness_um: hardtopXpNorm.applicability.wet_film_thickness_um,
  theoretical_spreading_rate_m2_l: hardtopXpNorm.applicability.theoretical_spreading_rate_m2_l,
  mixing_ratio_component_a_to_b_by_volume:
    hardtopXpNorm.applicability.mixing_ratio_component_a_to_b_by_volume,
  typical_combined_kit_sizes_l: hardtopXpNorm.applicability.typical_combined_kit_sizes_l,
  definition_hash: estimateDeterministicHash({
    work_group: metalworkNormPack.work_group,
    source_pack_version: metalworkNormPack.source_pack_version,
    norm_item: hardtopXpNorm,
  }),
});

export const JOTUN_HARDTOP_XP_100UM_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: JOTUN_HARDTOP_XP_100UM_NORM_ID,
  work_group: "metalwork",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "STEEL_PROTECTIVE_COATING",
  operation_class: "APPLY",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: JOTUN_HARDTOP_XP_100UM_PRODUCT_PROFILE_ID,
  source_id: JOTUN_HARDTOP_XP_100UM_SOURCE_ID,
  source_document_version: JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA.source_document_version,
  source_definition_hash: JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: JOTUN_HARDTOP_XP_100UM_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["jotun_hardtop_xp_theoretical_quantity_l"] as const,
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
    source_id: JOTUN_HARDTOP_XP_100UM_SOURCE_ID,
    norm_id: JOTUN_HARDTOP_XP_100UM_NORM_ID,
    source_document_version: JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA.source_document_version,
    source_url: JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA.source_url,
    exact_locator: JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA.exact_locator,
    source_definition_hash: JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...consumedParameterIds].sort(),
    produced_parameter_ids: [] as const,
    parameter_values: parameterValues,
    blockers: [...new Set(blockers)].sort(),
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function resolveJotunHardtopXp100UmPhysicalNormV1(input: {
  technology_class: string;
  operation_class: string;
  material_system?: string;
  scope_mode: string;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const productProfileId = primitiveString(explicitValue(input.parameter_values, "product_profile_id"));
  if (productProfileId !== JOTUN_HARDTOP_XP_100UM_PRODUCT_PROFILE_ID) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }
  if (
    input.technology_class !== "STEEL_PROTECTIVE_COATING" ||
    input.operation_class !== "APPLY" ||
    input.material_system !== "JOTUN_HARDTOP_XP" ||
    input.scope_mode !== "FULL_APPLICABLE_SCOPE"
  ) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }

  const explicit = Object.fromEntries(JOTUN_HARDTOP_XP_100UM_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(input.parameter_values, parameterId)],
  ));
  const missing = JOTUN_HARDTOP_XP_100UM_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      missing,
      JOTUN_HARDTOP_XP_100UM_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const coatedAreaM2 = finiteNumber(explicit.coated_steel_area_m2);
  const dryFilmThicknessUm = finiteNumber(explicit.specified_dry_film_thickness_um);
  const applicationMethod = primitiveString(explicit.application_method);
  const surfaceProfile = primitiveString(explicit.surface_profile);
  const applicationLossFactor = finiteNumber(explicit.application_loss_factor);
  const selectedKitSizeL = finiteNumber(explicit.selected_kit_size_l);
  const mixingConfirmed = explicitBoolean(explicit.component_mixing_ratio_confirmed);
  const coatingSystemApproved = explicitBoolean(explicit.coating_system_approved);
  const blockers = [
    coatedAreaM2 !== null && coatedAreaM2 > 0
      ? ""
      : "PROJECT_VALUE_INVALID:coated_steel_area_m2",
    dryFilmThicknessUm === 100
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:specified_dry_film_thickness_um=${dryFilmThicknessUm}`,
    applicationMethod ? "" : "PROJECT_VALUE_INVALID:application_method",
    surfaceProfile ? "" : "PROJECT_VALUE_INVALID:surface_profile",
    applicationLossFactor === 1
      ? ""
      : `PROJECT_SPECIFIC_APPLICATION_LOSS_REQUIRED:application_loss_factor=${applicationLossFactor}`,
    selectedKitSizeL === 5 || selectedKitSizeL === 20
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_kit_size_l=${selectedKitSizeL}`,
    mixingConfirmed === true ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:component_mixing_ratio_confirmed",
    coatingSystemApproved === true ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:coating_system_approved",
  ].filter(Boolean);
  if (blockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      blockers,
      JOTUN_HARDTOP_XP_100UM_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const exactTheoreticalQuantityL = Number((coatedAreaM2! / 6.3).toFixed(9));
  const explicitOutput = finiteNumber(explicitValue(
    input.parameter_values,
    "jotun_hardtop_xp_theoretical_quantity_l",
  ));
  if (explicitOutput !== null && Math.abs(explicitOutput - exactTheoreticalQuantityL) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:jotun_hardtop_xp_theoretical_quantity_l=${explicitOutput}:norm_value=${exactTheoreticalQuantityL}`,
      ],
      [...JOTUN_HARDTOP_XP_100UM_REQUIRED_EXPLICIT_PARAMETER_IDS, "jotun_hardtop_xp_theoretical_quantity_l"],
    );
  }

  const capturedAt = JOTUN_HARDTOP_XP_100UM_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${productProfileId}`,
    `coated_steel_area_m2=${coatedAreaM2}`,
    `specified_dry_film_thickness_um=${dryFilmThicknessUm}`,
    `application_method=${applicationMethod}`,
    `surface_profile=${surfaceProfile}`,
    `application_loss_factor=${applicationLossFactor}`,
    `selected_kit_size_l=${selectedKitSizeL}`,
    `jotun_hardtop_xp_theoretical_quantity_l=${exactTheoreticalQuantityL}`,
    "formula=coated_steel_area_m2/6.3",
    "application_loss=false",
    "kit_rounding=false",
    "automatic_generic_binding=false",
  ].join(";");
  const parameterValues = Object.freeze({
    ...input.parameter_values,
    jotun_hardtop_xp_theoretical_quantity_l: {
      value: exactTheoreticalQuantityL,
      unit_id: "l",
      source_type: "APPLICABLE_NORM" as const,
      source_id: JOTUN_HARDTOP_XP_100UM_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: APPLICABILITY_VERSION,
    product_profile_id: productProfileId,
    source_id: JOTUN_HARDTOP_XP_100UM_SOURCE_ID,
    norm_id: JOTUN_HARDTOP_XP_100UM_NORM_ID,
    source_document_version: JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA.source_document_version,
    source_url: JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA.source_url,
    exact_locator: JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA.exact_locator,
    source_definition_hash: JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...JOTUN_HARDTOP_XP_100UM_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["jotun_hardtop_xp_theoretical_quantity_l"] as const,
    calculated_jotun_hardtop_xp_theoretical_quantity_l: exactTheoreticalQuantityL,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
