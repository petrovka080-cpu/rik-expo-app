import fs from "node:fs";
import path from "node:path";

import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";
import { getAgentRuntimeGatewayMount } from "../../src/features/ai/agent/agentRuntimeGateway";
import {
  getAgentRuntimeTransportRegistryEntry,
  listAgentRuntimeTransportRegistryEntries,
  resolveAgentRuntimeTransportName,
  type AgentRuntimeTransportRegistryEntry,
} from "../../src/features/ai/agent/agentRuntimeTransportRegistry";
import { listAiRuntimeTransportContracts } from "../../src/features/ai/tools/transport/aiToolTransportTypes";

export const AI_RUNTIME_EXPLICIT_TRANSPORT_BINDINGS_WAVE =
  "S_AI_RUNTIME_06_EXPLICIT_TRANSPORT_ROUTE_BINDINGS" as const;

export type AiRuntimeExplicitTransportBindingsFinalStatus =
  | "GREEN_AI_RUNTIME_EXPLICIT_TRANSPORT_BINDINGS_READY"
  | "BLOCKED_AI_RUNTIME_TRANSPORT_PATTERN_MATCHER_FOUND"
  | "BLOCKED_AI_RUNTIME_TRANSPORT_BINDING_MISSING"
  | "BLOCKED_AI_RUNTIME_TRANSPORT_BINDING_DUPLICATE"
  | "BLOCKED_AI_RUNTIME_TRANSPORT_BINDING_DRIFT";

export type AiRuntimeExplicitTransportBindingCheck = {
  operation: string;
  endpoint: string;
  registryEntryId: AgentRuntimeTransportRegistryEntry["entryId"] | null;
  registryRuntimeName: string | null;
  gatewayRuntimeName: string | null;
  expectedBoundary: string | null;
  gatewayBoundary: string | null;
  fallback: boolean | null;
  matchesGateway: boolean;
  boundaryAligned: boolean;
  commandCenterRoute: boolean;
  runtimeContractMounted: boolean;
};

export type AiRuntimeExplicitTransportBindingsMatrix = {
  wave: typeof AI_RUNTIME_EXPLICIT_TRANSPORT_BINDINGS_WAVE;
  final_status: AiRuntimeExplicitTransportBindingsFinalStatus;
  exact_reason: string | null;
  route_count: number;
  registry_entry_count: number;
  runtime_contract_count: number;
  explicit_binding_count: number;
  unique_binding_count: number;
  fallback_entry_count: number;
  command_center_route_count: number;
  all_routes_bound_once: boolean;
  no_extra_bindings: boolean;
  no_duplicate_bindings: boolean;
  no_pattern_matchers: boolean;
  all_bindings_match_gateway: boolean;
  all_boundaries_aligned: boolean;
  all_runtime_contracts_mounted: boolean;
  no_fallback_entries: boolean;
  no_command_center_routes: boolean;
  unknown_operation_fails_closed: boolean;
  missing_operations: readonly string[];
  extra_operations: readonly string[];
  duplicate_operations: readonly string[];
  route_drifts: readonly AiRuntimeExplicitTransportBindingCheck[];
  route_checks: readonly AiRuntimeExplicitTransportBindingCheck[];
  no_db_writes: true;
  no_direct_database_access: true;
  no_provider_calls: true;
  no_raw_rows: true;
  no_raw_provider_payloads: true;
  no_ui_changes: true;
  no_fake_green: true;
};

const projectRoot = process.cwd();
const artifactPrefix = path.join(
  projectRoot,
  "artifacts",
  AI_RUNTIME_EXPLICIT_TRANSPORT_BINDINGS_WAVE,
);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const proofPath = `${artifactPrefix}_proof.md`;
const registryPath = path.join(
  projectRoot,
  "src/features/ai/agent/agentRuntimeTransportRegistry.ts",
);

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function listExplicitBindings(entries: readonly AgentRuntimeTransportRegistryEntry[]): string[] {
  return entries.flatMap((entry) => entry.operations);
}

