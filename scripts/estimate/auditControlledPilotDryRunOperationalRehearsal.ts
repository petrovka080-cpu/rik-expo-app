import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  newestSummary,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";
import {
  GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_ANDROID_SMOKE,
} from "../e2e/runControlledPilotDryRunAndroidSmoke";
import {
  GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_ANDROID_PARITY,
} from "../e2e/runControlledPilotDryRunWebAndroidParity";
import {
  GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_SMOKE,
} from "../e2e/runControlledPilotDryRunWebSmoke";
import {
  CONTROLLED_PILOT_DRY_RUN_ROOT,
  CONTROLLED_PILOT_DRY_RUN_SCENARIO_ROOT,
  GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_SCENARIOS,
} from "./runControlledPilotDryRunScenarios";
import {
  EVIDENCE_HYGIENE_ROOT,
  GREEN_AI_ESTIMATE_EVIDENCE_HYGIENE,
} from "./auditAiEstimateEvidenceHygiene";
import {
  CONTROLLED_PILOT_KILL_SWITCH_ROOT,
  GREEN_AI_ESTIMATE_CONTROLLED_PILOT_KILL_SWITCH_REHEARSAL,
} from "./rehearseAiEstimateKillSwitch";
import {
  CONTROLLED_PILOT_ROLLBACK_ROOT,
  GREEN_AI_ESTIMATE_CONTROLLED_PILOT_ROLLBACK_REHEARSAL,
} from "./rehearseAiEstimatePilotRollback";
import {
  CONTROLLED_PILOT_TELEMETRY_ROOT,
  GREEN_AI_ESTIMATE_CONTROLLED_PILOT_TELEMETRY_DRY_RUN,
} from "./auditAiEstimatePilotTelemetryDryRun";

export const GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_OPERATIONAL_REHEARSAL =
  "GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_OPERATIONAL_REHEARSAL_READY_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_OPERATIONAL_REHEARSAL =
  "STOP_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_OPERATIONAL_REHEARSAL_INCOMPLETE_NO_GREEN" as const;

const WEB_ROOT = path.join(CONTROLLED_PILOT_DRY_RUN_ROOT, "web");
const ANDROID_ROOT = path.join(CONTROLLED_PILOT_DRY_RUN_ROOT, "android-chrome");
const PARITY_ROOT = path.join(CONTROLLED_PILOT_DRY_RUN_ROOT, "web-android-parity");

type SummaryLike = Record<string, unknown>;

const CONTROLLED_PILOT_ALLOWED_DELTA_PREFIXES = [
  "docs/ai-estimate-owner-review/",
  "package.json",
  "scripts/e2e/",
  "scripts/estimate/",
  "src/features/consumerRepair/",
  "src/features/estimates/",
  "src/features/foreman/",
  "src/features/pdf/",
  "src/features/procurement/",
  "src/features/requests/",
  "src/lib/consumerRequests/",
  "src/lib/estimate/",
  "src/lib/foreman/",
  "src/lib/platform/",
  "tests/architecture/",
  "tests/consumerRepair/",
  "tests/estimateInfrastructure/",
  "tests/estimateRuntime/",
  "tests/foreman/",
  "tests/officeEstimate/",
  "tests/requestEstimate/",
  "scripts/estimate/auditAiEstimateEvidenceHygiene.ts",
  "scripts/estimate/auditAiEstimatePilotTelemetryDryRun.ts",
  "scripts/estimate/auditControlledPilotDryRunOperationalRehearsal.ts",
  "scripts/estimate/rehearseAiEstimateKillSwitch.ts",
  "scripts/estimate/rehearseAiEstimatePilotRollback.ts",
  "scripts/estimate/runControlledPilotDryRunScenarios.ts",
  "scripts/e2e/runControlledPilotDryRunAndroidSmoke.ts",
  "scripts/e2e/runControlledPilotDryRunWebAndroidParity.ts",
  "scripts/e2e/runControlledPilotDryRunWebSmoke.ts",
  "src/lib/platform/aiEstimateControlledPilotDryRunContract.ts",
  "src/lib/platform/aiEstimateEvidenceHygienePolicy.ts",
  "src/lib/platform/buildAiEstimateControlledPilotDryRunPlan.ts",
  "src/lib/platform/validateAiEstimateControlledPilotDryRun.ts",
  "tests/fixtures/estimate/controlledPilotDryRunScenarios.json",
  "tests/estimateInfrastructure/controlledPilotDryRunContract.test.ts",
  "tests/estimateInfrastructure/controlledPilotKillSwitch.contract.test.ts",
  "tests/estimateInfrastructure/controlledPilotRollback.contract.test.ts",
  "tests/estimateInfrastructure/controlledPilotTelemetry.contract.test.ts",
  "tests/estimateInfrastructure/evidenceHygiene.contract.test.ts",
  "tests/consumerRepair/controlledPilotConsumerFlow.contract.test.ts",
  "tests/foreman/controlledPilotForemanFlow.contract.test.ts",
  "tests/officeEstimate/controlledPilotDirectorBuyerFlow.contract.test.ts",
  "tests/architecture/controlledPilotNoReleaseNoProdDb.contract.test.ts",
] as const;

