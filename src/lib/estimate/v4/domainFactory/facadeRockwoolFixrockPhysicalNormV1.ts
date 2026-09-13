import facadeNormPack from "../../../../../data/estimate-norms/professional/facade.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const APPLICABILITY_VERSION = "professional-physical-norm-applicability:v1" as const;

export const ROCKWOOL_FIXROCK_CONVENTIONAL_PRODUCT_PROFILE_ID =
  "manufacturer-profile:rockwool-fixrock:vhf-conventional-holders:v1" as const;
export const ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID =
  "facade_rockwool_fixrock_conventional_fixings_piece_m2_v1" as const;
export const ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_ID =
  `src_professional_norm_pack_${ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID}` as const;

export const ROCKWOOL_FIXROCK_CONVENTIONAL_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "facade_insulation_area_m2",
  "fixing_variant",
  "conventional_holder_fixing_confirmed",
  "adhesive_variant_excluded",
  "one_dowel_variant_excluded",
] as const);

const fixingNorm = (() => {
  const found = facadeNormPack.norm_items.find(
    (item) => item.norm_id === ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID,
  );
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID}`);
  return found;
})();

if (
  facadeNormPack.work_group !== "facade" ||
  facadeNormPack.review_status !== "reviewed" ||
  fixingNorm.unit !== "piece" ||
  fixingNorm.rate.value !== 5 ||
  fixingNorm.rate.unit !== "insulation fixings/m2 on average for conventional VHF installation" ||
  fixingNorm.applicability.system !== "ROCKWOOL Fixrock ventilated facade insulation" ||
  fixingNorm.applicability.installation_variant !== "conventional insulation-holder fixing" ||
  fixingNorm.applicability.manufacturer_average_fixings_per_m2 !== 5 ||
  fixingNorm.applicability.one_fixing_per_board_variant_excluded !== true ||
  fixingNorm.applicability.adhesive_fixing_variant_excluded !== true ||
  fixingNorm.parameters.length !== ROCKWOOL_FIXROCK_CONVENTIONAL_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  ROCKWOOL_FIXROCK_CONVENTIONAL_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !fixingNorm.parameters.includes(parameterId),
  ) ||
  fixingNorm.waste_percent_default !== 0 ||
  fixingNorm.rounding.package_size !== 1 ||
  fixingNorm.rounding.mode !== "ceil_to_whole_piece_after_confirmed_conventional_area"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID}`);
}

export const ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA = Object.freeze({
  source_id: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_ID,
  norm_id: ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID,
  source_document_version: facadeNormPack.source_pack_version,
  source_title: fixingNorm.source.title,
  source_url: fixingNorm.source.url,
  exact_locator: fixingNorm.source.page,
  rate_value: fixingNorm.rate.value,
  rate_unit: fixingNorm.rate.unit,
  system: fixingNorm.applicability.system,
  installation_variant: fixingNorm.applicability.installation_variant,
  definition_hash: estimateDeterministicHash({
    work_group: facadeNormPack.work_group,
    source_pack_version: facadeNormPack.source_pack_version,
    norm_item: fixingNorm,
  }),
});

export const ROCKWOOL_FIXROCK_CONVENTIONAL_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID,
  work_group: "facade",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "VENTILATED_FACADE_INSULATION",
  operation_class: "FIX",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: ROCKWOOL_FIXROCK_CONVENTIONAL_PRODUCT_PROFILE_ID,
  source_id: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_ID,
  source_document_version: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA.source_document_version,
  source_definition_hash: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: ROCKWOOL_FIXROCK_CONVENTIONAL_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["rockwool_fixrock_conventional_holder_quantity_piece"] as const,
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

