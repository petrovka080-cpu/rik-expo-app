import documentationNormPack from "../../../../../data/estimate-norms/professional/documentation.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const APPLICABILITY_VERSION = "professional-physical-norm-applicability:v1" as const;
export const KG_DESIGN_PRICE_PRODUCT_PROFILE_ID = "official-profile:kg-design-price:selected-sector-table:v1" as const;
export const KG_DESIGN_PRICE_NORM_ID = "documentation_kg_selected_design_price_unit_routing_v1" as const;
export const KG_DESIGN_PRICE_SOURCE_ID = `src_professional_norm_pack_${KG_DESIGN_PRICE_NORM_ID}` as const;
export const KG_DESIGN_PRICE_REQUIRED_IDS = Object.freeze([
  "project_object_type", "design_stage", "selected_price_collection_section", "selected_collection_edition_and_amendments",
  "selected_price_table_and_row", "project_capacity_measure", "project_capacity_unit", "selected_table_capacity_range",
  "selected_table_measurement_unit", "quantity_normalization_calculation", "selected_table_base_price_values",
  "applicable_design_stage_coefficient", "deliverable_composition", "design_section_cost_allocation",
  "additional_and_excluded_work_scope", "current_price_level_conversion_and_indices", "estimator_approval_reference",
] as const);

const norm = (() => {
  const found = documentationNormPack.norm_items.find((item) => item.norm_id === KG_DESIGN_PRICE_NORM_ID);
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${KG_DESIGN_PRICE_NORM_ID}`);
  return found;
})();
if (documentationNormPack.work_group !== "documentation" || documentationNormPack.review_status !== "reviewed" ||
  norm.unit !== "selected_price_unit" || norm.rate.value !== 1 || norm.applicability.jurisdiction !== "Kyrgyz Republic" ||
  norm.applicability.exact_sector_section_and_table_required !== true ||
  norm.applicability.exact_table_row_capacity_range_and_measurement_unit_required !== true ||
  norm.applicability.project_capacity_normalization_to_selected_table_unit_required !== true ||
  norm.applicability.design_stage_and_deliverable_composition_required !== true ||
  norm.applicability.applicable_stage_coefficient_and_design_section_allocation_required !== true ||
  norm.applicability.current_collection_edition_amendments_and_price_conversion_required !== true ||
  norm.applicability.generic_percent_of_construction_cost_forbidden !== true ||
  norm.applicability.price_and_effort_blocked_until_exact_collection_measure_selected !== true ||
  norm.applicability.rate_is_routing_identity_not_published_norm !== true ||
  norm.applicability.automatic_production_binding_for_generic_documentation_forbidden !== true ||
  norm.parameters.length !== KG_DESIGN_PRICE_REQUIRED_IDS.length ||
  KG_DESIGN_PRICE_REQUIRED_IDS.some((id) => !norm.parameters.includes(id)) || norm.waste_percent_default !== 0 ||
  norm.rounding.package_size !== 1 || norm.rounding.mode !== "no_rounding_until_exact_collection_table_measure_and_precision_rule_selected") {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${KG_DESIGN_PRICE_NORM_ID}`);
}
export const KG_DESIGN_PRICE_SOURCE_METADATA = Object.freeze({
  source_id: KG_DESIGN_PRICE_SOURCE_ID, norm_id: KG_DESIGN_PRICE_NORM_ID,
  source_document_version: documentationNormPack.source_pack_version, source_title: norm.source.title,
  source_url: norm.source.url, exact_locator: norm.source.page, rate_value: norm.rate.value, rate_unit: norm.rate.unit,
  definition_hash: estimateDeterministicHash({ work_group: documentationNormPack.work_group,
    source_pack_version: documentationNormPack.source_pack_version, norm_item: norm }),
});
export const KG_DESIGN_PRICE_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: KG_DESIGN_PRICE_NORM_ID, work_group: "documentation", binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1", technology_class: "KG_DESIGN_PRICE_TABLE_MEASUREMENT",
  operation_class: "MEASURE", scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: KG_DESIGN_PRICE_PRODUCT_PROFILE_ID, source_id: KG_DESIGN_PRICE_SOURCE_ID,
  source_document_version: KG_DESIGN_PRICE_SOURCE_METADATA.source_document_version,
  source_definition_hash: KG_DESIGN_PRICE_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: KG_DESIGN_PRICE_REQUIRED_IDS,
  produced_parameter_ids: ["documentation_selected_table_capacity_routed"] as const,
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
function fields(value: string | null): Readonly<Record<string, number>> {
  if (!value) return {};
  return Object.fromEntries([...value.matchAll(/([A-Z0-9_]+)\s*=\s*(\d+(?:[.,]\d+)?)/gu)]
    .map((match) => [match[1]!, Number(match[2]!.replace(",", "."))]));
}
function meaningful(value: string | null) { return value !== null && value.length >= 4 && !/^(?:NONE|N\/A|UNKNOWN|TBD)$/iu.test(value); }
function nonApplied(status: "NOT_REQUESTED" | "BLOCKED_REQUIRED_INPUTS" | "BLOCKED_NOT_APPLICABLE", profile: string | null,
  values: Readonly<Record<string, ProfessionalParameterValueV4>>, blockers: readonly string[], consumed: readonly string[] = []) {
  const result = { status, applicability_version: APPLICABILITY_VERSION, product_profile_id: profile,
    source_id: KG_DESIGN_PRICE_SOURCE_ID, norm_id: KG_DESIGN_PRICE_NORM_ID,
    source_document_version: KG_DESIGN_PRICE_SOURCE_METADATA.source_document_version,
    source_url: KG_DESIGN_PRICE_SOURCE_METADATA.source_url, exact_locator: KG_DESIGN_PRICE_SOURCE_METADATA.exact_locator,
    source_definition_hash: KG_DESIGN_PRICE_SOURCE_METADATA.definition_hash, consumed_parameter_ids: [...consumed].sort(),
    produced_parameter_ids: [] as const, parameter_values: values, blockers: [...new Set(blockers)].sort() };
  return { ...result, deterministic_hash: estimateDeterministicHash(result) };
}

