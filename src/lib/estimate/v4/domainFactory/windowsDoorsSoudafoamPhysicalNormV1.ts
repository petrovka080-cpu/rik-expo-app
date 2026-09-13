import windowsDoorsNormPack from "../../../../../data/estimate-norms/professional/windows_doors.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const VERSION = "professional-physical-norm-applicability:v1" as const;
export const SOUDAFOAM_GENIUS_9900539_PRODUCT_PROFILE_ID = "manufacturer-profile:soudal:soudafoam-window-door-genius:9900539:600ml:v1" as const;
export const SOUDAFOAM_GENIUS_NORM_ID = "windows_doors_soudafoam_genius_can_per_joint_m_v1" as const;
export const SOUDAFOAM_GENIUS_SOURCE_ID = `src_professional_norm_pack_${SOUDAFOAM_GENIUS_NORM_ID}` as const;
export const SOUDAFOAM_GENIUS_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "qualified_joint_length_linear_m", "joint_width_mm", "joint_depth_mm", "total_joint_volume_l",
  "exact_product_master_code", "package_volume_ml", "en_17333_1_reference_joint_geometry",
  "can_temperature_c", "ambient_temperature_c", "surface_temperature_c", "substrate_type_and_condition",
  "surface_moistening_condition", "application_layer_count", "onsite_validated_joint_yield_m_per_can",
  "storage_and_expiry_condition", "external_uv_and_weather_protection_scope",
  "frame_fixings_tapes_membranes_and_sealants_scope",
] as const);
const norm = windowsDoorsNormPack.norm_items.find((item) => item.norm_id === SOUDAFOAM_GENIUS_NORM_ID);
if (!norm) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${SOUDAFOAM_GENIUS_NORM_ID}`);
if (windowsDoorsNormPack.work_group !== "windows_doors" || windowsDoorsNormPack.review_status !== "reviewed" ||
  norm.unit !== "can" || norm.rate.value !== 0.0625 || norm.applicability.product !== "Soudafoam Window & Door Genius" ||
  norm.applicability.master_code !== "9900539" || norm.applicability.tds_revision !== "08-05-2026" ||
  norm.applicability.reference_package_ml !== 600 || norm.applicability.joint_yield_m_en_17333_1_approximate !== 16 ||
  norm.applicability.product_page_different_gun_grade_reference_ml !== 750 ||
  norm.applicability.product_page_different_gun_grade_reference_yield_m !== 26 ||
  norm.applicability.joint_cross_section_and_reference_test_geometry_required !== true ||
  norm.applicability.onsite_yield_validation_required !== true || norm.applicability.not_uv_resistant !== true ||
  norm.applicability.frame_fixings_tapes_membranes_and_sealants_are_separate !== true ||
  norm.applicability.additional_waste_not_published !== true ||
  norm.parameters.length !== SOUDAFOAM_GENIUS_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  SOUDAFOAM_GENIUS_REQUIRED_EXPLICIT_PARAMETER_IDS.some((id) => !norm.parameters.includes(id)) ||
  norm.waste_percent_default !== 0 || norm.rounding.mode !== "ceil_after_exact_joint_geometry_and_onsite_yield_validation") {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${SOUDAFOAM_GENIUS_NORM_ID}`);
}
export const SOUDAFOAM_GENIUS_SOURCE_METADATA = Object.freeze({ source_id: SOUDAFOAM_GENIUS_SOURCE_ID,
  norm_id: SOUDAFOAM_GENIUS_NORM_ID, source_document_version: windowsDoorsNormPack.source_pack_version,
  source_title: norm.source.title, source_url: norm.source.url, exact_locator: norm.source.page,
  rate_value: norm.rate.value, rate_unit: norm.rate.unit,
  definition_hash: estimateDeterministicHash({ work_group: windowsDoorsNormPack.work_group,
    source_pack_version: windowsDoorsNormPack.source_pack_version, norm_item: norm }) });
export const SOUDAFOAM_GENIUS_RUNTIME_BINDING_V1 = Object.freeze({ norm_id: SOUDAFOAM_GENIUS_NORM_ID,
  work_group: "windows_doors", binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1", technology_class: "WINDOW_DOOR_JOINT_FOAM",
  operation_class: "INSTALL", scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: SOUDAFOAM_GENIUS_9900539_PRODUCT_PROFILE_ID, source_id: SOUDAFOAM_GENIUS_SOURCE_ID,
  source_document_version: SOUDAFOAM_GENIUS_SOURCE_METADATA.source_document_version,
  source_definition_hash: SOUDAFOAM_GENIUS_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: SOUDAFOAM_GENIUS_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["soudafoam_genius_required_can_count"] as const });