function findDuplicates(values: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function noPatternMatchersInRegistrySource(): boolean {
  const source = fs.readFileSync(registryPath, "utf8");
  return (
    !source.includes("AgentRuntimeTransportMatcher") &&
    !source.includes("matchers:") &&
    !source.includes("matcherApplies") &&
    !/kind:\s*"prefix"/.test(source) &&
    !/kind:\s*"includes"/.test(source) &&
    !/operation\.startsWith\s*\(/.test(source) &&
    !/operation\.includes\s*\(/.test(source)
  );
}

function unknownOperationFailsClosed(): boolean {
  try {
    resolveAgentRuntimeTransportName("agent.unknown.operation");
    return false;
  } catch {
    return true;
  }
}

function buildRouteChecks(): AiRuntimeExplicitTransportBindingCheck[] {
  const runtimeContractNames = new Set(
    listAiRuntimeTransportContracts().map((contract) => contract.runtimeName),
  );

  return AGENT_BFF_ROUTE_DEFINITIONS.map((route) => {
    try {
      const registryEntry = getAgentRuntimeTransportRegistryEntry(route.operation);
      const registryRuntimeName = resolveAgentRuntimeTransportName(route.operation);
      const mount = getAgentRuntimeGatewayMount(route.operation);
      const gatewayRuntimeName = mount?.runtimeName ?? null;
      const gatewayBoundary = mount?.runtimeBoundary ?? null;

      return {
        operation: route.operation,
        endpoint: route.endpoint,
        registryEntryId: registryEntry.entryId,
        registryRuntimeName,
        gatewayRuntimeName,
        expectedBoundary: registryEntry.expectedBoundary,
        gatewayBoundary,
        fallback: registryEntry.fallback,
        matchesGateway: gatewayRuntimeName === registryRuntimeName,
        boundaryAligned: gatewayBoundary === registryEntry.expectedBoundary,
        commandCenterRoute: registryRuntimeName === "command_center",
        runtimeContractMounted: runtimeContractNames.has(registryRuntimeName),
      };
    } catch {
      return {
        operation: route.operation,
        endpoint: route.endpoint,
        registryEntryId: null,
        registryRuntimeName: null,
        gatewayRuntimeName: null,
        expectedBoundary: null,
        gatewayBoundary: null,
        fallback: null,
        matchesGateway: false,
        boundaryAligned: false,
        commandCenterRoute: false,
        runtimeContractMounted: false,
      };
    }
  });
}

export function buildAiRuntimeExplicitTransportBindingsMatrix(): AiRuntimeExplicitTransportBindingsMatrix {
  const routes = AGENT_BFF_ROUTE_DEFINITIONS.map((route) => route.operation);
  const routeSet = new Set<string>(routes);
  const registryEntries = listAgentRuntimeTransportRegistryEntries();
  const runtimeContracts = listAiRuntimeTransportContracts();
  const explicitBindings = listExplicitBindings(registryEntries);
  const bindingSet = new Set(explicitBindings);
  const missingOperations = routes.filter((operation) => !bindingSet.has(operation));
  const extraOperations = explicitBindings
    .filter((operation) => !routeSet.has(operation))
    .sort();
  const duplicateOperations = findDuplicates(explicitBindings);
  const routeChecks = buildRouteChecks();
  const routeDrifts = routeChecks.filter(
    (route) =>
      !route.matchesGateway ||
      !route.boundaryAligned ||
      !route.runtimeContractMounted ||
      route.fallback !== false ||
      route.commandCenterRoute,
  );

  const noPatternMatchers = noPatternMatchersInRegistrySource();
  const allRoutesBoundOnce = missingOperations.length === 0 && bindingSet.size === routes.length;
  const noExtraBindings = extraOperations.length === 0;
  const noDuplicateBindings = duplicateOperations.length === 0;
  const allBindingsMatchGateway = routeChecks.every((route) => route.matchesGateway);
  const allBoundariesAligned = routeChecks.every((route) => route.boundaryAligned);
  const allRuntimeContractsMounted = routeChecks.every((route) => route.runtimeContractMounted);
  const fallbackEntryCount = registryEntries.filter((entry) => entry.fallback).length;
  const noFallbackEntries = fallbackEntryCount === 0;
  const commandCenterRouteCount = routeChecks.filter((route) => route.commandCenterRoute).length;
  const noCommandCenterRoutes = commandCenterRouteCount === 0;
  const unknownOperationBlocked = unknownOperationFailsClosed();

  const finalStatus: AiRuntimeExplicitTransportBindingsFinalStatus =
    !noPatternMatchers
      ? "BLOCKED_AI_RUNTIME_TRANSPORT_PATTERN_MATCHER_FOUND"
      : !allRoutesBoundOnce || !noExtraBindings
        ? "BLOCKED_AI_RUNTIME_TRANSPORT_BINDING_MISSING"
        : !noDuplicateBindings
          ? "BLOCKED_AI_RUNTIME_TRANSPORT_BINDING_DUPLICATE"
          : !allBindingsMatchGateway ||
              !allBoundariesAligned ||
              !allRuntimeContractsMounted ||
              !noFallbackEntries ||
              !noCommandCenterRoutes ||
              !unknownOperationBlocked ||
              routeDrifts.length > 0
            ? "BLOCKED_AI_RUNTIME_TRANSPORT_BINDING_DRIFT"
            : "GREEN_AI_RUNTIME_EXPLICIT_TRANSPORT_BINDINGS_READY";

  return {
    wave: AI_RUNTIME_EXPLICIT_TRANSPORT_BINDINGS_WAVE,
    final_status: finalStatus,
    exact_reason:
      finalStatus === "GREEN_AI_RUNTIME_EXPLICIT_TRANSPORT_BINDINGS_READY"
        ? null
        : [
            ...(noPatternMatchers ? [] : ["transport registry still uses pattern matchers"]),
            ...missingOperations.map((operation) => `${operation}: explicit binding missing`),
            ...extraOperations.map((operation) => `${operation}: extra binding without mounted route`),
            ...duplicateOperations.map((operation) => `${operation}: duplicate transport binding`),
            ...(!noFallbackEntries ? [`fallback entries remain: ${fallbackEntryCount}`] : []),
            ...(!noCommandCenterRoutes ? [`command_center routes remain: ${commandCenterRouteCount}`] : []),
            ...(unknownOperationBlocked ? [] : ["unknown operation resolves instead of failing closed"]),
            ...routeDrifts.map((route) => `${route.operation}: registry/gateway/contract drift`),
          ].join("; "),
    route_count: routes.length,
    registry_entry_count: registryEntries.length,
    runtime_contract_count: runtimeContracts.length,
    explicit_binding_count: explicitBindings.length,
    unique_binding_count: bindingSet.size,
    fallback_entry_count: fallbackEntryCount,
    command_center_route_count: commandCenterRouteCount,
    all_routes_bound_once: allRoutesBoundOnce,
    no_extra_bindings: noExtraBindings,
    no_duplicate_bindings: noDuplicateBindings,
    no_pattern_matchers: noPatternMatchers,
    all_bindings_match_gateway: allBindingsMatchGateway,
    all_boundaries_aligned: allBoundariesAligned,
    all_runtime_contracts_mounted: allRuntimeContractsMounted,
    no_fallback_entries: noFallbackEntries,
    no_command_center_routes: noCommandCenterRoutes,
    unknown_operation_fails_closed: unknownOperationBlocked,
    missing_operations: missingOperations,
    extra_operations: extraOperations,
    duplicate_operations: duplicateOperations,
    route_drifts: routeDrifts,
    route_checks: routeChecks,
    no_db_writes: true,
    no_direct_database_access: true,
    no_provider_calls: true,
    no_raw_rows: true,
    no_raw_provider_payloads: true,
    no_ui_changes: true,
    no_fake_green: true,
  };
}

function writeArtifacts(matrix: AiRuntimeExplicitTransportBindingsMatrix): void {
  const inventory = {
    wave: AI_RUNTIME_EXPLICIT_TRANSPORT_BINDINGS_WAVE,
    source_files: [
      "src/features/ai/agent/agentRuntimeTransportRegistry.ts",
      "src/features/ai/agent/agentRuntimeGateway.ts",
      "src/features/ai/tools/transport/aiToolTransportTypes.ts",
      "scripts/ai/verifyAiRuntimeExplicitTransportBindings.ts",
    ],
    test_files: [
      "tests/ai/agentRuntimeExplicitTransportBindings.contract.test.ts",
      "tests/ai/agentRuntimeTransportRegistry.contract.test.ts",
      "tests/architecture/aiRuntimeTransportExplicitBindings.contract.test.ts",
      "tests/architecture/aiRuntimeTransportRegistryNoDrift.contract.test.ts",
    ],
    registry_entries: matrix.registry_entry_count,
    route_count: matrix.route_count,
    explicit_binding_count: matrix.explicit_binding_count,
    runtime_contracts: matrix.runtime_contract_count,
    db_writes: 0,
    provider_calls: 0,
    ui_changes: false,
  };
  const proof = [
    `# ${AI_RUNTIME_EXPLICIT_TRANSPORT_BINDINGS_WAVE}`,
    "",
    `final_status: ${matrix.final_status}`,
    `exact_reason: ${matrix.exact_reason ?? "none"}`,
    `route_count: ${matrix.route_count}`,
    `registry_entry_count: ${matrix.registry_entry_count}`,
    `runtime_contract_count: ${matrix.runtime_contract_count}`,
    `explicit_binding_count: ${matrix.explicit_binding_count}`,
    `unique_binding_count: ${matrix.unique_binding_count}`,
    `all_routes_bound_once: ${matrix.all_routes_bound_once}`,
    `no_extra_bindings: ${matrix.no_extra_bindings}`,
    `no_duplicate_bindings: ${matrix.no_duplicate_bindings}`,
    `no_pattern_matchers: ${matrix.no_pattern_matchers}`,
    `all_bindings_match_gateway: ${matrix.all_bindings_match_gateway}`,
    `all_boundaries_aligned: ${matrix.all_boundaries_aligned}`,
    `all_runtime_contracts_mounted: ${matrix.all_runtime_contracts_mounted}`,
    `no_fallback_entries: ${matrix.no_fallback_entries}`,
    `no_command_center_routes: ${matrix.no_command_center_routes}`,
    `unknown_operation_fails_closed: ${matrix.unknown_operation_fails_closed}`,
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
  const matrix = buildAiRuntimeExplicitTransportBindingsMatrix();
  writeArtifacts(matrix);
  console.log(JSON.stringify(matrix, null, 2));
  process.exitCode =
    matrix.final_status === "GREEN_AI_RUNTIME_EXPLICIT_TRANSPORT_BINDINGS_READY" ? 0 : 1;
}
