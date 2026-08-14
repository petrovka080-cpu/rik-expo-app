import type { ElectricalDomainInventoryRow } from "./inventory";
import type {
  ElectricalMaximumResourceCandidateV2,
  ElectricalResourceOwnerV2,
} from "./maximumResourceScopeV2";
import {
  independentElectricalExpectedOwnerForSemanticKeyV2,
  independentElectricalNormativeRoutesForSemanticKeyV2,
  independentElectricalOperationAllowsProductionSemanticV2,
  reconstructIndependentElectricalExpectedResourceCatalogV2,
  type IndependentElectricalExpectedResourceCatalogV2,
} from "./independentExpectedResourceCatalogV2";

/**
 * Comparison boundary between two separately constructed models:
 *
 * - expected scope is rebuilt only from catalog identity, family, operation and
 *   normative/technology rules in independentExpectedResourceCatalogV2;
 * - production rows are supplied by the caller after the production builder
 *   has completed.
 *
 * This module must never ask maximumResourceScopeV2 to construct expected
 * resources. Importing the structural production-row type above does not
 * import or execute the production builder.
 */

export type IndependentElectricalProductionAdmissionIssueV2 = {
  code:
    | "EXPECTED_RESOURCE_MISSING"
    | "EXPECTED_OWNER_MISMATCH"
    | "EXPECTED_NORMATIVE_ROUTE_MISSING"
    | "EXPECTED_SLOT_MISSING"
    | "PRODUCTION_ROW_DEFICIT"
    | "PRODUCTION_RESOURCE_DUPLICATE"
    | "PRODUCTION_GROUP_IDENTITY_MISMATCH"
    | "PRODUCTION_ROW_WITHOUT_INDEPENDENT_EXPECTATION"
    | "PRODUCTION_ROW_OPERATION_INAPPLICABLE"
    | "PRODUCTION_ROW_OWNER_CONFLICT"
    | "PRODUCTION_ROW_NORMATIVE_CONFLICT"
    | "PRODUCTION_PADDING_SEMANTIC";
  detail: string;
};

export type IndependentElectricalProductionAdmissionV2 = {
  schema_version: "IndependentElectricalProductionAdmissionV2";
  catalog_id: string;
  group_id: string;
  expected_catalog: IndependentElectricalExpectedResourceCatalogV2;
  expected_resource_count: number;
  production_resource_count: number;
  independently_required_minimum_rows: number;
  missing_semantic_keys: readonly string[];
  owner_mismatches: readonly string[];
  missing_normative_routes: readonly string[];
  missing_slots: readonly string[];
  extra_production_semantic_keys: readonly string[];
  production_reconciliations: readonly IndependentElectricalProductionResourceReconciliationV2[];
  issues: readonly IndependentElectricalProductionAdmissionIssueV2[];
  verdict: "GREEN_INDEPENDENT_EXPECTED_SCOPE_ADMISSION" | "RED_INDEPENDENT_EXPECTED_SCOPE_ADMISSION";
};

export type IndependentElectricalProductionResourceReconciliationV2 = {
  production_semantic_key: string;
  independent_expected_candidate_id: string;
  independent_rule_id: string;
  expected_physical_stage: string;
  expected_owner: string;
  expected_normative_routes: readonly string[];
  production_owner: string;
  production_normative_source_id: string;
  decision: "MATCHED_ONE_TO_ONE" | "OWNED_BY_EXACT_TYPED_CHILD";
};

function ownerMatches(expected: string, actual: ElectricalResourceOwnerV2): boolean {
  return expected === actual;
}

