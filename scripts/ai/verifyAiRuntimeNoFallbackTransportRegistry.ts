import fs from "node:fs";
import path from "node:path";

import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";
import { getAgentRuntimeGatewayMount } from "../../src/features/ai/agent/agentRuntimeGateway";
import {
  getAgentRuntimeTransportRegistryEntry,
  listAgentRuntimeTransportRegistryEntries,
  resolveAgentRuntimeTransportName,
} from "../../src/features/ai/agent/agentRuntimeTransportRegistry";
import { listAiRuntimeTransportContracts } from "../../src/features/ai/tools/transport/aiToolTransportTypes";

export const AI_RUNTIME_NO_FALLBACK_TRANSPORT_REGISTRY_WAVE =
  "S_AI_RUNTIME_05_NO_FALLBACK_TRANSPORT_REGISTRY" as const;

export type AiRuntimeNoFallbackTransportRegistryFinalStatus =
  | "GREEN_AI_RUNTIME_TRANSPORT_NO_FALLBACK_READY"
  | "BLOCKED_AI_RUNTIME_TRANSPORT_FALLBACK_FOUND"
  | "BLOCKED_AI_RUNTIME_TRANSPORT_ROUTE_UNREGISTERED"
  | "BLOCKED_AI_RUNTIME_TRANSPORT_DRIFT";

export type AiRuntimeNoFallbackRouteCheck = {
  operation: string;
  endpoint: string;
  registryEntryId: string;
  registryRuntimeName: string;
  gatewayRuntimeName: string | null;
  expectedBoundary: string;
  gatewayBoundary: string | null;
  fallback: boolean;
  commandCenterFallback: boolean;
  matchesGateway: boolean;
  boundaryAligned: boolean;
};

