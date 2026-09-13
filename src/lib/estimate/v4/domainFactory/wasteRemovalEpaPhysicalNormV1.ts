import wasteNormPack from "../../../../../data/estimate-norms/professional/waste_removal.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";
const VERSION = "professional-physical-norm-applicability:v1" as const;
export const EPA_CD_CONCRETE_PRODUCT_PROFILE_ID = "public-reference:us-epa-2016:cd-concrete-860-lb-yd3:v1" as const;
export const EPA_CD_COMPOSITE_PRODUCT_PROFILE_ID = "public-reference:us-epa-2016:cd-composite-417-lb-yd3:v1" as const;
export const EPA_CD_CONCRETE_NORM_ID = "waste_removal_us_epa_cd_concrete_kg_m3_v1" as const;
export const EPA_CD_COMPOSITE_NORM_ID = "waste_removal_us_epa_cd_composite_kg_m3_v1" as const;
export const EPA_CD_CONCRETE_SOURCE_ID = `src_professional_norm_pack_${EPA_CD_CONCRETE_NORM_ID}` as const;
export const EPA_CD_COMPOSITE_SOURCE_ID = `src_professional_norm_pack_${EPA_CD_COMPOSITE_NORM_ID}` as const;
export const EPA_CD_CONCRETE_REQUIRED_IDS = Object.freeze(["measured_epa_compatible_concrete_debris_volume_m3",
  "volume_measurement_method_and_state", "waste_material_class_confirmed", "concrete_piece_size_class", "rebar_condition",
  "local_weighbridge_mass_kg_if_available", "local_hauler_container_payload_and_disposal_rules", "conversion_calculation_reference"] as const);
export const EPA_CD_COMPOSITE_REQUIRED_IDS = Object.freeze(["measured_epa_compatible_composite_cd_volume_m3",
  "volume_measurement_method_and_state", "waste_material_class_confirmed", "composite_or_bulk_cd_row_selected", "container_compaction_state",
  "local_weighbridge_mass_kg_if_available", "local_hauler_container_payload_and_disposal_rules", "conversion_calculation_reference"] as const);
const concrete = wasteNormPack.norm_items.find((item) => item.norm_id === EPA_CD_CONCRETE_NORM_ID);
const composite = wasteNormPack.norm_items.find((item) => item.norm_id === EPA_CD_COMPOSITE_NORM_ID);
if (!concrete || !composite) throw new Error("PHYSICAL_NORM_DEFINITION_MISSING:EPA_CD_WASTE");
if (wasteNormPack.work_group !== "waste_removal" || wasteNormPack.review_status !== "reviewed" ||
  concrete.unit !== "kg" || concrete.rate.value !== 510.2177223 || concrete.applicability.epa_value_lb_per_cubic_yard !== 860 ||
  concrete.applicability.local_weighbridge_mass_overrides_conversion !== true ||
  composite.unit !== "kg" || composite.rate.value !== 247.3962677 || composite.applicability.epa_value_lb_per_cubic_yard !== 417 ||
  composite.applicability.separate_epa_bulk_cd_value_lb_per_cubic_yard !== 484 ||
  composite.applicability.bulk_cd_484_lb_per_cubic_yard_must_not_be_substituted !== true ||
  composite.applicability.local_weighbridge_mass_overrides_conversion !== true ||
  concrete.parameters.length !== EPA_CD_CONCRETE_REQUIRED_IDS.length || EPA_CD_CONCRETE_REQUIRED_IDS.some((id) => !concrete.parameters.includes(id)) ||
  composite.parameters.length !== EPA_CD_COMPOSITE_REQUIRED_IDS.length || EPA_CD_COMPOSITE_REQUIRED_IDS.some((id) => !composite.parameters.includes(id)) ||
  concrete.waste_percent_default !== 0 || composite.waste_percent_default !== 0) throw new Error("PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:EPA_CD_WASTE");
function metadata(item: NonNullable<typeof concrete>, sourceId: string) { return Object.freeze({ source_id: sourceId,
  norm_id: item.norm_id, source_document_version: wasteNormPack.source_pack_version, source_title: item.source.title,
  source_url: item.source.url, exact_locator: item.source.page, rate_value: item.rate.value, rate_unit: item.rate.unit,
  definition_hash: estimateDeterministicHash({ work_group: wasteNormPack.work_group,
    source_pack_version: wasteNormPack.source_pack_version, norm_item: item }) }); }