function booleanValue(value: ProfessionalParameterValueV4 | null): boolean | null {
  return typeof value?.value === "boolean" ? value.value : null;
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
    source_id: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_ID,
    norm_id: ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID,
    source_document_version: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA.source_document_version,
    source_url: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA.source_url,
    exact_locator: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA.exact_locator,
    source_definition_hash: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...consumedParameterIds].sort(),
    produced_parameter_ids: [] as const,
    parameter_values: parameterValues,
    blockers: [...new Set(blockers)].sort(),
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function resolveRockwoolFixrockConventionalPhysicalNormV1(input: {
  technology_class: string;
  operation_class: string;
  material_system?: string;
  scope_mode: string;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const productProfileId = primitiveString(explicitValue(input.parameter_values, "product_profile_id"));
  if (productProfileId !== ROCKWOOL_FIXROCK_CONVENTIONAL_PRODUCT_PROFILE_ID) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }
  if (
    input.technology_class !== "VENTILATED_FACADE_INSULATION" ||
    input.operation_class !== "FIX" ||
    input.material_system !== "ROCKWOOL_FIXROCK_CONVENTIONAL" ||
    input.scope_mode !== "FULL_APPLICABLE_SCOPE"
  ) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }

  const explicit = Object.fromEntries(ROCKWOOL_FIXROCK_CONVENTIONAL_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(input.parameter_values, parameterId)],
  ));
  const missing = ROCKWOOL_FIXROCK_CONVENTIONAL_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      missing,
      ROCKWOOL_FIXROCK_CONVENTIONAL_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const areaM2 = finiteNumber(explicit.facade_insulation_area_m2);
  const fixingVariant = primitiveString(explicit.fixing_variant)?.toUpperCase();
  const conventionalConfirmed = booleanValue(explicit.conventional_holder_fixing_confirmed);
  const adhesiveExcluded = booleanValue(explicit.adhesive_variant_excluded);
  const oneDowelExcluded = booleanValue(explicit.one_dowel_variant_excluded);
  const blockers = [
    areaM2 !== null && areaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:facade_insulation_area_m2",
    fixingVariant === "CONVENTIONAL_INSULATION_HOLDER"
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:fixing_variant=${fixingVariant}`,
    conventionalConfirmed === true
      ? ""
      : "PHYSICAL_NORM_NOT_APPLICABLE:conventional_holder_fixing_confirmed",
    adhesiveExcluded === true ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:adhesive_variant_excluded",
    oneDowelExcluded === true ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:one_dowel_variant_excluded",
  ].filter(Boolean);
  if (blockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      blockers,
      ROCKWOOL_FIXROCK_CONVENTIONAL_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const calculatedQuantityPiece = Math.ceil(areaM2! * fixingNorm.rate.value);
  const explicitOutput = finiteNumber(explicitValue(
    input.parameter_values,
    "rockwool_fixrock_conventional_holder_quantity_piece",
  ));
  if (explicitOutput !== null && explicitOutput !== calculatedQuantityPiece) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:rockwool_fixrock_conventional_holder_quantity_piece=${explicitOutput}:norm_value=${calculatedQuantityPiece}`,
      ],
      [
        ...ROCKWOOL_FIXROCK_CONVENTIONAL_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "rockwool_fixrock_conventional_holder_quantity_piece",
      ],
    );
  }

  const capturedAt = ROCKWOOL_FIXROCK_CONVENTIONAL_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${productProfileId}`,
    `facade_insulation_area_m2=${areaM2}`,
    `fixing_variant=${fixingVariant}`,
    `conventional_holder_fixing_confirmed=${conventionalConfirmed}`,
    `adhesive_variant_excluded=${adhesiveExcluded}`,
    `one_dowel_variant_excluded=${oneDowelExcluded}`,
    `formula=ceil(facade_insulation_area_m2*${fixingNorm.rate.value})`,
    `rockwool_fixrock_conventional_holder_quantity_piece=${calculatedQuantityPiece}`,
    "automatic_waste=false",
    "automatic_alternative_variant=false",
    "automatic_generic_binding=false",
  ].join(";");
  const parameterValues = Object.freeze({
    ...input.parameter_values,
    rockwool_fixrock_conventional_holder_quantity_piece: {
      value: calculatedQuantityPiece,
      unit_id: "piece",
      source_type: "APPLICABLE_NORM" as const,
      source_id: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: APPLICABILITY_VERSION,
    product_profile_id: productProfileId,
    source_id: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_ID,
    norm_id: ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID,
    source_document_version: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA.source_document_version,
    source_url: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA.source_url,
    exact_locator: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA.exact_locator,
    source_definition_hash: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...ROCKWOOL_FIXROCK_CONVENTIONAL_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["rockwool_fixrock_conventional_holder_quantity_piece"] as const,
    calculated_rockwool_fixrock_conventional_holder_quantity_piece: calculatedQuantityPiece,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
