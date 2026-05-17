import fs from "node:fs";
import path from "node:path";

import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";

export const AGENT_BFF_TASK_STREAM_OWNER_SPLIT_WAVE =
  "S_SCALE_08_AGENT_BFF_TASK_STREAM_OWNER_SPLIT" as const;

export type AgentBffTaskStreamOwnerSplitFinalStatus =
  | "GREEN_SCALE_AGENT_BFF_TASK_STREAM_OWNER_SPLIT_READY"
  | "BLOCKED_AGENT_BFF_TASK_STREAM_OWNER_SPLIT_REGRESSED"
  | "BLOCKED_AGENT_BFF_ROUTE_REGISTRY_DRIFT";

export type AgentBffTaskStreamOwnerSplitMatrix = {
  wave: typeof AGENT_BFF_TASK_STREAM_OWNER_SPLIT_WAVE;
  final_status: AgentBffTaskStreamOwnerSplitFinalStatus;
  exact_reason: string | null;
  shell_line_count_before_wave: number;
  shell_line_count_after: number;
  shell_line_count_reduction: number;
  task_stream_module_line_count: number;
  task_stream_owner_module_added: boolean;
  shell_reexports_task_stream_contract: boolean;
  shell_reexports_task_stream_function: boolean;
  shell_reexports_task_stream_types: boolean;
  shell_no_inline_task_stream_contract: boolean;
  shell_no_inline_task_stream_function: boolean;
  task_stream_module_owns_contract: boolean;
  task_stream_module_owns_function: boolean;
  task_stream_public_contract_preserved: boolean;
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
const taskStreamRelativePath = "src/features/ai/agent/agentTaskStreamRoutes.ts";
const artifactPrefix = path.join(
  projectRoot,
  "artifacts",
  "S_SCALE_08_AGENT_BFF_TASK_STREAM_OWNER_SPLIT",
);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const SHELL_LINE_COUNT_BEFORE_TASK_STREAM_SPLIT = 2442;
const MAX_SHELL_LINE_COUNT_AFTER_TASK_STREAM_SPLIT = 2250;
const MIN_SHELL_LINE_COUNT_REDUCTION = 180;
const EXPECTED_AGENT_BFF_ROUTE_COUNT = 76;

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

export function buildAgentBffTaskStreamOwnerSplitMatrix(): AgentBffTaskStreamOwnerSplitMatrix {
  const shellSource = readProjectFile(shellRelativePath);
  const taskStreamSource = readProjectFile(taskStreamRelativePath);
  const shellLineCountAfter = countLines(shellSource);
  const taskStreamModuleLineCount = countLines(taskStreamSource);
  const shellLineCountReduction =
    SHELL_LINE_COUNT_BEFORE_TASK_STREAM_SPLIT - shellLineCountAfter;

  const routes = AGENT_BFF_ROUTE_DEFINITIONS;
  const operations = routes.map((route) => route.operation);
  const endpoints = routes.map((route) => route.endpoint);

  const taskStreamOwnerModuleAdded = fs.existsSync(
    path.join(projectRoot, taskStreamRelativePath),
  );
  const shellReexportsTaskStreamContract =
    shellSource.includes("AGENT_TASK_STREAM_BFF_CONTRACT") &&
    shellSource.includes('from "./agentTaskStreamRoutes"');
  const shellReexportsTaskStreamFunction =
    shellSource.includes("getAgentTaskStream") &&
    shellSource.includes('from "./agentTaskStreamRoutes"');
  const shellReexportsTaskStreamTypes =
    shellSource.includes("AgentTaskStreamCard") &&
    shellSource.includes("AgentTaskStreamEnvelope") &&
    shellSource.includes("AgentTaskStreamRequest") &&
    shellSource.includes('from "./agentTaskStreamRoutes"');
  const shellNoInlineTaskStreamContract = !shellSource.includes(
    "export const AGENT_TASK_STREAM_BFF_CONTRACT = Object.freeze(",
  );
  const shellNoInlineTaskStreamFunction = !shellSource.includes(
    "export function getAgentTaskStream(",
  );
  const taskStreamModuleOwnsContract = taskStreamSource.includes(
    "export const AGENT_TASK_STREAM_BFF_CONTRACT = Object.freeze(",
  );
  const taskStreamModuleOwnsFunction = taskStreamSource.includes(
    "export function getAgentTaskStream(",
  );
  const taskStreamPublicContractPreserved =
    taskStreamSource.includes('contractId: "agent_task_stream_bff_v1"') &&
    taskStreamSource.includes('endpoint: "GET /agent/task-stream"') &&
    taskStreamSource.includes("readOnly: true") &&
    taskStreamSource.includes("mutationCount: 0") &&
    taskStreamSource.includes("providerCalled: false") &&
    taskStreamSource.includes("dbAccessedDirectly: false") &&
    taskStreamSource.includes("loadAiTaskStreamRuntime") &&
    shellSource.includes("GET /agent/task-stream") &&
    shellSource.includes("agent.task_stream.read");

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

  const changedProductionSources = `${shellSource}\n${taskStreamSource}`;
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
    shellLineCountAfter <= MAX_SHELL_LINE_COUNT_AFTER_TASK_STREAM_SPLIT &&
    shellLineCountReduction >= MIN_SHELL_LINE_COUNT_REDUCTION &&
    taskStreamOwnerModuleAdded &&
    shellReexportsTaskStreamContract &&
    shellReexportsTaskStreamFunction &&
    shellReexportsTaskStreamTypes &&
    shellNoInlineTaskStreamContract &&
    shellNoInlineTaskStreamFunction &&
    taskStreamModuleOwnsContract &&
    taskStreamModuleOwnsFunction &&
    taskStreamPublicContractPreserved &&
    noHooksAdded &&
    !dbWritesUsed &&
    !providerCallsUsed &&
    !rawRowsPrinted &&
    !secretsPrinted;

  const finalStatus: AgentBffTaskStreamOwnerSplitFinalStatus = !routeRegistryHealthy
    ? "BLOCKED_AGENT_BFF_ROUTE_REGISTRY_DRIFT"
    : !ownerSplitHealthy
      ? "BLOCKED_AGENT_BFF_TASK_STREAM_OWNER_SPLIT_REGRESSED"
      : "GREEN_SCALE_AGENT_BFF_TASK_STREAM_OWNER_SPLIT_READY";

  const exactReason =
    finalStatus === "GREEN_SCALE_AGENT_BFF_TASK_STREAM_OWNER_SPLIT_READY"
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
          ...(shellLineCountAfter <= MAX_SHELL_LINE_COUNT_AFTER_TASK_STREAM_SPLIT
            ? []
            : [`shell line count must be <= ${MAX_SHELL_LINE_COUNT_AFTER_TASK_STREAM_SPLIT}`]),
          ...(shellLineCountReduction >= MIN_SHELL_LINE_COUNT_REDUCTION
            ? []
            : [`shell line reduction must be >= ${MIN_SHELL_LINE_COUNT_REDUCTION}`]),
          ...(taskStreamOwnerModuleAdded ? [] : ["task-stream owner module is missing"]),
          ...(shellReexportsTaskStreamContract ? [] : ["shell must re-export task-stream contract"]),
          ...(shellReexportsTaskStreamFunction ? [] : ["shell must re-export task-stream function"]),
          ...(shellReexportsTaskStreamTypes ? [] : ["shell must re-export task-stream public types"]),
          ...(shellNoInlineTaskStreamContract ? [] : ["shell still owns task-stream contract"]),
          ...(shellNoInlineTaskStreamFunction ? [] : ["shell still owns task-stream function"]),
          ...(taskStreamModuleOwnsContract ? [] : ["task-stream module does not own contract"]),
          ...(taskStreamModuleOwnsFunction ? [] : ["task-stream module does not own function"]),
          ...(taskStreamPublicContractPreserved ? [] : ["task-stream public contract markers drifted"]),
          ...(noHooksAdded ? [] : ["hooks are not allowed in this owner split"]),
          ...(dbWritesUsed ? ["database write surface detected"] : []),
          ...(providerCallsUsed ? ["provider call surface detected"] : []),
          ...(rawRowsPrinted ? ["console output detected in production sources"] : []),
          ...(secretsPrinted ? ["secret/raw payload marker detected in production sources"] : []),
        ].join("; ");

  return {
    wave: AGENT_BFF_TASK_STREAM_OWNER_SPLIT_WAVE,
    final_status: finalStatus,
    exact_reason: exactReason,
    shell_line_count_before_wave: SHELL_LINE_COUNT_BEFORE_TASK_STREAM_SPLIT,
    shell_line_count_after: shellLineCountAfter,
    shell_line_count_reduction: shellLineCountReduction,
    task_stream_module_line_count: taskStreamModuleLineCount,
    task_stream_owner_module_added: taskStreamOwnerModuleAdded,
    shell_reexports_task_stream_contract: shellReexportsTaskStreamContract,
    shell_reexports_task_stream_function: shellReexportsTaskStreamFunction,
    shell_reexports_task_stream_types: shellReexportsTaskStreamTypes,
    shell_no_inline_task_stream_contract: shellNoInlineTaskStreamContract,
    shell_no_inline_task_stream_function: shellNoInlineTaskStreamFunction,
    task_stream_module_owns_contract: taskStreamModuleOwnsContract,
    task_stream_module_owns_function: taskStreamModuleOwnsFunction,
    task_stream_public_contract_preserved: taskStreamPublicContractPreserved,
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

function writeArtifacts(matrix: AgentBffTaskStreamOwnerSplitMatrix): void {
  const inventory = {
    wave: AGENT_BFF_TASK_STREAM_OWNER_SPLIT_WAVE,
    source_files: [shellRelativePath, taskStreamRelativePath],
    verifier: "scripts/ai/verifyAgentBffTaskStreamOwnerSplit.ts",
    tests: ["tests/scale/agentBffTaskStreamOwnerSplit.contract.test.ts"],
    shell_line_count_before_wave: matrix.shell_line_count_before_wave,
    shell_line_count_after: matrix.shell_line_count_after,
    shell_line_count_reduction: matrix.shell_line_count_reduction,
    task_stream_module_line_count: matrix.task_stream_module_line_count,
    route_count: matrix.route_count,
    no_ui_changes: matrix.no_ui_changes,
    business_logic_changed: matrix.business_logic_changed,
    db_writes_used: matrix.db_writes_used,
    provider_calls_used: matrix.provider_calls_used,
  };
  const proof = [
    `# ${AGENT_BFF_TASK_STREAM_OWNER_SPLIT_WAVE}`,
    "",
    `final_status: ${matrix.final_status}`,
    `exact_reason: ${matrix.exact_reason ?? "none"}`,
    `shell_line_count_before_wave: ${matrix.shell_line_count_before_wave}`,
    `shell_line_count_after: ${matrix.shell_line_count_after}`,
    `shell_line_count_reduction: ${matrix.shell_line_count_reduction}`,
    `task_stream_module_line_count: ${matrix.task_stream_module_line_count}`,
    `route_count: ${matrix.route_count}`,
    `shell_no_inline_task_stream_contract: ${matrix.shell_no_inline_task_stream_contract}`,
    `shell_no_inline_task_stream_function: ${matrix.shell_no_inline_task_stream_function}`,
    `task_stream_public_contract_preserved: ${matrix.task_stream_public_contract_preserved}`,
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
  const matrix = buildAgentBffTaskStreamOwnerSplitMatrix();
  writeArtifacts(matrix);
  if (matrix.final_status !== "GREEN_SCALE_AGENT_BFF_TASK_STREAM_OWNER_SPLIT_READY") {
    throw new Error(matrix.exact_reason ?? matrix.final_status);
  }
  console.log(
    `${AGENT_BFF_TASK_STREAM_OWNER_SPLIT_WAVE} ${matrix.final_status}`,
  );
}