export function resolveKgDesignPricePhysicalNormV1(input: { technology_class: string; operation_class: string;
  material_system?: string; scope_mode: string; parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const profile = text(explicit(input.parameter_values, "product_profile_id"));
  if (profile !== KG_DESIGN_PRICE_PRODUCT_PROFILE_ID) return nonApplied("NOT_REQUESTED", profile, input.parameter_values, []);
  if (input.technology_class !== "KG_DESIGN_PRICE_TABLE_MEASUREMENT" || input.operation_class !== "MEASURE" ||
    input.material_system !== "KG_DESIGN_PRICE_SELECTED_TABLE" || input.scope_mode !== "FULL_APPLICABLE_SCOPE") {
    return nonApplied("NOT_REQUESTED", profile, input.parameter_values, []);
  }
  const values = Object.fromEntries(KG_DESIGN_PRICE_REQUIRED_IDS.map((id) => [id, explicit(input.parameter_values, id)]));
  const missing = KG_DESIGN_PRICE_REQUIRED_IDS.filter((id) => values[id] === null)
    .map((id) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${id}`);
  if (missing.length) return nonApplied("BLOCKED_REQUIRED_INPUTS", profile, input.parameter_values, missing, KG_DESIGN_PRICE_REQUIRED_IDS);
  const capacity = number(values.project_capacity_measure), projectUnit = text(values.project_capacity_unit)?.toLowerCase() ?? null;
  const tableUnit = text(values.selected_table_measurement_unit)?.toLowerCase() ?? null;
  const stage = text(values.design_stage)?.toUpperCase() ?? null, range = fields(text(values.selected_table_capacity_range));
  const stageValues = fields(text(values.applicable_design_stage_coefficient));
  const blockers = [
    text(values.project_object_type)?.startsWith("CHEMICAL_INDUSTRY:") ? "" : "PHYSICAL_NORM_SECTOR_INVALID:project_object_type",
    /^(?:WORKING_DOCUMENTATION|PROJECT|WORKING_PROJECT)$/u.test(stage ?? "") ? "" : `PHYSICAL_NORM_STAGE_INVALID:design_stage=${stage}`,
    text(values.selected_price_collection_section) === "KG_DESIGN_PRICE_SECTION_9_CHEMICAL_INDUSTRY_2016" ? "" :
      "PHYSICAL_NORM_COLLECTION_INVALID:selected_price_collection_section",
    text(values.selected_collection_edition_and_amendments)?.startsWith("CURRENT_CONFIRMED:") ? "" :
      "PROJECT_VALUE_INVALID:selected_collection_edition_and_amendments",
    text(values.selected_price_table_and_row)?.startsWith("SECTION9:") ? "" : "PROJECT_VALUE_INVALID:selected_price_table_and_row",
    capacity !== null && capacity > 0 ? "" : "PROJECT_VALUE_INVALID:project_capacity_measure",
    meaningful(projectUnit) ? "" : "PROJECT_UNIT_INVALID:project_capacity_unit",
    range.MIN !== undefined && range.MAX !== undefined && range.MIN >= 0 && range.MAX >= range.MIN && capacity !== null &&
      capacity >= range.MIN && capacity <= range.MAX ? "" : "PHYSICAL_NORM_CAPACITY_RANGE_INVALID:selected_table_capacity_range",
    meaningful(tableUnit) ? "" : "TABLE_UNIT_INVALID:selected_table_measurement_unit",
    projectUnit !== null && projectUnit === tableUnit ? "" : `PHYSICAL_NORM_UNIT_CONFLICT:${projectUnit}->${tableUnit}`,
    text(values.quantity_normalization_calculation) === `SAME_UNIT:${projectUnit}->${tableUnit},FACTOR=1` ? "" :
      "PROJECT_VALUE_INVALID:quantity_normalization_calculation",
    text(values.selected_table_base_price_values)?.startsWith("TABLE_BASE_VALUES:") ? "" :
      "PROJECT_VALUE_INVALID:selected_table_base_price_values",
    stageValues.STAGE_COEFFICIENT !== undefined && stageValues.STAGE_COEFFICIENT > 0 ? "" :
      "PROJECT_VALUE_INVALID:applicable_design_stage_coefficient",
    text(values.deliverable_composition)?.startsWith("DELIVERABLES:") ? "" : "PROJECT_VALUE_INVALID:deliverable_composition",
    text(values.design_section_cost_allocation)?.startsWith("SECTION_ALLOCATION:") ? "" :
      "PROJECT_VALUE_INVALID:design_section_cost_allocation",
    text(values.additional_and_excluded_work_scope)?.startsWith("PROJECT_SCOPE:") ? "" :
      "PROJECT_VALUE_INVALID:additional_and_excluded_work_scope",
    text(values.current_price_level_conversion_and_indices)?.startsWith("PRICE_CONVERSION:") ? "" :
      "PROJECT_VALUE_INVALID:current_price_level_conversion_and_indices",
    meaningful(text(values.estimator_approval_reference)) ? "" : "PROJECT_VALUE_INVALID:estimator_approval_reference",
  ].filter(Boolean);
  if (blockers.length) return nonApplied("BLOCKED_NOT_APPLICABLE", profile, input.parameter_values, blockers, KG_DESIGN_PRICE_REQUIRED_IDS);
  const routed = capacity! * norm.rate.value;
  const explicitOutput = number(explicit(input.parameter_values, "documentation_selected_table_capacity_routed"));
  if (explicitOutput !== null && Math.abs(explicitOutput - routed) > 1e-9) return nonApplied("BLOCKED_NOT_APPLICABLE", profile,
    input.parameter_values, [`PHYSICAL_NORM_VALUE_CONFLICT:documentation_selected_table_capacity_routed=${explicitOutput}:norm_value=${routed}`],
    [...KG_DESIGN_PRICE_REQUIRED_IDS, "documentation_selected_table_capacity_routed"]);
  const capturedAt = KG_DESIGN_PRICE_REQUIRED_IDS.map((id) => values[id]!.captured_at).sort().at(-1)!;
  const applicability = [`product_profile_id=${profile}`, `project_object_type=${text(values.project_object_type)}`, `design_stage=${stage}`,
    `selected_table=${text(values.selected_price_table_and_row)}`, `capacity_range=${text(values.selected_table_capacity_range)}`,
    `routed_capacity=${routed} ${tableUnit}`, `stage_coefficient=${stageValues.STAGE_COEFFICIENT}`,
    "formula=project_capacity_measure*1", "generic_percent_of_construction_cost=false", "automatic_price_or_effort=false"].join(";");
  const parameterValues = Object.freeze({ ...input.parameter_values, documentation_selected_table_capacity_routed: {
    value: routed, unit_id: tableUnit!, source_type: "APPLICABLE_NORM" as const, source_id: KG_DESIGN_PRICE_SOURCE_ID,
    captured_at: capturedAt, confidence: "high" as const, applicability } });
  const result = { status: "APPLIED" as const, applicability_version: APPLICABILITY_VERSION, product_profile_id: profile,
    source_id: KG_DESIGN_PRICE_SOURCE_ID, norm_id: KG_DESIGN_PRICE_NORM_ID,
    source_document_version: KG_DESIGN_PRICE_SOURCE_METADATA.source_document_version,
    source_url: KG_DESIGN_PRICE_SOURCE_METADATA.source_url, exact_locator: KG_DESIGN_PRICE_SOURCE_METADATA.exact_locator,
    source_definition_hash: KG_DESIGN_PRICE_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...KG_DESIGN_PRICE_REQUIRED_IDS], produced_parameter_ids: ["documentation_selected_table_capacity_routed"] as const,
    calculated_documentation_selected_table_capacity: routed, calculated_documentation_selected_table_unit: tableUnit!,
    parameter_values: parameterValues, blockers: [] as const };
  return { ...result, deterministic_hash: estimateDeterministicHash(result) };
}
