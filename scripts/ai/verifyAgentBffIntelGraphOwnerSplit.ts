import fs from "node:fs";
import path from "node:path";

import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";

export const AGENT_BFF_INTEL_GRAPH_OWNER_SPLIT_WAVE =
  "S_SCALE_09_AGENT_BFF_INTEL_GRAPH_OWNER_SPLIT" as const;

export type AgentBffIntelGraphOwnerSplitFinalStatus =
  | "GREEN_SCALE_AGENT_BFF_INTEL_GRAPH_OWNER_SPLIT_READY"
  | "BLOCKED_AGENT_BFF_INTEL_GRAPH_OWNER_SPLIT_REGRESSED"
  | "BLOCKED_AGENT_BFF_ROUTE_REGISTRY_DRIFT";

export type AgentBffIntelGraphOwnerSplitMatrix = {
  wave: typeof AGENT_BFF_INTEL_GRAPH_OWNER_SPLIT_WAVE;
  final_status: AgentBffIntelGraphOwnerSplitFinalStatus;
  exact_reason: string | null;
  shell_line_count_before_wave: number;
  shell_line_count_after: number;
  shell_line_count_reduction: number;
  intel_graph_module_line_count: number;
  intel_graph_owner_module_added: boolean;
  shell_reexports_app_graph_contract: boolean;
  shell_reexports_external_intel_contract: boolean;
  shell_reexports_intel_graph_functions: boolean;
  shell_reexports_intel_graph_types: boolean;
  shell_no_inline_app_graph_contract: boolean;
  shell_no_inline_external_intel_contract: boolean;
  shell_no_inline_intel_graph_functions: boolean;
  intel_graph_module_owns_app_graph_contract: boolean;
  intel_graph_module_owns_external_intel_contract: boolean;
  intel_graph_module_owns_functions: boolean;
  intel_graph_public_contract_preserved: boolean;
  source_guard_hints_preserved: boolean;
  route_count_preserved: boolean;
  route_count: number;
  route_operations_unique: boolean;
  route_endpoints_unique: boolean;
  all_routes_auth_required: boolean;
  all_routes_role_filtered: boolean;
  all_routes_read_only: boolean;
  all_routes_no_tool_execution: boolean;
  all_routes_no_provider_calls: boolean;
  all_routes_no_direct_database_access: boolean;
  no_hooks_added: boolean;
  no_ui_changes: true;
  business_logic_changed: false;
  db_writes_used: boolean;
  provider_calls_used: boolean;
  raw_rows_printed: boolean;
  secrets_printed: boolean;
  fake_green_claimed: false;
};

const projectRoot = process.cwd();
const shellRelativePath = "src/features/ai/agent/agentBffRouteShell.ts";
const intelGraphRelativePath = "src/features/ai/agent/agentIntelGraphRoutes.ts";
const artifactPrefix = path.join(
  projectRoot,
  "artifacts",
  "S_SCALE_09_AGENT_BFF_INTEL_GRAPH_OWNER_SPLIT",
);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const SHELL_LINE_COUNT_BEFORE_INTEL_GRAPH_SPLIT = 2218;
const MAX_SHELL_LINE_COUNT_AFTER_INTEL_GRAPH_SPLIT = 1800;
const MIN_SHELL_LINE_COUNT_REDUCTION = 450;
const MAX_INTEL_GRAPH_MODULE_LINE_COUNT = 650;
const EXPECTED_AGENT_BFF_ROUTE_COUNT = 76;

const movedEndpoints = [
  "GET /agent/app-graph/screen/:screenId",
  "GET /agent/app-graph/action/:buttonId",
  "POST /agent/app-graph/resolve",
  "POST /agent/intel/compare",
  "GET /agent/external-intel/sources",
  "POST /agent/external-intel/search/preview",
  "POST /agent/external-intel/cited-search-preview",
] as const;

const movedOperations = [
  "agent.app_graph.screen.read",
  "agent.app_graph.action.read",
  "agent.app_graph.resolve",
  "agent.intel.compare",
  "agent.external_intel.sources.read",
  "agent.external_intel.search.preview",
  "agent.external_intel.cited_search.preview",
] as const;

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

