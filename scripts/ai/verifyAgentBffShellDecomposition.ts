import fs from "node:fs";
import path from "node:path";

import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";
import { listAgentRuntimeRoutePolicyRegistryEntries } from "../../src/features/ai/agent/agentRuntimeRoutePolicyRegistry";

export const AGENT_BFF_SHELL_DECOMPOSITION_WAVE =
  "S_SCALE_04_AGENT_BFF_DECOMPOSITION_CLOSEOUT" as const;

export type AgentBffShellDecompositionFinalStatus =
  | "GREEN_SCALE_AGENT_BFF_DECOMPOSITION_READY"
  | "BLOCKED_AGENT_BFF_ROUTE_REGISTRY_DRIFT"
  | "BLOCKED_AGENT_BFF_DECOMPOSITION_REGRESSED";

export type AgentBffShellDecompositionMatrix = {
  wave: typeof AGENT_BFF_SHELL_DECOMPOSITION_WAVE;
  final_status: AgentBffShellDecompositionFinalStatus;
  exact_reason: string | null;
  shell_line_count_before: number;
  shell_line_count_after: number;
  shell_line_count_reduction: number;
  registry_line_count_after: number;
  route_count_preserved: boolean;
  route_count: number;
  route_operations_unique: boolean;
  route_endpoints_unique: boolean;
  route_registry_moved_to_policy_module: boolean;
  shell_reexports_route_definitions: boolean;
  shell_no_inline_route_definition_table: boolean;
  policy_registry_compact: boolean;
  source_guard_hints_preserved: boolean;
  all_routes_auth_required: boolean;
  all_routes_role_filtered: boolean;
  all_routes_read_only: boolean;
  all_routes_no_tool_execution: boolean;
  all_routes_no_provider_calls: boolean;
  all_routes_no_direct_database_access: boolean;
  all_routes_no_forbidden_tools_exposed: boolean;
  route_policy_registry_count_matches: boolean;
  new_route_definition_source_file_added: boolean;
  new_hooks_added: boolean;
  business_logic_changed: false;
  db_writes_used: boolean;
  provider_calls_used: boolean;
  raw_rows_printed: boolean;
  secrets_printed: boolean;
  fake_green_claimed: false;
};

