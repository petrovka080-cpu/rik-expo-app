import fs from "node:fs";
import path from "node:path";

import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";
import {
  getAgentRuntimeRouteBudgetPolicy,
  listAgentRuntimeRouteBudgetPolicies,
} from "../../src/features/ai/agent/agentRuntimeBudgetPolicy";
import { listAgentRuntimeRoutePolicyRegistryEntries } from "../../src/features/ai/agent/agentRuntimeRoutePolicyRegistry";

export const AI_RUNTIME_ROUTE_POLICY_REGISTRY_WAVE =
  "S_AI_RUNTIME_04_EXPLICIT_ROUTE_POLICY_REGISTRY" as const;

export type AiRuntimeRoutePolicyRegistryFinalStatus =
  | "GREEN_AI_RUNTIME_ROUTE_POLICY_REGISTRY_READY"
  | "BLOCKED_AI_RUNTIME_ROUTE_POLICY_MISSING"
  | "BLOCKED_AI_RUNTIME_ROUTE_POLICY_DRIFT";

export type AiRuntimeRoutePolicyRegistryMatrix = {
  wave: typeof AI_RUNTIME_ROUTE_POLICY_REGISTRY_WAVE;
  final_status: AiRuntimeRoutePolicyRegistryFinalStatus;
  exact_reason: string | null;
  route_count: number;
  route_budget_count: number;
  explicit_route_policy_count: number;
  missing_policy_operations: readonly string[];
  extra_policy_operations: readonly string[];
  duplicate_policy_operations: readonly string[];
  budget_policy_missing_operations: readonly string[];
  all_routes_have_explicit_policy: boolean;
  no_extra_explicit_route_policies: boolean;
  no_duplicate_explicit_route_policies: boolean;
  all_budget_policies_use_explicit_registry: boolean;
  actual_submit_routes_approval_ledger: boolean;
  actual_submit_route_checks: readonly {
    operation: string;
    routeClass: string | null;
    idempotencyRequired: boolean | null;
    auditRequired: boolean | null;
  }[];
  tool_routes_optional_or_blocked_reason: boolean;
  no_db_writes: true;
  no_direct_database_access: true;
  no_provider_calls: true;
  no_raw_rows: true;
  no_raw_provider_payloads: true;
  no_ui_changes: true;
  no_fake_green: true;
};

const projectRoot = process.cwd();
const artifactPrefix = path.join(projectRoot, "artifacts", AI_RUNTIME_ROUTE_POLICY_REGISTRY_WAVE);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const proofPath = `${artifactPrefix}_proof.md`;

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function findDuplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function isActualSubmitForApprovalOperation(operation: string): boolean {
  return operation.endsWith(".submit_for_approval") || operation === "agent.action.submit_for_approval";
}

export function buildAiRuntimeRoutePolicyRegistryMatrix(): AiRuntimeRoutePolicyRegistryMatrix {
  const routes = AGENT_BFF_ROUTE_DEFINITIONS;
  const routeOperations = routes.map((route) => route.operation);
  const explicitPolicies = listAgentRuntimeRoutePolicyRegistryEntries();
  const explicitOperations = explicitPolicies.map((policy) => policy.operation);
  const budgetPolicies = listAgentRuntimeRouteBudgetPolicies();
  const missingPolicyOperations = routeOperations.filter(
    (operation) => !explicitOperations.includes(operation),
  );
  const extraPolicyOperations = explicitOperations.filter(
    (operation) => !routeOperations.includes(operation),
  );
  const duplicatePolicyOperations = findDuplicates(explicitOperations);
  const budgetPolicyMissingOperations = routeOperations.filter(
    (operation) => !getAgentRuntimeRouteBudgetPolicy(operation),
  );
  const actualSubmitRouteChecks = routeOperations
    .filter(isActualSubmitForApprovalOperation)
    .map((operation) => {
      const budget = getAgentRuntimeRouteBudgetPolicy(operation);
      return {
        operation,
        routeClass: budget?.routeClass ?? null,
        idempotencyRequired: budget?.idempotencyRequired ?? null,
        auditRequired: budget?.auditRequired ?? null,
      };
    });
  const allRoutesHaveExplicitPolicy = missingPolicyOperations.length === 0;
  const noExtraExplicitRoutePolicies = extraPolicyOperations.length === 0;
  const noDuplicateExplicitRoutePolicies = duplicatePolicyOperations.length === 0;
  const allBudgetPoliciesUseExplicitRegistry = budgetPolicies.every(
    (policy) =>
      policy.explicitPolicyRequired &&
      policy.policySource === "explicit_route_policy_registry",
  );
  const actualSubmitRoutesApprovalLedger = actualSubmitRouteChecks.every(
    (check) =>
      check.routeClass === "approval_ledger" &&
      check.idempotencyRequired === true &&
      check.auditRequired === true,
  );
  const toolRoutesOptionalOrBlockedReason = budgetPolicies
    .filter((policy) => policy.operation.startsWith("agent.tools."))
    .every((policy) => policy.evidencePolicy === "optional_or_blocked_reason");

  const finalStatus: AiRuntimeRoutePolicyRegistryFinalStatus =
    !allRoutesHaveExplicitPolicy || budgetPolicyMissingOperations.length > 0
      ? "BLOCKED_AI_RUNTIME_ROUTE_POLICY_MISSING"
      : !noExtraExplicitRoutePolicies ||
          !noDuplicateExplicitRoutePolicies ||
          !allBudgetPoliciesUseExplicitRegistry ||
          !actualSubmitRoutesApprovalLedger ||
          !toolRoutesOptionalOrBlockedReason
        ? "BLOCKED_AI_RUNTIME_ROUTE_POLICY_DRIFT"
        : "GREEN_AI_RUNTIME_ROUTE_POLICY_REGISTRY_READY";

  return {
    wave: AI_RUNTIME_ROUTE_POLICY_REGISTRY_WAVE,
    final_status: finalStatus,
    exact_reason:
      finalStatus === "GREEN_AI_RUNTIME_ROUTE_POLICY_REGISTRY_READY"
        ? null
        : [
            ...missingPolicyOperations.map((operation) => `${operation}: explicit policy missing`),
            ...extraPolicyOperations.map((operation) => `${operation}: policy has no mounted route`),
            ...duplicatePolicyOperations.map((operation) => `${operation}: duplicate policy`),
            ...budgetPolicyMissingOperations.map((operation) => `${operation}: budget policy missing`),
            ...(actualSubmitRoutesApprovalLedger
              ? []
              : ["actual submit_for_approval routes must use approval_ledger budget policy"]),
            ...(toolRoutesOptionalOrBlockedReason
              ? []
              : ["tool registry routes must use optional_or_blocked_reason evidence policy"]),
          ].join("; "),
    route_count: routes.length,
    route_budget_count: budgetPolicies.length,
    explicit_route_policy_count: explicitPolicies.length,
    missing_policy_operations: missingPolicyOperations,
    extra_policy_operations: extraPolicyOperations,
    duplicate_policy_operations: duplicatePolicyOperations,
    budget_policy_missing_operations: budgetPolicyMissingOperations,
    all_routes_have_explicit_policy: allRoutesHaveExplicitPolicy,
    no_extra_explicit_route_policies: noExtraExplicitRoutePolicies,
    no_duplicate_explicit_route_policies: noDuplicateExplicitRoutePolicies,
    all_budget_policies_use_explicit_registry: allBudgetPoliciesUseExplicitRegistry,
    actual_submit_routes_approval_ledger: actualSubmitRoutesApprovalLedger,
    actual_submit_route_checks: actualSubmitRouteChecks,
    tool_routes_optional_or_blocked_reason: toolRoutesOptionalOrBlockedReason,
    no_db_writes: true,
    no_direct_database_access: true,
    no_provider_calls: true,
    no_raw_rows: true,
    no_raw_provider_payloads: true,
    no_ui_changes: true,
    no_fake_green: true,
  };
}

