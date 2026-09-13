import landscapingNormPack from "../../../../../data/estimate-norms/professional/landscaping.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const VERSION = "professional-physical-norm-applicability:v1" as const;
export const RAIN_BIRD_XFD_06_12_500_PRODUCT_PROFILE_ID =
  "manufacturer-profile:rain-bird:xfd-06-12-500:d39717e:v1" as const;
export const RAIN_BIRD_XFD_DRIPLINE_NORM_ID =
  "landscaping_rain_bird_xfd_dripline_m_route_m_v1" as const;
export const RAIN_BIRD_XFD_DRIPLINE_SOURCE_ID =
  `src_professional_norm_pack_${RAIN_BIRD_XFD_DRIPLINE_NORM_ID}` as const;
export const RAIN_BIRD_XFD_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "approved_dripline_route_linear_m", "irrigated_planting_area_and_layout", "exact_xfd_model",
  "emitter_spacing_cm", "emitter_flow_l_h", "zone_inlet_pressure_bar",
  "maximum_lateral_length_table_check", "zone_total_flow_l_h", "zone_hydraulic_design",
  "water_source_and_quality", "filtration_mesh", "pressure_regulation_scope",
  "header_and_manifold_schedule", "fitting_schedule", "flush_point_schedule",
  "elevation_and_slope_conditions", "selected_coil_length_m", "reusable_coil_remainder_plan",
  "project_cutting_allowance_percent",
] as const);

const norm = landscapingNormPack.norm_items.find((item) => item.norm_id === RAIN_BIRD_XFD_DRIPLINE_NORM_ID);
if (!norm) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${RAIN_BIRD_XFD_DRIPLINE_NORM_ID}`);
if (
  landscapingNormPack.work_group !== "landscaping" || landscapingNormPack.review_status !== "reviewed" ||
  norm.unit !== "linear_m" || norm.rate.value !== 1 ||
  norm.applicability.product_family !== "Rain Bird XFD Dripline" ||
  norm.applicability.technical_specification !== "D39717E 04/22" ||
  JSON.stringify(norm.applicability.emitter_spacing_cm) !== JSON.stringify([30.5, 45.7]) ||
  JSON.stringify(norm.applicability.emitter_flow_l_h) !== JSON.stringify([2.3, 3.5]) ||
  JSON.stringify(norm.applicability.pressure_range_bar) !== JSON.stringify([0.58, 4.14]) ||
  norm.applicability.required_filtration_mesh !== 120 ||
  JSON.stringify(norm.applicability.available_coil_lengths_m) !== JSON.stringify([30.5, 76.2, 152.4]) ||
  norm.applicability.exact_maximum_lateral_table_cell_required !== true ||
  norm.applicability.zone_flow_pressure_and_water_quality_design_required !== true ||
  norm.applicability.fittings_headers_flush_points_and_pressure_regulation_are_separate !== true ||
  norm.applicability.coil_remainder_reuse_and_cut_plan_required !== true ||
  norm.applicability.rate_is_geometric_identity_not_manufacturer_consumption_norm !== true ||
  norm.applicability.additional_waste_not_published !== true ||
  norm.parameters.length !== RAIN_BIRD_XFD_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  RAIN_BIRD_XFD_REQUIRED_EXPLICIT_PARAMETER_IDS.some((id) => !norm.parameters.includes(id)) ||
  norm.waste_percent_default !== 0 ||
  norm.rounding.mode !== "net_approved_route_m_before_explicit_30_5_76_2_or_152_4_m_coil_cut_plan"
) throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${RAIN_BIRD_XFD_DRIPLINE_NORM_ID}`);

export const RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA = Object.freeze({
  source_id: RAIN_BIRD_XFD_DRIPLINE_SOURCE_ID, norm_id: RAIN_BIRD_XFD_DRIPLINE_NORM_ID,
  source_document_version: landscapingNormPack.source_pack_version, source_title: norm.source.title,
  source_url: norm.source.url, exact_locator: norm.source.page, rate_value: norm.rate.value,
  rate_unit: norm.rate.unit,
  definition_hash: estimateDeterministicHash({ work_group: landscapingNormPack.work_group,
    source_pack_version: landscapingNormPack.source_pack_version, norm_item: norm }),
});
export const RAIN_BIRD_XFD_DRIPLINE_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: RAIN_BIRD_XFD_DRIPLINE_NORM_ID, work_group: "landscaping",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "DRIP_IRRIGATION", operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: RAIN_BIRD_XFD_06_12_500_PRODUCT_PROFILE_ID,
  source_id: RAIN_BIRD_XFD_DRIPLINE_SOURCE_ID,
  source_document_version: RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA.source_document_version,
  source_definition_hash: RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: RAIN_BIRD_XFD_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["rain_bird_xfd_project_dripline_linear_m"] as const,
});

