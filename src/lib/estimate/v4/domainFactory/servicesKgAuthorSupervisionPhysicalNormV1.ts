import servicesNormPack from "../../../../../data/estimate-norms/professional/services.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const APPLICABILITY_VERSION = "professional-physical-norm-applicability:v1" as const;

export const KG_AUTHOR_SUPERVISION_PRODUCT_PROFILE_ID =
  "regulatory-profile:kg-order-52-npa:author-supervision:appendix-5:v1" as const;
export const KG_AUTHOR_SUPERVISION_NORM_ID =
  "services_kg_author_supervision_cost_fraction_v1" as const;
export const KG_AUTHOR_SUPERVISION_SOURCE_ID =
  `src_professional_norm_pack_${KG_AUTHOR_SUPERVISION_NORM_ID}` as const;

export const KG_AUTHOR_SUPERVISION_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "construction_estimated_cost_chapters_1_9_currency",
  "construction_estimated_cost_currency",
  "author_supervision_required_for_object",
  "applicable_consolidated_estimate_chapters",
  "current_legal_applicability_and_amendments",
  "travel_to_and_from_site_required",
  "travel_cost_separate_calculation",
  "estimator_approval_reference",
] as const);

const supervisionNorm = (() => {
  const found = servicesNormPack.norm_items.find(
    (item) => item.norm_id === KG_AUTHOR_SUPERVISION_NORM_ID,
  );
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${KG_AUTHOR_SUPERVISION_NORM_ID}`);
  return found;
})();

if (
  servicesNormPack.work_group !== "services" ||
  servicesNormPack.review_status !== "reviewed" ||
  supervisionNorm.unit !== "currency" ||
  supervisionNorm.rate.value !== 0.004 ||
  supervisionNorm.rate.unit !== "currency/currency; 0.4% of construction estimated cost in chapters 1-9 of the consolidated estimate" ||
  supervisionNorm.applicability.jurisdiction !== "Kyrgyz Republic" ||
  supervisionNorm.applicability.author_supervision_cost_percent !== 0.4 ||
  supervisionNorm.applicability.construction_estimated_cost_basis_chapters !== "1-9" ||
  supervisionNorm.applicability.travel_to_and_from_site_is_not_included_in_author_supervision_cost !== true ||
  supervisionNorm.applicability.normative_visit_count_not_defined_by_source !== true ||
  supervisionNorm.applicability.automatic_visit_count_or_visit_cost_derivation_forbidden !== true ||
  supervisionNorm.applicability.automatic_production_binding_for_generic_services_forbidden !== true ||
  supervisionNorm.parameters.length !== KG_AUTHOR_SUPERVISION_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  KG_AUTHOR_SUPERVISION_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !supervisionNorm.parameters.includes(parameterId),
  ) ||
  supervisionNorm.rounding.package_size !== 0.01 ||
  supervisionNorm.rounding.mode !== "apply_0_004_to_confirmed_chapters_1_9_cost_then_round_only_to_document_currency_precision"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${KG_AUTHOR_SUPERVISION_NORM_ID}`);
}

export const KG_AUTHOR_SUPERVISION_SOURCE_METADATA = Object.freeze({
  source_id: KG_AUTHOR_SUPERVISION_SOURCE_ID,
  norm_id: KG_AUTHOR_SUPERVISION_NORM_ID,
  source_document_version: servicesNormPack.source_pack_version,
  source_title: supervisionNorm.source.title,
  source_url: supervisionNorm.source.url,
  exact_locator: supervisionNorm.source.page,
  rate_value: supervisionNorm.rate.value,
  rate_unit: supervisionNorm.rate.unit,
  jurisdiction: supervisionNorm.applicability.jurisdiction,
  document: supervisionNorm.applicability.document,
  construction_estimated_cost_basis_chapters:
    supervisionNorm.applicability.construction_estimated_cost_basis_chapters,
  definition_hash: estimateDeterministicHash({
    work_group: servicesNormPack.work_group,
    source_pack_version: servicesNormPack.source_pack_version,
    norm_item: supervisionNorm,
  }),
});

export const KG_AUTHOR_SUPERVISION_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: KG_AUTHOR_SUPERVISION_NORM_ID,
  work_group: "services",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "PROJECT_COST_SERVICES",
  operation_class: "CALCULATE",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: KG_AUTHOR_SUPERVISION_PRODUCT_PROFILE_ID,
  source_id: KG_AUTHOR_SUPERVISION_SOURCE_ID,
  source_document_version: KG_AUTHOR_SUPERVISION_SOURCE_METADATA.source_document_version,
  source_definition_hash: KG_AUTHOR_SUPERVISION_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: KG_AUTHOR_SUPERVISION_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["kg_author_supervision_cost_currency"] as const,
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

