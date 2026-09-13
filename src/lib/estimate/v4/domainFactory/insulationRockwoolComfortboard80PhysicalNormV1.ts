import insulationNormPack from "../../../../../data/estimate-norms/professional/insulation.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const APPLICABILITY_VERSION = "professional-physical-norm-applicability:v1" as const;

export const ROCKWOOL_COMFORTBOARD80_R63_38MM_PRODUCT_PROFILE_ID =
  "manufacturer-profile:rockwool-comfortboard80:r6.3-38mm-small-board:v1" as const;
export const ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID =
  "insulation_rockwool_comfortboard80_r63_38mm_m2_m2_v1" as const;
export const ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_ID =
  `src_professional_norm_pack_${ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID}` as const;

export const ROCKWOOL_COMFORTBOARD80_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "net_insulation_area_m2",
  "required_r_value",
  "selected_thickness_mm",
  "selected_board_length_mm",
  "selected_board_width_mm",
  "selected_package_format",
  "opening_and_cut_layout",
] as const);

const comfortboard80Norm = (() => {
  const found = insulationNormPack.norm_items.find(
    (item) => item.norm_id === ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID}`);
  }
  return found;
})();

if (
  insulationNormPack.work_group !== "insulation" ||
  insulationNormPack.review_status !== "reviewed" ||
  comfortboard80Norm.unit !== "m2" ||
  comfortboard80Norm.rate.value !== 1 ||
  comfortboard80Norm.rate.unit !== "board m2/net insulation m2 before project cutting allowance" ||
  comfortboard80Norm.applicability.product !== "ROCKWOOL Comfortboard 80" ||
  comfortboard80Norm.applicability.nominal_r_value !== "R6.3" ||
  comfortboard80Norm.applicability.thickness_mm !== 38 ||
  comfortboard80Norm.applicability.board_length_mm !== 1219 ||
  comfortboard80Norm.applicability.board_width_mm !== 610 ||
  comfortboard80Norm.applicability.boards_per_pack !== 6 ||
  comfortboard80Norm.applicability.manufacturer_pack_coverage_m2 !== 4.45 ||
  comfortboard80Norm.applicability.selected_format_must_match_r6_3_small_pack !== true ||
  comfortboard80Norm.applicability.cutting_allowance_requires_layout !== true ||
  comfortboard80Norm.applicability.thermal_design_and_regional_code_review_required !== true ||
  comfortboard80Norm.parameters.length !== ROCKWOOL_COMFORTBOARD80_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  ROCKWOOL_COMFORTBOARD80_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !comfortboard80Norm.parameters.includes(parameterId),
  ) ||
  comfortboard80Norm.waste_percent_default !== 0 ||
  comfortboard80Norm.rounding.package_size !== 4.45 ||
  comfortboard80Norm.rounding.mode !== "exact_net_area_before_cut_layout_and_package_selection"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID}`);
}

export const ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA = Object.freeze({
  source_id: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_ID,
  norm_id: ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID,
  source_document_version: insulationNormPack.source_pack_version,
  source_title: comfortboard80Norm.source.title,
  source_url: comfortboard80Norm.source.url,
  exact_locator: comfortboard80Norm.source.page,
  rate_value: comfortboard80Norm.rate.value,
  rate_unit: comfortboard80Norm.rate.unit,
  product: comfortboard80Norm.applicability.product,
  nominal_r_value: comfortboard80Norm.applicability.nominal_r_value,
  thickness_mm: comfortboard80Norm.applicability.thickness_mm,
  board_length_mm: comfortboard80Norm.applicability.board_length_mm,
  board_width_mm: comfortboard80Norm.applicability.board_width_mm,
  boards_per_pack: comfortboard80Norm.applicability.boards_per_pack,
  manufacturer_pack_coverage_m2: comfortboard80Norm.applicability.manufacturer_pack_coverage_m2,
  definition_hash: estimateDeterministicHash({
    work_group: insulationNormPack.work_group,
    source_pack_version: insulationNormPack.source_pack_version,
    norm_item: comfortboard80Norm,
  }),
});

