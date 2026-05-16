import fs from "node:fs";
import path from "node:path";

import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";
import { getAgentRuntimeGatewayMount } from "../../src/features/ai/agent/agentRuntimeGateway";
import {
  AI_EXPLICIT_DOMAIN_RUNTIME_TRANSPORT_GROUPS,
  getAgentRuntimeTransportRegistryEntry,
  listAgentRuntimeTransportRegistryEntries,
  resolveAgentRuntimeTransportName,
  type AgentRuntimeTransportRegistryEntry,
} from "../../src/features/ai/agent/agentRuntimeTransportRegistry";
import { listAiRuntimeTransportContracts } from "../../src/features/ai/tools/transport/aiToolTransportTypes";

export const AI_RUNTIME_TRANSPORT_REGISTRY_HARDENING_WAVE =
  "S_AI_RUNTIME_03_RUNTIME_TRANSPORT_REGISTRY_HARDENING" as const;

export type AiRuntimeTransportRegistryHardeningFinalStatus =
  | "GREEN_AI_RUNTIME_TRANSPORT_REGISTRY_HARDENING_READY"
  | "BLOCKED_AI_RUNTIME_TRANSPORT_REGISTRY_DRIFT"
  | "BLOCKED_AI_RUNTIME_TRANSPORT_CONTRACT_MISSING"
  | "BLOCKED_AI_DOMAIN_RUNTIME_COMMAND_CENTER_FALLBACK";

export type AiRuntimeTransportRegistryRouteCheck = {
  operation: string;
  endpoint: string;
  registryEntryId: AgentRuntimeTransportRegistryEntry["entryId"];
  registryRuntimeName: string;
  gatewayRuntimeName: string | null;
  gatewayBoundary: string | null;
  expectedBoundary: string;
  matchesGateway: boolean;
  boundaryAligned: boolean;
  commandCenterFallback: boolean;
};

export type AiRuntimeTransportRegistryDomainCheck = {
  domain: string;
  operationPrefix: string;
  expectedRuntimeName: string;
  expectedBoundary: string;
  minRouteCount: number;
  routeCount: number;
  allRoutesExplicit: boolean;
  commandCenterFallback: boolean;
};

export type AiRuntimeTransportRegistryHardeningMatrix = {
  wave: typeof AI_RUNTIME_TRANSPORT_REGISTRY_HARDENING_WAVE;
  final_status: AiRuntimeTransportRegistryHardeningFinalStatus;
  exact_reason: string | null;
  route_count: number;
  registry_entry_count: number;
  fallback_entry_count: number;
  runtime_contract_count: number;
  all_registry_runtime_contracts_mounted: boolean;
  all_registry_boundaries_aligned: boolean;
  all_gateway_mounts_match_registry: boolean;
  no_domain_command_center_fallback: boolean;
  all_domain_groups_explicit: boolean;
  missing_runtime_contracts: readonly string[];
  boundary_drifts: readonly string[];
  route_drifts: readonly AiRuntimeTransportRegistryRouteCheck[];
  domain_checks: readonly AiRuntimeTransportRegistryDomainCheck[];
  runtime_route_counts: Readonly<Record<string, number>>;
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
  AI_RUNTIME_TRANSPORT_REGISTRY_HARDENING_WAVE,
);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const proofPath = `${artifactPrefix}_proof.md`;

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildRouteChecks(): AiRuntimeTransportRegistryRouteCheck[] {
  return AGENT_BFF_ROUTE_DEFINITIONS.map((route) => {
    const registryEntry = getAgentRuntimeTransportRegistryEntry(route.operation);
    const registryRuntimeName = resolveAgentRuntimeTransportName(route.operation);
    const mount = getAgentRuntimeGatewayMount(route.operation);
    const gatewayRuntimeName = mount?.runtimeName ?? null;
    const gatewayBoundary = mount?.runtimeBoundary ?? null;
    const matchesGateway = gatewayRuntimeName === registryRuntimeName;
    const boundaryAligned = gatewayBoundary === registryEntry.expectedBoundary;

    return {
      operation: route.operation,
      endpoint: route.endpoint,
      registryEntryId: registryEntry.entryId,
      registryRuntimeName,
      gatewayRuntimeName,
      gatewayBoundary,
      expectedBoundary: registryEntry.expectedBoundary,
      matchesGateway,
      boundaryAligned,
      commandCenterFallback: registryRuntimeName === "command_center",
    };
  });
}