export type AiRuntimeNoFallbackTransportRegistryMatrix = {
  wave: typeof AI_RUNTIME_NO_FALLBACK_TRANSPORT_REGISTRY_WAVE;
  final_status: AiRuntimeNoFallbackTransportRegistryFinalStatus;
  exact_reason: string | null;
  route_count: number;
  registry_entry_count: number;
  runtime_contract_count: number;
  fallback_entry_count: number;
  command_center_route_count: number;
  tool_registry_route_count: number;
  all_routes_registered: boolean;
  all_routes_match_gateway: boolean;
  all_boundaries_aligned: boolean;
  no_fallback_entries: boolean;
  no_route_uses_fallback: boolean;
  no_command_center_route_fallback: boolean;
  tool_routes_explicit: boolean;
  unknown_operation_fails_closed: boolean;
  missing_operations: readonly string[];
  fallback_operations: readonly string[];
  route_drifts: readonly AiRuntimeNoFallbackRouteCheck[];
  route_checks: readonly AiRuntimeNoFallbackRouteCheck[];
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
  AI_RUNTIME_NO_FALLBACK_TRANSPORT_REGISTRY_WAVE,
);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const proofPath = `${artifactPrefix}_proof.md`;

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function safeResolveRoute(operation: string) {
  try {
    const registryEntry = getAgentRuntimeTransportRegistryEntry(operation);
    return {
      registryEntry,
      registryRuntimeName: resolveAgentRuntimeTransportName(operation),
      error: null,
    };
  } catch (error) {
    return {
      registryEntry: null,
      registryRuntimeName: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildRouteChecks(): {
  routeChecks: AiRuntimeNoFallbackRouteCheck[];
  missingOperations: string[];
} {
  const missingOperations: string[] = [];
  const routeChecks: AiRuntimeNoFallbackRouteCheck[] = [];

  for (const route of AGENT_BFF_ROUTE_DEFINITIONS) {
    const resolved = safeResolveRoute(route.operation);
    if (!resolved.registryEntry || !resolved.registryRuntimeName) {
      missingOperations.push(route.operation);
      continue;
    }

    const mount = getAgentRuntimeGatewayMount(route.operation);
    const gatewayRuntimeName = mount?.runtimeName ?? null;
    const gatewayBoundary = mount?.runtimeBoundary ?? null;

    routeChecks.push({
      operation: route.operation,
      endpoint: route.endpoint,
      registryEntryId: resolved.registryEntry.entryId,
      registryRuntimeName: resolved.registryRuntimeName,
      gatewayRuntimeName,
      expectedBoundary: resolved.registryEntry.expectedBoundary,
      gatewayBoundary,
      fallback: resolved.registryEntry.fallback,
      commandCenterFallback: resolved.registryRuntimeName === "command_center",
      matchesGateway: gatewayRuntimeName === resolved.registryRuntimeName,
      boundaryAligned: gatewayBoundary === resolved.registryEntry.expectedBoundary,
    });
  }

  return { routeChecks, missingOperations };
}

function unknownOperationFailsClosed(): boolean {
  try {
    resolveAgentRuntimeTransportName("agent.unknown.operation");
    return false;
  } catch {
    return true;
  }
}

export function buildAiRuntimeNoFallbackTransportRegistryMatrix(): AiRuntimeNoFallbackTransportRegistryMatrix {
  const registryEntries = listAgentRuntimeTransportRegistryEntries();
  const runtimeContracts = listAiRuntimeTransportContracts();
  const runtimeContractNames = new Set<string>(runtimeContracts.map((contract) => contract.runtimeName));
  const { routeChecks, missingOperations } = buildRouteChecks();
  const fallbackEntryCount = registryEntries.filter((entry) => entry.fallback).length;
  const fallbackOperations = routeChecks
    .filter((route) => route.fallback || route.commandCenterFallback)
    .map((route) => route.operation);
  const routeDrifts = routeChecks.filter(
    (route) =>
      !route.matchesGateway ||
      !route.boundaryAligned ||
      !runtimeContractNames.has(route.registryRuntimeName),
  );
  const toolRoutes = routeChecks.filter((route) => route.operation.startsWith("agent.tools."));
  const toolRoutesExplicit =
    toolRoutes.length === 3 &&
    toolRoutes.every(
      (route) =>
        route.registryEntryId === "tool_registry" &&
        route.registryRuntimeName === "tool_registry" &&
        route.gatewayRuntimeName === "tool_registry" &&
        route.expectedBoundary === "runtime_read_transport" &&
        route.gatewayBoundary === "runtime_read_transport" &&
        route.fallback === false,
    );
  const allRoutesRegistered = missingOperations.length === 0 && routeChecks.length === AGENT_BFF_ROUTE_DEFINITIONS.length;
  const noFallbackEntries = fallbackEntryCount === 0;
  const noRouteUsesFallback = fallbackOperations.length === 0;
  const allRoutesMatchGateway = routeChecks.every((route) => route.matchesGateway);
  const allBoundariesAligned = routeChecks.every((route) => route.boundaryAligned);
  const noCommandCenterRouteFallback = routeChecks.every((route) => !route.commandCenterFallback);
  const unknownOperationBlocked = unknownOperationFailsClosed();

  const finalStatus: AiRuntimeNoFallbackTransportRegistryFinalStatus =
    !noFallbackEntries || !noRouteUsesFallback || !noCommandCenterRouteFallback
      ? "BLOCKED_AI_RUNTIME_TRANSPORT_FALLBACK_FOUND"
      : !allRoutesRegistered || !toolRoutesExplicit || !unknownOperationBlocked
        ? "BLOCKED_AI_RUNTIME_TRANSPORT_ROUTE_UNREGISTERED"
        : !allRoutesMatchGateway || !allBoundariesAligned || routeDrifts.length > 0
          ? "BLOCKED_AI_RUNTIME_TRANSPORT_DRIFT"
          : "GREEN_AI_RUNTIME_TRANSPORT_NO_FALLBACK_READY";

  return {
    wave: AI_RUNTIME_NO_FALLBACK_TRANSPORT_REGISTRY_WAVE,
    final_status: finalStatus,
    exact_reason:
      finalStatus === "GREEN_AI_RUNTIME_TRANSPORT_NO_FALLBACK_READY"
        ? null
        : [
            ...(!noFallbackEntries ? [`fallback entries remain: ${fallbackEntryCount}`] : []),
            ...fallbackOperations.map((operation) => `${operation}: fallback runtime selected`),
            ...missingOperations.map((operation) => `${operation}: transport registry missing`),
            ...(toolRoutesExplicit ? [] : ["agent.tools.*: explicit tool_registry transport missing"]),
            ...(unknownOperationBlocked ? [] : ["unknown operation resolves instead of failing closed"]),
            ...routeDrifts.map((route) => `${route.operation}: registry/gateway/contract drift`),
          ].join("; "),
    route_count: AGENT_BFF_ROUTE_DEFINITIONS.length,
    registry_entry_count: registryEntries.length,
    runtime_contract_count: runtimeContracts.length,
    fallback_entry_count: fallbackEntryCount,
    command_center_route_count: routeChecks.filter((route) => route.registryRuntimeName === "command_center").length,
    tool_registry_route_count: toolRoutes.length,
    all_routes_registered: allRoutesRegistered,
    all_routes_match_gateway: allRoutesMatchGateway,
    all_boundaries_aligned: allBoundariesAligned,
    no_fallback_entries: noFallbackEntries,
    no_route_uses_fallback: noRouteUsesFallback,
    no_command_center_route_fallback: noCommandCenterRouteFallback,
    tool_routes_explicit: toolRoutesExplicit,
    unknown_operation_fails_closed: unknownOperationBlocked,
    missing_operations: missingOperations,
    fallback_operations: fallbackOperations,
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

function writeArtifacts(matrix: AiRuntimeNoFallbackTransportRegistryMatrix): void {
  const inventory = {
    wave: AI_RUNTIME_NO_FALLBACK_TRANSPORT_REGISTRY_WAVE,
    source_files: [
      "src/features/ai/agent/agentRuntimeTransportRegistry.ts",
      "src/features/ai/agent/agentRuntimeGateway.ts",
      "src/features/ai/tools/transport/aiToolTransportTypes.ts",
      "scripts/ai/verifyAiRuntimeNoFallbackTransportRegistry.ts",
    ],
    test_files: [
      "tests/ai/agentRuntimeTransportRegistry.contract.test.ts",
      "tests/ai/agentRuntimeNoFallbackTransportRegistry.contract.test.ts",
      "tests/architecture/aiRuntimeTransportNoFallback.contract.test.ts",
      "tests/architecture/aiToolTransportBoundaryArchitecture.contract.test.ts",
    ],
    registry_entries: matrix.registry_entry_count,
    runtime_contracts: matrix.runtime_contract_count,
    route_count: matrix.route_count,
    fallback_entry_count: matrix.fallback_entry_count,
    command_center_route_count: matrix.command_center_route_count,
    tool_registry_route_count: matrix.tool_registry_route_count,
    db_writes: 0,
    provider_calls: 0,
    ui_changes: false,
  };
  const proof = [
    `# ${AI_RUNTIME_NO_FALLBACK_TRANSPORT_REGISTRY_WAVE}`,
    "",
    `final_status: ${matrix.final_status}`,
    `exact_reason: ${matrix.exact_reason ?? "none"}`,
    `route_count: ${matrix.route_count}`,
    `registry_entry_count: ${matrix.registry_entry_count}`,
    `runtime_contract_count: ${matrix.runtime_contract_count}`,
    `fallback_entry_count: ${matrix.fallback_entry_count}`,
    `command_center_route_count: ${matrix.command_center_route_count}`,
    `tool_registry_route_count: ${matrix.tool_registry_route_count}`,
    `all_routes_registered: ${matrix.all_routes_registered}`,
    `all_routes_match_gateway: ${matrix.all_routes_match_gateway}`,
    `all_boundaries_aligned: ${matrix.all_boundaries_aligned}`,
    `no_fallback_entries: ${matrix.no_fallback_entries}`,
    `no_route_uses_fallback: ${matrix.no_route_uses_fallback}`,
    `no_command_center_route_fallback: ${matrix.no_command_center_route_fallback}`,
    `tool_routes_explicit: ${matrix.tool_routes_explicit}`,
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
  const matrix = buildAiRuntimeNoFallbackTransportRegistryMatrix();
  writeArtifacts(matrix);
  console.log(JSON.stringify(matrix, null, 2));
  process.exitCode =
    matrix.final_status === "GREEN_AI_RUNTIME_TRANSPORT_NO_FALLBACK_READY" ? 0 : 1;
}