export const ROCKWOOL_COMFORTBOARD80_R63_38MM_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID,
  work_group: "insulation",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "THERMAL_INSULATION",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: ROCKWOOL_COMFORTBOARD80_R63_38MM_PRODUCT_PROFILE_ID,
  source_id: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_ID,
  source_document_version: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA.source_document_version,
  source_definition_hash: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: ROCKWOOL_COMFORTBOARD80_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["rockwool_comfortboard80_net_board_quantity_m2"] as const,
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
    source_id: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_ID,
    norm_id: ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID,
    source_document_version: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA.source_document_version,
    source_url: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA.source_url,
    exact_locator: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA.exact_locator,
    source_definition_hash: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...consumedParameterIds].sort(),
    produced_parameter_ids: [] as const,
    parameter_values: parameterValues,
    blockers: [...new Set(blockers)].sort(),
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function resolveRockwoolComfortboard80R6338MmPhysicalNormV1(input: {
  technology_class: string;
  operation_class: string;
  material_system?: string;
  scope_mode: string;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const productProfileId = primitiveString(explicitValue(input.parameter_values, "product_profile_id"));
  if (productProfileId !== ROCKWOOL_COMFORTBOARD80_R63_38MM_PRODUCT_PROFILE_ID) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }
  if (
    input.technology_class !== "THERMAL_INSULATION" ||
    input.operation_class !== "INSTALL" ||
    input.material_system !== "ROCKWOOL_COMFORTBOARD80" ||
    input.scope_mode !== "FULL_APPLICABLE_SCOPE"
  ) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }

  const explicit = Object.fromEntries(ROCKWOOL_COMFORTBOARD80_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(input.parameter_values, parameterId)],
  ));
  const missing = ROCKWOOL_COMFORTBOARD80_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      missing,
      ROCKWOOL_COMFORTBOARD80_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const netAreaM2 = finiteNumber(explicit.net_insulation_area_m2);
  const requiredRValue = primitiveString(explicit.required_r_value)?.toUpperCase() ?? null;
  const selectedThicknessMm = finiteNumber(explicit.selected_thickness_mm);
  const selectedBoardLengthMm = finiteNumber(explicit.selected_board_length_mm);
  const selectedBoardWidthMm = finiteNumber(explicit.selected_board_width_mm);
  const selectedPackageFormat = primitiveString(explicit.selected_package_format);
  const openingAndCutLayout = primitiveString(explicit.opening_and_cut_layout);
  const blockers = [
    netAreaM2 !== null && netAreaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:net_insulation_area_m2",
    requiredRValue === "R6.3" ? "" : `PHYSICAL_NORM_NOT_APPLICABLE:required_r_value=${requiredRValue}`,
    selectedThicknessMm === 38 ? "" : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_thickness_mm=${selectedThicknessMm}`,
    selectedBoardLengthMm === 1219 ? "" : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_board_length_mm=${selectedBoardLengthMm}`,
    selectedBoardWidthMm === 610 ? "" : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_board_width_mm=${selectedBoardWidthMm}`,
    selectedPackageFormat === "R6_3_38MM_1219X610_6_BOARDS_4_45_M2"
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_package_format=${selectedPackageFormat}`,
    openingAndCutLayout && !/^(?:NONE|NO|НЕТ)$/iu.test(openingAndCutLayout)
      ? ""
      : "PROJECT_VALUE_INVALID:opening_and_cut_layout",
  ].filter(Boolean);
  if (blockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      blockers,
      ROCKWOOL_COMFORTBOARD80_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const exactNetBoardQuantityM2 = Number(netAreaM2!.toFixed(9));
  const explicitOutput = finiteNumber(explicitValue(
    input.parameter_values,
    "rockwool_comfortboard80_net_board_quantity_m2",
  ));
  if (explicitOutput !== null && Math.abs(explicitOutput - exactNetBoardQuantityM2) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:rockwool_comfortboard80_net_board_quantity_m2=${explicitOutput}:norm_value=${exactNetBoardQuantityM2}`,
      ],
      [...ROCKWOOL_COMFORTBOARD80_REQUIRED_EXPLICIT_PARAMETER_IDS, "rockwool_comfortboard80_net_board_quantity_m2"],
    );
  }

  const capturedAt = ROCKWOOL_COMFORTBOARD80_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${productProfileId}`,
    `net_insulation_area_m2=${netAreaM2}`,
    `required_r_value=${requiredRValue}`,
    `selected_thickness_mm=${selectedThicknessMm}`,
    `selected_board_dimensions_mm=${selectedBoardLengthMm}x${selectedBoardWidthMm}`,
    `selected_package_format=${selectedPackageFormat}`,
    `opening_and_cut_layout=${openingAndCutLayout}`,
    `rockwool_comfortboard80_net_board_quantity_m2=${exactNetBoardQuantityM2}`,
    "cutting_allowance=false",
    "package_rounding=false",
    "automatic_generic_binding=false",
  ].join(";");
  const parameterValues = Object.freeze({
    ...input.parameter_values,
    rockwool_comfortboard80_net_board_quantity_m2: {
      value: exactNetBoardQuantityM2,
      unit_id: "m2",
      source_type: "APPLICABLE_NORM" as const,
      source_id: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: APPLICABILITY_VERSION,
    product_profile_id: productProfileId,
    source_id: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_ID,
    norm_id: ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID,
    source_document_version: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA.source_document_version,
    source_url: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA.source_url,
    exact_locator: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA.exact_locator,
    source_definition_hash: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...ROCKWOOL_COMFORTBOARD80_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["rockwool_comfortboard80_net_board_quantity_m2"] as const,
    calculated_rockwool_comfortboard80_net_board_quantity_m2: exactNetBoardQuantityM2,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
