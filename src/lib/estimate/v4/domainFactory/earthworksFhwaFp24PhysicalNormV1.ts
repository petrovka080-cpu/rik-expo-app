import earthworksNormPack from "../../../../../data/estimate-norms/professional/earthworks.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";
const VERSION = "professional-physical-norm-applicability:v1" as const;
export const FHWA_FP24_SECTION208_PRODUCT_PROFILE_ID = "public-standard:fhwa-fp24:section-208:structural-backfill:v1" as const;
export const FHWA_FP24_SECTION208_NORM_ID = "earthworks_fhwa_fp24_structural_backfill_lifts_per_m_v1" as const;
export const FHWA_FP24_SECTION208_SOURCE_ID = `src_professional_norm_pack_${FHWA_FP24_SECTION208_NORM_ID}` as const;
export const FHWA_FP24_SECTION208_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "compacted_backfill_depth_m", "fhwa_fp24_project_applicability_confirmed", "project_supplemental_specification_revision",
  "structure_and_excavation_limits", "material_source_and_section_704_01_qualification", "material_class_and_rock_content",
  "selected_compacted_lift_thickness_m", "moisture_condition_and_optimum_moisture", "aashto_t99_method_c_maximum_dry_density",
  "required_density_percent", "aashto_t310_or_approved_in_place_test_method", "density_test_count_per_lift",
  "even_placement_around_structure_sequence", "concrete_design_strength_before_backfill_percent", "running_waterway_condition",
  "selected_compaction_equipment", "rocky_material_exception_procedure", "regional_code_and_geotechnical_specification",
] as const);
const norm = earthworksNormPack.norm_items.find((item) => item.norm_id === FHWA_FP24_SECTION208_NORM_ID);
if (!norm) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${FHWA_FP24_SECTION208_NORM_ID}`);
if (earthworksNormPack.work_group !== "earthworks" || earthworksNormPack.review_status !== "reviewed" ||
  norm.unit !== "lift" || norm.rate.value !== 6.5616798 || norm.applicability.specification !== "FHWA FP-24" ||
  norm.applicability.maximum_compacted_lift_m !== 0.1524 ||
  norm.applicability.minimum_density_percent_of_aashto_t99_method_c !== 95 ||
  norm.applicability.in_place_test_method !== "AASHTO T 310 or other approved procedures" ||
  norm.applicability.structural_backfill_density_tests_per_lift !== 2 ||
  norm.applicability.minimum_concrete_design_strength_before_backfill_percent !== 80 ||
  norm.applicability.calculation !== "ceil(compacted_backfill_depth_m / selected_compacted_lift_thickness_m)" ||
  norm.applicability.rocky_material_exception_requires_separate_visible_consolidation_acceptance !== true ||
  norm.applicability.project_supplement_and_geotechnical_specification_override_required !== true ||
  norm.applicability.not_applicable_to_generic_earthworks_or_embankment_without_section_208_scope !== true ||
  norm.parameters.length !== FHWA_FP24_SECTION208_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  FHWA_FP24_SECTION208_REQUIRED_EXPLICIT_PARAMETER_IDS.some((id) => !norm.parameters.includes(id)) ||
  norm.waste_percent_default !== 0 || norm.rounding.mode !== "ceil_selected_lift_count_after_section_208_and_project_specification_confirmation") {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${FHWA_FP24_SECTION208_NORM_ID}`);
}
export const FHWA_FP24_SECTION208_SOURCE_METADATA = Object.freeze({ source_id: FHWA_FP24_SECTION208_SOURCE_ID,
  norm_id: FHWA_FP24_SECTION208_NORM_ID, source_document_version: earthworksNormPack.source_pack_version,
  source_title: norm.source.title, source_url: norm.source.url, exact_locator: norm.source.page,
  rate_value: norm.rate.value, rate_unit: norm.rate.unit,
  definition_hash: estimateDeterministicHash({ work_group: earthworksNormPack.work_group,
    source_pack_version: earthworksNormPack.source_pack_version, norm_item: norm }) });
export const FHWA_FP24_SECTION208_RUNTIME_BINDING_V1 = Object.freeze({ norm_id: FHWA_FP24_SECTION208_NORM_ID,
  work_group: "earthworks", binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1", technology_class: "STRUCTURAL_BACKFILL",
  operation_class: "BACKFILL", scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: FHWA_FP24_SECTION208_PRODUCT_PROFILE_ID, source_id: FHWA_FP24_SECTION208_SOURCE_ID,
  source_document_version: FHWA_FP24_SECTION208_SOURCE_METADATA.source_document_version,
  source_definition_hash: FHWA_FP24_SECTION208_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: FHWA_FP24_SECTION208_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["fhwa_fp24_structural_backfill_lift_count"] as const });
