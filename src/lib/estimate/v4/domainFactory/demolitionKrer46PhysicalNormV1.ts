import demolitionNormPack from "../../../../../data/estimate-norms/professional/demolition.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const APPLICABILITY_VERSION = "professional-physical-norm-applicability:v1" as const;
export const KRER46_DEMOLITION_PRODUCT_PROFILE_ID = "official-profile:kg-krer46:selected-demolition-table:v1" as const;
export const KRER46_DEMOLITION_NORM_ID = "demolition_krer46_selected_table_same_unit_routing_v1" as const;
export const KRER46_DEMOLITION_SOURCE_ID = `src_professional_norm_pack_${KRER46_DEMOLITION_NORM_ID}` as const;
export const KRER46_DEMOLITION_REQUIRED_IDS = Object.freeze([
  "measured_project_quantity", "demolished_element_type_and_material",
  "reconstruction_expansion_or_technical_re_equipment_scope", "selected_norm_collection",
  "selected_collection_edition_and_amendments", "selected_krer46_table_code", "selected_table_work_composition",
  "project_quantity_unit", "selected_table_measurement_unit", "quantity_normalization_calculation",
  "retained_and_disposed_material_scope", "work_access_and_constraint_conditions",
  "applicable_methodical_instruction_coefficients", "selected_table_resource_rows",
  "current_price_level_and_regional_indices", "estimator_approval_reference",
] as const);

const norm = (() => {
  const found = demolitionNormPack.norm_items.find((item) => item.norm_id === KRER46_DEMOLITION_NORM_ID);
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${KRER46_DEMOLITION_NORM_ID}`);
  return found;
})();
if (demolitionNormPack.work_group !== "demolition" || demolitionNormPack.review_status !== "reviewed" ||
  norm.unit !== "selected_table_unit" || norm.rate.value !== 1 || norm.applicability.jurisdiction !== "Kyrgyz Republic" ||
  norm.applicability.exact_table_code_work_composition_and_measurement_unit_required !== true ||
  norm.applicability.project_quantity_normalization_to_selected_table_unit_required !== true ||
  norm.applicability.generic_m2_m3_piece_or_same_unit_conversion_forbidden !== true ||
  norm.applicability.resource_and_cost_rates_blocked_until_exact_table_selected !== true ||
  norm.applicability.current_application_instructions_and_amendments_required !== true ||
  norm.applicability.repair_collection_applicability_requires_estimator_review !== true ||
  norm.applicability.rate_is_routing_identity_not_published_norm !== true ||
  norm.applicability.automatic_production_binding_for_generic_demolition_forbidden !== true ||
  norm.parameters.length !== KRER46_DEMOLITION_REQUIRED_IDS.length ||
  KRER46_DEMOLITION_REQUIRED_IDS.some((id) => !norm.parameters.includes(id)) || norm.waste_percent_default !== 0 ||
  norm.rounding.package_size !== 1 || norm.rounding.mode !== "no_rounding_until_exact_table_measurement_and_precision_rule_selected") {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${KRER46_DEMOLITION_NORM_ID}`);
}
export const KRER46_DEMOLITION_SOURCE_METADATA = Object.freeze({
  source_id: KRER46_DEMOLITION_SOURCE_ID, norm_id: KRER46_DEMOLITION_NORM_ID,
  source_document_version: demolitionNormPack.source_pack_version, source_title: norm.source.title,
  source_url: norm.source.url, exact_locator: norm.source.page, rate_value: norm.rate.value, rate_unit: norm.rate.unit,
  definition_hash: estimateDeterministicHash({ work_group: demolitionNormPack.work_group,
    source_pack_version: demolitionNormPack.source_pack_version, norm_item: norm }),
});
export const KRER46_DEMOLITION_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: KRER46_DEMOLITION_NORM_ID, work_group: "demolition", binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1", technology_class: "KG_KRER46_DEMOLITION_TABLE_MEASUREMENT",
  operation_class: "MEASURE", scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: KRER46_DEMOLITION_PRODUCT_PROFILE_ID, source_id: KRER46_DEMOLITION_SOURCE_ID,
  source_document_version: KRER46_DEMOLITION_SOURCE_METADATA.source_document_version,
  source_definition_hash: KRER46_DEMOLITION_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: KRER46_DEMOLITION_REQUIRED_IDS,
  produced_parameter_ids: ["demolition_selected_table_quantity_routed"] as const,
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
function text(value: ProfessionalParameterValueV4 | null) { return typeof value?.value === "string" ? value.value.trim() || null : null; }
function meaningful(value: string | null) { return value !== null && value.length >= 4 && !/^(?:NONE|N\/A|UNKNOWN|TBD)$/iu.test(value); }
function nonApplied(status: "NOT_REQUESTED" | "BLOCKED_REQUIRED_INPUTS" | "BLOCKED_NOT_APPLICABLE", profile: string | null,
  values: Readonly<Record<string, ProfessionalParameterValueV4>>, blockers: readonly string[], consumed: readonly string[] = []) {
  const result = { status, applicability_version: APPLICABILITY_VERSION, product_profile_id: profile,
    source_id: KRER46_DEMOLITION_SOURCE_ID, norm_id: KRER46_DEMOLITION_NORM_ID,
    source_document_version: KRER46_DEMOLITION_SOURCE_METADATA.source_document_version,
    source_url: KRER46_DEMOLITION_SOURCE_METADATA.source_url, exact_locator: KRER46_DEMOLITION_SOURCE_METADATA.exact_locator,
    source_definition_hash: KRER46_DEMOLITION_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...consumed].sort(), produced_parameter_ids: [] as const, parameter_values: values,
    blockers: [...new Set(blockers)].sort() };
  return { ...result, deterministic_hash: estimateDeterministicHash(result) };
}

