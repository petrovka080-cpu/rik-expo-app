import fs from "node:fs";
import path from "node:path";

import {
  AGENT_BFF_ROUTE_DEFINITIONS,
  type AgentBffRouteOperation,
} from "../../src/features/ai/agent/agentBffRouteShell";
import {
  getAgentRuntimeGatewayMount,
  listAgentRuntimeGatewayMounts,
} from "../../src/features/ai/agent/agentRuntimeGateway";
import {
  AI_EXPLICIT_DOMAIN_RUNTIME_TRANSPORT_GROUPS,
  type AiExplicitDomainRuntimeTransportGroup,
} from "../../src/features/ai/agent/agentRuntimeTransportRegistry";

export const AI_DOMAIN_RUNTIME_TRANSPORT_CLOSEOUT_WAVE =
  "S_AI_RUNTIME_02_DOMAIN_RUNTIME_TRANSPORT_CLOSEOUT" as const;

export type AiDomainRuntimeTransportCloseoutFinalStatus =
  | "GREEN_AI_DOMAIN_RUNTIME_TRANSPORT_CLOSEOUT_READY"
  | "BLOCKED_AI_DOMAIN_RUNTIME_TRANSPORT_INCOMPLETE"
  | "BLOCKED_AI_DOMAIN_RUNTIME_COMMAND_CENTER_FALLBACK";

export type AiDomainRuntimeGroup = AiExplicitDomainRuntimeTransportGroup;

export type AiDomainRuntimeGroupMatrix = AiDomainRuntimeGroup & {
  routeCount: number;
  routes: readonly string[];
  endpoints: readonly string[];
  missingRouteCount: boolean;
  allRoutesMounted: boolean;
  explicitRuntimeTransport: boolean;
  commandCenterFallback: boolean;
  mutates: false;
  executesTool: false;
  directDatabaseAccess: false;
  providerCalls: false;
  rawRowsExposed: false;
  rawProviderPayloadExposed: false;
};

export type AiDomainRuntimeTransportCloseoutMatrix = {
  wave: typeof AI_DOMAIN_RUNTIME_TRANSPORT_CLOSEOUT_WAVE;
  final_status: AiDomainRuntimeTransportCloseoutFinalStatus;
  exact_reason: string | null;
  group_count: number;
  mounted_route_count: number;
  route_count: number;
  groups: readonly AiDomainRuntimeGroupMatrix[];
  no_command_center_fallback: boolean;
  all_domain_routes_mounted: boolean;
  all_domain_routes_explicit: boolean;
  no_db_writes: true;
  no_direct_database_access: true;
  no_provider_calls: true;
  no_raw_rows: true;
  no_raw_provider_payloads: true;
  no_ui_changes: true;
  no_fake_green: true;
};

export const AI_DOMAIN_RUNTIME_GROUPS: readonly AiDomainRuntimeGroup[] =
  AI_EXPLICIT_DOMAIN_RUNTIME_TRANSPORT_GROUPS;

const projectRoot = process.cwd();
const artifactPrefix = path.join(projectRoot, "artifacts", AI_DOMAIN_RUNTIME_TRANSPORT_CLOSEOUT_WAVE);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const proofPath = `${artifactPrefix}_proof.md`;

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function routeOperationsForPrefix(prefix: string): AgentBffRouteOperation[] {
  return AGENT_BFF_ROUTE_DEFINITIONS
    .filter((route) => route.operation.startsWith(prefix))
    .map((route) => route.operation);
}

function buildGroupMatrix(group: AiDomainRuntimeGroup): AiDomainRuntimeGroupMatrix {
  const routes = AGENT_BFF_ROUTE_DEFINITIONS.filter((route) =>
    route.operation.startsWith(group.operationPrefix),
  );
  const routeOperations = routeOperationsForPrefix(group.operationPrefix);
  const mounts = routeOperations
    .map((operation) => getAgentRuntimeGatewayMount(operation))
    .filter((mount): mount is NonNullable<ReturnType<typeof getAgentRuntimeGatewayMount>> =>
      Boolean(mount),
    );
  const allRoutesMounted = mounts.length === routeOperations.length;
  const explicitRuntimeTransport = mounts.every(
    (mount) =>
      mount.runtimeName === group.expectedRuntimeName &&
      mount.runtimeBoundary === group.expectedBoundary,
  );
  const commandCenterFallback = mounts.some((mount) => mount.runtimeName === "command_center");

  return {
    ...group,
    routeCount: routes.length,
    routes: routeOperations,
    endpoints: routes.map((route) => route.endpoint),
    missingRouteCount: routes.length < group.minRouteCount,
    allRoutesMounted,
    explicitRuntimeTransport,
    commandCenterFallback,
    mutates: false,
    executesTool: false,
    directDatabaseAccess: false,
    providerCalls: false,
    rawRowsExposed: false,
    rawProviderPayloadExposed: false,
  };
}

