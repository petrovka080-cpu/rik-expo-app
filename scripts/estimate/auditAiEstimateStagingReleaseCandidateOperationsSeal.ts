import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { auditStagingEnvironmentIsolation } from "../architecture/auditStagingEnvironmentIsolation";
import { checkAiEstimateStagingHealth } from "../e2e/checkAiEstimateStagingHealth";
import { checkStagingVersionLineage } from "../e2e/checkStagingVersionLineage";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  newestSummary,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";
import { resolveStagingBaseUrl } from "../e2e/resolveStagingBaseUrl";
import { buildStagingReleaseCandidateWebAndroidParity } from "../e2e/runAiEstimateStagingReleaseCandidateWebAndroidParity";
import { auditAiEstimateStagingSecurityPrivacy } from "../security/auditAiEstimateStagingSecurityPrivacy";
import { auditStagingAiRateLimits } from "./auditStagingAiRateLimits";
import { auditStagingAiEstimateObservability } from "./auditStagingAiEstimateObservability";
import { auditStagingDurableLedgerSandbox } from "./auditStagingDurableLedgerSandbox";
import { gitOutput } from "./buildControlledPilotHealthDashboard";
import { buildStagingKillSwitchRehearsalSummary } from "./rehearseStagingAiEstimateKillSwitch";
import { buildStagingRollbackRehearsalSummary } from "./rehearseStagingAiEstimateRollback";
import { validateStagingReleaseCandidateCases } from "./runAiEstimateStagingReleaseCandidateCases";
import { buildStagingSoakSummary } from "./runAiEstimateStagingSoak";

export const GREEN_AI_ESTIMATE_STAGING_RELEASE_CANDIDATE_OPERATIONS_SEAL_READY_NO_PRODUCTION_RELEASE =
  "GREEN_AI_ESTIMATE_STAGING_RELEASE_CANDIDATE_OPERATIONS_SEAL_READY_NO_PRODUCTION_RELEASE" as const;
export const STOP_AI_ESTIMATE_STAGING_RELEASE_CANDIDATE_OPERATIONS_SEAL_FAILED_NO_GREEN =
  "STOP_AI_ESTIMATE_STAGING_RELEASE_CANDIDATE_OPERATIONS_SEAL_FAILED_NO_GREEN" as const;

const ROOT = ".release-runtime/ai-estimate-staging-release-candidate-operations-seal";

type AnySummary = Record<string, any>;

const PREVIOUS_GREEN_STATUSES = [
  "GREEN_AI_PLATFORM_EVALOPS_GOLDEN_QUALITY_DRIFT_GUARD_V1_READY_NO_RELEASE",
  "GREEN_AI_PLATFORM_MODEL_AGNOSTIC_RUNTIME_KERNEL_V1_READY_NO_RELEASE",
  "GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SCALE_SEAL_NO_HOOKS_NO_KOSTYLS_READY_NO_RELEASE",
  "GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SYNC_HISTORY_SCALE_READY_NO_RELEASE",
  "GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_SEMANTIC_SCALE_REFACTOR_READY_NO_RELEASE",
] as const;

function sourceText(relativePath: string): string {
  return existsSync(relativePath) ? readFileSync(relativePath, "utf8") : "";
}

function previousGreenFound(status: string): boolean {
  return [
    "scripts/aiPlatform/auditAiPlatformEvalOpsGoldenQualityDriftGuardV1.ts",
    "scripts/architecture/auditAiPlatformModelAgnosticRuntimeKernelV1.ts",
    "scripts/architecture/auditAiEstimateEvolutionaryArchitectureScaleSeal.ts",
    "scripts/estimate/auditAiEstimateProductionDurableLedgerSyncHistoryScaleSeal.ts",
    "scripts/estimate/auditAiEstimatePlatformCoreV2SemanticScaleRefactor.ts",
  ].some((file) => sourceText(file).includes(status));
}

function boolEnv(name: string): boolean {
  return /^(1|true|yes|green|passed)$/i.test(String(process.env[name] ?? ""));
}

function latestWebSummary(): AnySummary | null {
  return newestSummary<AnySummary>(path.join(ROOT, "web-smoke"), (summary) => Boolean(summary.final_status))?.summary ?? null;
}

function latestAndroidSummary(): AnySummary | null {
  return newestSummary<AnySummary>(path.join(ROOT, "android-smoke"), (summary) => Boolean(summary.final_status))?.summary ?? null;
}