function buildDomainChecks(routeChecks: readonly AiRuntimeTransportRegistryRouteCheck[]) {
  return AI_EXPLICIT_DOMAIN_RUNTIME_TRANSPORT_GROUPS.map((group) => {
    const routes = routeChecks.filter((route) => route.operation.startsWith(group.operationPrefix));
    const allRoutesExplicit = routes.every(
      (route) =>
        route.registryRuntimeName === group.expectedRuntimeName &&
        route.gatewayRuntimeName === group.expectedRuntimeName &&
        route.gatewayBoundary === group.expectedBoundary,
    );

    return {
      domain: group.domain,
      operationPrefix: group.operationPrefix,
      expectedRuntimeName: group.expectedRuntimeName,
      expectedBoundary: group.expectedBoundary,
      minRouteCount: group.minRouteCount,
      routeCount: routes.length,
      allRoutesExplicit: routes.length >= group.minRouteCount && allRoutesExplicit,
      commandCenterFallback: routes.some((route) => route.commandCenterFallback),
    };
  });
}

function countRoutesByRuntime(routeChecks: readonly AiRuntimeTransportRegistryRouteCheck[]) {
  return routeChecks.reduce<Record<string, number>>((counts, route) => {
    counts[route.registryRuntimeName] = (counts[route.registryRuntimeName] ?? 0) + 1;
    return counts;
  }, {});
}

export function buildAiRuntimeTransportRegistryHardeningMatrix(): AiRuntimeTransportRegistryHardeningMatrix {
  const registryEntries = listAgentRuntimeTransportRegistryEntries();
  const runtimeContracts = listAiRuntimeTransportContracts();
  const contractByRuntimeName = new Map(runtimeContracts.map((contract) => [contract.runtimeName, contract]));
  const missingRuntimeContracts = registryEntries
    .filter((entry) => !contractByRuntimeName.has(entry.runtimeName))
    .map((entry) => entry.runtimeName);
  const boundaryDrifts = registryEntries
    .filter((entry) => contractByRuntimeName.get(entry.runtimeName)?.boundary !== entry.expectedBoundary)
    .map((entry) => {
      const contract = contractByRuntimeName.get(entry.runtimeName);
      return `${entry.runtimeName}: expected ${entry.expectedBoundary}, got ${contract?.boundary ?? "missing"}`;
    });
  const routeChecks = buildRouteChecks();
  const routeDrifts = routeChecks.filter((route) => !route.matchesGateway || !route.boundaryAligned);
  const domainChecks = buildDomainChecks(routeChecks);
  const domainFallbacks = domainChecks.filter((domain) => domain.commandCenterFallback);
  const incompleteDomains = domainChecks.filter((domain) => !domain.allRoutesExplicit);

  const allRegistryRuntimeContractsMounted = missingRuntimeContracts.length === 0;
  const allRegistryBoundariesAligned = boundaryDrifts.length === 0;
  const allGatewayMountsMatchRegistry = routeDrifts.length === 0;
  const noDomainCommandCenterFallback = domainFallbacks.length === 0;
  const allDomainGroupsExplicit = incompleteDomains.length === 0;

  const finalStatus: AiRuntimeTransportRegistryHardeningFinalStatus =
    !allRegistryRuntimeContractsMounted
      ? "BLOCKED_AI_RUNTIME_TRANSPORT_CONTRACT_MISSING"
      : !noDomainCommandCenterFallback
        ? "BLOCKED_AI_DOMAIN_RUNTIME_COMMAND_CENTER_FALLBACK"
        : !allRegistryBoundariesAligned || !allGatewayMountsMatchRegistry || !allDomainGroupsExplicit
          ? "BLOCKED_AI_RUNTIME_TRANSPORT_REGISTRY_DRIFT"
          : "GREEN_AI_RUNTIME_TRANSPORT_REGISTRY_HARDENING_READY";

  return {
    wave: AI_RUNTIME_TRANSPORT_REGISTRY_HARDENING_WAVE,
    final_status: finalStatus,
    exact_reason:
      finalStatus === "GREEN_AI_RUNTIME_TRANSPORT_REGISTRY_HARDENING_READY"
        ? null
        : [
            ...missingRuntimeContracts.map((runtime) => `${runtime}: runtime contract missing`),
            ...boundaryDrifts,
            ...routeDrifts.map((route) => `${route.operation}: gateway does not match registry`),
            ...domainFallbacks.map((domain) => `${domain.domain}: command_center fallback remains`),
            ...incompleteDomains.map((domain) => `${domain.domain}: explicit domain runtime incomplete`),
          ].join("; "),
    route_count: AGENT_BFF_ROUTE_DEFINITIONS.length,
    registry_entry_count: registryEntries.length,
    fallback_entry_count: registryEntries.filter((entry) => entry.fallback).length,
    runtime_contract_count: runtimeContracts.length,
    all_registry_runtime_contracts_mounted: allRegistryRuntimeContractsMounted,
    all_registry_boundaries_aligned: allRegistryBoundariesAligned,
    all_gateway_mounts_match_registry: allGatewayMountsMatchRegistry,
    no_domain_command_center_fallback: noDomainCommandCenterFallback,
    all_domain_groups_explicit: allDomainGroupsExplicit,
    missing_runtime_contracts: missingRuntimeContracts,
    boundary_drifts: boundaryDrifts,
    route_drifts: routeDrifts,
    domain_checks: domainChecks,
    runtime_route_counts: countRoutesByRuntime(routeChecks),
    no_db_writes: true,
    no_direct_database_access: true,
    no_provider_calls: true,
    no_raw_rows: true,
    no_raw_provider_payloads: true,
    no_ui_changes: true,
    no_fake_green: true,
  };
}