export function resolveKrer46DemolitionPhysicalNormV1(input: { technology_class: string; operation_class: string;
  material_system?: string; scope_mode: string; parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const profile = text(explicit(input.parameter_values, "product_profile_id"));
  if (profile !== KRER46_DEMOLITION_PRODUCT_PROFILE_ID) return nonApplied("NOT_REQUESTED", profile, input.parameter_values, []);
  if (input.technology_class !== "KG_KRER46_DEMOLITION_TABLE_MEASUREMENT" || input.operation_class !== "MEASURE" ||
    input.material_system !== "KG_KRER46_SELECTED_DEMOLITION_TABLE" || input.scope_mode !== "FULL_APPLICABLE_SCOPE") {
    return nonApplied("NOT_REQUESTED", profile, input.parameter_values, []);
  }
  const values = Object.fromEntries(KRER46_DEMOLITION_REQUIRED_IDS.map((id) => [id, explicit(input.parameter_values, id)]));
  const missing = KRER46_DEMOLITION_REQUIRED_IDS.filter((id) => values[id] === null)
    .map((id) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${id}`);
  if (missing.length) return nonApplied("BLOCKED_REQUIRED_INPUTS", profile, input.parameter_values, missing, KRER46_DEMOLITION_REQUIRED_IDS);
  const quantity = number(values.measured_project_quantity), projectUnit = text(values.project_quantity_unit)?.toLowerCase() ?? null;
  const tableUnit = text(values.selected_table_measurement_unit)?.toLowerCase() ?? null;
  const scope = text(values.reconstruction_expansion_or_technical_re_equipment_scope)?.toUpperCase() ?? null;
  const allowedUnits = new Set(["m2", "m3", "linear_m", "piece", "set", "ton"]);
  const blockers = [
    quantity !== null && quantity > 0 ? "" : "PROJECT_VALUE_INVALID:measured_project_quantity",
    meaningful(text(values.demolished_element_type_and_material)) ? "" : "PROJECT_VALUE_INVALID:demolished_element_type_and_material",
    /^(?:RECONSTRUCTION|EXPANSION|TECHNICAL_RE_EQUIPMENT)$/u.test(scope ?? "") ? "" :
      `PHYSICAL_NORM_SCOPE_INVALID:reconstruction_expansion_or_technical_re_equipment_scope=${scope}`,
    text(values.selected_norm_collection) === "KG_KRER_46" ? "" : "PHYSICAL_NORM_COLLECTION_INVALID:selected_norm_collection",
    text(values.selected_collection_edition_and_amendments)?.startsWith("CURRENT_CONFIRMED:") ? "" :
      "PROJECT_VALUE_INVALID:selected_collection_edition_and_amendments",
    text(values.selected_krer46_table_code)?.startsWith("KRER46:") ? "" : "PROJECT_VALUE_INVALID:selected_krer46_table_code",
    text(values.selected_table_work_composition)?.startsWith("TABLE_SCOPE:") ? "" : "PROJECT_VALUE_INVALID:selected_table_work_composition",
    projectUnit && allowedUnits.has(projectUnit) ? "" : `PROJECT_UNIT_INVALID:project_quantity_unit=${projectUnit}`,
    tableUnit && allowedUnits.has(tableUnit) ? "" : `TABLE_UNIT_INVALID:selected_table_measurement_unit=${tableUnit}`,
    projectUnit !== null && projectUnit === tableUnit ? "" : `PHYSICAL_NORM_UNIT_CONFLICT:${projectUnit}->${tableUnit}`,
    text(values.quantity_normalization_calculation) === `SAME_UNIT:${projectUnit}->${tableUnit},FACTOR=1` ? "" :
      "PROJECT_VALUE_INVALID:quantity_normalization_calculation",
    text(values.retained_and_disposed_material_scope)?.startsWith("PROJECT_SCOPE:") ? "" :
      "PROJECT_VALUE_INVALID:retained_and_disposed_material_scope",
    text(values.work_access_and_constraint_conditions)?.startsWith("PROJECT_CONDITIONS:") ? "" :
      "PROJECT_VALUE_INVALID:work_access_and_constraint_conditions",
    text(values.applicable_methodical_instruction_coefficients)?.startsWith("PROJECT_COEFFICIENTS:") ? "" :
      "PROJECT_VALUE_INVALID:applicable_methodical_instruction_coefficients",
    text(values.selected_table_resource_rows)?.startsWith("TABLE_RESOURCES:") ? "" : "PROJECT_VALUE_INVALID:selected_table_resource_rows",
    text(values.current_price_level_and_regional_indices)?.startsWith("PRICE_LEVEL:") ? "" :
      "PROJECT_VALUE_INVALID:current_price_level_and_regional_indices",
    meaningful(text(values.estimator_approval_reference)) ? "" : "PROJECT_VALUE_INVALID:estimator_approval_reference",
  ].filter(Boolean);
  if (blockers.length) return nonApplied("BLOCKED_NOT_APPLICABLE", profile, input.parameter_values, blockers, KRER46_DEMOLITION_REQUIRED_IDS);
  const routed = quantity! * norm.rate.value;
  const explicitOutput = number(explicit(input.parameter_values, "demolition_selected_table_quantity_routed"));
  if (explicitOutput !== null && Math.abs(explicitOutput - routed) > 1e-9) return nonApplied("BLOCKED_NOT_APPLICABLE", profile,
    input.parameter_values, [`PHYSICAL_NORM_VALUE_CONFLICT:demolition_selected_table_quantity_routed=${explicitOutput}:norm_value=${routed}`],
    [...KRER46_DEMOLITION_REQUIRED_IDS, "demolition_selected_table_quantity_routed"]);
  const capturedAt = KRER46_DEMOLITION_REQUIRED_IDS.map((id) => values[id]!.captured_at).sort().at(-1)!;
  const applicability = [`product_profile_id=${profile}`, `selected_table=${text(values.selected_krer46_table_code)}`,
    `project_quantity=${quantity}`, `project_unit=${projectUnit}`, `table_unit=${tableUnit}`,
    `normalization=${text(values.quantity_normalization_calculation)}`, `scope=${scope}`,
    `coefficients=${text(values.applicable_methodical_instruction_coefficients)}`, "automatic_generic_rate=false",
    "automatic_resource_cost=false", "automatic_repair_scope=false"].join(";");
  const parameterValues = Object.freeze({ ...input.parameter_values, demolition_selected_table_quantity_routed: {
    value: routed, unit_id: tableUnit, source_type: "APPLICABLE_NORM" as const, source_id: KRER46_DEMOLITION_SOURCE_ID,
    captured_at: capturedAt, confidence: "high" as const, applicability } });
  const result = { status: "APPLIED" as const, applicability_version: APPLICABILITY_VERSION, product_profile_id: profile,
    source_id: KRER46_DEMOLITION_SOURCE_ID, norm_id: KRER46_DEMOLITION_NORM_ID,
    source_document_version: KRER46_DEMOLITION_SOURCE_METADATA.source_document_version,
    source_url: KRER46_DEMOLITION_SOURCE_METADATA.source_url, exact_locator: KRER46_DEMOLITION_SOURCE_METADATA.exact_locator,
    source_definition_hash: KRER46_DEMOLITION_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...KRER46_DEMOLITION_REQUIRED_IDS], produced_parameter_ids: ["demolition_selected_table_quantity_routed"] as const,
    calculated_demolition_selected_table_quantity: routed, calculated_demolition_selected_table_unit: tableUnit!,
    parameter_values: parameterValues, blockers: [] as const };
  return { ...result, deterministic_hash: estimateDeterministicHash(result) };
}