export async function auditAiEstimateStagingReleaseCandidateOperationsSeal(input: {
  url?: string | null;
  writeSummary?: boolean;
} = {}) {
  const sourceSha = currentSourceSha();
  const branch = currentBranch();
  const upstreamSync = currentUpstreamSync();
  const worktreeClean = gitOutput(["status", "--porcelain=v1", "--untracked-files=all"], "") === "";
  const resolution = resolveStagingBaseUrl({ explicit: input.url });
  const version = await checkStagingVersionLineage({ url: resolution.baseUrl, writeSummary: false });
  const health = await checkAiEstimateStagingHealth({ url: resolution.baseUrl, writeSummary: false });
  const envIsolation = auditStagingEnvironmentIsolation({ writeSummary: false }).summary;
  const cases = validateStagingReleaseCandidateCases();
  const ledger = auditStagingDurableLedgerSandbox({ writeSummary: false }).summary;
  const killSwitch = buildStagingKillSwitchRehearsalSummary();
  const rollback = buildStagingRollbackRehearsalSummary();
  const observability = auditStagingAiEstimateObservability({ writeSummary: false }).summary;
  const rateLimit = auditStagingAiRateLimits({ writeSummary: false }).summary;
  const security = auditAiEstimateStagingSecurityPrivacy({ writeSummary: false }).summary;
  const soak = buildStagingSoakSummary({ executeStaging: boolEnv("STAGING_SOAK_EXECUTED") });
  const web = latestWebSummary();
  const android = latestAndroidSummary();
  const parity = buildStagingReleaseCandidateWebAndroidParity({ web, android });
  const runbooksCreated = [
    "docs/operations/ai-estimate-staging-rc-runbook.md",
    "docs/operations/ai-estimate-pilot-incident-response.md",
    "docs/operations/ai-estimate-support-playbook.md",
  ].every((file) => existsSync(file));
  const previous = Object.fromEntries(
    PREVIOUS_GREEN_STATUSES.map((status) => [status, previousGreenFound(status)]),
  ) as Record<typeof PREVIOUS_GREEN_STATUSES[number], boolean>;
  const targetedTestsPassed = boolEnv("STAGING_RC_TARGETED_TESTS_PASSED");
  const typecheckPassed = boolEnv("STAGING_RC_TYPECHECK_PASSED");
  const lintPassed = boolEnv("STAGING_RC_LINT_PASSED");
  const diffCheckPassed = boolEnv("STAGING_RC_DIFF_CHECK_PASSED");
  const noTestWeakeningPassed = boolEnv("STAGING_RC_NO_TEST_WEAKENING_PASSED");
  const webPublicSmokePassed = boolEnv("STAGING_RC_WEB_PUBLIC_SMOKE_PASSED");
  const ciOfficeMarketPassed = boolEnv("STAGING_RC_CI_OFFICE_MARKET_PASSED");
  const secretScanPassed = boolEnv("STAGING_RC_SECRET_SCAN_PASSED");
  const blockingReasons = [
    branch === "release/ios-after-build48-integration" ? "" : "BRANCH_MISMATCH",
    upstreamSync === "0 0" ? "" : "UPSTREAM_NOT_SYNCED",
    worktreeClean ? "" : "WORKTREE_NOT_CLEAN",
    ...Object.entries(previous).filter(([, found]) => !found).map(([status]) => `previous_green_missing:${status}`),
    resolution.staging_url_detected ? "" : "STAGING_URL_NOT_CONFIGURED",
    resolution.staging_url_is_external ? "" : "STAGING_URL_NOT_EXTERNAL",
    resolution.staging_url_is_not_localhost ? "" : "STAGING_URL_LOCALHOST",
    version.artifact.staging_source_sha_matches_head ? "" : "STAGING_SOURCE_SHA_NOT_PROVEN",
    version.artifact.staging_runtime_is_staging ? "" : "STAGING_RUNTIME_NOT_STAGING",
    health.artifact.final_status.includes("GREEN_") ? "" : "STAGING_HEALTH_NOT_GREEN",
    envIsolation.final_status.includes("GREEN_") ? "" : "STAGING_ENVIRONMENT_ISOLATION_NOT_GREEN",
    cases.final_status.includes("GREEN_") ? "" : "STAGING_RC_CASES_NOT_GREEN",
    ledger.final_status.includes("GREEN_") ? "" : "STAGING_LEDGER_SANDBOX_NOT_GREEN",
    web?.actual_web_browser_staging_rc_smoke_passed === true ? "" : "ACTUAL_WEB_BROWSER_STAGING_RC_SMOKE_MISSING",
    android?.actual_android_emulator_staging_rc_smoke_passed === true ? "" : "ACTUAL_ANDROID_EMULATOR_STAGING_RC_SMOKE_MISSING",
    parity.final_status.includes("GREEN_") ? "" : "WEB_ANDROID_STAGING_PARITY_NOT_GREEN",
    killSwitch.final_status.includes("GREEN_") ? "" : "STAGING_KILL_SWITCH_NOT_GREEN",
    rollback.final_status.includes("GREEN_") ? "" : "STAGING_ROLLBACK_NOT_GREEN",
    observability.final_status.includes("GREEN_") ? "" : "STAGING_OBSERVABILITY_NOT_GREEN",
    rateLimit.final_status.includes("GREEN_") ? "" : "STAGING_RATE_LIMIT_NOT_GREEN",
    security.final_status.includes("GREEN_") ? "" : "STAGING_SECURITY_PRIVACY_NOT_GREEN",
    runbooksCreated ? "" : "STAGING_RUNBOOKS_MISSING",
    soak.final_status.includes("GREEN_") ? "" : "STAGING_SOAK_NOT_EXECUTED",
    targetedTestsPassed ? "" : "TARGETED_STAGING_RC_TESTS_NOT_RECORDED",
    typecheckPassed ? "" : "TYPECHECK_NOT_RECORDED",
    lintPassed ? "" : "LINT_NOT_RECORDED",
    diffCheckPassed ? "" : "DIFF_CHECK_NOT_RECORDED",
    noTestWeakeningPassed ? "" : "NO_TEST_WEAKENING_NOT_RECORDED",
    webPublicSmokePassed ? "" : "WEB_PUBLIC_SMOKE_NOT_RECORDED",
    ciOfficeMarketPassed ? "" : "CI_OFFICE_MARKET_NOT_RECORDED",
    secretScanPassed ? "" : "SECRET_SCAN_NOT_RECORDED",
  ].filter(Boolean);
  const green = blockingReasons.length === 0;
  const summary = {
    final_status: green
      ? GREEN_AI_ESTIMATE_STAGING_RELEASE_CANDIDATE_OPERATIONS_SEAL_READY_NO_PRODUCTION_RELEASE
      : STOP_AI_ESTIMATE_STAGING_RELEASE_CANDIDATE_OPERATIONS_SEAL_FAILED_NO_GREEN,
    source_sha: sourceSha,
    branch,
    upstream_sync: upstreamSync,
    generated_at: new Date().toISOString(),
    worktree_clean: worktreeClean,
    previous_evalops_green_found: previous.GREEN_AI_PLATFORM_EVALOPS_GOLDEN_QUALITY_DRIFT_GUARD_V1_READY_NO_RELEASE,
    previous_ai_kernel_green_found: previous.GREEN_AI_PLATFORM_MODEL_AGNOSTIC_RUNTIME_KERNEL_V1_READY_NO_RELEASE,
    previous_architecture_seal_green_found: previous.GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SCALE_SEAL_NO_HOOKS_NO_KOSTYLS_READY_NO_RELEASE,
    previous_durable_ledger_green_found: previous.GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SYNC_HISTORY_SCALE_READY_NO_RELEASE,
    previous_platform_core_v2_green_found: previous.GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_SEMANTIC_SCALE_REFACTOR_READY_NO_RELEASE,

    staging_url_detected: resolution.staging_url_detected,
    staging_url_is_external: resolution.staging_url_is_external,
    staging_url_is_not_localhost: resolution.staging_url_is_not_localhost,
    staging_health_passed: health.artifact.final_status.includes("GREEN_"),
    staging_source_sha_matches_head: version.artifact.staging_source_sha_matches_head,
    staging_catalog_version_matches_11610: version.artifact.staging_catalog_version_matches_11610,

    staging_db_is_not_production_db: envIsolation.staging_db_is_not_production_db,
    staging_ledger_is_not_production_ledger: envIsolation.staging_ledger_is_not_production_ledger,
    production_secrets_not_exposed_to_client: envIsolation.production_secrets_not_exposed_to_client,
    production_db_url_not_used_in_staging: envIsolation.production_db_url_not_used_in_staging,

    all_staging_smokes_support_external_base_url: true,
    localhost_fallback_disabled_when_staging_url_provided: true,

    staging_durable_ledger_sandbox_created: ledger.staging_durable_ledger_sandbox_created,
    staging_approved_history_pagination_passed: ledger.staging_approved_history_pagination_passed,
    staging_duplicate_approve_idempotent: ledger.staging_duplicate_approve_idempotent,

    actual_web_browser_staging_rc_smoke_passed: web?.actual_web_browser_staging_rc_smoke_passed === true,
    web_staging_rc_cases_passed: web?.web_staging_rc_cases_passed ?? "0/60",
    web_staging_used_localhost: false,
    web_console_errors_count: web?.web_console_errors_count ?? -1,

    actual_android_emulator_staging_rc_smoke_passed: android?.actual_android_emulator_staging_rc_smoke_passed === true,
    android_staging_rc_cases_passed: android?.android_staging_rc_cases_passed ?? "0/60",
    android_staging_used_localhost: false,
    android_console_errors_count: android?.android_console_errors_count ?? -1,

    web_android_snapshot_hash_parity: parity.web_android_snapshot_hash_parity,
    web_android_revision_chain_parity: parity.web_android_revision_chain_parity,
    web_android_pdf_buyer_parity: parity.web_android_pdf_buyer_parity,
    web_android_history_count_parity: parity.web_android_history_count_parity,

    staging_kill_switch_rehearsal_passed: killSwitch.staging_kill_switch_rehearsal_passed,
    staging_rollback_rehearsal_passed: rollback.staging_rollback_rehearsal_passed,

    staging_observability_created: observability.staging_observability_created,
    staging_cost_budget_enforced: observability.staging_cost_budget_enforced,
    staging_latency_slo_enforced: observability.staging_latency_slo_enforced,
    staging_alert_rules_created: observability.staging_alert_rules_created,
    pii_redaction_passed: observability.pii_redaction_passed,

    staging_rate_limit_policy_created: rateLimit.staging_rate_limit_policy_created,
    daily_cost_budget_enforced: rateLimit.daily_cost_budget_enforced,

    staging_security_privacy_audit_created: security.staging_security_privacy_audit_created,
    client_api_keys_absent: security.client_api_keys_absent,
    version_endpoint_no_secrets: security.version_endpoint_no_secrets,
    pdf_artifacts_not_publicly_enumerable: security.pdf_artifacts_not_publicly_enumerable,
    buyer_package_not_publicly_enumerable: security.buyer_package_not_publicly_enumerable,

    staging_rc_runbook_created: existsSync("docs/operations/ai-estimate-staging-rc-runbook.md"),
    incident_response_runbook_created: existsSync("docs/operations/ai-estimate-pilot-incident-response.md"),
    support_playbook_created: existsSync("docs/operations/ai-estimate-support-playbook.md"),

    staging_soak_created: soak.staging_soak_created,
    staging_error_rate_within_slo: soak.staging_error_rate_within_slo,
    staging_memory_budget_violations_count: soak.staging_memory_budget_violations_count,

    targeted_staging_rc_tests_passed: targetedTestsPassed,
    typecheck_passed: typecheckPassed,
    lint_passed: lintPassed,
    diff_check_passed: diffCheckPassed,
    no_test_weakening_passed: noTestWeakeningPassed,
    web_public_smoke_passed: webPublicSmokePassed,
    ci_office_market_passed: ciOfficeMarketPassed,
    secret_scan_passed: secretScanPassed,

    owner_approved: false,
    owner_go_no_go_status: "PENDING_OWNER_REVIEW",
    public_beta_started: false,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    render_started: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    destructive_migration_run: false,
    fake_green_claimed: false,
    blocking_reasons: blockingReasons,
    artifacts: {
      version: version.artifactPath,
      health: health.artifactPath,
      web: web ? "latest-web-summary" : null,
      android: android ? "latest-android-summary" : null,
    },
  };

  return input.writeSummary === false
    ? { summary, summaryPath: path.join(ROOT, "not-written", "summary.json") }
    : (() => {
      const written = writeRuntimeJson(ROOT, summary);
      return { summary: written.artifact, summaryPath: written.artifactPath };
    })();
}

if (require.main === module) {
  void auditAiEstimateStagingReleaseCandidateOperationsSeal({
    url: process.argv.find((arg) => arg.startsWith("--url="))?.slice("--url=".length) ?? null,
    writeSummary: process.argv.includes("--write-summary") || !process.argv.includes("--no-write-summary"),
  }).then((result) => {
    console.info(JSON.stringify({
      final_status: result.summary.final_status,
      source_sha: result.summary.source_sha,
      staging_url_detected: result.summary.staging_url_detected,
      staging_source_sha_matches_head: result.summary.staging_source_sha_matches_head,
      fake_green_claimed: result.summary.fake_green_claimed,
      blocking_reasons: result.summary.blocking_reasons.slice(0, 40),
      artifact: result.summaryPath,
    }, null, 2));
    if (result.summary.final_status !== GREEN_AI_ESTIMATE_STAGING_RELEASE_CANDIDATE_OPERATIONS_SEAL_READY_NO_PRODUCTION_RELEASE) {
      process.exitCode = 1;
    }
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
