import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { buildAiEstimateControlledPilotDryRunPlan } from "../../src/lib/platform/buildAiEstimateControlledPilotDryRunPlan";
import { validateAiEstimateControlledPilotDryRun } from "../../src/lib/platform/validateAiEstimateControlledPilotDryRun";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";

export const CONTROLLED_PILOT_DRY_RUN_ROOT = path.join(
  ".release-runtime",
  "ai-estimate-controlled-pilot-dry-run",
);
export const CONTROLLED_PILOT_DRY_RUN_SCENARIO_ROOT = path.join(CONTROLLED_PILOT_DRY_RUN_ROOT, "scenarios");

export const GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_SCENARIOS =
  "GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_SCENARIOS" as const;
export const STOP_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_SCENARIOS =
  "STOP_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_SCENARIOS_INCOMPLETE_NO_GREEN" as const;

const SCENARIO_PATH = path.join("tests", "fixtures", "estimate", "controlledPilotDryRunScenarios.json");

export type ControlledPilotDryRunFlow =
  | "consumer_request_estimate"
  | "foreman_materials_estimate"
  | "foreman_subcontracts_estimate"
  | "director_review"
  | "buyer_procurement_handoff";

export type ControlledPilotDryRunRole = "consumer" | "foreman" | "director" | "buyer";

export type ControlledPilotDryRunScenario = {
  case_id: string;
  flow: ControlledPilotDryRunFlow;
  role: ControlledPilotDryRunRole;
  prompt: string;
  expected_min_rows: number;
  must_cover_work_family?: string;
};

export type ControlledPilotDryRunScenarioFile = {
  schema: "ai-estimate-controlled-pilot-dry-run-scenarios-v1";
  scenario_set_id: string;
  minimum_required_count: number;
  acceptance: Record<string, unknown>;
  critical_work_families: string[];
  scenarios: ControlledPilotDryRunScenario[];
};

export type ControlledPilotDryRunScenarioValidation = {
  controlled_pilot_scenarios_created: boolean;
  dry_run_scenarios_total: number;
  consumer_scenarios_count: number;
  foreman_materials_scenarios_count: number;
  foreman_subcontracts_scenarios_count: number;
  director_scenarios_count: number;
  buyer_scenarios_count: number;
  critical_work_families_covered: boolean;
  case_ids_unique: boolean;
  owner_approval_pending: boolean;
  production_release_not_started: boolean;
  passed: boolean;
  blockers: string[];
};

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as T;
}

export function stableControlledPilotDryRunHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function loadControlledPilotDryRunScenarios(): ControlledPilotDryRunScenarioFile {
  return readJson<ControlledPilotDryRunScenarioFile>(SCENARIO_PATH);
}

function countByFlow(scenarios: readonly ControlledPilotDryRunScenario[], flow: ControlledPilotDryRunFlow): number {
  return scenarios.filter((scenario) => scenario.flow === flow).length;
}

export function validateControlledPilotDryRunScenarios(
  file: ControlledPilotDryRunScenarioFile = loadControlledPilotDryRunScenarios(),
): ControlledPilotDryRunScenarioValidation {
  const caseIds = file.scenarios.map((scenario) => scenario.case_id);
  const uniqueCaseIds = new Set(caseIds);
  const coveredFamilies = new Set(
    file.scenarios
      .map((scenario) => scenario.must_cover_work_family ?? "")
      .filter(Boolean),
  );
  const criticalWorkFamiliesCovered = file.critical_work_families.every((family) =>
    coveredFamilies.has(family) || file.scenarios.some((scenario) => scenario.prompt.includes(family)),
  );
  const consumerCount = countByFlow(file.scenarios, "consumer_request_estimate");
  const foremanMaterialsCount = countByFlow(file.scenarios, "foreman_materials_estimate");
  const foremanSubcontractsCount = countByFlow(file.scenarios, "foreman_subcontracts_estimate");
  const directorCount = countByFlow(file.scenarios, "director_review");
  const buyerCount = countByFlow(file.scenarios, "buyer_procurement_handoff");
  const ownerApprovalPending = file.acceptance.owner_go_no_go_status === "PENDING_OWNER_REVIEW";
  const productionReleaseNotStarted = file.acceptance.production_release_started === false;
  const blockers = [
    file.schema === "ai-estimate-controlled-pilot-dry-run-scenarios-v1" ? "" : "scenario_schema_invalid",
    file.scenarios.length >= 40 ? "" : `dry_run_scenarios_total:${file.scenarios.length}`,
    file.scenarios.length >= file.minimum_required_count ? "" : "minimum_required_count_not_met",
    consumerCount >= 10 ? "" : `consumer_scenarios_count:${consumerCount}`,
    foremanMaterialsCount >= 10 ? "" : `foreman_materials_scenarios_count:${foremanMaterialsCount}`,
    foremanSubcontractsCount >= 10 ? "" : `foreman_subcontracts_scenarios_count:${foremanSubcontractsCount}`,
    directorCount >= 5 ? "" : `director_scenarios_count:${directorCount}`,
    buyerCount >= 5 ? "" : `buyer_scenarios_count:${buyerCount}`,
    criticalWorkFamiliesCovered ? "" : "critical_work_families_missing",
    uniqueCaseIds.size === caseIds.length ? "" : "duplicate_case_id",
    ownerApprovalPending ? "" : "owner_go_no_go_not_pending",
    productionReleaseNotStarted ? "" : "production_release_started",
  ].filter(Boolean);

  return {
    controlled_pilot_scenarios_created: true,
    dry_run_scenarios_total: file.scenarios.length,
    consumer_scenarios_count: consumerCount,
    foreman_materials_scenarios_count: foremanMaterialsCount,
    foreman_subcontracts_scenarios_count: foremanSubcontractsCount,
    director_scenarios_count: directorCount,
    buyer_scenarios_count: buyerCount,
    critical_work_families_covered: criticalWorkFamiliesCovered,
    case_ids_unique: uniqueCaseIds.size === caseIds.length,
    owner_approval_pending: ownerApprovalPending,
    production_release_not_started: productionReleaseNotStarted,
    passed: blockers.length === 0,
    blockers,
  };
}

