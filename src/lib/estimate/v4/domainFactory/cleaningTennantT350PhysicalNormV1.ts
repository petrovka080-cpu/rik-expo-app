import cleaningNormPack from "../../../../../data/estimate-norms/professional/cleaning.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const VERSION = "professional-physical-norm-applicability:v1" as const;
export const TENNANT_T350_CONVENTIONAL_PRODUCT_PROFILE_ID = "manufacturer-profile:tennant-t350:600mm-dual-disk:conventional:v1" as const;
export const TENNANT_T350_CONVENTIONAL_NORM_ID = "cleaning_tennant_t350_600mm_conventional_practical_hour_m2_v1" as const;
export const TENNANT_T350_CONVENTIONAL_SOURCE_ID = `src_professional_norm_pack_${TENNANT_T350_CONVENTIONAL_NORM_ID}` as const;
export const TENNANT_T350_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "cleanable_hard_floor_area_m2", "machine_variant", "cleaning_path_mm", "cleaning_technology_mode",
  "required_pass_count", "soil_type", "obstruction_factor", "dump_fill_cycle_allowance",
  "battery_runtime_allowance", "manual_detail_cleaning_scope", "operator_labor_scope",
] as const);
const norm = cleaningNormPack.norm_items.find((item) => item.norm_id === TENNANT_T350_CONVENTIONAL_NORM_ID);
if (!norm) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${TENNANT_T350_CONVENTIONAL_NORM_ID}`);
if (cleaningNormPack.work_group !== "cleaning" || cleaningNormPack.review_status !== "reviewed" ||
  norm.unit !== "equipment_hour" || norm.rate.value !== 0.0003577818 ||
  norm.applicability.machine_variant !== "24_inch_600_mm_dual_disk" || norm.applicability.cleaning_path_mm !== 600 ||
  norm.applicability.cleaning_technology_mode !== "conventional" ||
  norm.applicability.manufacturer_practical_productivity_m2_per_hour !== 2795 ||
  norm.applicability.different_ec_h2o_practical_productivity_m2_per_hour !== 2874 ||
  norm.applicability.reciprocal_rate_is_derived !== true || norm.applicability.exact_machine_and_mode_confirmation_required !== true ||
  norm.applicability.project_specific_obstruction_soil_cycle_and_battery_adjustments_required !== true ||
  norm.applicability.manual_detail_cleaning_excluded_from_machine_rate !== true || norm.applicability.operator_labor_is_separate !== true ||
  norm.parameters.length !== TENNANT_T350_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  TENNANT_T350_REQUIRED_EXPLICIT_PARAMETER_IDS.some((id) => !norm.parameters.includes(id)) ||
  norm.waste_percent_default !== 0 || norm.rounding.mode !== "net_equipment_hours_before_separate_supplier_billing_rule") {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${TENNANT_T350_CONVENTIONAL_NORM_ID}`);
}
export const TENNANT_T350_CONVENTIONAL_SOURCE_METADATA = Object.freeze({
  source_id: TENNANT_T350_CONVENTIONAL_SOURCE_ID, norm_id: TENNANT_T350_CONVENTIONAL_NORM_ID,
  source_document_version: cleaningNormPack.source_pack_version, source_title: norm.source.title,
  source_url: norm.source.url, exact_locator: norm.source.page, rate_value: norm.rate.value, rate_unit: norm.rate.unit,
  productivity_m2_per_hour: norm.applicability.manufacturer_practical_productivity_m2_per_hour,
  definition_hash: estimateDeterministicHash({ work_group: cleaningNormPack.work_group, source_pack_version: cleaningNormPack.source_pack_version, norm_item: norm }),
});
export const TENNANT_T350_CONVENTIONAL_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: TENNANT_T350_CONVENTIONAL_NORM_ID, work_group: "cleaning", binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1", technology_class: "MECHANIZED_HARD_FLOOR_CLEANING",
  operation_class: "CLEAN", scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: TENNANT_T350_CONVENTIONAL_PRODUCT_PROFILE_ID, source_id: TENNANT_T350_CONVENTIONAL_SOURCE_ID,
  source_document_version: TENNANT_T350_CONVENTIONAL_SOURCE_METADATA.source_document_version,
  source_definition_hash: TENNANT_T350_CONVENTIONAL_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: TENNANT_T350_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["tennant_t350_project_equipment_hours"] as const,
});
function explicit(values: Readonly<Record<string, ProfessionalParameterValueV4>>, id: string) {
  const value = values[id];
  return !value || value.source_type === "VISIBLE_BASELINE_ASSUMPTION" || (typeof value.value === "string" && !value.value.trim()) ? null : value;
}
function text(value: ProfessionalParameterValueV4 | null) { return typeof value?.value === "string" ? value.value.trim() || null : null; }
function number(value: ProfessionalParameterValueV4 | null) {
  if (!value) return null;
  const parsed = typeof value.value === "number" ? value.value : Number(String(value.value).replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
function blocked(status: "NOT_REQUESTED" | "BLOCKED_REQUIRED_INPUTS" | "BLOCKED_NOT_APPLICABLE", profile: string | null,
  values: Readonly<Record<string, ProfessionalParameterValueV4>>, blockers: readonly string[], consumed: readonly string[] = []): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const base = { status, applicability_version: VERSION, product_profile_id: profile, source_id: TENNANT_T350_CONVENTIONAL_SOURCE_ID,
    norm_id: TENNANT_T350_CONVENTIONAL_NORM_ID, source_document_version: TENNANT_T350_CONVENTIONAL_SOURCE_METADATA.source_document_version,
    source_url: TENNANT_T350_CONVENTIONAL_SOURCE_METADATA.source_url, exact_locator: TENNANT_T350_CONVENTIONAL_SOURCE_METADATA.exact_locator,
    source_definition_hash: TENNANT_T350_CONVENTIONAL_SOURCE_METADATA.definition_hash, consumed_parameter_ids: [...consumed].sort(),
    produced_parameter_ids: [] as const, parameter_values: values, blockers: [...new Set(blockers)].sort() };
  return { ...base, deterministic_hash: estimateDeterministicHash(base) };
}
export function resolveTennantT350ConventionalPhysicalNormV1(input: { technology_class: string; operation_class: string;
  material_system?: string; scope_mode: string; parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>> }): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const profile = text(explicit(input.parameter_values, "product_profile_id"));
  if (profile !== TENNANT_T350_CONVENTIONAL_PRODUCT_PROFILE_ID) return blocked("NOT_REQUESTED", profile, input.parameter_values, []);
  if (input.technology_class !== "MECHANIZED_HARD_FLOOR_CLEANING" || input.operation_class !== "CLEAN" ||
    input.material_system !== "TENNANT_T350_600MM_DUAL_DISK_CONVENTIONAL" || input.scope_mode !== "FULL_APPLICABLE_SCOPE") {
    return blocked("NOT_REQUESTED", profile, input.parameter_values, []);
  }
  const values = Object.fromEntries(TENNANT_T350_REQUIRED_EXPLICIT_PARAMETER_IDS.map((id) => [id, explicit(input.parameter_values, id)]));
  const missing = TENNANT_T350_REQUIRED_EXPLICIT_PARAMETER_IDS.filter((id) => values[id] === null).map((id) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${id}`);
  if (missing.length) return blocked("BLOCKED_REQUIRED_INPUTS", profile, input.parameter_values, missing, TENNANT_T350_REQUIRED_EXPLICIT_PARAMETER_IDS);
  const area = number(values.cleanable_hard_floor_area_m2); const variant = text(values.machine_variant)?.toUpperCase();
  const path = number(values.cleaning_path_mm); const mode = text(values.cleaning_technology_mode)?.toUpperCase();
  const passes = number(values.required_pass_count); const soil = text(values.soil_type); const obstruction = number(values.obstruction_factor);
  const cycleHours = number(values.dump_fill_cycle_allowance); const batteryHours = number(values.battery_runtime_allowance);
  const detailScope = text(values.manual_detail_cleaning_scope); const laborScope = text(values.operator_labor_scope);
  const blockers = [
    area !== null && area > 0 ? "" : "PROJECT_VALUE_INVALID:cleanable_hard_floor_area_m2",
    variant === "TENNANT_T350_24_INCH_600_MM_DUAL_DISK" ? "" : `PHYSICAL_NORM_VARIANT_CONFLICT:machine_variant=${variant}`,
    path === 600 ? "" : `PHYSICAL_NORM_VARIANT_CONFLICT:cleaning_path_mm=${path}`,
    mode === "CONVENTIONAL" ? "" : `PHYSICAL_NORM_VARIANT_CONFLICT:cleaning_technology_mode=${mode}`,
    passes !== null && Number.isInteger(passes) && passes > 0 ? "" : "PROJECT_VALUE_INVALID:required_pass_count",
    soil && soil.length >= 4 ? "" : "PROJECT_VALUE_INVALID:soil_type",
    obstruction !== null && obstruction >= 1 ? "" : "PROJECT_VALUE_INVALID:obstruction_factor",
    cycleHours !== null && cycleHours >= 0 ? "" : "PROJECT_VALUE_INVALID:dump_fill_cycle_allowance",
    batteryHours !== null && batteryHours >= 0 ? "" : "PROJECT_VALUE_INVALID:battery_runtime_allowance",
    detailScope?.startsWith("SEPARATE_SCOPE:") ? "" : "PROJECT_VALUE_INVALID:manual_detail_cleaning_scope",
    laborScope?.startsWith("SEPARATE_SCOPE:") ? "" : "PROJECT_VALUE_INVALID:operator_labor_scope",
  ].filter(Boolean);
  if (blockers.length) return blocked("BLOCKED_NOT_APPLICABLE", profile, input.parameter_values, blockers, TENNANT_T350_REQUIRED_EXPLICIT_PARAMETER_IDS);
  const baseHours = area! * passes! / 2795;
  const projectHours = baseHours * obstruction! + cycleHours! + batteryHours!;
  const output = number(explicit(input.parameter_values, "tennant_t350_project_equipment_hours"));
  if (output !== null && Math.abs(output - projectHours) > 1e-9) return blocked("BLOCKED_NOT_APPLICABLE", profile, input.parameter_values,
    [`PHYSICAL_NORM_VALUE_CONFLICT:tennant_t350_project_equipment_hours=${output}:norm_value=${projectHours}`],
    [...TENNANT_T350_REQUIRED_EXPLICIT_PARAMETER_IDS, "tennant_t350_project_equipment_hours"]);
  const capturedAt = TENNANT_T350_REQUIRED_EXPLICIT_PARAMETER_IDS.map((id) => values[id]!.captured_at).sort().at(-1)!;
  const applicability = [`area=${area}`, `passes=${passes}`, "manufacturer_productivity_m2_h=2795", `manufacturer_base_hours=${baseHours}`,
    `obstruction_factor=${obstruction}`, `dump_fill_cycle_allowance_hours=${cycleHours}`, `battery_runtime_allowance_hours=${batteryHours}`,
    `tennant_t350_project_equipment_hours=${projectHours}`, "ec_h2o_variant=false", "operator_labor_separate=true",
    "manual_detail_cleaning_separate=true", "supplier_billing_increment_separate=true"].join(";");
  const parameterValues = Object.freeze({ ...input.parameter_values, tennant_t350_project_equipment_hours: { value: projectHours,
    unit_id: "equipment_hour", source_type: "APPLICABLE_NORM" as const, source_id: TENNANT_T350_CONVENTIONAL_SOURCE_ID,
    captured_at: capturedAt, confidence: "high" as const, applicability } });
  const base = { status: "APPLIED" as const, applicability_version: VERSION, product_profile_id: profile,
    source_id: TENNANT_T350_CONVENTIONAL_SOURCE_ID, norm_id: TENNANT_T350_CONVENTIONAL_NORM_ID,
    source_document_version: TENNANT_T350_CONVENTIONAL_SOURCE_METADATA.source_document_version,
    source_url: TENNANT_T350_CONVENTIONAL_SOURCE_METADATA.source_url, exact_locator: TENNANT_T350_CONVENTIONAL_SOURCE_METADATA.exact_locator,
    source_definition_hash: TENNANT_T350_CONVENTIONAL_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...TENNANT_T350_REQUIRED_EXPLICIT_PARAMETER_IDS], produced_parameter_ids: ["tennant_t350_project_equipment_hours"] as const,
    calculated_tennant_t350_project_equipment_hours: projectHours, parameter_values: parameterValues, blockers: [] as const };
  return { ...base, deterministic_hash: estimateDeterministicHash(base) };
}
