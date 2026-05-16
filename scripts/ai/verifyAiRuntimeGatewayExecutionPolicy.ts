import fs from "node:fs";
import path from "node:path";

import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";
import {
  buildAgentRuntimeGatewayMatrix,
  listAgentRuntimeGatewayMounts,
} from "../../src/features/ai/agent/agentRuntimeGateway";
import {
  listAgentRuntimeRoutePolicyRegistryEntries,
  type AgentRuntimeRoutePolicyRegistryEntry,
} from "../../src/features/ai/agent/agentRuntimeRoutePolicyRegistry";

export const AI_RUNTIME_GATEWAY_EXECUTION_POLICY_WAVE =
  "S_AI_RUNTIME_07_EXPLICIT_GATEWAY_EXECUTION_POLICY" as const;

export type AiRuntimeGatewayExecutionPolicyFinalStatus =
  | "GREEN_AI_RUNTIME_GATEWAY_EXECUTION_POLICY_READY"
  | "BLOCKED_AI_RUNTIME_GATEWAY_EXECUTION_POLICY_MISSING"
  | "BLOCKED_AI_RUNTIME_GATEWAY_EXECUTION_POLICY_DRIFT"
  | "BLOCKED_AI_RUNTIME_GATEWAY_EXECUTION_HEURISTIC_FOUND";

export type AiRuntimeGatewayExecutionPolicyCheck = {
  operation: string;
  routeClass: string | null;
  approvedGatewayRequiredByPolicy: boolean | null;
  approvedGatewayRequiredByGateway: boolean | null;
  idempotencyRequired: boolean | null;
  auditRequired: boolean | null;
  directExecutionWithoutApproval: boolean | null;
  executionPolicySource: string | null;
  policyMatchesGateway: boolean;
  approvedExecutorGateAligned: boolean;
};

export type AiRuntimeGatewayExecutionPolicyMatrix = {
  wave: typeof AI_RUNTIME_GATEWAY_EXECUTION_POLICY_WAVE;
  final_status: AiRuntimeGatewayExecutionPolicyFinalStatus;
  exact_reason: string | null;
  route_count: number;
  gateway_mount_count: number;
  explicit_policy_count: number;
  approved_gateway_route_count: number;
  approved_executor_policy_count: number;
  all_routes_have_gateway_execution_policy: boolean;
  approved_gateway_matches_policy: boolean;
  approved_executor_routes_require_gateway: boolean;
  non_approved_routes_do_not_require_gateway: boolean;
  approved_gateway_routes_require_idempotency_and_audit: boolean;
  direct_execution_without_approval_zero: boolean;
  gateway_matrix_uses_explicit_execution_policy: boolean;
  no_gateway_operation_name_heuristics: boolean;
  missing_policy_operations: readonly string[];
  missing_mount_operations: readonly string[];
  drift_operations: readonly string[];
  execution_checks: readonly AiRuntimeGatewayExecutionPolicyCheck[];
  no_db_writes: true;
  no_direct_database_access: true;
  no_provider_calls: true;
  no_raw_rows: true;
  no_raw_provider_payloads: true;
  no_ui_changes: true;
  no_fake_green: true;
};

const projectRoot = process.cwd();
const artifactPrefix = path.join(projectRoot, "artifacts", AI_RUNTIME_GATEWAY_EXECUTION_POLICY_WAVE);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const proofPath = `${artifactPrefix}_proof.md`;
const gatewayPath = path.join(projectRoot, "src/features/ai/agent/agentRuntimeGateway.ts");

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function policyByOperation(): Map<string, AgentRuntimeRoutePolicyRegistryEntry> {
  return new Map(
    listAgentRuntimeRoutePolicyRegistryEntries().map((entry) => [entry.operation, entry]),
  );
}