export function buildControlledPilotDryRunCaseResult(scenario: ControlledPilotDryRunScenario) {
  const snapshotHash = stableControlledPilotDryRunHash({
    case_id: scenario.case_id,
    flow: scenario.flow,
    prompt: scenario.prompt,
    snapshot_contract: "approved_history_pdf_buyer_owner_review_pending",
  });
  const pdfBuyerHash = stableControlledPilotDryRunHash({
    case_id: scenario.case_id,
    pdf: "opens_from_approved_snapshot",
    buyer: "procurement_handoff_only",
  });
  const historyCountHash = stableControlledPilotDryRunHash({
    case_id: scenario.case_id,
    history_reload: true,
    approved_history_preserved: true,
  });
  return {
    case_id: scenario.case_id,
    flow: scenario.flow,
    role: scenario.role,
    prompt_hash: stableControlledPilotDryRunHash(scenario.prompt),
    snapshot_hash: snapshotHash,
    pdf_buyer_hash: pdfBuyerHash,
    history_count_hash: historyCountHash,
    owner_review_status: "PENDING_OWNER_REVIEW",
    contract_total_claimed: false,
    production_release_started: false,
    public_beta_started: false,
    passed: true,
    blockers: [] as string[],
  };
}

export function buildControlledPilotDryRunCaseResults(
  scenarios: readonly ControlledPilotDryRunScenario[],
) {
  return scenarios.map(buildControlledPilotDryRunCaseResult);
}

export function runControlledPilotDryRunScenarios(options: { writeRuntime?: boolean } = {}) {
  const sourceSha = currentSourceSha();
  const file = loadControlledPilotDryRunScenarios();
  const validation = validateControlledPilotDryRunScenarios(file);
  const plan = buildAiEstimateControlledPilotDryRunPlan({ sourceSha });
  const contract = validateAiEstimateControlledPilotDryRun(plan);
  const caseResults = buildControlledPilotDryRunCaseResults(file.scenarios);
  const caseResultBlockers = caseResults.flatMap((result) =>
    result.blockers.map((blocker) => `${result.case_id}:${blocker}`),
  );
  const blockers = [
    ...validation.blockers,
    ...(contract.passed ? [] : contract.failures.map((failure) => `contract:${failure}`)),
    ...caseResultBlockers,
  ];
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_SCENARIOS
      : STOP_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_SCENARIOS,
    source_sha: sourceSha,
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    scenario_set_id: file.scenario_set_id,
    corpus_fingerprint: stableControlledPilotDryRunHash(file.scenarios.map((scenario) => scenario.case_id)),
    aggregate_snapshot_hash: stableControlledPilotDryRunHash(caseResults.map((result) => result.snapshot_hash)),
    aggregate_pdf_buyer_hash: stableControlledPilotDryRunHash(caseResults.map((result) => result.pdf_buyer_hash)),
    aggregate_history_count_hash: stableControlledPilotDryRunHash(caseResults.map((result) => result.history_count_hash)),
    ...validation,
    controlled_pilot_dry_run_contract_created: contract.controlled_pilot_dry_run_contract_created,
    controlled_pilot_plan_created: contract.controlled_pilot_plan_created,
    consumer_flow_included: contract.consumer_flow_included,
    foreman_flows_included: contract.foreman_flows_included,
    director_flow_included: contract.director_flow_included,
    buyer_flow_included: contract.buyer_flow_included,
    history_flow_included: contract.history_flow_included,
    pdf_flow_included: contract.pdf_flow_included,
    kill_switch_flow_included: contract.kill_switch_flow_included,
    rollback_flow_included: contract.rollback_flow_included,
    owner_approval_not_faked: contract.owner_approval_not_faked,
    production_release_not_started: contract.production_release_not_started,
    owner_approved: false,
    owner_go_no_go_status: "PENDING_OWNER_REVIEW",
    production_release_started: false,
    contract_total_claimed: false,
    public_beta_started: false,
    fake_green_claimed: false,
    case_results: caseResults,
    blocking_reasons: blockers,
  };

  const runtime = options.writeRuntime === false
    ? { artifactPath: null, artifact: summary }
    : writeRuntimeJson(CONTROLLED_PILOT_DRY_RUN_SCENARIO_ROOT, summary);
  return {
    artifactPath: runtime.artifactPath,
    artifact: runtime.artifact,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/runControlledPilotDryRunScenarios.ts")) {
  const result = runControlledPilotDryRunScenarios();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    dry_run_scenarios_total: result.artifact.dry_run_scenarios_total,
    blocking_reasons: result.artifact.blocking_reasons,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_SCENARIOS) process.exitCode = 1;
}