function writeArtifacts(matrix: AiRuntimeTransportRegistryHardeningMatrix): void {
  const inventory = {
    wave: AI_RUNTIME_TRANSPORT_REGISTRY_HARDENING_WAVE,
    source_files: [
      "src/features/ai/agent/agentRuntimeTransportRegistry.ts",
      "src/features/ai/agent/agentRuntimeGateway.ts",
      "src/features/ai/tools/transport/aiToolTransportTypes.ts",
      "scripts/ai/verifyAiDomainRuntimeTransportCloseout.ts",
      "scripts/ai/verifyAiRuntimeTransportRegistryHardening.ts",
    ],
    test_files: [
      "tests/ai/agentRuntimeTransportRegistry.contract.test.ts",
      "tests/ai/aiDomainRuntimeTransportCloseout.contract.test.ts",
      "tests/architecture/aiRuntimeTransportRegistryNoDrift.contract.test.ts",
      "tests/architecture/aiDomainRuntimeNoCommandCenterFallback.contract.test.ts",
      "tests/architecture/agentBffRuntimeMount.contract.test.ts",
    ],
    registry_entries: matrix.registry_entry_count,
    runtime_contracts: matrix.runtime_contract_count,
    route_count: matrix.route_count,
    db_writes: 0,
    provider_calls: 0,
    ui_changes: false,
  };
  const proof = [
    `# ${AI_RUNTIME_TRANSPORT_REGISTRY_HARDENING_WAVE}`,
    "",
    `final_status: ${matrix.final_status}`,
    `exact_reason: ${matrix.exact_reason ?? "none"}`,
    `route_count: ${matrix.route_count}`,
    `registry_entry_count: ${matrix.registry_entry_count}`,
    `runtime_contract_count: ${matrix.runtime_contract_count}`,
    `all_registry_runtime_contracts_mounted: ${matrix.all_registry_runtime_contracts_mounted}`,
    `all_registry_boundaries_aligned: ${matrix.all_registry_boundaries_aligned}`,
    `all_gateway_mounts_match_registry: ${matrix.all_gateway_mounts_match_registry}`,
    `no_domain_command_center_fallback: ${matrix.no_domain_command_center_fallback}`,
    `all_domain_groups_explicit: ${matrix.all_domain_groups_explicit}`,
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
  const matrix = buildAiRuntimeTransportRegistryHardeningMatrix();
  writeArtifacts(matrix);
  console.log(JSON.stringify(matrix, null, 2));
  process.exitCode =
    matrix.final_status === "GREEN_AI_RUNTIME_TRANSPORT_REGISTRY_HARDENING_READY" ? 0 : 1;
}
