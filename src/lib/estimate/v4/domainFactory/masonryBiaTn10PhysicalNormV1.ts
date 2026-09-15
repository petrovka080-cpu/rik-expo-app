import masonryNormPack from "../../../../../data/estimate-norms/professional/masonry.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const APPLICABILITY_VERSION = "professional-physical-norm-applicability:v1" as const;
export const BIA_TN10_MASONRY_PRODUCT_PROFILE_ID = "standard-profile:bia-tn10:selected-table-4-fired-clay-brick:v1" as const;
export const BIA_TN10_MASONRY_NORM_ID = "masonry_bia_tn10_selected_brick_mortar_table_routing_v1" as const;
export const BIA_TN10_MASONRY_SOURCE_ID = `src_professional_norm_pack_${BIA_TN10_MASONRY_NORM_ID}` as const;
export const BIA_TN10_MASONRY_REQUIRED_IDS = Object.freeze([
  "measured_net_brick_wall_area_m2", "gross_wall_area_and_opening_deductions", "fired_clay_brick_confirmed",
  "brick_manufacturer_and_designation", "specified_and_nominal_dimensions", "joint_width_mm",
  "wall_thickness_and_wythe_configuration", "bond_pattern", "selected_bia_tn10_table_4_row",
  "selected_brick_quantity_per_m2", "selected_mortar_quantity_per_m2", "applicable_bond_correction_factors",
  "selected_project_breakage_and_waste_allowances", "supplier_package_quantities",
  "project_architect_engineer_or_estimator_approval_reference",
] as const);

const masonryNorm = masonryNormPack.norm_items.find((item) => item.norm_id === BIA_TN10_MASONRY_NORM_ID);
if (!masonryNorm) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${BIA_TN10_MASONRY_NORM_ID}`);
if (masonryNormPack.work_group !== "masonry" || masonryNormPack.review_status !== "reviewed" ||
  masonryNorm.unit !== "selected_material_unit" || masonryNorm.rate.value !== 1 ||
  masonryNorm.applicability.material_scope !== "fired clay brick only" ||
  masonryNorm.applicability.wall_area_method_uses_net_area_after_openings !== true ||
  masonryNorm.applicability.exact_brick_size_joint_width_wall_configuration_and_bond_required !== true ||
  masonryNorm.applicability.selected_table_4_row_and_correction_factors_required !== true ||
  masonryNorm.applicability.table_4_quantities_exclude_waste !== true ||
  masonryNorm.applicability.project_specific_breakage_mortar_waste_and_supplier_packages_required !== true ||
  masonryNorm.applicability.aac_concrete_silicate_or_other_non_clay_products_excluded !== true ||
  masonryNorm.applicability.adhesive_and_masonry_mesh_consumption_not_defined_by_source !== true ||
  masonryNorm.applicability.previous_fixed_8_33_piece_51_piece_5_kg_0_055_m3_and_1_05_m2_rates_rejected !== true ||
  masonryNorm.applicability.rate_is_routing_identity_not_published_consumption_norm !== true ||
  masonryNorm.applicability.automatic_production_binding_for_generic_masonry_forbidden !== true ||
  masonryNorm.parameters.length !== BIA_TN10_MASONRY_REQUIRED_IDS.length ||
  BIA_TN10_MASONRY_REQUIRED_IDS.some((id) => !masonryNorm.parameters.includes(id)) ||
  masonryNorm.waste_percent_default !== 0 || masonryNorm.rounding.package_size !== 1) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${BIA_TN10_MASONRY_NORM_ID}`);
}

export const BIA_TN10_MASONRY_SOURCE_METADATA = Object.freeze({
  source_id: BIA_TN10_MASONRY_SOURCE_ID, norm_id: BIA_TN10_MASONRY_NORM_ID,
  source_document_version: masonryNormPack.source_pack_version, source_title: masonryNorm.source.title,
  source_url: masonryNorm.source.url, exact_locator: masonryNorm.source.page,
  rate_value: masonryNorm.rate.value, rate_unit: masonryNorm.rate.unit,
  definition_hash: estimateDeterministicHash({ work_group: masonryNormPack.work_group,
    source_pack_version: masonryNormPack.source_pack_version, norm_item: masonryNorm }),
});