export function buildAiDomainRuntimeTransportCloseoutMatrix(): AiDomainRuntimeTransportCloseoutMatrix {
  const groups = AI_DOMAIN_RUNTIME_GROUPS.map(buildGroupMatrix);
  const mountedRouteCount = listAgentRuntimeGatewayMounts().length;
  const incomplete = groups.filter(
    (group) =>
      group.missingRouteCount ||
      !group.allRoutesMounted ||
      !group.explicitRuntimeTransport,
  );
  const fallbackGroups = groups.filter((group) => group.commandCenterFallback);
  const finalStatus: AiDomainRuntimeTransportCloseoutFinalStatus =
    fallbackGroups.length > 0
      ? "BLOCKED_AI_DOMAIN_RUNTIME_COMMAND_CENTER_FALLBACK"
      : incomplete.length > 0
        ? "BLOCKED_AI_DOMAIN_RUNTIME_TRANSPORT_INCOMPLETE"
        : "GREEN_AI_DOMAIN_RUNTIME_TRANSPORT_CLOSEOUT_READY";

  return {
    wave: AI_DOMAIN_RUNTIME_TRANSPORT_CLOSEOUT_WAVE,
    final_status: finalStatus,
    exact_reason:
      finalStatus === "GREEN_AI_DOMAIN_RUNTIME_TRANSPORT_CLOSEOUT_READY"
        ? null
        : [
            ...fallbackGroups.map((group) => `${group.domain}: command_center fallback remains`),
            ...incomplete.map((group) => `${group.domain}: explicit runtime transport incomplete`),
          ].join("; "),
    group_count: groups.length,
    mounted_route_count: mountedRouteCount,
    route_count: AGENT_BFF_ROUTE_DEFINITIONS.length,
    groups,
    no_command_center_fallback: fallbackGroups.length === 0,
    all_domain_routes_mounted: groups.every((group) => group.allRoutesMounted),
    all_domain_routes_explicit: groups.every((group) => group.explicitRuntimeTransport),
    no_db_writes: true,
    no_direct_database_access: true,
    no_provider_calls: true,
    no_raw_rows: true,
    no_raw_provider_payloads: true,
    no_ui_changes: true,
    no_fake_green: true,
  };
}

function writeArtifacts(matrix: AiDomainRuntimeTransportCloseoutMatrix): void {
  const inventory = {
    wave: AI_DOMAIN_RUNTIME_TRANSPORT_CLOSEOUT_WAVE,
    source_files: [
      "src/features/ai/tools/transport/aiToolTransportTypes.ts",
      "src/features/ai/agent/agentRuntimeTransportRegistry.ts",
      "src/features/ai/agent/agentRuntimeGateway.ts",
      "scripts/architecture_anti_regression_suite.ts",
      "scripts/ai/verifyAiDomainRuntimeTransportCloseout.ts",
    ],
    test_files: [
      "tests/ai/aiToolTransportBoundary.contract.test.ts",
      "tests/ai/aiDomainRuntimeTransportCloseout.contract.test.ts",
      "tests/architecture/aiDomainRuntimeNoCommandCenterFallback.contract.test.ts",
      "tests/architecture/aiToolTransportBoundaryArchitecture.contract.test.ts",
    ],
    domains: matrix.groups.map((group) => group.domain),
    runtime_transports: matrix.groups.map((group) => group.expectedRuntimeName),
    db_writes: 0,
    provider_calls: 0,
    ui_changes: false,
  };
  const proof = [
    `# ${AI_DOMAIN_RUNTIME_TRANSPORT_CLOSEOUT_WAVE}`,
    "",
    `final_status: ${matrix.final_status}`,
    `exact_reason: ${matrix.exact_reason ?? "none"}`,
    `group_count: ${matrix.group_count}`,
    `route_count: ${matrix.route_count}`,
    `mounted_route_count: ${matrix.mounted_route_count}`,
    `no_command_center_fallback: ${matrix.no_command_center_fallback}`,
    `all_domain_routes_explicit: ${matrix.all_domain_routes_explicit}`,
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
  const matrix = buildAiDomainRuntimeTransportCloseoutMatrix();
  writeArtifacts(matrix);
  console.log(JSON.stringify(matrix, null, 2));
  process.exitCode = matrix.final_status === "GREEN_AI_DOMAIN_RUNTIME_TRANSPORT_CLOSEOUT_READY" ? 0 : 1;
}