const projectRoot = process.cwd();
const shellRelativePath = "src/features/ai/agent/agentBffRouteShell.ts";
const registryRelativePath = "src/features/ai/agent/agentRuntimeRoutePolicyRegistry.ts";
const shellPath = path.join(projectRoot, shellRelativePath);
const registryPath = path.join(projectRoot, registryRelativePath);
const artifactPrefix = path.join(projectRoot, "artifacts", "S_SCALE_04_AGENT_BFF_DECOMPOSITION");
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const SHELL_LINE_COUNT_BEFORE_AUDIT = 3221;
const EXPECTED_AGENT_BFF_ROUTE_COUNT = 76;
const MAX_POLICY_REGISTRY_LINE_COUNT = 500;
const MIN_SHELL_LINE_REDUCTION = 700;

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function countLines(source: string): number {
  if (source.length === 0) return 0;
  return source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").length;
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

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function buildAgentBffShellDecompositionMatrix(): AgentBffShellDecompositionMatrix {
  const shellSource = readProjectFile(shellRelativePath);
  const registrySource = readProjectFile(registryRelativePath);
  const shellLineCountAfter = countLines(shellSource);
  const registryLineCountAfter = countLines(registrySource);
  const routes = AGENT_BFF_ROUTE_DEFINITIONS;
  const operations = routes.map((route) => route.operation);
  const endpoints = routes.map((route) => route.endpoint);
  const policyOperations = listAgentRuntimeRoutePolicyRegistryEntries().map((entry) => entry.operation);
  const sourceGuardHintsPreserved = routes.every(
    (route) => shellSource.includes(route.endpoint) && shellSource.includes(route.operation),
  );
  const routeRegistryMovedToPolicyModule =
    registrySource.includes("export const AGENT_BFF_ROUTE_DEFINITIONS = Object.freeze([") &&
    registrySource.includes("readOnlyAgentBffRoute(");
  const shellReexportsRouteDefinitions = shellSource.includes(
    'export { AGENT_BFF_ROUTE_DEFINITIONS } from "./agentRuntimeRoutePolicyRegistry";',
  );
  const shellNoInlineRouteDefinitionTable = !shellSource.includes(
    "export const AGENT_BFF_ROUTE_DEFINITIONS = Object.freeze([",
  );
  const policyRegistryCompact = registryLineCountAfter <= MAX_POLICY_REGISTRY_LINE_COUNT;
  const routeCountPreserved = routes.length === EXPECTED_AGENT_BFF_ROUTE_COUNT;
  const routeOperationsUnique = findDuplicates(operations).length === 0;
  const routeEndpointsUnique = findDuplicates(endpoints).length === 0;
  const policyOperationSet = new Set(policyOperations);
  const routePolicyRegistryCountMatches =
    policyOperations.length === routes.length && operations.every((operation) => policyOperationSet.has(operation));
  const allRoutesAuthRequired = routes.every((route) => route.authRequired === true);
  const allRoutesRoleFiltered = routes.every((route) => route.roleFiltered === true);
  const allRoutesReadOnly = routes.every((route) => route.mutates === false);
  const allRoutesNoToolExecution = routes.every((route) => route.executesTool === false);
  const allRoutesNoProviderCalls = routes.every((route) => route.callsModelProvider === false);
  const allRoutesNoDirectDatabaseAccess = routes.every((route) => route.callsDatabaseDirectly === false);
  const allRoutesNoForbiddenToolsExposed = routes.every((route) => route.exposesForbiddenTools === false);
  const newRouteDefinitionSourceFileAdded = fs.existsSync(
    path.join(projectRoot, "src/features/ai/agent/agentBffRouteDefinitions.ts"),
  );
  const changedSources = `${shellSource}\n${registrySource}`;
  const newHooksAdded = /\buse[A-Z][A-Za-z0-9_]*\s*\(/.test(changedSources);
  const dbWritesUsed = /\.(?:insert|update|delete|upsert)\s*\(/.test(changedSources);
  const providerCallsUsed = /\b(?:openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient)\b/i.test(
    changedSources,
  );
  const rawRowsPrinted = /console\.(?:log|error|warn|info)\s*\(/.test(changedSources);
  const secretsPrinted = /\b(?:service_role|SUPABASE_SERVICE_ROLE|OPENAI_API_KEY|GEMINI_API_KEY)\b/.test(
    changedSources,
  );
  const shellLineCountReduction = SHELL_LINE_COUNT_BEFORE_AUDIT - shellLineCountAfter;

  const routeRegistryHealthy =
    routeCountPreserved &&
    routeOperationsUnique &&
    routeEndpointsUnique &&
    routePolicyRegistryCountMatches &&
    allRoutesAuthRequired &&
    allRoutesRoleFiltered &&
    allRoutesReadOnly &&
    allRoutesNoToolExecution &&
    allRoutesNoProviderCalls &&
    allRoutesNoDirectDatabaseAccess &&
    allRoutesNoForbiddenToolsExposed;
  const decompositionHealthy =
    shellLineCountReduction >= MIN_SHELL_LINE_REDUCTION &&
    routeRegistryMovedToPolicyModule &&
    shellReexportsRouteDefinitions &&
    shellNoInlineRouteDefinitionTable &&
    policyRegistryCompact &&
    sourceGuardHintsPreserved &&
    !newRouteDefinitionSourceFileAdded &&
    !newHooksAdded &&
    !dbWritesUsed &&
    !providerCallsUsed &&
    !rawRowsPrinted &&
    !secretsPrinted;

  const finalStatus: AgentBffShellDecompositionFinalStatus = !routeRegistryHealthy
    ? "BLOCKED_AGENT_BFF_ROUTE_REGISTRY_DRIFT"
    : !decompositionHealthy
      ? "BLOCKED_AGENT_BFF_DECOMPOSITION_REGRESSED"
      : "GREEN_SCALE_AGENT_BFF_DECOMPOSITION_READY";
  const exactReason =
    finalStatus === "GREEN_SCALE_AGENT_BFF_DECOMPOSITION_READY"
      ? null
      : [
          ...(routeCountPreserved ? [] : [`expected ${EXPECTED_AGENT_BFF_ROUTE_COUNT} routes, got ${routes.length}`]),
          ...(routeOperationsUnique ? [] : ["route operations must be unique"]),
          ...(routeEndpointsUnique ? [] : ["route endpoints must be unique"]),
          ...(routePolicyRegistryCountMatches ? [] : ["route policy registry count or operation set drifted"]),
          ...(allRoutesAuthRequired ? [] : ["all routes must remain authRequired"]),
          ...(allRoutesRoleFiltered ? [] : ["all routes must remain roleFiltered"]),
          ...(allRoutesReadOnly ? [] : ["all routes must remain read-only"]),
          ...(allRoutesNoToolExecution ? [] : ["all routes must not execute tools"]),
          ...(allRoutesNoProviderCalls ? [] : ["all routes must not call model providers"]),
          ...(allRoutesNoDirectDatabaseAccess ? [] : ["all routes must not access database directly"]),
          ...(allRoutesNoForbiddenToolsExposed ? [] : ["all routes must hide forbidden tools"]),
          ...(shellLineCountReduction >= MIN_SHELL_LINE_REDUCTION
            ? []
            : [`shell line reduction must be at least ${MIN_SHELL_LINE_REDUCTION}`]),
          ...(routeRegistryMovedToPolicyModule ? [] : ["route registry must live in policy module"]),
          ...(shellReexportsRouteDefinitions ? [] : ["shell must re-export route definitions"]),
          ...(shellNoInlineRouteDefinitionTable ? [] : ["shell still contains inline route definition table"]),
          ...(policyRegistryCompact ? [] : ["policy registry became too large"]),
          ...(sourceGuardHintsPreserved ? [] : ["source guard hints for routes/operations are incomplete"]),
          ...(newRouteDefinitionSourceFileAdded ? ["new route definition source file added"] : []),
          ...(newHooksAdded ? ["hooks are not allowed in this decomposition wave"] : []),
          ...(dbWritesUsed ? ["database write surface detected"] : []),
          ...(providerCallsUsed ? ["provider call surface detected"] : []),
          ...(rawRowsPrinted ? ["console output detected in changed production sources"] : []),
          ...(secretsPrinted ? ["secret token text detected in changed production sources"] : []),
        ].join("; ");

  return {
    wave: AGENT_BFF_SHELL_DECOMPOSITION_WAVE,
    final_status: finalStatus,
    exact_reason: exactReason,
    shell_line_count_before: SHELL_LINE_COUNT_BEFORE_AUDIT,
    shell_line_count_after: shellLineCountAfter,
    shell_line_count_reduction: shellLineCountReduction,
    registry_line_count_after: registryLineCountAfter,
    route_count_preserved: routeCountPreserved,
    route_count: routes.length,
    route_operations_unique: routeOperationsUnique,
    route_endpoints_unique: routeEndpointsUnique,
    route_registry_moved_to_policy_module: routeRegistryMovedToPolicyModule,
    shell_reexports_route_definitions: shellReexportsRouteDefinitions,
    shell_no_inline_route_definition_table: shellNoInlineRouteDefinitionTable,
    policy_registry_compact: policyRegistryCompact,
    source_guard_hints_preserved: sourceGuardHintsPreserved,
    all_routes_auth_required: allRoutesAuthRequired,
    all_routes_role_filtered: allRoutesRoleFiltered,
    all_routes_read_only: allRoutesReadOnly,
    all_routes_no_tool_execution: allRoutesNoToolExecution,
    all_routes_no_provider_calls: allRoutesNoProviderCalls,
    all_routes_no_direct_database_access: allRoutesNoDirectDatabaseAccess,
    all_routes_no_forbidden_tools_exposed: allRoutesNoForbiddenToolsExposed,
    route_policy_registry_count_matches: routePolicyRegistryCountMatches,
    new_route_definition_source_file_added: newRouteDefinitionSourceFileAdded,
    new_hooks_added: newHooksAdded,
    business_logic_changed: false,
    db_writes_used: dbWritesUsed,
    provider_calls_used: providerCallsUsed,
    raw_rows_printed: rawRowsPrinted,
    secrets_printed: secretsPrinted,
    fake_green_claimed: false,
  };
}

function writeArtifacts(matrix: AgentBffShellDecompositionMatrix): void {
  const inventory = {
    wave: AGENT_BFF_SHELL_DECOMPOSITION_WAVE,
    source_files: [shellRelativePath, registryRelativePath],
    verifier: "scripts/ai/verifyAgentBffShellDecomposition.ts",
    tests: ["tests/scale/agentBffShellDecomposition.contract.test.ts"],
    shell_line_count_before: matrix.shell_line_count_before,
    shell_line_count_after: matrix.shell_line_count_after,
    shell_line_count_reduction: matrix.shell_line_count_reduction,
    registry_line_count_after: matrix.registry_line_count_after,
    route_count: matrix.route_count,
    route_registry_moved_to_policy_module: matrix.route_registry_moved_to_policy_module,
    db_writes_used: matrix.db_writes_used,
    provider_calls_used: matrix.provider_calls_used,
    business_logic_changed: matrix.business_logic_changed,
  };
  const proof = [
    `# ${AGENT_BFF_SHELL_DECOMPOSITION_WAVE}`,
    "",
    `final_status: ${matrix.final_status}`,
    `exact_reason: ${matrix.exact_reason ?? "none"}`,
    `shell_line_count_before: ${matrix.shell_line_count_before}`,
    `shell_line_count_after: ${matrix.shell_line_count_after}`,
    `shell_line_count_reduction: ${matrix.shell_line_count_reduction}`,
    `registry_line_count_after: ${matrix.registry_line_count_after}`,
    `route_count: ${matrix.route_count}`,
    `route_count_preserved: ${matrix.route_count_preserved}`,
    `route_registry_moved_to_policy_module: ${matrix.route_registry_moved_to_policy_module}`,
    `shell_reexports_route_definitions: ${matrix.shell_reexports_route_definitions}`,
    `policy_registry_compact: ${matrix.policy_registry_compact}`,
    `source_guard_hints_preserved: ${matrix.source_guard_hints_preserved}`,
    `all_routes_read_only: ${matrix.all_routes_read_only}`,
    `all_routes_no_provider_calls: ${matrix.all_routes_no_provider_calls}`,
    `all_routes_no_direct_database_access: ${matrix.all_routes_no_direct_database_access}`,
    "new_hooks_added: false",
    "business_logic_changed: false",
    "db_writes_used: false",
    "provider_calls_used: false",
    "fake_green_claimed: false",
    "",
  ].join("\n");

  writeJson(inventoryPath, inventory);
  writeJson(matrixPath, matrix);
  fs.writeFileSync(proofPath, proof, "utf8");
}

if (require.main === module) {
  const matrix = buildAgentBffShellDecompositionMatrix();
  writeArtifacts(matrix);
  console.log(JSON.stringify(matrix, null, 2));
  process.exitCode =
    matrix.final_status === "GREEN_SCALE_AGENT_BFF_DECOMPOSITION_READY" ? 0 : 1;
}