const FORBIDDEN_TOUCH_PATTERNS = [
  /(^|\/)marketplace(\/|$)/i,
  /(^|\/)rfq(\/|$)/i,
  /(^|\/)warehouse(\/|$)/i,
  /(^|\/)payment(\/|$)/i,
  /(^|\/)android\/app\/build(\/|$)/i,
  /(^|\/)ios(\/|$)/i,
  /(^|\/)dist(\/|$)/i,
] as const;

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function finalStatus(summary: SummaryLike | null | undefined): string {
  return String(summary?.final_status ?? "");
}

function sourceSha(summary: SummaryLike | null | undefined): string {
  return String(summary?.source_sha ?? "");
}

function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return fallback;
  }
}

function gitSucceeds(args: string[]): boolean {
  try {
    execFileSync("git", args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function controlledPilotOnlyDeltaAllowed(summarySourceSha: string, head: string): boolean {
  if (!/^[0-9a-f]{7,40}$/i.test(summarySourceSha)) return false;
  if (summarySourceSha === head) return true;
  if (!gitSucceeds(["merge-base", "--is-ancestor", summarySourceSha, head])) return false;
  const changed = gitOutput(["diff", "--name-only", `${summarySourceSha}..${head}`])
    .split(/\r?\n/)
    .map((item) => normalizePath(item.trim()))
    .filter(Boolean);
  return changed.length > 0 && changed.every((file) =>
    CONTROLLED_PILOT_ALLOWED_DELTA_PREFIXES.some((prefix) => file.startsWith(prefix)),
  );
}

function latestGreen(root: string, marker: string): { path: string; summary: SummaryLike } | null {
  return newestSummary<SummaryLike>(root, (summary) => finalStatus(summary) === marker);
}

function latestGreenIncludes(root: string, marker: string): { path: string; summary: SummaryLike } | null {
  return newestSummary<SummaryLike>(root, (summary) => finalStatus(summary).includes(marker));
}

function summaryAccepted(summary: SummaryLike | null | undefined, head: string): boolean {
  return Boolean(summary && finalStatus(summary).startsWith("GREEN") && controlledPilotOnlyDeltaAllowed(sourceSha(summary), head));
}

function exactCurrentSummary(summary: SummaryLike | null | undefined, marker: string, head: string): boolean {
  return Boolean(summary && finalStatus(summary) === marker && sourceSha(summary) === head);
}

function gateFlag(name: string): boolean {
  return hasFlag(name);
}

function gitStatusPorcelain(): string {
  return gitOutput(["status", "--porcelain=v1", "--untracked-files=all"]);
}

function changedPaths(): string[] {
  const unstaged = gitOutput(["diff", "--name-only"])
    .split(/\r?\n/)
    .map((item) => normalizePath(item.trim()))
    .filter(Boolean);
  const staged = gitOutput(["diff", "--cached", "--name-only"])
    .split(/\r?\n/)
    .map((item) => normalizePath(item.trim()))
    .filter(Boolean);
  const untracked = gitOutput(["ls-files", "--others", "--exclude-standard"])
    .split(/\r?\n/)
    .map((item) => normalizePath(item.trim()))
    .filter(Boolean);
  return [...new Set([...unstaged, ...staged, ...untracked])];
}

function scopeDirtyOnly(paths: readonly string[]): boolean {
  return paths.every((file) =>
    CONTROLLED_PILOT_ALLOWED_DELTA_PREFIXES.some((prefix) => file.startsWith(prefix)),
  );
}

function forbiddenTouched(paths: readonly string[]): Record<string, boolean> {
  const touched = (pattern: RegExp) => paths.some((file) => pattern.test(file));
  return {
    marketplace_touched: touched(FORBIDDEN_TOUCH_PATTERNS[0]),
    rfq_touched: touched(FORBIDDEN_TOUCH_PATTERNS[1]),
    warehouse_touched: touched(FORBIDDEN_TOUCH_PATTERNS[2]),
    payment_touched: touched(FORBIDDEN_TOUCH_PATTERNS[3]),
    native_outputs_touched: paths.some((file) =>
      FORBIDDEN_TOUCH_PATTERNS.slice(4).some((pattern) => pattern.test(file)),
    ),
  };
}

export function auditControlledPilotDryRunOperationalRehearsal() {
  const head = currentSourceSha();
  const branch = currentBranch();
  const upstreamSync = currentUpstreamSync();
  const status = gitStatusPorcelain();
  const paths = changedPaths();
  const worktreeClean = status.length === 0;
  const worktreeCleanOrScopeDirtyOnly = worktreeClean || scopeDirtyOnly(paths);
  const forbidden = forbiddenTouched(paths);

  const prerequisites = {
    foreman_sync: latestGreenIncludes(
      path.join(".release-runtime", "ai-estimate-foreman-materials-subcontracts-sync"),
      "GREEN_AI_ESTIMATE_FOREMAN_MATERIALS_SUBCONTRACTS_SYNCED",
    ),
    platform_core_scale: latestGreenIncludes(
      path.join(".release-runtime", "ai-estimate-platform-core-scale-seal"),
      "GREEN_AI_ESTIMATE_PLATFORM_CORE_SCALE_SEAL",
    ),
    replayable_core: latestGreenIncludes(
      path.join(".release-runtime", "ai-estimate-replayable-core"),
      "GREEN_AI_ESTIMATE_REPLAYABLE_CORE_DRIFT_GUARD",
    ),
    trusted_costing: latestGreenIncludes(
      path.join(".release-runtime", "ai-estimate-trusted-costing-pricebook"),
      "GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK",
    ),
    approved_history: latestGreenIncludes(
      path.join(".release-runtime", "ai-estimate-performance-slo-scale-seal", "approved-history-scale"),
      "GREEN_AI_ESTIMATE_APPROVED_HISTORY_SCALE_PERFORMANCE",
    ) ?? latestGreenIncludes(
      path.join(".release-runtime", "ai-estimate-approved-history-scaling"),
      "GREEN_AI_ESTIMATE_APPROVED_HISTORY",
    ),
    material_quantity: latestGreenIncludes(
      path.join(".release-runtime", "ai-estimate-material-quantity-accuracy"),
      "GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY",
    ),
    owner_review: latestGreen(
      path.join(".release-runtime", "ai-estimate-owner-review-pilot-operating-system"),
      "GREEN_AI_ESTIMATE_OWNER_REVIEW_PILOT_OPERATING_SYSTEM_READY_NO_RELEASE",
    ),
  };

  const scenario = latestGreen(CONTROLLED_PILOT_DRY_RUN_SCENARIO_ROOT, GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_SCENARIOS);
  const web = latestGreen(WEB_ROOT, GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_SMOKE);
  const android = latestGreen(ANDROID_ROOT, GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_ANDROID_SMOKE);
  const parity = latestGreen(PARITY_ROOT, GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_ANDROID_PARITY);
  const killSwitch = latestGreen(CONTROLLED_PILOT_KILL_SWITCH_ROOT, GREEN_AI_ESTIMATE_CONTROLLED_PILOT_KILL_SWITCH_REHEARSAL);
  const rollback = latestGreen(CONTROLLED_PILOT_ROLLBACK_ROOT, GREEN_AI_ESTIMATE_CONTROLLED_PILOT_ROLLBACK_REHEARSAL);
  const telemetry = latestGreen(CONTROLLED_PILOT_TELEMETRY_ROOT, GREEN_AI_ESTIMATE_CONTROLLED_PILOT_TELEMETRY_DRY_RUN);
  const hygiene = latestGreen(EVIDENCE_HYGIENE_ROOT, GREEN_AI_ESTIMATE_EVIDENCE_HYGIENE);
  const ownerReviewPrerequisitesCovered =
    summaryAccepted(prerequisites.owner_review?.summary, head) &&
    prerequisites.owner_review?.summary.required_dependencies_checked === true &&
    prerequisites.owner_review?.summary.stale_required_green_rejected === true;

  const sourceGates = {
    targeted_controlled_pilot_tests_passed: gateFlag("targeted-controlled-pilot-tests-passed"),
    typecheck_passed: gateFlag("typecheck-passed"),
    lint_passed: gateFlag("lint-passed"),
    diff_check_passed: gateFlag("diff-check-passed"),
    no_test_weakening_passed: gateFlag("no-test-weakening-passed"),
    web_public_smoke_passed: gateFlag("web-public-smoke-passed"),
    ci_office_market_passed: gateFlag("ci-office-market-passed"),
    secret_scan_passed: gateFlag("secret-scan-passed"),
  };

  const prerequisiteBooleans = {
    foreman_sync_green_found: ownerReviewPrerequisitesCovered || summaryAccepted(prerequisites.foreman_sync?.summary, head),
    platform_core_scale_green_found: ownerReviewPrerequisitesCovered ||
      summaryAccepted(prerequisites.platform_core_scale?.summary, head),
    replayable_core_green_found: ownerReviewPrerequisitesCovered || summaryAccepted(prerequisites.replayable_core?.summary, head),
    trusted_costing_green_found: ownerReviewPrerequisitesCovered || summaryAccepted(prerequisites.trusted_costing?.summary, head),
    approved_history_green_found: ownerReviewPrerequisitesCovered || summaryAccepted(prerequisites.approved_history?.summary, head),
    material_quantity_green_found: ownerReviewPrerequisitesCovered ||
      summaryAccepted(prerequisites.material_quantity?.summary, head),
    owner_review_green_found: summaryAccepted(prerequisites.owner_review?.summary, head),
  };

  const webPassed = exactCurrentSummary(web?.summary, GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_SMOKE, head) &&
    web?.summary.actual_web_browser_controlled_pilot_dry_run_passed === true &&
    web?.summary.web_dry_run_cases_passed === "40/40" &&
    Number(web?.summary.web_console_errors_count ?? -1) === 0;
  const androidPassed = exactCurrentSummary(android?.summary, GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_ANDROID_SMOKE, head) &&
    android?.summary.actual_android_emulator_controlled_pilot_dry_run_passed === true &&
    android?.summary.android_dry_run_cases_passed === "40/40" &&
    Number(android?.summary.android_console_errors_count ?? -1) === 0 &&
    android?.summary.android_emulator_health_degraded === false;
  const parityPassed = exactCurrentSummary(parity?.summary, GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_ANDROID_PARITY, head) &&
    parity?.summary.web_android_snapshot_hash_parity === true &&
    parity?.summary.web_android_pdf_buyer_parity === true &&
    parity?.summary.web_android_history_count_parity === true;

  const blockers = [
    branch === "release/ios-after-build48-integration" ? "" : `branch:${branch}`,
    upstreamSync === "0 0" ? "" : `upstream_sync:${upstreamSync}`,
    worktreeCleanOrScopeDirtyOnly ? "" : "STOP_UNRELATED_DIRTY_WORKTREE_BEFORE_CONTROLLED_PILOT_DRY_RUN",
    Object.values(forbidden).some(Boolean) ? "forbidden_area_touched" : "",
    Object.values(prerequisiteBooleans).every(Boolean)
      ? ""
      : "STOP_CONTROLLED_PILOT_DRY_RUN_BLOCKED_BY_STALE_REQUIRED_LAYER",
    exactCurrentSummary(scenario?.summary, GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_SCENARIOS, head)
      ? ""
      : "controlled_pilot_scenarios_missing_or_stale",
    webPassed ? "" : web ? "web_dry_run_smoke_failed_or_stale" : "web_dry_run_smoke_missing",
    androidPassed ? "" : android ? "android_dry_run_smoke_failed_or_stale" : "android_dry_run_smoke_missing",
    parityPassed ? "" : parity ? "web_android_parity_failed_or_stale" : "web_android_parity_missing",
    exactCurrentSummary(killSwitch?.summary, GREEN_AI_ESTIMATE_CONTROLLED_PILOT_KILL_SWITCH_REHEARSAL, head)
      ? ""
      : "kill_switch_rehearsal_missing_or_stale",
    exactCurrentSummary(rollback?.summary, GREEN_AI_ESTIMATE_CONTROLLED_PILOT_ROLLBACK_REHEARSAL, head)
      ? ""
      : "rollback_rehearsal_missing_or_stale",
    exactCurrentSummary(telemetry?.summary, GREEN_AI_ESTIMATE_CONTROLLED_PILOT_TELEMETRY_DRY_RUN, head)
      ? ""
      : "pilot_telemetry_dry_run_missing_or_stale",
    exactCurrentSummary(hygiene?.summary, GREEN_AI_ESTIMATE_EVIDENCE_HYGIENE, head)
      ? ""
      : "evidence_hygiene_missing_or_stale",
    ...Object.entries(sourceGates).map(([key, value]) => (value ? "" : key)),
  ].filter(Boolean);

  const green = blockers.length === 0;
  const summary = {
    final_status: green
      ? GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_OPERATIONAL_REHEARSAL
      : STOP_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_OPERATIONAL_REHEARSAL,
    source_sha: head,
    branch,
    upstream_sync: upstreamSync,
    generated_at: new Date().toISOString(),
    worktree_clean: worktreeClean,
    worktree_clean_or_scope_dirty_only: worktreeCleanOrScopeDirtyOnly,
    controlled_pilot_dry_run_ready: green,
    owner_review_prerequisites_covered: ownerReviewPrerequisitesCovered,
    owner_approved: false,
    owner_go_no_go_status: "PENDING_OWNER_REVIEW",
    production_release_started: false,
    contract_total_claimed: false,
    public_beta_started: false,

    ...prerequisiteBooleans,

    dry_run_scenarios_total: String(scenario?.summary.dry_run_scenarios_total ?? "0"),
    consumer_flow_passed: scenario?.summary.consumer_flow_included === true && web?.summary.web_consumer_flow_passed === true,
    foreman_materials_flow_passed: scenario?.summary.foreman_flows_included === true && web?.summary.web_foreman_materials_flow_passed === true,
    foreman_subcontracts_flow_passed: scenario?.summary.foreman_flows_included === true && web?.summary.web_foreman_subcontracts_flow_passed === true,
    director_flow_passed: scenario?.summary.director_flow_included === true && web?.summary.web_director_flow_passed === true,
    buyer_flow_passed: scenario?.summary.buyer_flow_included === true && web?.summary.web_buyer_flow_passed === true,
    history_flow_passed: web?.summary.web_history_reload_passed === true,
    pdf_flow_passed: web?.summary.web_pdf_open_passed === true,

    actual_web_browser_controlled_pilot_dry_run_passed: webPassed,
    web_dry_run_cases_passed: String(web?.summary.web_dry_run_cases_passed ?? "0/40"),
    web_console_errors_count: Number(web?.summary.web_console_errors_count ?? -1),

    actual_android_emulator_controlled_pilot_dry_run_passed: androidPassed,
    android_dry_run_cases_passed: String(android?.summary.android_dry_run_cases_passed ?? "0/40"),
    android_console_errors_count: Number(android?.summary.android_console_errors_count ?? -1),

    web_android_snapshot_hash_parity: parity?.summary.web_android_snapshot_hash_parity === true,
    web_android_pdf_buyer_parity: parity?.summary.web_android_pdf_buyer_parity === true,
    web_android_history_count_parity: parity?.summary.web_android_history_count_parity === true,

    kill_switch_rehearsal_passed: killSwitch?.summary.kill_switch_rehearsal_created === true,
    rollback_rehearsal_passed: rollback?.summary.rollback_rehearsal_created === true,
    pilot_telemetry_dry_run_passed: telemetry?.summary.pilot_telemetry_dry_run_created === true,
    evidence_hygiene_passed: hygiene?.summary.evidence_hygiene_policy_created === true,

    ...sourceGates,

    marketplace_touched: forbidden.marketplace_touched,
    rfq_touched: forbidden.rfq_touched,
    warehouse_touched: forbidden.warehouse_touched,
    payment_touched: forbidden.payment_touched,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    fake_green_claimed: false,

    scenario_summary_path: scenario?.path ?? null,
    web_summary_path: web?.path ?? null,
    android_summary_path: android?.path ?? null,
    parity_summary_path: parity?.path ?? null,
    kill_switch_summary_path: killSwitch?.path ?? null,
    rollback_summary_path: rollback?.path ?? null,
    telemetry_summary_path: telemetry?.path ?? null,
    evidence_hygiene_summary_path: hygiene?.path ?? null,
    changed_paths: paths,
    blocking_reasons: blockers,
  };

  const result = writeRuntimeJson(CONTROLLED_PILOT_DRY_RUN_ROOT, summary);
  return { artifactPath: result.artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditControlledPilotDryRunOperationalRehearsal.ts")) {
  const result = auditControlledPilotDryRunOperationalRehearsal();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    source_sha: result.artifact.source_sha,
    branch: result.artifact.branch,
    upstream_sync: result.artifact.upstream_sync,
    blocking_reasons: result.artifact.blocking_reasons,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_OPERATIONAL_REHEARSAL) {
    process.exitCode = 1;
  }
}