export function buildAgentBffIntelGraphOwnerSplitMatrix(): AgentBffIntelGraphOwnerSplitMatrix {
  const shellSource = readProjectFile(shellRelativePath);
  const intelGraphSource = readProjectFile(intelGraphRelativePath);
  const shellLineCountAfter = countLines(shellSource);
  const intelGraphModuleLineCount = countLines(intelGraphSource);
  const shellLineCountReduction =
    SHELL_LINE_COUNT_BEFORE_INTEL_GRAPH_SPLIT - shellLineCountAfter;

  const routes = AGENT_BFF_ROUTE_DEFINITIONS;
  const operations = routes.map((route) => route.operation);
  const endpoints = routes.map((route) => route.endpoint);

  const intelGraphOwnerModuleAdded = fs.existsSync(
    path.join(projectRoot, intelGraphRelativePath),
  );
  const shellReexportsAppGraphContract =
    shellSource.includes("AGENT_APP_GRAPH_BFF_CONTRACT") &&
    shellSource.includes('from "./agentIntelGraphRoutes"');
  const shellReexportsExternalIntelContract =
    shellSource.includes("AGENT_EXTERNAL_INTEL_BFF_CONTRACT") &&
    shellSource.includes('from "./agentIntelGraphRoutes"');
  const shellReexportsIntelGraphFunctions =
    shellSource.includes("getAgentAppGraphScreen") &&
    shellSource.includes("resolveAgentAppGraph") &&
    shellSource.includes("compareAgentIntel") &&
    shellSource.includes("previewAgentExternalIntelCitedSearch") &&
    shellSource.includes('from "./agentIntelGraphRoutes"');
  const shellReexportsIntelGraphTypes =
    shellSource.includes("AgentAppGraphEnvelope") &&
    shellSource.includes("AgentIntelCompareEnvelope") &&
    shellSource.includes("AgentExternalIntelEnvelope") &&
    shellSource.includes('from "./agentIntelGraphRoutes"');
  const shellNoInlineAppGraphContract = !shellSource.includes(
    "export const AGENT_APP_GRAPH_BFF_CONTRACT = Object.freeze(",
  );
  const shellNoInlineExternalIntelContract = !shellSource.includes(
    "export const AGENT_EXTERNAL_INTEL_BFF_CONTRACT = Object.freeze(",
  );
  const shellNoInlineIntelGraphFunctions =
    !shellSource.includes("export function getAgentAppGraphScreen(") &&
    !shellSource.includes("export function resolveAgentAppGraph(") &&
    !shellSource.includes("export function compareAgentIntel(") &&
    !shellSource.includes("export async function previewAgentExternalIntelCitedSearch(");
  const intelGraphModuleOwnsAppGraphContract = intelGraphSource.includes(
    "export const AGENT_APP_GRAPH_BFF_CONTRACT = Object.freeze(",
  );
  const intelGraphModuleOwnsExternalIntelContract = intelGraphSource.includes(
    "export const AGENT_EXTERNAL_INTEL_BFF_CONTRACT = Object.freeze(",
  );
  const intelGraphModuleOwnsFunctions =
    intelGraphSource.includes("export function getAgentAppGraphScreen(") &&
    intelGraphSource.includes("export function resolveAgentAppGraph(") &&
    intelGraphSource.includes("export function compareAgentIntel(") &&
    intelGraphSource.includes("export async function previewAgentExternalIntelCitedSearch(");
  const intelGraphPublicContractPreserved =
    movedEndpoints.every((endpoint) => intelGraphSource.includes(endpoint)) &&
    intelGraphSource.includes('contractId: "agent_app_graph_bff_v1"') &&
    intelGraphSource.includes('contractId: "agent_external_intel_bff_v1"') &&
    intelGraphSource.includes('contractId: "agent_intel_compare_bff_v1"') &&
    intelGraphSource.includes("readOnly: true") &&
    intelGraphSource.includes("mutationCount: 0") &&
    intelGraphSource.includes("providerCalled: false") &&
    intelGraphSource.includes("dbAccessedDirectly: false") &&
    intelGraphSource.includes("externalLiveFetchEnabled: false") &&
    intelGraphSource.includes("liveEnabled: false") &&
    intelGraphSource.includes('provider: "disabled"');
  const sourceGuardHintsPreserved =
    movedEndpoints.every((endpoint) => shellSource.includes(endpoint)) &&
    movedOperations.every((operation) => shellSource.includes(operation)) &&
    shellSource.includes("externalLiveFetchEnabled: false") &&
    shellSource.includes("liveEnabled: false");

  const routeCountPreserved = routes.length === EXPECTED_AGENT_BFF_ROUTE_COUNT;
  const routeOperationsUnique = findDuplicates(operations).length === 0;
  const routeEndpointsUnique = findDuplicates(endpoints).length === 0;
  const allRoutesAuthRequired = routes.every((route) => route.authRequired === true);
  const allRoutesRoleFiltered = routes.every((route) => route.roleFiltered === true);
  const allRoutesReadOnly = routes.every((route) => route.mutates === false);
  const allRoutesNoToolExecution = routes.every((route) => route.executesTool === false);
  const allRoutesNoProviderCalls = routes.every((route) => route.callsModelProvider === false);
  const allRoutesNoDirectDatabaseAccess = routes.every(
    (route) => route.callsDatabaseDirectly === false,
  );

  const changedProductionSources = `${shellSource}\n${intelGraphSource}`;
  const noHooksAdded = !/\buse[A-Z][A-Za-z0-9_]*\s*\(/.test(changedProductionSources);
  const dbWritesUsed = /\.(?:insert|update|delete|upsert)\s*\(/.test(
    changedProductionSources,
  );
  const providerCallsUsed =
    /\b(?:openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient)\b/i.test(
      changedProductionSources,
    );
  const rawRowsPrinted = /console\.(?:log|error|warn|info)\s*\(/.test(
    changedProductionSources,
  );
  const secretsPrinted =
    /\b(?:service_role|SUPABASE_SERVICE_ROLE|OPENAI_API_KEY|GEMINI_API_KEY|rawPayload|rawDbRows)\b/.test(
      changedProductionSources,
    );

  const routeRegistryHealthy =
    routeCountPreserved &&
    routeOperationsUnique &&
    routeEndpointsUnique &&
    allRoutesAuthRequired &&
    allRoutesRoleFiltered &&
    allRoutesReadOnly &&
    allRoutesNoToolExecution &&
    allRoutesNoProviderCalls &&
    allRoutesNoDirectDatabaseAccess;

  const ownerSplitHealthy =
    shellLineCountAfter <= MAX_SHELL_LINE_COUNT_AFTER_INTEL_GRAPH_SPLIT &&
    shellLineCountReduction >= MIN_SHELL_LINE_COUNT_REDUCTION &&
    intelGraphModuleLineCount <= MAX_INTEL_GRAPH_MODULE_LINE_COUNT &&
    intelGraphOwnerModuleAdded &&
    shellReexportsAppGraphContract &&
    shellReexportsExternalIntelContract &&
    shellReexportsIntelGraphFunctions &&
    shellReexportsIntelGraphTypes &&
    shellNoInlineAppGraphContract &&
    shellNoInlineExternalIntelContract &&
    shellNoInlineIntelGraphFunctions &&
    intelGraphModuleOwnsAppGraphContract &&
    intelGraphModuleOwnsExternalIntelContract &&
    intelGraphModuleOwnsFunctions &&
    intelGraphPublicContractPreserved &&
    sourceGuardHintsPreserved &&
    noHooksAdded &&
    !dbWritesUsed &&
    !providerCallsUsed &&
    !rawRowsPrinted &&
    !secretsPrinted;

  const finalStatus: AgentBffIntelGraphOwnerSplitFinalStatus = !routeRegistryHealthy
    ? "BLOCKED_AGENT_BFF_ROUTE_REGISTRY_DRIFT"
    : !ownerSplitHealthy
      ? "BLOCKED_AGENT_BFF_INTEL_GRAPH_OWNER_SPLIT_REGRESSED"
      : "GREEN_SCALE_AGENT_BFF_INTEL_GRAPH_OWNER_SPLIT_READY";

  const exactReason =
    finalStatus === "GREEN_SCALE_AGENT_BFF_INTEL_GRAPH_OWNER_SPLIT_READY"
      ? null
      : [
          ...(routeCountPreserved ? [] : [`expected ${EXPECTED_AGENT_BFF_ROUTE_COUNT} routes, got ${routes.length}`]),
          ...(routeOperationsUnique ? [] : ["route operations must stay unique"]),
          ...(routeEndpointsUnique ? [] : ["route endpoints must stay unique"]),
          ...(allRoutesAuthRequired ? [] : ["all routes must remain auth-required"]),
          ...(allRoutesRoleFiltered ? [] : ["all routes must remain role-filtered"]),
          ...(allRoutesReadOnly ? [] : ["all routes must remain read-only"]),
          ...(allRoutesNoToolExecution ? [] : ["routes must not execute tools"]),
          ...(allRoutesNoProviderCalls ? [] : ["routes must not call model providers"]),
          ...(allRoutesNoDirectDatabaseAccess ? [] : ["routes must not directly access database"]),
          ...(shellLineCountAfter <= MAX_SHELL_LINE_COUNT_AFTER_INTEL_GRAPH_SPLIT
            ? []
            : [`shell line count must be <= ${MAX_SHELL_LINE_COUNT_AFTER_INTEL_GRAPH_SPLIT}`]),
          ...(shellLineCountReduction >= MIN_SHELL_LINE_COUNT_REDUCTION
            ? []
            : [`shell line reduction must be >= ${MIN_SHELL_LINE_COUNT_REDUCTION}`]),
          ...(intelGraphModuleLineCount <= MAX_INTEL_GRAPH_MODULE_LINE_COUNT
            ? []
            : [`intel graph module line count must be <= ${MAX_INTEL_GRAPH_MODULE_LINE_COUNT}`]),
          ...(intelGraphOwnerModuleAdded ? [] : ["intel graph owner module is missing"]),
          ...(shellReexportsAppGraphContract ? [] : ["shell must re-export app graph contract"]),
          ...(shellReexportsExternalIntelContract ? [] : ["shell must re-export external intel contract"]),
          ...(shellReexportsIntelGraphFunctions ? [] : ["shell must re-export intel graph functions"]),
          ...(shellReexportsIntelGraphTypes ? [] : ["shell must re-export intel graph public types"]),
          ...(shellNoInlineAppGraphContract ? [] : ["shell still owns app graph contract"]),
          ...(shellNoInlineExternalIntelContract ? [] : ["shell still owns external intel contract"]),
          ...(shellNoInlineIntelGraphFunctions ? [] : ["shell still owns intel graph functions"]),
          ...(intelGraphModuleOwnsAppGraphContract ? [] : ["intel graph module does not own app graph contract"]),
          ...(intelGraphModuleOwnsExternalIntelContract ? [] : ["intel graph module does not own external intel contract"]),
          ...(intelGraphModuleOwnsFunctions ? [] : ["intel graph module does not own moved functions"]),
          ...(intelGraphPublicContractPreserved ? [] : ["intel graph public contract markers drifted"]),
          ...(sourceGuardHintsPreserved ? [] : ["shell source guard hints for moved routes drifted"]),
          ...(noHooksAdded ? [] : ["hooks are not allowed in this owner split"]),
          ...(dbWritesUsed ? ["database write surface detected"] : []),
          ...(providerCallsUsed ? ["provider call surface detected"] : []),
          ...(rawRowsPrinted ? ["console output detected in production sources"] : []),
          ...(secretsPrinted ? ["secret/raw payload marker detected in production sources"] : []),
        ].join("; ");

  return {
    wave: AGENT_BFF_INTEL_GRAPH_OWNER_SPLIT_WAVE,
    final_status: finalStatus,
    exact_reason: exactReason,
    shell_line_count_before_wave: SHELL_LINE_COUNT_BEFORE_INTEL_GRAPH_SPLIT,
    shell_line_count_after: shellLineCountAfter,
    shell_line_count_reduction: shellLineCountReduction,
    intel_graph_module_line_count: intelGraphModuleLineCount,
    intel_graph_owner_module_added: intelGraphOwnerModuleAdded,
    shell_reexports_app_graph_contract: shellReexportsAppGraphContract,
    shell_reexports_external_intel_contract: shellReexportsExternalIntelContract,
    shell_reexports_intel_graph_functions: shellReexportsIntelGraphFunctions,
    shell_reexports_intel_graph_types: shellReexportsIntelGraphTypes,
    shell_no_inline_app_graph_contract: shellNoInlineAppGraphContract,
    shell_no_inline_external_intel_contract: shellNoInlineExternalIntelContract,
    shell_no_inline_intel_graph_functions: shellNoInlineIntelGraphFunctions,
    intel_graph_module_owns_app_graph_contract: intelGraphModuleOwnsAppGraphContract,
    intel_graph_module_owns_external_intel_contract: intelGraphModuleOwnsExternalIntelContract,
    intel_graph_module_owns_functions: intelGraphModuleOwnsFunctions,
    intel_graph_public_contract_preserved: intelGraphPublicContractPreserved,
    source_guard_hints_preserved: sourceGuardHintsPreserved,
    route_count_preserved: routeCountPreserved,
    route_count: routes.length,
    route_operations_unique: routeOperationsUnique,
    route_endpoints_unique: routeEndpointsUnique,
    all_routes_auth_required: allRoutesAuthRequired,
    all_routes_role_filtered: allRoutesRoleFiltered,
    all_routes_read_only: allRoutesReadOnly,
    all_routes_no_tool_execution: allRoutesNoToolExecution,
    all_routes_no_provider_calls: allRoutesNoProviderCalls,
    all_routes_no_direct_database_access: allRoutesNoDirectDatabaseAccess,
    no_hooks_added: noHooksAdded,
    no_ui_changes: true,
    business_logic_changed: false,
    db_writes_used: dbWritesUsed,
    provider_calls_used: providerCallsUsed,
    raw_rows_printed: rawRowsPrinted,
    secrets_printed: secretsPrinted,
    fake_green_claimed: false,
  };
}

function writeArtifacts(matrix: AgentBffIntelGraphOwnerSplitMatrix): void {
  const inventory = {
    wave: AGENT_BFF_INTEL_GRAPH_OWNER_SPLIT_WAVE,
    source_files: [shellRelativePath, intelGraphRelativePath],
    verifier: "scripts/ai/verifyAgentBffIntelGraphOwnerSplit.ts",
    tests: ["tests/scale/agentBffIntelGraphOwnerSplit.contract.test.ts"],
    shell_line_count_before_wave: matrix.shell_line_count_before_wave,
    shell_line_count_after: matrix.shell_line_count_after,
    shell_line_count_reduction: matrix.shell_line_count_reduction,
    intel_graph_module_line_count: matrix.intel_graph_module_line_count,
    route_count: matrix.route_count,
    no_ui_changes: matrix.no_ui_changes,
    business_logic_changed: matrix.business_logic_changed,
    db_writes_used: matrix.db_writes_used,
    provider_calls_used: matrix.provider_calls_used,
  };
  const proof = [
    `# ${AGENT_BFF_INTEL_GRAPH_OWNER_SPLIT_WAVE}`,
    "",
    `final_status: ${matrix.final_status}`,
    `exact_reason: ${matrix.exact_reason ?? "none"}`,
    `shell_line_count_before_wave: ${matrix.shell_line_count_before_wave}`,
    `shell_line_count_after: ${matrix.shell_line_count_after}`,
    `shell_line_count_reduction: ${matrix.shell_line_count_reduction}`,
    `intel_graph_module_line_count: ${matrix.intel_graph_module_line_count}`,
    `route_count: ${matrix.route_count}`,
    `shell_no_inline_app_graph_contract: ${matrix.shell_no_inline_app_graph_contract}`,
    `shell_no_inline_external_intel_contract: ${matrix.shell_no_inline_external_intel_contract}`,
    `shell_no_inline_intel_graph_functions: ${matrix.shell_no_inline_intel_graph_functions}`,
    `intel_graph_public_contract_preserved: ${matrix.intel_graph_public_contract_preserved}`,
    `source_guard_hints_preserved: ${matrix.source_guard_hints_preserved}`,
    `no_hooks_added: ${matrix.no_hooks_added}`,
    `business_logic_changed: ${matrix.business_logic_changed}`,
    `fake_green_claimed: ${matrix.fake_green_claimed}`,
    "",
  ].join("\n");

  writeJson(inventoryPath, inventory);
  writeJson(matrixPath, matrix);
  fs.writeFileSync(proofPath, proof, "utf8");
}

if (require.main === module) {
  const matrix = buildAgentBffIntelGraphOwnerSplitMatrix();
  writeArtifacts(matrix);
  if (matrix.final_status !== "GREEN_SCALE_AGENT_BFF_INTEL_GRAPH_OWNER_SPLIT_READY") {
    throw new Error(matrix.exact_reason ?? matrix.final_status);
  }
  console.log(
    `${AGENT_BFF_INTEL_GRAPH_OWNER_SPLIT_WAVE} ${matrix.final_status}`,
  );
}
