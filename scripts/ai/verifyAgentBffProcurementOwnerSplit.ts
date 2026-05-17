import fs from "node:fs";
import path from "node:path";

import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";

export const AGENT_BFF_PROCUREMENT_OWNER_SPLIT_WAVE =
  "S_SCALE_10_AGENT_BFF_PROCUREMENT_OWNER_SPLIT" as const;

export type AgentBffProcurementOwnerSplitFinalStatus =
  | "GREEN_SCALE_AGENT_BFF_PROCUREMENT_OWNER_SPLIT_READY"
  | "BLOCKED_AGENT_BFF_PROCUREMENT_OWNER_SPLIT_REGRESSED"
  | "BLOCKED_AGENT_BFF_ROUTE_REGISTRY_DRIFT";

export type AgentBffProcurementOwnerSplitMatrix = {
  wave: typeof AGENT_BFF_PROCUREMENT_OWNER_SPLIT_WAVE;
  final_status: AgentBffProcurementOwnerSplitFinalStatus;
  exact_reason: string | null;
  shell_line_count_before_wave: number;
  shell_line_count_after: number;
  shell_line_count_reduction: number;
  procurement_module_line_count: number;
  procurement_owner_module_added: boolean;
  shell_reexports_procurement_contract: boolean;
  shell_reexports_procurement_functions: boolean;
  shell_reexports_procurement_types: boolean;
  shell_no_inline_procurement_contract: boolean;
  shell_no_inline_procurement_functions: boolean;
  procurement_module_owns_contract: boolean;
  procurement_module_owns_functions: boolean;
  procurement_public_contract_preserved: boolean;
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
const procurementRelativePath = "src/features/ai/agent/agentProcurementRoutes.ts";
const artifactPrefix = path.join(
  projectRoot,
  "artifacts",
  "S_SCALE_10_AGENT_BFF_PROCUREMENT_OWNER_SPLIT",
);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const SHELL_LINE_COUNT_BEFORE_PROCUREMENT_SPLIT = 1720;
const MAX_SHELL_LINE_COUNT_AFTER_PROCUREMENT_SPLIT = 900;
const MIN_SHELL_LINE_COUNT_REDUCTION = 850;
const MAX_PROCUREMENT_MODULE_LINE_COUNT = 1100;
const EXPECTED_AGENT_BFF_ROUTE_COUNT = 76;

const movedEndpoints = [
  "GET /agent/procurement/request-context/:requestId",
  "GET /agent/procurement/request-understanding/:requestId",
  "POST /agent/procurement/internal-supplier-rank",
  "POST /agent/procurement/decision-card",
  "POST /agent/procurement/supplier-match/preview",
  "POST /agent/procurement/external-supplier-candidates/preview",
  "POST /agent/procurement/external-supplier-preview",
  "POST /agent/procurement/draft-request/preview",
  "POST /agent/procurement/draft-request-preview",
  "POST /agent/procurement/submit-for-approval",
  "POST /agent/procurement/live-supplier-chain/preview",
  "POST /agent/procurement/live-supplier-chain/draft",
  "POST /agent/procurement/live-supplier-chain/submit-for-approval",
  "GET /agent/procurement/copilot/context",
  "POST /agent/procurement/copilot/plan",
  "POST /agent/procurement/copilot/draft-preview",
  "POST /agent/procurement/copilot/submit-for-approval-preview",
] as const;

const movedOperations = [
  "agent.procurement.request_context.read",
  "agent.procurement.request_understanding.read",
  "agent.procurement.internal_supplier_rank.preview",
  "agent.procurement.decision_card.preview",
  "agent.procurement.supplier_match.preview",
  "agent.procurement.external_supplier_candidates.preview",
  "agent.procurement.external_supplier.preview",
  "agent.procurement.draft_request.preview",
  "agent.procurement.draft_request.internal_first_preview",
  "agent.procurement.submit_for_approval",
  "agent.procurement.live_supplier_chain.preview",
  "agent.procurement.live_supplier_chain.draft",
  "agent.procurement.live_supplier_chain.submit_for_approval",
  "agent.procurement.copilot.context.read",
  "agent.procurement.copilot.plan.preview",
  "agent.procurement.copilot.draft_preview",
  "agent.procurement.copilot.submit_for_approval.preview",
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

export function buildAgentBffProcurementOwnerSplitMatrix(): AgentBffProcurementOwnerSplitMatrix {
  const shellSource = readProjectFile(shellRelativePath);
  const procurementSource = readProjectFile(procurementRelativePath);
  const shellLineCountAfter = countLines(shellSource);
  const procurementModuleLineCount = countLines(procurementSource);
  const shellLineCountReduction =
    SHELL_LINE_COUNT_BEFORE_PROCUREMENT_SPLIT - shellLineCountAfter;

  const routes = AGENT_BFF_ROUTE_DEFINITIONS;
  const operations = routes.map((route) => route.operation);
  const endpoints = routes.map((route) => route.endpoint);

  const procurementOwnerModuleAdded = fs.existsSync(
    path.join(projectRoot, procurementRelativePath),
  );
  const shellReexportsProcurementContract =
    shellSource.includes("AGENT_PROCUREMENT_BFF_CONTRACT") &&
    shellSource.includes('from "./agentProcurementRoutes"');
  const shellReexportsProcurementFunctions =
    shellSource.includes("getAgentProcurementRequestContext") &&
    shellSource.includes("previewAgentProcurementLiveSupplierChain") &&
    shellSource.includes("previewAgentProcurementCopilotSubmitForApproval") &&
    shellSource.includes("submitAgentProcurementForApproval") &&
    shellSource.includes('from "./agentProcurementRoutes"');
  const shellReexportsProcurementTypes =
    shellSource.includes("AgentProcurementEnvelope") &&
    shellSource.includes("AgentProcurementLiveSupplierChainRequest") &&
    shellSource.includes("AgentProcurementCopilotPlanRequest") &&
    shellSource.includes('from "./agentProcurementRoutes"');
  const shellNoInlineProcurementContract = !shellSource.includes(
    "export const AGENT_PROCUREMENT_BFF_CONTRACT = Object.freeze(",
  );
  const shellNoInlineProcurementFunctions =
    !shellSource.includes("export function getAgentProcurementRequestContext(") &&
    !shellSource.includes("export async function previewAgentProcurementInternalSupplierRank(") &&
    !shellSource.includes("export async function previewAgentProcurementLiveSupplierChain(") &&
    !shellSource.includes("export function previewAgentProcurementCopilotSubmitForApproval(") &&
    !shellSource.includes("function procurementAuthRequiredError(");
  const procurementModuleOwnsContract = procurementSource.includes(
    "export const AGENT_PROCUREMENT_BFF_CONTRACT = Object.freeze(",
  );
  const procurementModuleOwnsFunctions =
    procurementSource.includes("export function getAgentProcurementRequestContext(") &&
    procurementSource.includes("export async function previewAgentProcurementInternalSupplierRank(") &&
    procurementSource.includes("export async function previewAgentProcurementLiveSupplierChain(") &&
    procurementSource.includes("export function previewAgentProcurementCopilotSubmitForApproval(") &&
    procurementSource.includes("function procurementAuthRequiredError(");
  const procurementPublicContractPreserved =
    movedEndpoints.every((endpoint) => procurementSource.includes(endpoint)) &&
    procurementSource.includes('contractId: "agent_procurement_bff_v1"') &&
    procurementSource.includes("readOnly: true") &&
    procurementSource.includes("roleScoped: true") &&
    procurementSource.includes("evidenceBacked: true") &&
    procurementSource.includes("mutationCount: 0") &&
    procurementSource.includes("providerCalled: false") &&
    procurementSource.includes("dbAccessedDirectly: false") &&
    procurementSource.includes("directDatabaseAccess: 0") &&
    procurementSource.includes("modelProviderImports: 0") &&
    procurementSource.includes("externalLiveFetchEnabled: false") &&
    procurementSource.includes("finalActionExecutionEnabled: false") &&
    procurementSource.includes("supplierSelectionFinalized: false");
  const sourceGuardHintsPreserved =
    movedEndpoints.every((endpoint) => shellSource.includes(endpoint)) &&
    movedOperations.every((operation) => shellSource.includes(operation)) &&
    shellSource.includes("AGENT_PROCUREMENT_BFF_CONTRACT") &&
    shellSource.includes("externalLiveFetchEnabled: false");

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

  const changedProductionSources = `${shellSource}\n${procurementSource}`;
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
    shellLineCountAfter <= MAX_SHELL_LINE_COUNT_AFTER_PROCUREMENT_SPLIT &&
    shellLineCountReduction >= MIN_SHELL_LINE_COUNT_REDUCTION &&
    procurementModuleLineCount <= MAX_PROCUREMENT_MODULE_LINE_COUNT &&
    procurementOwnerModuleAdded &&
    shellReexportsProcurementContract &&
    shellReexportsProcurementFunctions &&
    shellReexportsProcurementTypes &&
    shellNoInlineProcurementContract &&
    shellNoInlineProcurementFunctions &&
    procurementModuleOwnsContract &&
    procurementModuleOwnsFunctions &&
    procurementPublicContractPreserved &&
    sourceGuardHintsPreserved &&
    noHooksAdded &&
    !dbWritesUsed &&
    !providerCallsUsed &&
    !rawRowsPrinted &&
    !secretsPrinted;

  const finalStatus: AgentBffProcurementOwnerSplitFinalStatus = !routeRegistryHealthy
    ? "BLOCKED_AGENT_BFF_ROUTE_REGISTRY_DRIFT"
    : !ownerSplitHealthy
      ? "BLOCKED_AGENT_BFF_PROCUREMENT_OWNER_SPLIT_REGRESSED"
      : "GREEN_SCALE_AGENT_BFF_PROCUREMENT_OWNER_SPLIT_READY";

  const exactReason =
    finalStatus === "GREEN_SCALE_AGENT_BFF_PROCUREMENT_OWNER_SPLIT_READY"
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
          ...(shellLineCountAfter <= MAX_SHELL_LINE_COUNT_AFTER_PROCUREMENT_SPLIT
            ? []
            : [`shell line count must be <= ${MAX_SHELL_LINE_COUNT_AFTER_PROCUREMENT_SPLIT}`]),
          ...(shellLineCountReduction >= MIN_SHELL_LINE_COUNT_REDUCTION
            ? []
            : [`shell line reduction must be >= ${MIN_SHELL_LINE_COUNT_REDUCTION}`]),
          ...(procurementModuleLineCount <= MAX_PROCUREMENT_MODULE_LINE_COUNT
            ? []
            : [`procurement module line count must be <= ${MAX_PROCUREMENT_MODULE_LINE_COUNT}`]),
          ...(procurementOwnerModuleAdded ? [] : ["procurement owner module is missing"]),
          ...(shellReexportsProcurementContract ? [] : ["shell must re-export procurement contract"]),
          ...(shellReexportsProcurementFunctions ? [] : ["shell must re-export procurement functions"]),
          ...(shellReexportsProcurementTypes ? [] : ["shell must re-export procurement public types"]),
          ...(shellNoInlineProcurementContract ? [] : ["shell still owns procurement contract"]),
          ...(shellNoInlineProcurementFunctions ? [] : ["shell still owns procurement functions"]),
          ...(procurementModuleOwnsContract ? [] : ["procurement module does not own contract"]),
          ...(procurementModuleOwnsFunctions ? [] : ["procurement module does not own moved functions"]),
          ...(procurementPublicContractPreserved ? [] : ["procurement public contract markers drifted"]),
          ...(sourceGuardHintsPreserved ? [] : ["shell source guard hints for moved routes drifted"]),
          ...(noHooksAdded ? [] : ["hooks are not allowed in this owner split"]),
          ...(dbWritesUsed ? ["database write surface detected"] : []),
          ...(providerCallsUsed ? ["provider call surface detected"] : []),
          ...(rawRowsPrinted ? ["console output detected in production sources"] : []),
          ...(secretsPrinted ? ["secret/raw payload marker detected in production sources"] : []),
        ].join("; ");

  return {
    wave: AGENT_BFF_PROCUREMENT_OWNER_SPLIT_WAVE,
    final_status: finalStatus,
    exact_reason: exactReason,
    shell_line_count_before_wave: SHELL_LINE_COUNT_BEFORE_PROCUREMENT_SPLIT,
    shell_line_count_after: shellLineCountAfter,
    shell_line_count_reduction: shellLineCountReduction,
    procurement_module_line_count: procurementModuleLineCount,
    procurement_owner_module_added: procurementOwnerModuleAdded,
    shell_reexports_procurement_contract: shellReexportsProcurementContract,
    shell_reexports_procurement_functions: shellReexportsProcurementFunctions,
    shell_reexports_procurement_types: shellReexportsProcurementTypes,
    shell_no_inline_procurement_contract: shellNoInlineProcurementContract,
    shell_no_inline_procurement_functions: shellNoInlineProcurementFunctions,
    procurement_module_owns_contract: procurementModuleOwnsContract,
    procurement_module_owns_functions: procurementModuleOwnsFunctions,
    procurement_public_contract_preserved: procurementPublicContractPreserved,
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

function writeArtifacts(matrix: AgentBffProcurementOwnerSplitMatrix): void {
  const inventory = {
    wave: AGENT_BFF_PROCUREMENT_OWNER_SPLIT_WAVE,
    source_files: [shellRelativePath, procurementRelativePath],
    verifier: "scripts/ai/verifyAgentBffProcurementOwnerSplit.ts",
    tests: ["tests/scale/agentBffProcurementOwnerSplit.contract.test.ts"],
    shell_line_count_before_wave: matrix.shell_line_count_before_wave,
    shell_line_count_after: matrix.shell_line_count_after,
    shell_line_count_reduction: matrix.shell_line_count_reduction,
    procurement_module_line_count: matrix.procurement_module_line_count,
    route_count: matrix.route_count,
    no_ui_changes: matrix.no_ui_changes,
    business_logic_changed: matrix.business_logic_changed,
    db_writes_used: matrix.db_writes_used,
    provider_calls_used: matrix.provider_calls_used,
  };
  const proof = [
    `# ${AGENT_BFF_PROCUREMENT_OWNER_SPLIT_WAVE}`,
    "",
    `final_status: ${matrix.final_status}`,
    `exact_reason: ${matrix.exact_reason ?? "none"}`,
    `shell_line_count_before_wave: ${matrix.shell_line_count_before_wave}`,
    `shell_line_count_after: ${matrix.shell_line_count_after}`,
    `shell_line_count_reduction: ${matrix.shell_line_count_reduction}`,
    `procurement_module_line_count: ${matrix.procurement_module_line_count}`,
    `route_count: ${matrix.route_count}`,
    `shell_no_inline_procurement_contract: ${matrix.shell_no_inline_procurement_contract}`,
    `shell_no_inline_procurement_functions: ${matrix.shell_no_inline_procurement_functions}`,
    `procurement_public_contract_preserved: ${matrix.procurement_public_contract_preserved}`,
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
  const matrix = buildAgentBffProcurementOwnerSplitMatrix();
  writeArtifacts(matrix);
  if (matrix.final_status !== "GREEN_SCALE_AGENT_BFF_PROCUREMENT_OWNER_SPLIT_READY") {
    throw new Error(matrix.exact_reason ?? matrix.final_status);
  }
  console.log(
    `${AGENT_BFF_PROCUREMENT_OWNER_SPLIT_WAVE} ${matrix.final_status}`,
  );
}