function explicit(values: Readonly<Record<string, ProfessionalParameterValueV4>>, id: string) {
  const value = values[id]; return !value || value.source_type === "VISIBLE_BASELINE_ASSUMPTION" ||
    (typeof value.value === "string" && !value.value.trim()) ? null : value;
}
function text(value: ProfessionalParameterValueV4 | null) { return typeof value?.value === "string" ? value.value.trim() || null : null; }
function number(value: ProfessionalParameterValueV4 | null) { if (!value) return null;
  const parsed = typeof value.value === "number" ? value.value : Number(String(value.value).replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null; }
function blocked(status: "NOT_REQUESTED" | "BLOCKED_REQUIRED_INPUTS" | "BLOCKED_NOT_APPLICABLE", profile: string | null,
  values: Readonly<Record<string, ProfessionalParameterValueV4>>, blockers: readonly string[], consumed: readonly string[] = []): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const base = { status, applicability_version: VERSION, product_profile_id: profile, source_id: SOUDAFOAM_GENIUS_SOURCE_ID,
    norm_id: SOUDAFOAM_GENIUS_NORM_ID, source_document_version: SOUDAFOAM_GENIUS_SOURCE_METADATA.source_document_version,
    source_url: SOUDAFOAM_GENIUS_SOURCE_METADATA.source_url, exact_locator: SOUDAFOAM_GENIUS_SOURCE_METADATA.exact_locator,
    source_definition_hash: SOUDAFOAM_GENIUS_SOURCE_METADATA.definition_hash, consumed_parameter_ids: [...consumed].sort(),
    produced_parameter_ids: [] as const, parameter_values: values, blockers: [...new Set(blockers)].sort() };
  return { ...base, deterministic_hash: estimateDeterministicHash(base) };
}
export function resolveSoudafoamGeniusPhysicalNormV1(input: { technology_class: string; operation_class: string;
  material_system?: string; scope_mode: string; parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>> }): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const profile = text(explicit(input.parameter_values, "product_profile_id"));
  if (profile !== SOUDAFOAM_GENIUS_9900539_PRODUCT_PROFILE_ID) return blocked("NOT_REQUESTED", profile, input.parameter_values, []);
  if (input.technology_class !== "WINDOW_DOOR_JOINT_FOAM" || input.operation_class !== "INSTALL" ||
    input.material_system !== "SOUDAFOAM_WINDOW_DOOR_GENIUS_9900539_600ML" || input.scope_mode !== "FULL_APPLICABLE_SCOPE") {
    return blocked("NOT_REQUESTED", profile, input.parameter_values, []);
  }
  const values = Object.fromEntries(SOUDAFOAM_GENIUS_REQUIRED_EXPLICIT_PARAMETER_IDS.map((id) => [id, explicit(input.parameter_values, id)]));
  const missing = SOUDAFOAM_GENIUS_REQUIRED_EXPLICIT_PARAMETER_IDS.filter((id) => values[id] === null)
    .map((id) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${id}`);
  if (missing.length) return blocked("BLOCKED_REQUIRED_INPUTS", profile, input.parameter_values, missing,
    SOUDAFOAM_GENIUS_REQUIRED_EXPLICIT_PARAMETER_IDS);
  const lengthM = number(values.qualified_joint_length_linear_m), widthMm = number(values.joint_width_mm), depthMm = number(values.joint_depth_mm);
  const volumeL = number(values.total_joint_volume_l), canC = number(values.can_temperature_c), ambientC = number(values.ambient_temperature_c);
  const surfaceC = number(values.surface_temperature_c), layers = number(values.application_layer_count);
  const onsiteYield = number(values.onsite_validated_joint_yield_m_per_can), packageMl = number(values.package_volume_ml);
  const calculatedVolumeL = lengthM === null || widthMm === null || depthMm === null ? null : Math.round(lengthM * widthMm * depthMm / 1000 * 1e6) / 1e6;
  const blockers = [lengthM !== null && lengthM > 0 ? "" : "PROJECT_VALUE_INVALID:qualified_joint_length_linear_m",
    widthMm !== null && widthMm > 0 ? "" : "PROJECT_VALUE_INVALID:joint_width_mm",
    depthMm !== null && depthMm > 0 ? "" : "PROJECT_VALUE_INVALID:joint_depth_mm",
    volumeL !== null && calculatedVolumeL !== null && Math.abs(volumeL - calculatedVolumeL) <= 0.000001 ? "" : "PROJECT_VALUE_CONFLICT:total_joint_volume_l",
    text(values.exact_product_master_code) === "9900539" ? "" : "PHYSICAL_NORM_VARIANT_CONFLICT:exact_product_master_code",
    packageMl === 600 ? "" : "PHYSICAL_NORM_VARIANT_CONFLICT:package_volume_ml",
    text(values.en_17333_1_reference_joint_geometry)?.startsWith("EN_17333_1_GEOMETRY:") ? "" : "PROJECT_VALUE_INVALID:en_17333_1_reference_joint_geometry",
    canC !== null && canC >= 5 && canC <= 30 ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:can_temperature_c",
    ambientC !== null && ambientC >= 5 && ambientC <= 30 ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:ambient_temperature_c",
    surfaceC !== null && surfaceC >= 5 && surfaceC <= 35 ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:surface_temperature_c",
    text(values.substrate_type_and_condition)?.startsWith("SUBSTRATE:") ? "" : "PROJECT_VALUE_INVALID:substrate_type_and_condition",
    text(values.surface_moistening_condition)?.startsWith("MOISTENING:") ? "" : "PROJECT_VALUE_INVALID:surface_moistening_condition",
    layers !== null && Number.isInteger(layers) && layers > 0 ? "" : "PROJECT_VALUE_INVALID:application_layer_count",
    onsiteYield !== null && onsiteYield > 0 && onsiteYield <= 16 ? "" : "PROJECT_VALUE_INVALID:onsite_validated_joint_yield_m_per_can",
    text(values.storage_and_expiry_condition)?.startsWith("STORAGE:") ? "" : "PROJECT_VALUE_INVALID:storage_and_expiry_condition",
    text(values.external_uv_and_weather_protection_scope)?.startsWith("SEPARATE_SCOPE:") ? "" : "PROJECT_VALUE_INVALID:external_uv_and_weather_protection_scope",
    text(values.frame_fixings_tapes_membranes_and_sealants_scope)?.startsWith("SEPARATE_SCOPE:") ? "" : "PROJECT_VALUE_INVALID:frame_fixings_tapes_membranes_and_sealants_scope"].filter(Boolean);
  if (blockers.length) return blocked("BLOCKED_NOT_APPLICABLE", profile, input.parameter_values, blockers,
    SOUDAFOAM_GENIUS_REQUIRED_EXPLICIT_PARAMETER_IDS);
  const cans = Math.ceil(lengthM! / onsiteYield!);
  const existing = number(explicit(input.parameter_values, "soudafoam_genius_required_can_count"));
  if (existing !== null && existing !== cans) return blocked("BLOCKED_NOT_APPLICABLE", profile, input.parameter_values,
    [`PHYSICAL_NORM_VALUE_CONFLICT:soudafoam_genius_required_can_count=${existing}:norm_value=${cans}`],
    [...SOUDAFOAM_GENIUS_REQUIRED_EXPLICIT_PARAMETER_IDS, "soudafoam_genius_required_can_count"]);
  const capturedAt = SOUDAFOAM_GENIUS_REQUIRED_EXPLICIT_PARAMETER_IDS.map((id) => values[id]!.captured_at).sort().at(-1)!;
  const applicability = [`product_profile_id=${profile}`, `qualified_joint_length_linear_m=${lengthM}`, `joint_width_mm=${widthMm}`,
    `joint_depth_mm=${depthMm}`, `total_joint_volume_l=${volumeL}`, `onsite_validated_joint_yield_m_per_can=${onsiteYield}`,
    `required_can_count=${cans}`, "tds_16m_used_as_project_rate=false", "different_750ml_26m_product=false",
    "manufacturer_waste_default=false", "uv_fixings_tapes_membranes_sealants_separate=true", "automatic_generic_binding=false"].join(";");
  const parameterValues = Object.freeze({ ...input.parameter_values, soudafoam_genius_required_can_count: { value: cans,
    unit_id: "can", source_type: "APPLICABLE_NORM" as const, source_id: SOUDAFOAM_GENIUS_SOURCE_ID,
    captured_at: capturedAt, confidence: "high" as const, applicability } });
  const base = { status: "APPLIED" as const, applicability_version: VERSION, product_profile_id: profile,
    source_id: SOUDAFOAM_GENIUS_SOURCE_ID, norm_id: SOUDAFOAM_GENIUS_NORM_ID,
    source_document_version: SOUDAFOAM_GENIUS_SOURCE_METADATA.source_document_version,
    source_url: SOUDAFOAM_GENIUS_SOURCE_METADATA.source_url, exact_locator: SOUDAFOAM_GENIUS_SOURCE_METADATA.exact_locator,
    source_definition_hash: SOUDAFOAM_GENIUS_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...SOUDAFOAM_GENIUS_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["soudafoam_genius_required_can_count"] as const,
    calculated_soudafoam_genius_required_can_count: cans, parameter_values: parameterValues, blockers: [] as const };
  return { ...base, deterministic_hash: estimateDeterministicHash(base) };
}