function explicit(values: Readonly<Record<string, ProfessionalParameterValueV4>>, id: string) { const value = values[id];
  return !value || value.source_type === "VISIBLE_BASELINE_ASSUMPTION" || (typeof value.value === "string" && !value.value.trim()) ? null : value; }
function text(value: ProfessionalParameterValueV4 | null) { return typeof value?.value === "string" ? value.value.trim() || null : null; }
function number(value: ProfessionalParameterValueV4 | null) { if (!value) return null;
  const parsed = typeof value.value === "number" ? value.value : Number(String(value.value).replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null; }
function bool(value: ProfessionalParameterValueV4 | null) { return typeof value?.value === "boolean" ? value.value : null; }
function blocked(status: "NOT_REQUESTED" | "BLOCKED_REQUIRED_INPUTS" | "BLOCKED_NOT_APPLICABLE", profile: string | null,
  values: Readonly<Record<string, ProfessionalParameterValueV4>>, blockers: readonly string[], consumed: readonly string[] = []): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const base = { status, applicability_version: VERSION, product_profile_id: profile, source_id: FHWA_FP24_SECTION208_SOURCE_ID,
    norm_id: FHWA_FP24_SECTION208_NORM_ID, source_document_version: FHWA_FP24_SECTION208_SOURCE_METADATA.source_document_version,
    source_url: FHWA_FP24_SECTION208_SOURCE_METADATA.source_url, exact_locator: FHWA_FP24_SECTION208_SOURCE_METADATA.exact_locator,
    source_definition_hash: FHWA_FP24_SECTION208_SOURCE_METADATA.definition_hash, consumed_parameter_ids: [...consumed].sort(),
    produced_parameter_ids: [] as const, parameter_values: values, blockers: [...new Set(blockers)].sort() };
  return { ...base, deterministic_hash: estimateDeterministicHash(base) };
}
export function resolveFhwaFp24Section208PhysicalNormV1(input: { technology_class: string; operation_class: string;
  material_system?: string; scope_mode: string; parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>> }): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const profile = text(explicit(input.parameter_values, "product_profile_id"));
  if (profile !== FHWA_FP24_SECTION208_PRODUCT_PROFILE_ID) return blocked("NOT_REQUESTED", profile, input.parameter_values, []);
  if (input.technology_class !== "STRUCTURAL_BACKFILL" || input.operation_class !== "BACKFILL" ||
    input.material_system !== "FHWA_FP24_SECTION208_STRUCTURAL_BACKFILL" || input.scope_mode !== "FULL_APPLICABLE_SCOPE") {
    return blocked("NOT_REQUESTED", profile, input.parameter_values, []);
  }
  const values = Object.fromEntries(FHWA_FP24_SECTION208_REQUIRED_EXPLICIT_PARAMETER_IDS.map((id) => [id, explicit(input.parameter_values, id)]));
  const missing = FHWA_FP24_SECTION208_REQUIRED_EXPLICIT_PARAMETER_IDS.filter((id) => values[id] === null)
    .map((id) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${id}`);
  if (missing.length) return blocked("BLOCKED_REQUIRED_INPUTS", profile, input.parameter_values, missing,
    FHWA_FP24_SECTION208_REQUIRED_EXPLICIT_PARAMETER_IDS);
  const depthM = number(values.compacted_backfill_depth_m), liftM = number(values.selected_compacted_lift_thickness_m);
  const density = number(values.required_density_percent), tests = number(values.density_test_count_per_lift);
  const strength = number(values.concrete_design_strength_before_backfill_percent), maxDryDensity = number(values.aashto_t99_method_c_maximum_dry_density);
  const blockers = [depthM !== null && depthM > 0 ? "" : "PROJECT_VALUE_INVALID:compacted_backfill_depth_m",
    bool(values.fhwa_fp24_project_applicability_confirmed) === true ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:fhwa_fp24_project_applicability_confirmed",
    text(values.project_supplemental_specification_revision)?.startsWith("SUPPLEMENT_REF:") ? "" : "PROJECT_VALUE_INVALID:project_supplemental_specification_revision",
    text(values.structure_and_excavation_limits)?.startsWith("LIMITS_REF:") ? "" : "PROJECT_VALUE_INVALID:structure_and_excavation_limits",
    text(values.material_source_and_section_704_01_qualification)?.startsWith("SECTION_704_01:") ? "" : "PROJECT_VALUE_INVALID:material_source_and_section_704_01_qualification",
    text(values.material_class_and_rock_content)?.startsWith("MATERIAL_CLASS:") ? "" : "PROJECT_VALUE_INVALID:material_class_and_rock_content",
    liftM !== null && liftM > 0 && liftM <= 0.1524 ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:selected_compacted_lift_thickness_m",
    text(values.moisture_condition_and_optimum_moisture)?.startsWith("MOISTURE_REF:") ? "" : "PROJECT_VALUE_INVALID:moisture_condition_and_optimum_moisture",
    maxDryDensity !== null && maxDryDensity > 0 ? "" : "PROJECT_VALUE_INVALID:aashto_t99_method_c_maximum_dry_density",
    density !== null && density >= 95 ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:required_density_percent",
    text(values.aashto_t310_or_approved_in_place_test_method)?.startsWith("AASHTO_T310:") ? "" : "PROJECT_VALUE_INVALID:aashto_t310_or_approved_in_place_test_method",
    tests === 2 ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:density_test_count_per_lift",
    text(values.even_placement_around_structure_sequence)?.startsWith("SEQUENCE_REF:") ? "" : "PROJECT_VALUE_INVALID:even_placement_around_structure_sequence",
    strength !== null && strength >= 80 ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:concrete_design_strength_before_backfill_percent",
    text(values.running_waterway_condition)?.startsWith("WATERWAY:") ? "" : "PROJECT_VALUE_INVALID:running_waterway_condition",
    text(values.selected_compaction_equipment)?.startsWith("EQUIPMENT:") ? "" : "PROJECT_VALUE_INVALID:selected_compaction_equipment",
    text(values.rocky_material_exception_procedure)?.startsWith("ROCK_EXCEPTION:") ? "" : "PROJECT_VALUE_INVALID:rocky_material_exception_procedure",
    text(values.regional_code_and_geotechnical_specification)?.startsWith("GEOTECH_REF:") ? "" : "PROJECT_VALUE_INVALID:regional_code_and_geotechnical_specification"].filter(Boolean);
  if (blockers.length) return blocked("BLOCKED_NOT_APPLICABLE", profile, input.parameter_values, blockers,
    FHWA_FP24_SECTION208_REQUIRED_EXPLICIT_PARAMETER_IDS);
  const lifts = Math.ceil(depthM! / liftM!);
  const existing = number(explicit(input.parameter_values, "fhwa_fp24_structural_backfill_lift_count"));
  if (existing !== null && existing !== lifts) return blocked("BLOCKED_NOT_APPLICABLE", profile, input.parameter_values,
    [`PHYSICAL_NORM_VALUE_CONFLICT:fhwa_fp24_structural_backfill_lift_count=${existing}:norm_value=${lifts}`],
    [...FHWA_FP24_SECTION208_REQUIRED_EXPLICIT_PARAMETER_IDS, "fhwa_fp24_structural_backfill_lift_count"]);
  const capturedAt = FHWA_FP24_SECTION208_REQUIRED_EXPLICIT_PARAMETER_IDS.map((id) => values[id]!.captured_at).sort().at(-1)!;
  const applicability = [`product_profile_id=${profile}`, `compacted_backfill_depth_m=${depthM}`,
    `selected_compacted_lift_thickness_m=${liftM}`, `structural_backfill_lift_count=${lifts}`,
    `required_density_percent=${density}`, `density_test_count_per_lift=${tests}`, `concrete_strength_percent=${strength}`,
    "formula=ceil(depth/selected_lift_thickness)", "generic_earthworks_binding=false", "rock_exception_separate=true"].join(";");
  const parameterValues = Object.freeze({ ...input.parameter_values, fhwa_fp24_structural_backfill_lift_count: {
    value: lifts, unit_id: "lift", source_type: "APPLICABLE_NORM" as const, source_id: FHWA_FP24_SECTION208_SOURCE_ID,
    captured_at: capturedAt, confidence: "high" as const, applicability } });
  const base = { status: "APPLIED" as const, applicability_version: VERSION, product_profile_id: profile,
    source_id: FHWA_FP24_SECTION208_SOURCE_ID, norm_id: FHWA_FP24_SECTION208_NORM_ID,
    source_document_version: FHWA_FP24_SECTION208_SOURCE_METADATA.source_document_version,
    source_url: FHWA_FP24_SECTION208_SOURCE_METADATA.source_url, exact_locator: FHWA_FP24_SECTION208_SOURCE_METADATA.exact_locator,
    source_definition_hash: FHWA_FP24_SECTION208_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...FHWA_FP24_SECTION208_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["fhwa_fp24_structural_backfill_lift_count"] as const,
    calculated_fhwa_fp24_structural_backfill_lift_count: lifts, parameter_values: parameterValues, blockers: [] as const };
  return { ...base, deterministic_hash: estimateDeterministicHash(base) };
}