function explicit(values: Readonly<Record<string, ProfessionalParameterValueV4>>, id: string) {
  const value = values[id];
  return !value || value.source_type === "VISIBLE_BASELINE_ASSUMPTION" ||
    (typeof value.value === "string" && !value.value.trim()) ? null : value;
}
function text(value: ProfessionalParameterValueV4 | null): string | null {
  return typeof value?.value === "string" ? value.value.trim() || null : null;
}
function number(value: ProfessionalParameterValueV4 | null): number | null {
  if (!value) return null;
  const parsed = typeof value.value === "number" ? value.value : Number(String(value.value).replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
function blocked(status: "NOT_REQUESTED" | "BLOCKED_REQUIRED_INPUTS" | "BLOCKED_NOT_APPLICABLE", profile: string | null,
  values: Readonly<Record<string, ProfessionalParameterValueV4>>, blockers: readonly string[],
  consumed: readonly string[] = []): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const base = { status, applicability_version: VERSION, product_profile_id: profile,
    source_id: RAIN_BIRD_XFD_DRIPLINE_SOURCE_ID, norm_id: RAIN_BIRD_XFD_DRIPLINE_NORM_ID,
    source_document_version: RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA.source_document_version,
    source_url: RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA.source_url,
    exact_locator: RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA.exact_locator,
    source_definition_hash: RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...consumed].sort(), produced_parameter_ids: [] as const,
    parameter_values: values, blockers: [...new Set(blockers)].sort() };
  return { ...base, deterministic_hash: estimateDeterministicHash(base) };
}

