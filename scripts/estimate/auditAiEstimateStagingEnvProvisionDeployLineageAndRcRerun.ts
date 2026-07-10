import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { checkAiEstimateStagingHealth } from "../e2e/checkAiEstimateStagingHealth";
import { checkStagingVersionLineage } from "../e2e/checkStagingVersionLineage";
import {
  argValue,
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";
import { resolveStagingBaseUrl, type StagingBaseUrlResolution } from "../e2e/resolveStagingBaseUrl";
import { gitOutput } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_STAGING_ENV_PROVISION_DEPLOY_LINEAGE_AND_RC_RERUN_READY_NO_PRODUCTION_RELEASE =
  "GREEN_AI_ESTIMATE_STAGING_ENV_PROVISION_DEPLOY_LINEAGE_AND_RC_RERUN_READY_NO_PRODUCTION_RELEASE" as const;
export const STOP_AI_ESTIMATE_STAGING_ENVIRONMENT_NOT_AVAILABLE_NO_GREEN =
  "STOP_AI_ESTIMATE_STAGING_ENVIRONMENT_NOT_AVAILABLE_NO_GREEN" as const;

const ROOT = ".release-runtime/ai-estimate-staging-env-provision-deploy-lineage-and-rc-rerun";
const EXPECTED_BRANCH = "release/ios-after-build48-integration";

const DEPLOY_ACCESS_ENV_KEYS = [
  "RENDER_API_TOKEN",
  "RENDER_API_KEY",
  "RENDER_STAGING_SERVICE_ID",
  "RENDER_STAGING_DEPLOY_HOOK_URL",
  "STAGING_DEPLOY_HOOK_URL",
  "APP_STAGING_DEPLOY_HOOK_URL",
  "RENDER_DEPLOY_HOOK_URL",
] as const;

const GUARDRAIL_FILES = [
  "scripts/estimate/auditAiEstimateStagingReleaseCandidateOperationsSeal.ts",
  "scripts/e2e/checkStagingVersionLineage.ts",
  "scripts/e2e/checkAiEstimateStagingHealth.ts",
  "scripts/e2e/runAiEstimateStagingReleaseCandidateWebSmoke.ts",
  "scripts/e2e/runAiEstimateStagingReleaseCandidateAndroidSmoke.ts",
  "scripts/e2e/runAiEstimateStagingReleaseCandidateWebAndroidParity.ts",
  "scripts/estimate/runAiEstimateStagingSoak.ts",
  "docs/operations/ai-estimate-staging-rc-runbook.md",
] as const;

type EnvLike = Record<string, string | undefined>;
type SummaryLike = Record<string, any>;

export type StagingDeployAccessDetection = {
  staging_deploy_access_detected: boolean;
  render_cli_available: boolean;
  deploy_access_env_keys_present: string[];
  deploy_access_detection_methods: string[];
};

function commandAvailable(command: string): boolean {
  try {
    execFileSync(process.platform === "win32" ? "where.exe" : "which", [command], {
      stdio: "ignore",
      timeout: 5_000,
    });
    return true;
  } catch {
    return false;
  }
}

export function detectStagingDeployAccess(
  env: EnvLike = process.env,
  options: { renderCliAvailable?: boolean } = {},
): StagingDeployAccessDetection {
  const deploy_access_env_keys_present = DEPLOY_ACCESS_ENV_KEYS.filter((key) =>
    String(env[key] ?? "").trim().length > 0,
  );
  const render_cli_available = options.renderCliAvailable ?? commandAvailable("render");
  const deploy_access_detection_methods = [
    ...deploy_access_env_keys_present.map((key) => `env:${key}`),
    render_cli_available ? "cli:render" : "",
  ].filter(Boolean);

  return {
    staging_deploy_access_detected: deploy_access_detection_methods.length > 0,
    render_cli_available,
    deploy_access_env_keys_present,
    deploy_access_detection_methods,
  };
}

function guardrailsReady(): boolean {
  return GUARDRAIL_FILES.every((file) => existsSync(file));
}

function startsGreen(summary: SummaryLike | null | undefined): boolean {
  return String(summary?.final_status ?? "").startsWith("GREEN_");
}

function ownerActionFor(input: {
  sourceSha: string;
  stagingUrlDetected: boolean;
  deploySatisfied: boolean;
  deployAccessDetected: boolean;
  stagingSourceShaMatchesHead: boolean;
  stagingRuntimeIsStaging: boolean;
  stagingHealthGreen: boolean;
}): string {
  if (!input.stagingUrlDetected || (!input.deploySatisfied && !input.deployAccessDetected)) {
    return "PROVIDE_APP_STAGING_URL_OR_DEPLOY_ACCESS";
  }
  if (!input.stagingSourceShaMatchesHead || !input.stagingRuntimeIsStaging) {
    return `REDEPLOY_RENDER_STAGING_FROM_HEAD_${input.sourceSha}_WITH_STAGING_RUNTIME_ENV`;
  }
  if (!input.stagingHealthGreen) return "FIX_STAGING_HEALTH_AND_RERUN_RC";
  return "RUN_WEB_ANDROID_STAGING_RC_SMOKES_PARITY_AND_SOAK";
}

export function buildStagingEnvProvisionDeployLineageAndRcRerunSummary(input: {
  sourceSha: string;
  branch: string;
  upstreamSync: string;
  worktreeClean: boolean;
  pushed: boolean;
  resolution: StagingBaseUrlResolution;
  deployAccess: StagingDeployAccessDetection;
  versionArtifact: SummaryLike | null;
  versionArtifactPath?: string | null;
  healthArtifact: SummaryLike | null;
  healthArtifactPath?: string | null;
  codeGuardrailsReady: boolean;
  stagingDeployStarted?: boolean;
  stagingDeployCompleted?: boolean;
  rcRerunFinalStatus?: string | null;
  generatedAt?: string;
}) {
  const staging_source_sha_matches_head = input.versionArtifact?.staging_source_sha_matches_head === true;
  const staging_runtime_is_staging =
    input.versionArtifact?.staging_runtime_is_staging === true ||
    input.healthArtifact?.staging_runtime_is_staging === true;
  const staging_health_green = startsGreen(input.healthArtifact);
  const staging_url_serves_request_route = input.healthArtifact?.staging_request_status_ok === true;
  const staging_already_current = staging_source_sha_matches_head && staging_runtime_is_staging;
  const staging_deploy_started = input.stagingDeployStarted === true;
  const staging_deploy_completed = input.stagingDeployCompleted === true;
  const deploy_satisfied = staging_deploy_completed || staging_already_current;
  const rc_rerun_green = String(input.rcRerunFinalStatus ?? "").startsWith("GREEN_");
  const staging_environment_missing = [
    !input.resolution.staging_url_detected,
    !input.resolution.staging_url_is_external,
    !input.resolution.staging_url_is_not_localhost,
    !staging_url_serves_request_route,
    !staging_source_sha_matches_head,
    !staging_runtime_is_staging,
    !staging_health_green,
    !deploy_satisfied && !input.deployAccess.staging_deploy_access_detected,
  ].some(Boolean);
  const owner_action_required = ownerActionFor({
    sourceSha: input.sourceSha,
    stagingUrlDetected: input.resolution.staging_url_detected,
    deploySatisfied: deploy_satisfied,
    deployAccessDetected: input.deployAccess.staging_deploy_access_detected,
    stagingSourceShaMatchesHead: staging_source_sha_matches_head,
    stagingRuntimeIsStaging: staging_runtime_is_staging,
    stagingHealthGreen: staging_health_green,
  });
  const blocking_reasons = [
    input.branch === EXPECTED_BRANCH ? "" : "BRANCH_MISMATCH",
    input.upstreamSync === "0 0" ? "" : "UPSTREAM_NOT_SYNCED",
    input.worktreeClean ? "" : "WORKTREE_NOT_CLEAN",
    input.pushed ? "" : "HEAD_NOT_PUSHED_TO_UPSTREAM",
    input.codeGuardrailsReady ? "" : "CODE_GUARDRAILS_NOT_READY",
    input.resolution.staging_url_detected ? "" : "STAGING_URL_NOT_CONFIGURED",
    input.resolution.staging_url_is_external ? "" : "STAGING_URL_NOT_EXTERNAL",
    input.resolution.staging_url_is_not_localhost ? "" : "STAGING_URL_IS_LOCALHOST",
    staging_url_serves_request_route ? "" : "STAGING_REQUEST_ROUTE_NOT_PROVEN",
    staging_source_sha_matches_head ? "" : "STAGING_SOURCE_SHA_NOT_PROVEN",
    staging_runtime_is_staging ? "" : "STAGING_RUNTIME_NOT_STAGING",
    staging_health_green ? "" : "STAGING_HEALTH_NOT_GREEN",
    deploy_satisfied || input.deployAccess.staging_deploy_access_detected
      ? ""
      : "STAGING_DEPLOY_ACCESS_NOT_AVAILABLE",
    deploy_satisfied ? "" : "STAGING_DEPLOY_NOT_COMPLETED",
    rc_rerun_green ? "" : "STAGING_RC_RERUN_NOT_EXECUTED",
  ].filter(Boolean);
  const green = blocking_reasons.length === 0;

  return {
    final_status: green
      ? GREEN_AI_ESTIMATE_STAGING_ENV_PROVISION_DEPLOY_LINEAGE_AND_RC_RERUN_READY_NO_PRODUCTION_RELEASE
      : STOP_AI_ESTIMATE_STAGING_ENVIRONMENT_NOT_AVAILABLE_NO_GREEN,
    source_sha: input.sourceSha,
    branch: input.branch,
    upstream_sync: input.upstreamSync,
    worktree_clean: input.worktreeClean,
    pushed: input.pushed,
    generated_at: input.generatedAt ?? new Date().toISOString(),

    app_staging_url_detected: input.resolution.staging_url_detected,
    app_staging_url: input.resolution.baseUrl,
    staging_url_source: input.resolution.source,
    staging_provider: input.resolution.provider,
    staging_url_is_external: input.resolution.staging_url_is_external,
    staging_url_is_not_localhost: input.resolution.staging_url_is_not_localhost,
    staging_url_serves_request_route,

    staging_deploy_access_detected: input.deployAccess.staging_deploy_access_detected,
    render_cli_available: input.deployAccess.render_cli_available,
    deploy_access_env_keys_present: input.deployAccess.deploy_access_env_keys_present,
    deploy_access_detection_methods: input.deployAccess.deploy_access_detection_methods,
    staging_deploy_started,
    staging_deploy_completed,
    staging_already_current,
    deploy_satisfied,

    staging_source_sha_matches_head,
    staging_runtime_is_staging,
    staging_health_green,
    staging_environment_missing,
    code_guardrails_ready: input.codeGuardrailsReady,
    owner_action_required,
    owner_action_detail:
      owner_action_required === "PROVIDE_APP_STAGING_URL_OR_DEPLOY_ACCESS"
        ? `Grant deploy credentials/hook for ${input.resolution.baseUrl ?? "the app staging URL"} or redeploy it from ${input.sourceSha} with runtime=staging.`
        : owner_action_required,

    actual_web_browser_staging_rc_smoke_passed: false,
    actual_android_emulator_staging_rc_smoke_passed: false,
    web_android_staging_parity_green: false,
    staging_soak_executed: false,
    owner_approved: false,
    public_beta_started: false,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    render_started: false,
    native_build_started: false,
    eas_started: false,
    testflight_started: false,
    app_store_started: false,
    production_release_started: false,
    release_started: false,
    production_db_touched: false,
    destructive_migration_run: false,
    fake_green_claimed: false,

    version_lineage_final_status: input.versionArtifact?.final_status ?? null,
    health_final_status: input.healthArtifact?.final_status ?? null,
    rc_rerun_final_status: input.rcRerunFinalStatus ?? null,
    blocking_reasons,
    artifacts: {
      version: input.versionArtifactPath ?? null,
      health: input.healthArtifactPath ?? null,
    },
  };
}

export async function auditAiEstimateStagingEnvProvisionDeployLineageAndRcRerun(input: {
  url?: string | null;
  writeSummary?: boolean;
} = {}) {
  const sourceSha = currentSourceSha();
  const branch = currentBranch();
  const upstreamSync = currentUpstreamSync();
  const upstreamSha = gitOutput(["rev-parse", "@{u}"], "unknown");
  const worktreeClean = gitOutput(["status", "--porcelain=v1", "--untracked-files=all"], "") === "";
  const pushed = upstreamSync === "0 0" && upstreamSha === sourceSha;
  const resolution = resolveStagingBaseUrl({ explicit: input.url });
  const deployAccess = detectStagingDeployAccess();
  const version = await checkStagingVersionLineage({
    url: resolution.baseUrl,
    writeSummary: input.writeSummary !== false,
  });
  const health = await checkAiEstimateStagingHealth({
    url: resolution.baseUrl,
    writeSummary: input.writeSummary !== false,
  });
  const summary = buildStagingEnvProvisionDeployLineageAndRcRerunSummary({
    sourceSha,
    branch,
    upstreamSync,
    worktreeClean,
    pushed,
    resolution,
    deployAccess,
    versionArtifact: version.artifact,
    versionArtifactPath: version.artifactPath,
    healthArtifact: health.artifact,
    healthArtifactPath: health.artifactPath,
    codeGuardrailsReady: guardrailsReady(),
    stagingDeployStarted: false,
    stagingDeployCompleted: false,
    rcRerunFinalStatus: null,
  });

  return input.writeSummary === false
    ? { summary, summaryPath: path.join(ROOT, "not-written", "summary.json") }
    : (() => {
      const written = writeRuntimeJson(ROOT, summary);
      return { summary: written.artifact, summaryPath: written.artifactPath };
    })();
}

if (require.main === module) {
  void auditAiEstimateStagingEnvProvisionDeployLineageAndRcRerun({
    url: argValue("url"),
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
  }).then((result) => {
    console.info(JSON.stringify({
      final_status: result.summary.final_status,
      source_sha: result.summary.source_sha,
      branch: result.summary.branch,
      upstream_sync: result.summary.upstream_sync,
      worktree_clean: result.summary.worktree_clean,
      pushed: result.summary.pushed,
      app_staging_url_detected: result.summary.app_staging_url_detected,
      app_staging_url: result.summary.app_staging_url,
      staging_url_serves_request_route: result.summary.staging_url_serves_request_route,
      staging_deploy_access_detected: result.summary.staging_deploy_access_detected,
      staging_source_sha_matches_head: result.summary.staging_source_sha_matches_head,
      staging_runtime_is_staging: result.summary.staging_runtime_is_staging,
      code_guardrails_ready: result.summary.code_guardrails_ready,
      staging_environment_missing: result.summary.staging_environment_missing,
      owner_action_required: result.summary.owner_action_required,
      fake_green_claimed: result.summary.fake_green_claimed,
      blocking_reasons: result.summary.blocking_reasons.slice(0, 40),
      artifact: result.summaryPath,
    }, null, 2));
    if (result.summary.final_status !== GREEN_AI_ESTIMATE_STAGING_ENV_PROVISION_DEPLOY_LINEAGE_AND_RC_RERUN_READY_NO_PRODUCTION_RELEASE) {
      process.exitCode = 1;
    }
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