export const EPA_CD_CONCRETE_SOURCE_METADATA = metadata(concrete, EPA_CD_CONCRETE_SOURCE_ID);
export const EPA_CD_COMPOSITE_SOURCE_METADATA = metadata(composite, EPA_CD_COMPOSITE_SOURCE_ID);
function binding(normId: string, profile: string, source: typeof EPA_CD_CONCRETE_SOURCE_METADATA, ids: readonly string[]) {
  return Object.freeze({ norm_id: normId, work_group: "waste_removal", binding_route: "CANONICAL_V4_APPLICABILITY" as const,
    binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1", technology_class: "WASTE_VOLUME_TO_PLANNING_MASS",
    operation_class: "CONVERT", scope_mode: "FULL_APPLICABLE_SCOPE" as const, product_profile_id: profile,
    source_id: source.source_id, source_document_version: source.source_document_version,
    source_definition_hash: source.definition_hash, consumed_parameter_ids: ids,
    produced_parameter_ids: ["epa_cd_planning_mass_kg"] as const });
}
export const EPA_CD_CONCRETE_RUNTIME_BINDING_V1 = binding(EPA_CD_CONCRETE_NORM_ID, EPA_CD_CONCRETE_PRODUCT_PROFILE_ID,
  EPA_CD_CONCRETE_SOURCE_METADATA, EPA_CD_CONCRETE_REQUIRED_IDS);
export const EPA_CD_COMPOSITE_RUNTIME_BINDING_V1 = binding(EPA_CD_COMPOSITE_NORM_ID, EPA_CD_COMPOSITE_PRODUCT_PROFILE_ID,
  EPA_CD_COMPOSITE_SOURCE_METADATA, EPA_CD_COMPOSITE_REQUIRED_IDS);
function explicit(values: Readonly<Record<string, ProfessionalParameterValueV4>>, id: string) { const value = values[id];
  return !value || value.source_type === "VISIBLE_BASELINE_ASSUMPTION" || (typeof value.value === "string" && !value.value.trim()) ? null : value; }