function hasGatewayOperationNameHeuristics(): boolean {
  const source = fs.readFileSync(gatewayPath, "utf8");
  return (
    /operation\.includes\s*\(/.test(source) ||
    /operation\.startsWith\s*\(/.test(source) ||
    /operation\.endsWith\s*\(/.test(source) ||
    /includes\s*\(\s*["']execute_approved["']\s*\)/.test(source) ||
    /startsWith\s*\(\s*["']agent\./.test(source)
  );
}

function buildExecutionChecks(): AiRuntimeGatewayExecutionPolicyCheck[] {
  const policies = policyByOperation();
  const mounts = new Map(listAgentRuntimeGatewayMounts().map((mount) => [mount.operation, mount]));

  return AGENT_BFF_ROUTE_DEFINITIONS.map((route) => {
    const policy = policies.get(route.operation) ?? null;
    const mount = mounts.get(route.operation) ?? null;
    const approvedGatewayRequiredByPolicy = policy?.approvedGatewayRequired ?? null;
    const approvedGatewayRequiredByGateway = mount?.approvedGatewayRequired ?? null;
    const approvedExecutorGateAligned =
      policy?.routeClass === "approved_executor"
        ? approvedGatewayRequiredByGateway === true &&
          policy.idempotencyRequired === true &&
          policy.auditRequired === true
        : approvedGatewayRequiredByGateway === false;

    return {
      operation: route.operation,
      routeClass: policy?.routeClass ?? null,
      approvedGatewayRequiredByPolicy,
      approvedGatewayRequiredByGateway,
      idempotencyRequired: policy?.idempotencyRequired ?? null,
      auditRequired: policy?.auditRequired ?? null,
      directExecutionWithoutApproval: policy?.directExecutionWithoutApproval ?? null,
      executionPolicySource: mount?.executionPolicySource ?? null,
      policyMatchesGateway:
        policy !== null &&
        mount !== null &&
        approvedGatewayRequiredByGateway === approvedGatewayRequiredByPolicy &&
        mount.executionPolicySource === policy.policySource,
      approvedExecutorGateAligned,
    };
  });
}

export function buildAiRuntimeGatewayExecutionPolicyMatrix(): AiRuntimeGatewayExecutionPolicyMatrix {
  const routes = AGENT_BFF_ROUTE_DEFINITIONS;
  const mounts = listAgentRuntimeGatewayMounts();
  const policies = listAgentRuntimeRoutePolicyRegistryEntries();
  const mountOperations = new Set(mounts.map((mount) => mount.operation));
  const policyOperations = new Set(policies.map((policy) => policy.operation));
  const executionChecks = buildExecutionChecks();
  const missingPolicyOperations = routes
    .map((route) => route.operation)
    .filter((operation) => !policyOperations.has(operation));
  const missingMountOperations = routes
    .map((route) => route.operation)
    .filter((operation) => !mountOperations.has(operation));
  const driftOperations = executionChecks
    .filter((check) => !check.policyMatchesGateway || !check.approvedExecutorGateAligned)
    .map((check) => check.operation);

  const approvedGatewayRouteCount = executionChecks.filter(
    (check) => check.approvedGatewayRequiredByGateway === true,
  ).length;
  const approvedExecutorPolicyCount = policies.filter(
    (policy) => policy.routeClass === "approved_executor",
  ).length;
  const allRoutesHaveGatewayExecutionPolicy =
    missingPolicyOperations.length === 0 &&
    missingMountOperations.length === 0 &&
    executionChecks.every(
      (check) =>
        check.approvedGatewayRequiredByPolicy !== null &&
        check.approvedGatewayRequiredByGateway !== null &&
        check.executionPolicySource === "explicit_route_policy_registry",
    );
  const approvedGatewayMatchesPolicy = executionChecks.every((check) => check.policyMatchesGateway);
  const approvedExecutorRoutesRequireGateway = executionChecks
    .filter((check) => check.routeClass === "approved_executor")
    .every((check) => check.approvedGatewayRequiredByGateway === true);
  const nonApprovedRoutesDoNotRequireGateway = executionChecks
    .filter((check) => check.routeClass !== "approved_executor")
    .every((check) => check.approvedGatewayRequiredByGateway === false);
  const approvedGatewayRoutesRequireIdempotencyAndAudit = executionChecks
    .filter((check) => check.approvedGatewayRequiredByGateway === true)
    .every((check) => check.idempotencyRequired === true && check.auditRequired === true);
  const directExecutionWithoutApprovalZero = executionChecks.every(
    (check) => check.directExecutionWithoutApproval === false,
  );
  const gatewayMatrix = buildAgentRuntimeGatewayMatrix();
  const gatewayMatrixUsesExplicitExecutionPolicy =
    gatewayMatrix.all_gateway_execution_policy_explicit === true &&
    gatewayMatrix.approved_gateway_routes_match_policy === true &&
    gatewayMatrix.approved_gateway_route_count === approvedExecutorPolicyCount;
  const noGatewayOperationNameHeuristics = !hasGatewayOperationNameHeuristics();

  const finalStatus: AiRuntimeGatewayExecutionPolicyFinalStatus =
    !noGatewayOperationNameHeuristics
      ? "BLOCKED_AI_RUNTIME_GATEWAY_EXECUTION_HEURISTIC_FOUND"
      : !allRoutesHaveGatewayExecutionPolicy
        ? "BLOCKED_AI_RUNTIME_GATEWAY_EXECUTION_POLICY_MISSING"
        : !approvedGatewayMatchesPolicy ||
            !approvedExecutorRoutesRequireGateway ||
            !nonApprovedRoutesDoNotRequireGateway ||
            !approvedGatewayRoutesRequireIdempotencyAndAudit ||
            !directExecutionWithoutApprovalZero ||
            !gatewayMatrixUsesExplicitExecutionPolicy ||
            driftOperations.length > 0
          ? "BLOCKED_AI_RUNTIME_GATEWAY_EXECUTION_POLICY_DRIFT"
          : "GREEN_AI_RUNTIME_GATEWAY_EXECUTION_POLICY_READY";

  return {
    wave: AI_RUNTIME_GATEWAY_EXECUTION_POLICY_WAVE,
    final_status: finalStatus,
    exact_reason:
      finalStatus === "GREEN_AI_RUNTIME_GATEWAY_EXECUTION_POLICY_READY"
        ? null
        : [
            ...(noGatewayOperationNameHeuristics
              ? []
              : ["agentRuntimeGateway uses operation-name heuristics for execution policy"]),
            ...missingPolicyOperations.map((operation) => `${operation}: execution policy missing`),
            ...missingMountOperations.map((operation) => `${operation}: gateway mount missing`),
            ...(approvedGatewayMatchesPolicy ? [] : ["gateway approved policy differs from registry"]),
            ...(approvedExecutorRoutesRequireGateway ? [] : ["approved_executor route missing approved gateway"]),
            ...(nonApprovedRoutesDoNotRequireGateway ? [] : ["non-approved route requires approved gateway"]),
            ...(approvedGatewayRoutesRequireIdempotencyAndAudit
              ? []
              : ["approved gateway route lacks idempotency or audit"]),
            ...(directExecutionWithoutApprovalZero ? [] : ["direct execution without approval enabled"]),
            ...(gatewayMatrixUsesExplicitExecutionPolicy ? [] : ["gateway matrix does not use explicit policy"]),
            ...driftOperations.map((operation) => `${operation}: execution policy drift`),
          ].join("; "),
    route_count: routes.length,
    gateway_mount_count: mounts.length,
    explicit_policy_count: policies.length,
    approved_gateway_route_count: approvedGatewayRouteCount,
    approved_executor_policy_count: approvedExecutorPolicyCount,
    all_routes_have_gateway_execution_policy: allRoutesHaveGatewayExecutionPolicy,
    approved_gateway_matches_policy: approvedGatewayMatchesPolicy,
    approved_executor_routes_require_gateway: approvedExecutorRoutesRequireGateway,
    non_approved_routes_do_not_require_gateway: nonApprovedRoutesDoNotRequireGateway,
    approved_gateway_routes_require_idempotency_and_audit:
      approvedGatewayRoutesRequireIdempotencyAndAudit,
    direct_execution_without_approval_zero: directExecutionWithoutApprovalZero,
    gateway_matrix_uses_explicit_execution_policy: gatewayMatrixUsesExplicitExecutionPolicy,
    no_gateway_operation_name_heuristics: noGatewayOperationNameHeuristics,
    missing_policy_operations: missingPolicyOperations,
    missing_mount_operations: missingMountOperations,
    drift_operations: driftOperations,
    execution_checks: executionChecks,
    no_db_writes: true,
    no_direct_database_access: true,
    no_provider_calls: true,
    no_raw_rows: true,
    no_raw_provider_payloads: true,
    no_ui_changes: true,
    no_fake_green: true,
  };
}

function writeArtifacts(matrix: AiRuntimeGatewayExecutionPolicyMatrix): void {
  const inventory = {
    wave: AI_RUNTIME_GATEWAY_EXECUTION_POLICY_WAVE,
    source_files: [
      "src/features/ai/agent/agentRuntimeGateway.ts",
      "src/features/ai/agent/agentRuntimeRoutePolicyRegistry.ts",
      "src/features/ai/agent/agentRuntimeBudgetPolicy.ts",
      "scripts/ai/verifyAiRuntimeGatewayExecutionPolicy.ts",
    ],
    test_files: [
      "tests/ai/agentRuntimeGatewayExecutionPolicy.contract.test.ts",
      "tests/architecture/aiRuntimeGatewayNoHeuristicExecutionPolicy.contract.test.ts",
      "tests/ai/agentRuntimeGateway.contract.test.ts",
      "tests/architecture/agentBffRuntimeMount.contract.test.ts",
    ],
    route_count: matrix.route_count,
    explicit_policy_count: matrix.explicit_policy_count,
    approved_gateway_route_count: matrix.approved_gateway_route_count,
    db_writes: 0,
    provider_calls: 0,
    ui_changes: false,
  };
  const proof = [
    `# ${AI_RUNTIME_GATEWAY_EXECUTION_POLICY_WAVE}`,
    "",
    `final_status: ${matrix.final_status}`,
    `exact_reason: ${matrix.exact_reason ?? "none"}`,
    `route_count: ${matrix.route_count}`,
    `gateway_mount_count: ${matrix.gateway_mount_count}`,
    `explicit_policy_count: ${matrix.explicit_policy_count}`,
    `approved_gateway_route_count: ${matrix.approved_gateway_route_count}`,
    `approved_executor_policy_count: ${matrix.approved_executor_policy_count}`,
    `all_routes_have_gateway_execution_policy: ${matrix.all_routes_have_gateway_execution_policy}`,
    `approved_gateway_matches_policy: ${matrix.approved_gateway_matches_policy}`,
    `approved_executor_routes_require_gateway: ${matrix.approved_executor_routes_require_gateway}`,
    `non_approved_routes_do_not_require_gateway: ${matrix.non_approved_routes_do_not_require_gateway}`,
    `approved_gateway_routes_require_idempotency_and_audit: ${matrix.approved_gateway_routes_require_idempotency_and_audit}`,
    `direct_execution_without_approval_zero: ${matrix.direct_execution_without_approval_zero}`,
    `gateway_matrix_uses_explicit_execution_policy: ${matrix.gateway_matrix_uses_explicit_execution_policy}`,
    `no_gateway_operation_name_heuristics: ${matrix.no_gateway_operation_name_heuristics}`,
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
  const matrix = buildAiRuntimeGatewayExecutionPolicyMatrix();
  writeArtifacts(matrix);
  console.log(JSON.stringify(matrix, null, 2));
  process.exitCode =
    matrix.final_status === "GREEN_AI_RUNTIME_GATEWAY_EXECUTION_POLICY_READY" ? 0 : 1;
}
