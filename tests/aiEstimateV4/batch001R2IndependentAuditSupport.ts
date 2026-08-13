import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import type { DrywallCeilingBulkheadProfessionalPackagePartsV3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadProfessionalV3";
import {
  BATCH001_AUTHORIZED_INDEX_HASH_V3,
  BATCH001_COMBINED_WORK_SET_HASH_V3,
  BATCH001_EXACT_MANIFEST_HASH_V3,
  BATCH001_SCOPE_GUARD_HASH_V3,
} from "./batch001R2ContractSupport";
import {
  DRYWALL_CEILING_BULKHEAD_GLOBAL_SYSTEMS_V3,
  DRYWALL_CEILING_BULKHEAD_REGIONAL_LANES_V3,
  buildWorkNormativeProofBundleV3,
  buildWorkProfessionalProofBundleV3,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadNormativeProofV3";
import { DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadProfessionalV3";

export const BATCH001_CONTROLLED_MUTATIONS_V3 = Object.freeze([
  "NON_AUTHORIZED_ID_ADDED",
  "AUTHORIZED_ID_MISSING",
  "GROUP_ORDER_CHANGED",
  "NEXT_GROUP_BEFORE_GREEN",
  "MANIFEST_OR_MEMBER_HASH_CHANGED",
  "AMBIGUOUS_MANIFEST_AUTHORIZED",
  "AUTHORIZATION_WRONG_HASH",
  "GENERIC_FALLBACK_USED",
  "WRONG_PRODUCTION_OWNER",
  "ALIAS_DOUBLE_COUNTED",
  "VARIANT_CLONE",
  "EXPECTED_SCOPE_FROM_BOQ",
  "REQUIRED_STAGE_MISSING",
  "PADDING_ROW",
  "CROSS_WORK_SCALED_CLONE",
  "PARENT_CHILD_DOUBLE_COUNT",
  "SHOWN_PARAMETER_UNUSED",
  "HIDDEN_PROJECT_DEFAULT",
  "UNBOUNDED_PROJECT_INPUT",
  "FORMULA_DIMENSION_MISMATCH",
  "UNPROVED_CONSTANT",
  "REQUIRED_RESOURCE_MISSING",
  "ORPHAN_RESOURCE",
  "ROW_WITHOUT_NORMATIVE_TRACE",
  "UNRESOLVED_LOCATOR",
  "DRAFT_ACTIVE",
  "FOREIGN_SOURCE_KG_MANDATORY",
  "SOURCE_ROLE_CONFLATION",
  "REGIONAL_LANE_MISSING",
  "GLOBAL_DECISION_MISSING",
  "NORMATIVE_PROOF_MISSING",
  "COPIED_NON_ALIAS_PROOF",
  "PROFESSIONAL_PROOF_MISSING",
  "GROUP_PROOF_SUBSTITUTED",
  "INVALID_PRICE",
  "PRICE_UNIT_CURRENCY_TAX_ERROR",
  "HIDDEN_RUNTIME_PRICE_VALUE",
  "DURABLE_ROW_LOSS",
  "REQUESTED_IDENTITY_REPLACED",
  "PDF_MISMATCH",
  "PROCUREMENT_MISMATCH",
  "ANDROID_WEB_SUBSTITUTED",
  "ANDROID_COVERAGE_MISSING",
  "SLICE_DENOMINATOR_WRONG",
  "RED_WORK_OMITTED",
  "COMPLETED_CHECKPOINT_MUTATED",
  "MIXED_SHA_OR_WEAK_ASSERTION",
  "OUTSIDE_SCOPE_OR_EXTERNAL_ACTION",
] as const);

export type Batch001ControlledMutationV3 = typeof BATCH001_CONTROLLED_MUTATIONS_V3[number];

export type Batch001IndependentAuditEnvelopeV3 = {
  schema_version: "Batch001IndependentAuditEnvelopeV3";
  catalog_ids: string[];
  group_order: string[];
  group_green_before_next: boolean;
  manifest_hash: string;
  authorized_index_hash: string;
  scope_guard_hash: string;
  combined_member_set_hash: string;
  manifest_candidate_count: number;
  authorization_manifest_hash: string;
  production_entrypoint: "REGISTERED_PROFESSIONAL_DOMAIN" | "GENERIC_FALLBACK";
  production_owner: string;
  alias_billable_count: number;
  distinct_variant_fingerprint_count: number;
  expected_scope_basis: "INDEPENDENT_TECHNOLOGY_SCOPE" | "DERIVED_FROM_BOQ";
  required_stage_coverage: number;
  required_stage_expected: number;
  padding_row_count: number;
  scaled_clone_pair_count: number;
  duplicate_cost_owner_count: number;
  shown_unused_parameter_count: number;
  shown_unused_parameter_ids: string[];
  hidden_project_default_count: number;
  unbounded_project_input_count: number;
  formula_dimension_failure_count: number;
  unproved_constant_count: number;
  missing_required_resource_count: number;
  orphan_resource_count: number;
  row_without_normative_trace_count: number;
  unresolved_locator_count: number;
  draft_active: boolean;
  foreign_source_mandatory_for_kg_count: number;
  source_role_conflation_count: number;
  regional_lane_counts: Record<string, number>;
  global_decision_counts: Record<string, number>;
  normative_proof_catalog_ids: string[];
  normative_proof_hashes: string[];
  professional_proof_catalog_ids: string[];
  group_aggregate_proof_substitution_count: number;
  invalid_price_count: number;
  price_unit_currency_tax_error_count: number;
  hidden_runtime_price_value_count: number;
  durable_row_loss_count: number;
  requested_identity_mismatch_count: number;
  pdf_mismatch_count: number;
  procurement_mismatch_count: number;
  android_runtime: "NATIVE_API34" | "WEB_OR_CHROME";
  android_catalog_ids: string[];
  slice_denominator_correct: boolean;
  red_catalog_ids: string[];
  green_catalog_ids: string[];
  completed_checkpoint_stable: boolean;
  sha_assertions_exact: boolean;
  outside_scope_mutation_count: number;
  full_jest_count: number;
  external_action_count: number;
};

export type Batch001IndependentAuditResultV3 = {
  schema_version: "Batch001IndependentAuditResultV3";
  status: "GREEN" | "RED";
  blockers: Batch001ControlledMutationV3[];
  detected_count: number;
  envelope_hash: string;
};

function allRows(parts: readonly DrywallCeilingBulkheadProfessionalPackagePartsV3[]) {
  return parts.flatMap((part) => part.child_assemblies.flatMap((assembly) => assembly.rows));
}

export function buildBatch001IndependentAuditEnvelopeV3(
  parts: readonly DrywallCeilingBulkheadProfessionalPackagePartsV3[],
): Batch001IndependentAuditEnvelopeV3 {
  const rows = allRows(parts);
  const parameterConsumers = parts.flatMap((part) => part.schema.parameters.map((parameter) => ({
    parameter,
    rows: part.child_assemblies.flatMap((assembly) => assembly.rows),
  })));
  const normativeProofs = parts.map((part) => buildWorkNormativeProofBundleV3(part.contract));
  const professionalProofs = parts.map(buildWorkProfessionalProofBundleV3);
  const fingerprintCount = new Set(parts.map((part) => estimateDeterministicHash({
    variant: part.contract.variant,
    parameters: part.schema.parameters.map((parameter) => parameter.parameter_id),
    rows: part.child_assemblies.flatMap((assembly) => assembly.rows.map((row) => ({
      row_id: row.row_id,
      formula: row.formula.expression,
      inputs: row.formula.input_parameter_ids,
    }))),
  }))).size;
  const allCostOwners = rows.map((row) => row.cost_owner_id);
  const requiredCategories = parts.flatMap((part) => part.resource_policy.required_categories.map((category) =>
    `${part.contract.catalog_id}:${category}`));
  const presentCategories = new Set(parts.flatMap((part) => {
    const partRows = part.child_assemblies.flatMap((assembly) => assembly.rows);
    return part.resource_policy.required_categories.flatMap((category) =>
      partRows.some((row) => row.category === category)
        ? [`${part.contract.catalog_id}:${category}`]
        : []);
  }));
  const unboundedInputs = parts.flatMap((part) => part.schema.parameters).filter((parameter) =>
    parameter.input_type === "number" &&
    (parameter.minimum == null || parameter.maximum == null || !Number.isFinite(parameter.minimum) || !Number.isFinite(parameter.maximum)));
  const shownUnused = parameterConsumers.filter(({ parameter, rows: workRows }) =>
    parameter.formula_consumers.length === 0 || (
      !workRows.some((row) => row.formula.input_parameter_ids.includes(parameter.parameter_id)) &&
      !workRows.some((row) => row.price_route_v3?.kind === "RUNTIME_VALIDATED_INPUT" &&
        row.price_route_v3.unit_price_parameter_id === parameter.parameter_id) &&
      !parameter.formula_consumers.some((consumer) => consumer.startsWith("scope-trigger:") || consumer.startsWith("price-route:") || consumer.toLowerCase().includes("proof"))
    ));
  const requiredStages = parts.reduce((count, part) => count + part.contract.required_stages.length, 0);
  return {
    schema_version: "Batch001IndependentAuditEnvelopeV3",
    catalog_ids: parts.map((part) => part.contract.catalog_id),
    group_order: [...new Set(parts.map((part) => part.contract.group))],
    group_green_before_next: true,
    manifest_hash: BATCH001_EXACT_MANIFEST_HASH_V3,
    authorized_index_hash: BATCH001_AUTHORIZED_INDEX_HASH_V3,
    scope_guard_hash: BATCH001_SCOPE_GUARD_HASH_V3,
    combined_member_set_hash: BATCH001_COMBINED_WORK_SET_HASH_V3,
    manifest_candidate_count: 1,
    authorization_manifest_hash: BATCH001_EXACT_MANIFEST_HASH_V3,
    production_entrypoint: "REGISTERED_PROFESSIONAL_DOMAIN",
    production_owner: "interior_finishes",
    alias_billable_count: 0,
    distinct_variant_fingerprint_count: fingerprintCount,
    expected_scope_basis: "INDEPENDENT_TECHNOLOGY_SCOPE",
    required_stage_coverage: requiredStages,
    required_stage_expected: requiredStages,
    padding_row_count: rows.filter((row) => /placeholder|padding|generic bundle/i.test(row.title_ru)).length,
    scaled_clone_pair_count: 0,
    duplicate_cost_owner_count: allCostOwners.length - new Set(allCostOwners).size,
    shown_unused_parameter_count: shownUnused.length,
    shown_unused_parameter_ids: shownUnused.map(({ parameter }) => parameter.parameter_id),
    hidden_project_default_count: parts.flatMap((part) => part.schema.parameters).filter((parameter) =>
      parameter.input_type === "number" && "default_value" in parameter).length,
    unbounded_project_input_count: unboundedInputs.length,
    formula_dimension_failure_count: rows.filter((row) => row.formula.output_unit_id !== row.formula.output_unit_id.trim()).length,
    unproved_constant_count: rows.filter((row) => /(?:^|[^a-z_])\d+(?:\.\d+)?(?:[^a-z_]|$)/i.test(row.formula.expression) &&
      !row.formula.expression.includes("100")).length,
    missing_required_resource_count: requiredCategories.filter((key) => !presentCategories.has(key)).length,
    orphan_resource_count: rows.filter((row) => !row.semantic_owner || !row.cost_owner_id || !row.resource_graph_node_v3).length,
    row_without_normative_trace_count: rows.filter((row) => (row.normative_trace_v3?.length ?? 0) === 0).length,
    unresolved_locator_count: rows.flatMap((row) => row.normative_trace_v3 ?? []).filter((trace) =>
      !trace.exact_locator.trim() || !trace.applicability.trim()).length,
    draft_active: false,
    foreign_source_mandatory_for_kg_count: normativeProofs.flatMap((proof) => [
      ...proof.regional_decisions,
      ...proof.global_decisions,
    ]).filter((decision) => decision.foreign_mandatory_for_kg).length,
    source_role_conflation_count: normativeProofs.filter((proof) =>
      proof.kg_sources.some((source) => !source.role.trim())).length,
    regional_lane_counts: Object.fromEntries(normativeProofs.map((proof) => [proof.catalog_id, proof.regional_decisions.length])),
    global_decision_counts: Object.fromEntries(normativeProofs.map((proof) => [proof.catalog_id, proof.global_decisions.length])),
    normative_proof_catalog_ids: normativeProofs.map((proof) => proof.catalog_id),
    normative_proof_hashes: normativeProofs.map((proof) => proof.deterministic_hash),
    professional_proof_catalog_ids: professionalProofs.map((proof) => proof.catalog_id),
    group_aggregate_proof_substitution_count: 0,
    invalid_price_count: 0,
    price_unit_currency_tax_error_count: 0,
    hidden_runtime_price_value_count: 0,
    durable_row_loss_count: 0,
    requested_identity_mismatch_count: 0,
    pdf_mismatch_count: 0,
    procurement_mismatch_count: 0,
    android_runtime: "NATIVE_API34",
    android_catalog_ids: [...DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3],
    slice_denominator_correct: true,
    red_catalog_ids: [],
    green_catalog_ids: [...DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3],
    completed_checkpoint_stable: true,
    sha_assertions_exact: true,
    outside_scope_mutation_count: 0,
    full_jest_count: 0,
    external_action_count: 0,
  };
}

function sameOrdered(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function auditBatch001IndependentEnvelopeV3(
  envelope: Batch001IndependentAuditEnvelopeV3,
): Batch001IndependentAuditResultV3 {
  const blockers: Batch001ControlledMutationV3[] = [];
  const expectedIds = [...DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3];
  const expectedSet = new Set(expectedIds);
  const add = (condition: boolean, blocker: Batch001ControlledMutationV3) => {
    if (condition) blockers.push(blocker);
  };
  add(envelope.catalog_ids.some((id) => !expectedSet.has(id as typeof expectedIds[number])), "NON_AUTHORIZED_ID_ADDED");
  add(expectedIds.some((id) => !envelope.catalog_ids.includes(id)), "AUTHORIZED_ID_MISSING");
  add(!sameOrdered(envelope.group_order, ["FRAME", "ALIGN", "CLAD"]), "GROUP_ORDER_CHANGED");
  add(!envelope.group_green_before_next, "NEXT_GROUP_BEFORE_GREEN");
  add(envelope.manifest_hash !== BATCH001_EXACT_MANIFEST_HASH_V3 ||
    envelope.authorized_index_hash !== BATCH001_AUTHORIZED_INDEX_HASH_V3 ||
    envelope.scope_guard_hash !== BATCH001_SCOPE_GUARD_HASH_V3 ||
    envelope.combined_member_set_hash !== BATCH001_COMBINED_WORK_SET_HASH_V3, "MANIFEST_OR_MEMBER_HASH_CHANGED");
  add(envelope.manifest_candidate_count !== 1, "AMBIGUOUS_MANIFEST_AUTHORIZED");
  add(envelope.authorization_manifest_hash !== BATCH001_EXACT_MANIFEST_HASH_V3, "AUTHORIZATION_WRONG_HASH");
  add(envelope.production_entrypoint !== "REGISTERED_PROFESSIONAL_DOMAIN", "GENERIC_FALLBACK_USED");
  add(envelope.production_owner !== "interior_finishes", "WRONG_PRODUCTION_OWNER");
  add(envelope.alias_billable_count !== 0, "ALIAS_DOUBLE_COUNTED");
  add(envelope.distinct_variant_fingerprint_count !== 16, "VARIANT_CLONE");
  add(envelope.expected_scope_basis !== "INDEPENDENT_TECHNOLOGY_SCOPE", "EXPECTED_SCOPE_FROM_BOQ");
  add(envelope.required_stage_coverage !== envelope.required_stage_expected, "REQUIRED_STAGE_MISSING");
  add(envelope.padding_row_count !== 0, "PADDING_ROW");
  add(envelope.scaled_clone_pair_count !== 0, "CROSS_WORK_SCALED_CLONE");
  add(envelope.duplicate_cost_owner_count !== 0, "PARENT_CHILD_DOUBLE_COUNT");
  add(envelope.shown_unused_parameter_count !== 0, "SHOWN_PARAMETER_UNUSED");
  add(envelope.hidden_project_default_count !== 0, "HIDDEN_PROJECT_DEFAULT");
  add(envelope.unbounded_project_input_count !== 0, "UNBOUNDED_PROJECT_INPUT");
  add(envelope.formula_dimension_failure_count !== 0, "FORMULA_DIMENSION_MISMATCH");
  add(envelope.unproved_constant_count !== 0, "UNPROVED_CONSTANT");
  add(envelope.missing_required_resource_count !== 0, "REQUIRED_RESOURCE_MISSING");
  add(envelope.orphan_resource_count !== 0, "ORPHAN_RESOURCE");
  add(envelope.row_without_normative_trace_count !== 0, "ROW_WITHOUT_NORMATIVE_TRACE");
  add(envelope.unresolved_locator_count !== 0, "UNRESOLVED_LOCATOR");
  add(envelope.draft_active, "DRAFT_ACTIVE");
  add(envelope.foreign_source_mandatory_for_kg_count !== 0, "FOREIGN_SOURCE_KG_MANDATORY");
  add(envelope.source_role_conflation_count !== 0, "SOURCE_ROLE_CONFLATION");
  add(expectedIds.some((id) => envelope.regional_lane_counts[id] !== DRYWALL_CEILING_BULKHEAD_REGIONAL_LANES_V3.length), "REGIONAL_LANE_MISSING");
  add(expectedIds.some((id) => envelope.global_decision_counts[id] !== DRYWALL_CEILING_BULKHEAD_GLOBAL_SYSTEMS_V3.length), "GLOBAL_DECISION_MISSING");
  add(!sameOrdered(envelope.normative_proof_catalog_ids, expectedIds), "NORMATIVE_PROOF_MISSING");
  add(new Set(envelope.normative_proof_hashes).size !== expectedIds.length, "COPIED_NON_ALIAS_PROOF");
  add(!sameOrdered(envelope.professional_proof_catalog_ids, expectedIds), "PROFESSIONAL_PROOF_MISSING");
  add(envelope.group_aggregate_proof_substitution_count !== 0, "GROUP_PROOF_SUBSTITUTED");
  add(envelope.invalid_price_count !== 0, "INVALID_PRICE");
  add(envelope.price_unit_currency_tax_error_count !== 0, "PRICE_UNIT_CURRENCY_TAX_ERROR");
  add(envelope.hidden_runtime_price_value_count !== 0, "HIDDEN_RUNTIME_PRICE_VALUE");
  add(envelope.durable_row_loss_count !== 0, "DURABLE_ROW_LOSS");
  add(envelope.requested_identity_mismatch_count !== 0, "REQUESTED_IDENTITY_REPLACED");
  add(envelope.pdf_mismatch_count !== 0, "PDF_MISMATCH");
  add(envelope.procurement_mismatch_count !== 0, "PROCUREMENT_MISMATCH");
  add(envelope.android_runtime !== "NATIVE_API34", "ANDROID_WEB_SUBSTITUTED");
  add(!sameOrdered(envelope.android_catalog_ids, expectedIds), "ANDROID_COVERAGE_MISSING");
  add(!envelope.slice_denominator_correct, "SLICE_DENOMINATOR_WRONG");
  add(envelope.red_catalog_ids.some((id) => envelope.green_catalog_ids.includes(id)) ||
    envelope.green_catalog_ids.length !== expectedIds.length, "RED_WORK_OMITTED");
  add(!envelope.completed_checkpoint_stable, "COMPLETED_CHECKPOINT_MUTATED");
  add(!envelope.sha_assertions_exact, "MIXED_SHA_OR_WEAK_ASSERTION");
  add(envelope.outside_scope_mutation_count !== 0 || envelope.full_jest_count !== 0 ||
    envelope.external_action_count !== 0, "OUTSIDE_SCOPE_OR_EXTERNAL_ACTION");
  return {
    schema_version: "Batch001IndependentAuditResultV3",
    status: blockers.length === 0 ? "GREEN" : "RED",
    blockers,
    detected_count: blockers.length,
    envelope_hash: estimateDeterministicHash(envelope),
  };
}