export function auditElectricalProductionAgainstIndependentExpectedV2(
  inventory: ElectricalDomainInventoryRow,
  productionCandidates: readonly ElectricalMaximumResourceCandidateV2[],
): IndependentElectricalProductionAdmissionV2 {
  const expected = reconstructIndependentElectricalExpectedResourceCatalogV2(inventory);
  const issues: IndependentElectricalProductionAdmissionIssueV2[] = [];
  const productionByKey = new Map<string, ElectricalMaximumResourceCandidateV2>();
  const duplicateKeys = new Set<string>();
  for (const candidate of productionCandidates) {
    if (productionByKey.has(candidate.candidate_id)) duplicateKeys.add(candidate.candidate_id);
    else productionByKey.set(candidate.candidate_id, candidate);
  }
  for (const key of duplicateKeys) issues.push({ code: "PRODUCTION_RESOURCE_DUPLICATE", detail: key });

  const missingSemanticKeys: string[] = [];
  const ownerMismatches: string[] = [];
  const missingNormativeRoutes: string[] = [];
  for (const requirement of expected.required_resources) {
    const production = productionByKey.get(requirement.semantic_key);
    if (!production) {
      missingSemanticKeys.push(requirement.semantic_key);
      issues.push({ code: "EXPECTED_RESOURCE_MISSING", detail: requirement.semantic_key });
      continue;
    }
    if (!ownerMatches(requirement.expected_owner, production.owner)) {
      const detail = `${requirement.semantic_key}:expected=${requirement.expected_owner}:actual=${production.owner}`;
      ownerMismatches.push(detail);
      issues.push({ code: "EXPECTED_OWNER_MISMATCH", detail });
    }
    if (!requirement.normative_route.includes(production.normative_source_id)) {
      const detail = `${requirement.semantic_key}:expected=${requirement.normative_route.join("|")}:actual=${production.normative_source_id}`;
      missingNormativeRoutes.push(detail);
      issues.push({ code: "EXPECTED_NORMATIVE_ROUTE_MISSING", detail });
    }
  }

  const productionSlots = new Set(productionCandidates.map((candidate) => candidate.completeness_slot_v2));
  const missingSlots = expected.required_slots.filter((slot) => !productionSlots.has(slot as never));
  for (const slot of missingSlots) issues.push({ code: "EXPECTED_SLOT_MISSING", detail: slot });

  if (productionCandidates.length < expected.minimum_justified_rows) {
    issues.push({
      code: "PRODUCTION_ROW_DEFICIT",
      detail: `expected-minimum=${expected.minimum_justified_rows}:actual=${productionCandidates.length}`,
    });
  }

  if (inventory.candidate_canonical_technology_id !== expected.permitted_shared_graph_group_id) {
    issues.push({
      code: "PRODUCTION_GROUP_IDENTITY_MISMATCH",
      detail: `${inventory.catalog_id}:${expected.permitted_shared_graph_group_id}`,
    });
  }

  const productionReconciliations: IndependentElectricalProductionResourceReconciliationV2[] = [];
  const extraProductionSemanticKeys: string[] = [];
  for (const candidate of productionCandidates) {
    const matchingRules = expected.production_legitimacy_rules.filter((candidateRule) => candidate.candidate_id.startsWith(candidateRule.semantic_prefix));
    if (matchingRules.length !== 1) {
      extraProductionSemanticKeys.push(candidate.candidate_id);
      issues.push({ code: "PRODUCTION_ROW_WITHOUT_INDEPENDENT_EXPECTATION", detail: `${candidate.candidate_id}:rules=${matchingRules.length}` });
      continue;
    }
    const matchingRule = matchingRules[0];
    if (!independentElectricalOperationAllowsProductionSemanticV2(inventory, candidate.candidate_id, candidate.completeness_slot_v2, candidate.category)) {
      issues.push({ code: "PRODUCTION_ROW_OPERATION_INAPPLICABLE", detail: `${candidate.candidate_id}:${inventory.operation_class}` });
    }
    if (/(?:^|_)(?:padding|duplicate|misc|miscellaneous|other|percentage|percent|aggregate|bundle|kit)(?:_|$)/iu.test(candidate.candidate_id)) {
      issues.push({ code: "PRODUCTION_PADDING_SEMANTIC", detail: candidate.candidate_id });
    }
    const expectedOwner = independentElectricalExpectedOwnerForSemanticKeyV2(candidate.candidate_id);
    if (!ownerMatches(expectedOwner, candidate.owner)) {
      issues.push({ code: "PRODUCTION_ROW_OWNER_CONFLICT", detail: `${candidate.candidate_id}:expected=${expectedOwner}:actual=${candidate.owner}` });
    }
    const expectedRoutes = independentElectricalNormativeRoutesForSemanticKeyV2(candidate.candidate_id, candidate.category);
    if (!expectedRoutes.includes(candidate.normative_source_id)) {
      issues.push({ code: "PRODUCTION_ROW_NORMATIVE_CONFLICT", detail: `${candidate.candidate_id}:expected=${expectedRoutes.join("|")}:actual=${candidate.normative_source_id}` });
    }
    productionReconciliations.push({
      production_semantic_key: candidate.candidate_id,
      independent_expected_candidate_id: `${matchingRule.rule_id}:${candidate.candidate_id}`,
      independent_rule_id: matchingRule.rule_id,
      expected_physical_stage: matchingRule.physical_stage,
      expected_owner: expectedOwner,
      expected_normative_routes: expectedRoutes,
      production_owner: candidate.owner,
      production_normative_source_id: candidate.normative_source_id,
      decision: candidate.owner === "ELECTRICAL" ? "MATCHED_ONE_TO_ONE" : "OWNED_BY_EXACT_TYPED_CHILD",
    });
  }

  return Object.freeze({
    schema_version: "IndependentElectricalProductionAdmissionV2",
    catalog_id: inventory.catalog_id,
    group_id: inventory.candidate_canonical_technology_id,
    expected_catalog: expected,
    expected_resource_count: expected.required_resources.length,
    production_resource_count: productionCandidates.length,
    independently_required_minimum_rows: expected.minimum_justified_rows,
    missing_semantic_keys: Object.freeze(missingSemanticKeys),
    owner_mismatches: Object.freeze(ownerMismatches),
    missing_normative_routes: Object.freeze(missingNormativeRoutes),
    missing_slots: Object.freeze([...missingSlots]),
    extra_production_semantic_keys: Object.freeze(extraProductionSemanticKeys),
    production_reconciliations: Object.freeze(productionReconciliations),
    issues: Object.freeze(issues),
    verdict: issues.length === 0
      ? "GREEN_INDEPENDENT_EXPECTED_SCOPE_ADMISSION"
      : "RED_INDEPENDENT_EXPECTED_SCOPE_ADMISSION",
  });
}