export function resolveRainBirdXfdDriplinePhysicalNormV1(input: { technology_class: string; operation_class: string;
  material_system?: string; scope_mode: string;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>> }): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const profile = text(explicit(input.parameter_values, "product_profile_id"));
  if (profile !== RAIN_BIRD_XFD_06_12_500_PRODUCT_PROFILE_ID) return blocked("NOT_REQUESTED", profile, input.parameter_values, []);
  if (input.technology_class !== "DRIP_IRRIGATION" || input.operation_class !== "INSTALL" ||
    input.material_system !== "RAIN_BIRD_XFD_06_12_500" || input.scope_mode !== "FULL_APPLICABLE_SCOPE") {
    return blocked("NOT_REQUESTED", profile, input.parameter_values, []);
  }
  const values = Object.fromEntries(RAIN_BIRD_XFD_REQUIRED_EXPLICIT_PARAMETER_IDS.map((id) => [id, explicit(input.parameter_values, id)]));
  const missing = RAIN_BIRD_XFD_REQUIRED_EXPLICIT_PARAMETER_IDS.filter((id) => values[id] === null)
    .map((id) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${id}`);
  if (missing.length) return blocked("BLOCKED_REQUIRED_INPUTS", profile, input.parameter_values, missing,
    RAIN_BIRD_XFD_REQUIRED_EXPLICIT_PARAMETER_IDS);

  const routeM = number(values.approved_dripline_route_linear_m);
  const spacingCm = number(values.emitter_spacing_cm);
  const flowLh = number(values.emitter_flow_l_h);
  const pressureBar = number(values.zone_inlet_pressure_bar);
  const zoneFlowLh = number(values.zone_total_flow_l_h);
  const filterMesh = number(values.filtration_mesh);
  const coilM = number(values.selected_coil_length_m);
  const allowancePercent = number(values.project_cutting_allowance_percent);
  const blockers = [
    routeM !== null && routeM > 0 ? "" : "PROJECT_VALUE_INVALID:approved_dripline_route_linear_m",
    text(values.irrigated_planting_area_and_layout)?.startsWith("LAYOUT_REF:") ? "" : "PROJECT_VALUE_INVALID:irrigated_planting_area_and_layout",
    text(values.exact_xfd_model) === "XFD-06-12-500" ? "" : "PHYSICAL_NORM_VARIANT_CONFLICT:exact_xfd_model",
    spacingCm === 30.5 ? "" : "PHYSICAL_NORM_VARIANT_CONFLICT:emitter_spacing_cm",
    flowLh === 2.3 ? "" : "PHYSICAL_NORM_VARIANT_CONFLICT:emitter_flow_l_h",
    pressureBar !== null && pressureBar >= 0.58 && pressureBar <= 4.14 ? "" : "PROJECT_VALUE_INVALID:zone_inlet_pressure_bar",
    text(values.maximum_lateral_length_table_check)?.startsWith("TABLE_CELL_CONFIRMED:") ? "" : "PROJECT_VALUE_INVALID:maximum_lateral_length_table_check",
    zoneFlowLh !== null && zoneFlowLh > 0 ? "" : "PROJECT_VALUE_INVALID:zone_total_flow_l_h",
    text(values.zone_hydraulic_design)?.startsWith("HYDRAULIC_DESIGN:") ? "" : "PROJECT_VALUE_INVALID:zone_hydraulic_design",
    text(values.water_source_and_quality)?.startsWith("WATER_SOURCE:") ? "" : "PROJECT_VALUE_INVALID:water_source_and_quality",
    filterMesh === 120 ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:filtration_mesh",
    text(values.pressure_regulation_scope)?.startsWith("PRESSURE_SCOPE:") ? "" : "PROJECT_VALUE_INVALID:pressure_regulation_scope",
    text(values.header_and_manifold_schedule)?.startsWith("SCHEDULE_REF:") ? "" : "PROJECT_VALUE_INVALID:header_and_manifold_schedule",
    text(values.fitting_schedule)?.startsWith("SCHEDULE_REF:") ? "" : "PROJECT_VALUE_INVALID:fitting_schedule",
    text(values.flush_point_schedule)?.startsWith("SCHEDULE_REF:") ? "" : "PROJECT_VALUE_INVALID:flush_point_schedule",
    text(values.elevation_and_slope_conditions)?.startsWith("SITE_REF:") ? "" : "PROJECT_VALUE_INVALID:elevation_and_slope_conditions",
    coilM === 152.4 ? "" : "PHYSICAL_NORM_VARIANT_CONFLICT:selected_coil_length_m",
    text(values.reusable_coil_remainder_plan)?.startsWith("CUT_PLAN:") ? "" : "PROJECT_VALUE_INVALID:reusable_coil_remainder_plan",
    allowancePercent !== null && allowancePercent >= 0 && allowancePercent <= 20
      ? "" : "PROJECT_VALUE_INVALID:project_cutting_allowance_percent",
  ].filter(Boolean);
  if (blockers.length) return blocked("BLOCKED_NOT_APPLICABLE", profile, input.parameter_values, blockers,
    RAIN_BIRD_XFD_REQUIRED_EXPLICIT_PARAMETER_IDS);

  const projectM = Math.round(routeM! * (1 + allowancePercent! / 100) * 1_000_000) / 1_000_000;
  const existing = number(explicit(input.parameter_values, "rain_bird_xfd_project_dripline_linear_m"));
  if (existing !== null && existing !== projectM) return blocked("BLOCKED_NOT_APPLICABLE", profile, input.parameter_values,
    [`PHYSICAL_NORM_VALUE_CONFLICT:rain_bird_xfd_project_dripline_linear_m=${existing}:norm_value=${projectM}`],
    [...RAIN_BIRD_XFD_REQUIRED_EXPLICIT_PARAMETER_IDS, "rain_bird_xfd_project_dripline_linear_m"]);
  const capturedAt = RAIN_BIRD_XFD_REQUIRED_EXPLICIT_PARAMETER_IDS.map((id) => values[id]!.captured_at).sort().at(-1)!;
  const applicability = [`product_profile_id=${profile}`, `approved_route_linear_m=${routeM}`,
    `project_cutting_allowance_percent=${allowancePercent}`, `project_dripline_linear_m=${projectM}`,
    `emitter_spacing_cm=${spacingCm}`, `emitter_flow_l_h=${flowLh}`, `zone_inlet_pressure_bar=${pressureBar}`,
    `zone_total_flow_l_h=${zoneFlowLh}`, "geometric_identity=true", "manufacturer_waste_default=false",
    "fittings_headers_flush_points_pressure_regulation_separate=true", "coil_rounding_separate_cut_plan=true",
    "automatic_generic_binding=false"].join(";");
  const parameterValues = Object.freeze({ ...input.parameter_values, rain_bird_xfd_project_dripline_linear_m: {
    value: projectM, unit_id: "linear_m", source_type: "APPLICABLE_NORM" as const,
    source_id: RAIN_BIRD_XFD_DRIPLINE_SOURCE_ID, captured_at: capturedAt,
    confidence: "high" as const, applicability } });
  const base = { status: "APPLIED" as const, applicability_version: VERSION, product_profile_id: profile,
    source_id: RAIN_BIRD_XFD_DRIPLINE_SOURCE_ID, norm_id: RAIN_BIRD_XFD_DRIPLINE_NORM_ID,
    source_document_version: RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA.source_document_version,
    source_url: RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA.source_url,
    exact_locator: RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA.exact_locator,
    source_definition_hash: RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...RAIN_BIRD_XFD_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["rain_bird_xfd_project_dripline_linear_m"] as const,
    calculated_rain_bird_xfd_project_dripline_linear_m: projectM,
    parameter_values: parameterValues, blockers: [] as const };
  return { ...base, deterministic_hash: estimateDeterministicHash(base) };
}