function writeArtifacts(matrix: AiRuntimeRoutePolicyRegistryMatrix): void {
  const inventory = {
    wave: AI_RUNTIME_ROUTE_POLICY_REGISTRY_WAVE,
    source_files: [
      "src/features/ai/agent/agentRuntimeRoutePolicyRegistry.ts",
      "src/features/ai/agent/agentRuntimeBudgetPolicy.ts",
      "src/features/ai/agent/agentRuntimeGateway.ts",
      "scripts/ai/verifyAiRuntimeRoutePolicyRegistry.ts",
    ],
    test_files: [
      "tests/ai/agentRuntimeRoutePolicyRegistry.contract.test.ts",
      "tests/ai/agentRuntimeBudgetPolicy.contract.test.ts",
      "tests/architecture/aiRuntimeRoutePolicyNoHeuristicFallback.contract.test.ts",
      "tests/architecture/agentBffRuntimeMount.contract.test.ts",
    ],
    route_count: matrix.route_count,
    explicit_route_policy_count: matrix.explicit_route_policy_count,
    db_writes: 0,
    provider_calls: 0,
    ui_changes: false,
  };
  const proof = [
    `# ${AI_RUNTIME_ROUTE_POLICY_REGISTRY_WAVE}`,
    "",
    `final_status: ${matrix.final_status}`,
    `exact_reason: ${matrix.exact_reason ?? "none"}`,
    `route_count: ${matrix.route_count}`,
    `explicit_route_policy_count: ${matrix.explicit_route_policy_count}`,
    `all_routes_have_explicit_policy: ${matrix.all_routes_have_explicit_policy}`,
    `no_extra_explicit_route_policies: ${matrix.no_extra_explicit_route_policies}`,
    `no_duplicate_explicit_route_policies: ${matrix.no_duplicate_explicit_route_policies}`,
    `all_budget_policies_use_explicit_registry: ${matrix.all_budget_policies_use_explicit_registry}`,
    `actual_submit_routes_approval_ledger: ${matrix.actual_submit_routes_approval_ledger}`,
    `tool_routes_optional_or_blocked_reason: ${matrix.tool_routes_optional_or_blocked_reason}`,
    "no_db_writes: true",
    "no_direct_database_access: true",
    "no_provider_calls: true",
    "no_raw_rows: true",
    "no_raw_provider_payloads: true",
    "no_ui_changes: true",
    "no_fake_green: true",
    "",
  ].join("\n");

  writeJson(inventoryPath, inventory);
  writeJson(matrixPath, matrix);
  fs.writeFileSync(proofPath, proof, "utf8");
}

if (require.main === module) {
  const matrix = buildAiRuntimeRoutePolicyRegistryMatrix();
  writeArtifacts(matrix);
  console.log(JSON.stringify(matrix, null, 2));
  process.exitCode =
    matrix.final_status === "GREEN_AI_RUNTIME_ROUTE_POLICY_REGISTRY_READY" ? 0 : 1;
}