function meaningfulReference(value: string | null): boolean {
  return value !== null && value.length >= 6 && !/^(?:NONE|N\/A|UNKNOWN|TBD)$/iu.test(value);
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
    source_id: KG_AUTHOR_SUPERVISION_SOURCE_ID,
    norm_id: KG_AUTHOR_SUPERVISION_NORM_ID,
    source_document_version: KG_AUTHOR_SUPERVISION_SOURCE_METADATA.source_document_version,
    source_url: KG_AUTHOR_SUPERVISION_SOURCE_METADATA.source_url,
    exact_locator: KG_AUTHOR_SUPERVISION_SOURCE_METADATA.exact_locator,
    source_definition_hash: KG_AUTHOR_SUPERVISION_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...consumedParameterIds].sort(),
    produced_parameter_ids: [] as const,
    parameter_values: parameterValues,
    blockers: [...new Set(blockers)].sort(),
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function resolveKgAuthorSupervisionPhysicalNormV1(input: {
  technology_class: string;
  operation_class: string;
  material_system?: string;
  scope_mode: string;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const productProfileId = primitiveString(explicitValue(input.parameter_values, "product_profile_id"));
  if (productProfileId !== KG_AUTHOR_SUPERVISION_PRODUCT_PROFILE_ID) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }
  if (
    input.technology_class !== "PROJECT_COST_SERVICES" ||
    input.operation_class !== "CALCULATE" ||
    input.material_system !== "KG_AUTHOR_SUPERVISION" ||
    input.scope_mode !== "FULL_APPLICABLE_SCOPE"
  ) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }

  const explicit = Object.fromEntries(KG_AUTHOR_SUPERVISION_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(input.parameter_values, parameterId)],
  ));
  const missing = KG_AUTHOR_SUPERVISION_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      missing,
      KG_AUTHOR_SUPERVISION_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const chaptersCost = finiteNumber(explicit.construction_estimated_cost_chapters_1_9_currency);
  const currency = primitiveString(explicit.construction_estimated_cost_currency)?.toUpperCase();
  const supervisionRequired = booleanValue(explicit.author_supervision_required_for_object);
  const applicableChapters = primitiveString(explicit.applicable_consolidated_estimate_chapters);
  const legalApplicability = primitiveString(explicit.current_legal_applicability_and_amendments);
  const travelRequired = booleanValue(explicit.travel_to_and_from_site_required);
  const travelCalculation = primitiveString(explicit.travel_cost_separate_calculation);
  const approvalReference = primitiveString(explicit.estimator_approval_reference);
  const travelConditionValid = travelRequired === true
    ? meaningfulReference(travelCalculation) && travelCalculation !== "NOT_REQUIRED:NO_TRAVEL"
    : travelRequired === false && travelCalculation === "NOT_REQUIRED:NO_TRAVEL";
  const blockers = [
    chaptersCost !== null && chaptersCost > 0
      ? ""
      : "PROJECT_VALUE_INVALID:construction_estimated_cost_chapters_1_9_currency",
    currency === "KGS" ? "" : `PHYSICAL_NORM_NOT_APPLICABLE:construction_estimated_cost_currency=${currency}`,
    supervisionRequired === true ? "" : "PHYSICAL_NORM_NOT_APPLICABLE:author_supervision_required_for_object",
    applicableChapters === "1-9"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:applicable_consolidated_estimate_chapters=${applicableChapters}`,
    legalApplicability?.startsWith("KG_ORDER_52_NPA_CURRENT_CONFIRMED:")
      ? ""
      : "PROJECT_VALUE_INVALID:current_legal_applicability_and_amendments",
    travelRequired !== null ? "" : "PROJECT_VALUE_INVALID:travel_to_and_from_site_required",
    travelConditionValid ? "" : "PROJECT_VALUE_INVALID:travel_cost_separate_calculation",
    meaningfulReference(approvalReference) ? "" : "PROJECT_VALUE_INVALID:estimator_approval_reference",
  ].filter(Boolean);
  if (blockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      blockers,
      KG_AUTHOR_SUPERVISION_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const calculatedCost = Math.round(chaptersCost! * supervisionNorm.rate.value * 100) / 100;
  const explicitOutput = finiteNumber(explicitValue(input.parameter_values, "kg_author_supervision_cost_currency"));
  if (explicitOutput !== null && Math.abs(explicitOutput - calculatedCost) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [`PHYSICAL_NORM_VALUE_CONFLICT:kg_author_supervision_cost_currency=${explicitOutput}:norm_value=${calculatedCost}`],
      [...KG_AUTHOR_SUPERVISION_REQUIRED_EXPLICIT_PARAMETER_IDS, "kg_author_supervision_cost_currency"],
    );
  }

  const capturedAt = KG_AUTHOR_SUPERVISION_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${productProfileId}`,
    `construction_estimated_cost_chapters_1_9_currency=${chaptersCost}`,
    `construction_estimated_cost_currency=${currency}`,
    `author_supervision_required_for_object=${supervisionRequired}`,
    `applicable_consolidated_estimate_chapters=${applicableChapters}`,
    `current_legal_applicability_and_amendments=${legalApplicability}`,
    `travel_to_and_from_site_required=${travelRequired}`,
    `travel_cost_separate_calculation=${travelCalculation}`,
    `estimator_approval_reference=${approvalReference}`,
    `kg_author_supervision_cost_currency=${calculatedCost}`,
    "formula=round_currency(construction_estimated_cost_chapters_1_9_currency*0.004)",
    "travel_included=false",
    "automatic_visit_count=false",
    "automatic_visit_cost=false",
    "automatic_generic_binding=false",
  ].join(";");
  const parameterValues = Object.freeze({
    ...input.parameter_values,
    kg_author_supervision_cost_currency: {
      value: calculatedCost,
      unit_id: currency!.toLowerCase(),
      source_type: "APPLICABLE_NORM" as const,
      source_id: KG_AUTHOR_SUPERVISION_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: APPLICABILITY_VERSION,
    product_profile_id: productProfileId,
    source_id: KG_AUTHOR_SUPERVISION_SOURCE_ID,
    norm_id: KG_AUTHOR_SUPERVISION_NORM_ID,
    source_document_version: KG_AUTHOR_SUPERVISION_SOURCE_METADATA.source_document_version,
    source_url: KG_AUTHOR_SUPERVISION_SOURCE_METADATA.source_url,
    exact_locator: KG_AUTHOR_SUPERVISION_SOURCE_METADATA.exact_locator,
    source_definition_hash: KG_AUTHOR_SUPERVISION_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...KG_AUTHOR_SUPERVISION_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["kg_author_supervision_cost_currency"] as const,
    calculated_kg_author_supervision_cost_currency: calculatedCost,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