function text(value: ProfessionalParameterValueV4 | null) { return typeof value?.value === "string" ? value.value.trim() || null : null; }
function number(value: ProfessionalParameterValueV4 | null) { if (!value) return null;
  const parsed = typeof value.value === "number" ? value.value : Number(String(value.value).replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null; }
function blocked(status: "NOT_REQUESTED" | "BLOCKED_REQUIRED_INPUTS" | "BLOCKED_NOT_APPLICABLE", profile: string | null,
  values: Readonly<Record<string, ProfessionalParameterValueV4>>, source: typeof EPA_CD_CONCRETE_SOURCE_METADATA,
  blockers: readonly string[], consumed: readonly string[] = []): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const base = { status, applicability_version: VERSION, product_profile_id: profile, source_id: source.source_id,
    norm_id: source.norm_id, source_document_version: source.source_document_version, source_url: source.source_url,
    exact_locator: source.exact_locator, source_definition_hash: source.definition_hash, consumed_parameter_ids: [...consumed].sort(),
    produced_parameter_ids: [] as const, parameter_values: values, blockers: [...new Set(blockers)].sort() };
  return { ...base, deterministic_hash: estimateDeterministicHash(base) };
}
export function resolveEpaCdWastePhysicalNormV1(input: { technology_class: string; operation_class: string; material_system?: string;
  scope_mode: string; parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>> }): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const profile = text(explicit(input.parameter_values, "product_profile_id"));
  const isConcrete = profile === EPA_CD_CONCRETE_PRODUCT_PROFILE_ID, isComposite = profile === EPA_CD_COMPOSITE_PRODUCT_PROFILE_ID;
  const source = isConcrete ? EPA_CD_CONCRETE_SOURCE_METADATA : EPA_CD_COMPOSITE_SOURCE_METADATA;
  if (!isConcrete && !isComposite) return blocked("NOT_REQUESTED", profile, input.parameter_values, source, []);
  const expectedSystem = isConcrete ? "US_EPA_2016_CD_CONCRETE" : "US_EPA_2016_CD_COMPOSITE_REMAINDER";
  if (input.technology_class !== "WASTE_VOLUME_TO_PLANNING_MASS" || input.operation_class !== "CONVERT" ||
    input.material_system !== expectedSystem || input.scope_mode !== "FULL_APPLICABLE_SCOPE") {
    return blocked("NOT_REQUESTED", profile, input.parameter_values, source, []);
  }
  const ids = isConcrete ? EPA_CD_CONCRETE_REQUIRED_IDS : EPA_CD_COMPOSITE_REQUIRED_IDS;
  const values = Object.fromEntries(ids.map((id) => [id, explicit(input.parameter_values, id)]));
  const missing = ids.filter((id) => values[id] === null).map((id) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${id}`);
  if (missing.length) return blocked("BLOCKED_REQUIRED_INPUTS", profile, input.parameter_values, source, missing, ids);
  const volumeId = isConcrete ? "measured_epa_compatible_concrete_debris_volume_m3" : "measured_epa_compatible_composite_cd_volume_m3";
  const volumeM3 = number(values[volumeId]);
  const weighbridgeText = text(values.local_weighbridge_mass_kg_if_available);
  const weighbridgeKg = number(values.local_weighbridge_mass_kg_if_available);
  const blockers = [volumeM3 !== null && volumeM3 > 0 ? "" : `PROJECT_VALUE_INVALID:${volumeId}`,
    text(values.volume_measurement_method_and_state)?.startsWith("EPA_COMPATIBLE_VOLUME:") ? "" : "PROJECT_VALUE_INVALID:volume_measurement_method_and_state",
    text(values.waste_material_class_confirmed) === (isConcrete ? "EPA_CD_CONCRETE" : "EPA_CD_COMPOSITE_REMAINDER") ? "" : "PHYSICAL_NORM_VARIANT_CONFLICT:waste_material_class_confirmed",
    isConcrete && !["LARGE", "SMALL"].includes(text(values.concrete_piece_size_class) ?? "") ? "PROJECT_VALUE_INVALID:concrete_piece_size_class" : "",
    isConcrete && !["WITH_REBAR", "WITHOUT_REBAR"].includes(text(values.rebar_condition) ?? "") ? "PROJECT_VALUE_INVALID:rebar_condition" : "",
    isComposite && text(values.composite_or_bulk_cd_row_selected) !== "COMPOSITE_417_LB_YD3" ? "PHYSICAL_NORM_VARIANT_CONFLICT:composite_or_bulk_cd_row_selected" : "",
    isComposite && !text(values.container_compaction_state)?.startsWith("EPA_COMPATIBLE_STATE:") ? "PROJECT_VALUE_INVALID:container_compaction_state" : "",
    weighbridgeText === "NOT_AVAILABLE" || (weighbridgeKg !== null && weighbridgeKg > 0) ? "" : "PROJECT_VALUE_INVALID:local_weighbridge_mass_kg_if_available",
    text(values.local_hauler_container_payload_and_disposal_rules)?.startsWith("SEPARATE_SCOPE:") ? "" : "PROJECT_VALUE_INVALID:local_hauler_container_payload_and_disposal_rules",
    text(values.conversion_calculation_reference) === (isConcrete ? "EPA_2016:860_LB_YD3" : "EPA_2016:417_LB_YD3") ? "" : "PROJECT_VALUE_INVALID:conversion_calculation_reference"].filter(Boolean);
  if (blockers.length) return blocked("BLOCKED_NOT_APPLICABLE", profile, input.parameter_values, source, blockers, ids);
  const lbPerYd3 = isConcrete ? 860 : 417;
  const convertedKg = Math.round(volumeM3! * lbPerYd3 * 0.45359237 / 0.764554857984 * 1e6) / 1e6;
  const massKg = weighbridgeKg !== null ? weighbridgeKg : convertedKg;
  const existing = number(explicit(input.parameter_values, "epa_cd_planning_mass_kg"));
  if (existing !== null && existing !== massKg) return blocked("BLOCKED_NOT_APPLICABLE", profile, input.parameter_values, source,
    [`PHYSICAL_NORM_VALUE_CONFLICT:epa_cd_planning_mass_kg=${existing}:norm_value=${massKg}`], [...ids, "epa_cd_planning_mass_kg"]);
  const capturedAt = ids.map((id) => values[id]!.captured_at).sort().at(-1)!;
  const applicability = [`product_profile_id=${profile}`, `measured_volume_m3=${volumeM3}`, `epa_lb_per_yd3=${lbPerYd3}`,
    `converted_planning_mass_kg=${convertedKg}`, `local_weighbridge_mass_kg=${weighbridgeKg ?? "not_available"}`,
    `result_mass_kg=${massKg}`, `mass_source=${weighbridgeKg !== null ? "local_weighbridge" : "epa_preliminary_conversion"}`,
    "trip_container_disposal_fee_forbidden=true", "automatic_generic_binding=false"].join(";");
  const parameterValues = Object.freeze({ ...input.parameter_values, epa_cd_planning_mass_kg: { value: massKg, unit_id: "kg",
    source_type: "APPLICABLE_NORM" as const, source_id: source.source_id, captured_at: capturedAt,
    confidence: weighbridgeKg !== null ? "high" as const : "medium" as const, applicability } });
  const base = { status: "APPLIED" as const, applicability_version: VERSION, product_profile_id: profile,
    source_id: source.source_id, norm_id: source.norm_id, source_document_version: source.source_document_version,
    source_url: source.source_url, exact_locator: source.exact_locator, source_definition_hash: source.definition_hash,
    consumed_parameter_ids: [...ids], produced_parameter_ids: ["epa_cd_planning_mass_kg"] as const,
    calculated_epa_cd_planning_mass_kg: massKg, parameter_values: parameterValues, blockers: [] as const };
  return { ...base, deterministic_hash: estimateDeterministicHash(base) };
}