export const BIA_TN10_MASONRY_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: BIA_TN10_MASONRY_NORM_ID, work_group: "masonry",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "BIA_TN10_FIRED_CLAY_BRICK_MEASUREMENT", operation_class: "MEASURE",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const, product_profile_id: BIA_TN10_MASONRY_PRODUCT_PROFILE_ID,
  source_id: BIA_TN10_MASONRY_SOURCE_ID,
  source_document_version: BIA_TN10_MASONRY_SOURCE_METADATA.source_document_version,
  source_definition_hash: BIA_TN10_MASONRY_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: BIA_TN10_MASONRY_REQUIRED_IDS,
  produced_parameter_ids: ["masonry_selected_brick_procurement_quantity_piece", "masonry_selected_mortar_procurement_quantity_m3"] as const,
});

function explicit(values: Readonly<Record<string, ProfessionalParameterValueV4>>, id: string) {
  const value = values[id];
  if (!value || value.source_type === "VISIBLE_BASELINE_ASSUMPTION" ||
    (typeof value.value === "string" && !value.value.trim())) return null;
  return value;
}
function number(value: ProfessionalParameterValueV4 | null): number | null {
  if (!value) return null;
  const parsed = typeof value.value === "number" ? value.value : Number(String(value.value).replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
function text(value: ProfessionalParameterValueV4 | null): string | null {
  return typeof value?.value === "string" ? value.value.trim() || null : null;
}
function fields(value: string | null): Readonly<Record<string, number>> {
  if (!value) return {};
  return Object.fromEntries([...value.matchAll(/([A-Z0-9_]+)\s*=\s*(\d+(?:[.,]\d+)?)/gu)]
    .map((match) => [match[1]!, Number(match[2]!.replace(",", "."))]));
}
function meaningful(value: string | null) { return value !== null && value.length >= 4 && !/^(?:NONE|N\/A|UNKNOWN|TBD)$/iu.test(value); }
function rounded(value: number) { return Math.round(value * 1e9) / 1e9; }
function packageRound(value: number, packageSize: number) { return rounded(Math.ceil((value - 1e-12) / packageSize) * packageSize); }
function nonApplied(status: "NOT_REQUESTED" | "BLOCKED_REQUIRED_INPUTS" | "BLOCKED_NOT_APPLICABLE",
  profile: string | null, values: Readonly<Record<string, ProfessionalParameterValueV4>>, blockers: readonly string[], consumed: readonly string[] = []) {
  const result = { status, applicability_version: APPLICABILITY_VERSION, product_profile_id: profile,
    source_id: BIA_TN10_MASONRY_SOURCE_ID, norm_id: BIA_TN10_MASONRY_NORM_ID,
    source_document_version: BIA_TN10_MASONRY_SOURCE_METADATA.source_document_version,
    source_url: BIA_TN10_MASONRY_SOURCE_METADATA.source_url, exact_locator: BIA_TN10_MASONRY_SOURCE_METADATA.exact_locator,
    source_definition_hash: BIA_TN10_MASONRY_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...consumed].sort(), produced_parameter_ids: [] as const,
    parameter_values: values, blockers: [...new Set(blockers)].sort() };
  return { ...result, deterministic_hash: estimateDeterministicHash(result) };
}

export function resolveBiaTn10MasonryPhysicalNormV1(input: { technology_class: string; operation_class: string;
  material_system?: string; scope_mode: string; parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const profile = text(explicit(input.parameter_values, "product_profile_id"));
  if (profile !== BIA_TN10_MASONRY_PRODUCT_PROFILE_ID) return nonApplied("NOT_REQUESTED", profile, input.parameter_values, []);
  if (input.technology_class !== "BIA_TN10_FIRED_CLAY_BRICK_MEASUREMENT" || input.operation_class !== "MEASURE" ||
    input.material_system !== "BIA_TN10_FIRED_CLAY_BRICK" || input.scope_mode !== "FULL_APPLICABLE_SCOPE") {
    return nonApplied("NOT_REQUESTED", profile, input.parameter_values, []);
  }
  const values = Object.fromEntries(BIA_TN10_MASONRY_REQUIRED_IDS.map((id) => [id, explicit(input.parameter_values, id)]));
  const missing = BIA_TN10_MASONRY_REQUIRED_IDS.filter((id) => values[id] === null)
    .map((id) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${id}`);
  if (missing.length) return nonApplied("BLOCKED_REQUIRED_INPUTS", profile, input.parameter_values, missing, BIA_TN10_MASONRY_REQUIRED_IDS);

  const area = number(values.measured_net_brick_wall_area_m2), geometry = fields(text(values.gross_wall_area_and_opening_deductions));
  const joint = number(values.joint_width_mm), brickRate = number(values.selected_brick_quantity_per_m2);
  const mortarRate = number(values.selected_mortar_quantity_per_m2), corrections = fields(text(values.applicable_bond_correction_factors));
  const waste = fields(text(values.selected_project_breakage_and_waste_allowances));
  const packages = fields(text(values.supplier_package_quantities));
  const gross = geometry.GROSS_M2, openings = geometry.OPENINGS_M2, statedNet = geometry.NET_M2;
  const componentPairs = [
    ["brick_bond_correction_factor", corrections.BRICK_FACTOR],
    ["mortar_bond_correction_factor", corrections.MORTAR_FACTOR],
    ["brick_breakage_percent", waste.BRICK_PERCENT],
    ["mortar_waste_percent", waste.MORTAR_PERCENT],
    ["brick_supplier_package_pieces", packages.BRICK_PIECES],
    ["mortar_supplier_package_m3", packages.MORTAR_M3],
  ] as const;
  const componentConflicts = componentPairs.flatMap(([id, expected]) => {
    const actual = number(explicit(input.parameter_values, id));
    return actual !== null && expected !== undefined && Math.abs(actual - expected) > 1e-9
      ? [`PHYSICAL_NORM_COMPONENT_CONFLICT:${id}=${actual}:selected_value=${expected}`]
      : [];
  });
  const blockers = [
    area !== null && area > 0 ? "" : "PROJECT_VALUE_INVALID:measured_net_brick_wall_area_m2",
    gross !== undefined && openings !== undefined && statedNet !== undefined && gross > 0 && openings >= 0 &&
      Math.abs(gross - openings - statedNet) < 1e-6 && area !== null && Math.abs(statedNet - area) < 1e-6
      ? "" : "PROJECT_GEOMETRY_CONFLICT:gross_wall_area_and_opening_deductions",
    values.fired_clay_brick_confirmed?.value === true ? "" : "PHYSICAL_NORM_MATERIAL_SCOPE_INVALID:fired_clay_brick_confirmed",
    meaningful(text(values.brick_manufacturer_and_designation)) ? "" : "PROJECT_VALUE_INVALID:brick_manufacturer_and_designation",
    /\d/u.test(text(values.specified_and_nominal_dimensions) ?? "") ? "" : "PROJECT_VALUE_INVALID:specified_and_nominal_dimensions",
    joint !== null && joint > 0 ? "" : "PROJECT_VALUE_INVALID:joint_width_mm",
    text(values.wall_thickness_and_wythe_configuration)?.startsWith("WYTHE:") ? "" : "PROJECT_VALUE_INVALID:wall_thickness_and_wythe_configuration",
    meaningful(text(values.bond_pattern)) ? "" : "PROJECT_VALUE_INVALID:bond_pattern",
    text(values.selected_bia_tn10_table_4_row)?.startsWith("BIA_TN10_TABLE4:") ? "" : "PROJECT_VALUE_INVALID:selected_bia_tn10_table_4_row",
    brickRate !== null && brickRate > 0 ? "" : "PROJECT_VALUE_INVALID:selected_brick_quantity_per_m2",
    mortarRate !== null && mortarRate > 0 ? "" : "PROJECT_VALUE_INVALID:selected_mortar_quantity_per_m2",
    corrections.BRICK_FACTOR !== undefined && corrections.BRICK_FACTOR > 0 && corrections.MORTAR_FACTOR !== undefined && corrections.MORTAR_FACTOR > 0
      ? "" : "PROJECT_VALUE_INVALID:applicable_bond_correction_factors",
    waste.BRICK_PERCENT !== undefined && waste.BRICK_PERCENT >= 0 && waste.MORTAR_PERCENT !== undefined && waste.MORTAR_PERCENT >= 0
      ? "" : "PROJECT_VALUE_INVALID:selected_project_breakage_and_waste_allowances",
    packages.BRICK_PIECES !== undefined && packages.BRICK_PIECES > 0 && packages.MORTAR_M3 !== undefined && packages.MORTAR_M3 > 0
      ? "" : "PROJECT_VALUE_INVALID:supplier_package_quantities",
    meaningful(text(values.project_architect_engineer_or_estimator_approval_reference)) ? "" : "PROJECT_VALUE_INVALID:project_architect_engineer_or_estimator_approval_reference",
    ...componentConflicts,
  ].filter(Boolean);
  if (blockers.length) return nonApplied("BLOCKED_NOT_APPLICABLE", profile, input.parameter_values, blockers, BIA_TN10_MASONRY_REQUIRED_IDS);

  const netBrick = area! * brickRate! * corrections.BRICK_FACTOR! * (1 + waste.BRICK_PERCENT! / 100);
  const netMortar = area! * mortarRate! * corrections.MORTAR_FACTOR! * (1 + waste.MORTAR_PERCENT! / 100);
  const brickQuantity = packageRound(netBrick, packages.BRICK_PIECES!);
  const mortarQuantity = packageRound(netMortar, packages.MORTAR_M3!);
  const outputPairs = [["masonry_selected_brick_procurement_quantity_piece", brickQuantity],
    ["masonry_selected_mortar_procurement_quantity_m3", mortarQuantity]] as const;
  const conflicts = outputPairs.flatMap(([id, expected]) => {
    const actual = number(explicit(input.parameter_values, id));
    return actual !== null && Math.abs(actual - expected) > 1e-9 ? [`PHYSICAL_NORM_VALUE_CONFLICT:${id}=${actual}:norm_value=${expected}`] : [];
  });
  if (conflicts.length) return nonApplied("BLOCKED_NOT_APPLICABLE", profile, input.parameter_values, conflicts,
    [...BIA_TN10_MASONRY_REQUIRED_IDS, ...outputPairs.map(([id]) => id)]);
  const capturedAt = BIA_TN10_MASONRY_REQUIRED_IDS.map((id) => values[id]!.captured_at).sort().at(-1)!;
  const applicability = [`product_profile_id=${profile}`, `net_area_m2=${area}`, `selected_table_row=${text(values.selected_bia_tn10_table_4_row)}`,
    `brick_rate_piece_m2=${brickRate}`, `mortar_rate_m3_m2=${mortarRate}`,
    `bond_corrections=${text(values.applicable_bond_correction_factors)}`, `project_waste=${text(values.selected_project_breakage_and_waste_allowances)}`,
    `supplier_packages=${text(values.supplier_package_quantities)}`, "automatic_generic_binding=false", "automatic_fixed_seed_rates=false"].join(";");
  const parameterValues = Object.freeze({ ...input.parameter_values,
    masonry_selected_brick_procurement_quantity_piece: { value: brickQuantity, unit_id: "piece", source_type: "APPLICABLE_NORM" as const,
      source_id: BIA_TN10_MASONRY_SOURCE_ID, captured_at: capturedAt, confidence: "high" as const, applicability },
    masonry_selected_mortar_procurement_quantity_m3: { value: mortarQuantity, unit_id: "m3", source_type: "APPLICABLE_NORM" as const,
      source_id: BIA_TN10_MASONRY_SOURCE_ID, captured_at: capturedAt, confidence: "high" as const, applicability },
  });
  const result = { status: "APPLIED" as const, applicability_version: APPLICABILITY_VERSION, product_profile_id: profile,
    source_id: BIA_TN10_MASONRY_SOURCE_ID, norm_id: BIA_TN10_MASONRY_NORM_ID,
    source_document_version: BIA_TN10_MASONRY_SOURCE_METADATA.source_document_version,
    source_url: BIA_TN10_MASONRY_SOURCE_METADATA.source_url, exact_locator: BIA_TN10_MASONRY_SOURCE_METADATA.exact_locator,
    source_definition_hash: BIA_TN10_MASONRY_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...BIA_TN10_MASONRY_REQUIRED_IDS], produced_parameter_ids: outputPairs.map(([id]) => id),
    calculated_masonry_selected_brick_quantity_piece: brickQuantity,
    calculated_masonry_selected_mortar_quantity_m3: mortarQuantity, parameter_values: parameterValues, blockers: [] as const };
  return { ...result, deterministic_hash: estimateDeterministicHash(result) };
}
