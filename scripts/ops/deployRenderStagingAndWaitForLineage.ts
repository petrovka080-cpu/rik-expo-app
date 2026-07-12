import {
  argValue,
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  normalizeBaseUrl,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";

export const GREEN_RENDER_STAGING_DEPLOY_LINEAGE_READY =
  "GREEN_RENDER_STAGING_DEPLOY_LINEAGE_READY" as const;
export const GREEN_RENDER_STAGING_DEPLOY_DRY_RUN_READY =
  "GREEN_RENDER_STAGING_DEPLOY_DRY_RUN_READY" as const;
export const STOP_RENDER_DEPLOY_CREDENTIALS_MISSING_NO_GREEN =
  "STOP_RENDER_DEPLOY_CREDENTIALS_MISSING_NO_GREEN" as const;
export const STOP_RENDER_STAGING_DEPLOY_CONFIRMATION_MISSING_NO_GREEN =
  "STOP_RENDER_STAGING_DEPLOY_CONFIRMATION_MISSING_NO_GREEN" as const;
export const STOP_RENDER_STAGING_DEPLOY_LINEAGE_FAILED_NO_GREEN =
  "STOP_RENDER_STAGING_DEPLOY_LINEAGE_FAILED_NO_GREEN" as const;

export const DEFAULT_RENDER_STAGING_URL = "https://rik-expo-app-staging.onrender.com";
export const REQUIRED_STAGING_CATALOG_VERSION = "catalog:11610";
export const REQUIRED_RENDER_STAGING_BRANCH = "release/production-candidate";
export const REQUIRED_RENDER_STAGING_SERVICE_NAME = "rik-expo-app-staging";
export const RENDER_STAGING_DEPLOY_HOOK_ENV_KEY = "RENDER_STAGING_DEPLOY_HOOK_URL";
export const RENDER_API_KEY_ENV_KEYS = ["RENDER_API_KEY", "RENDER_API_TOKEN"] as const;
export const RENDER_STAGING_SERVICE_ID_ENV_KEY = "RENDER_STAGING_SERVICE_ID";
export const RENDER_STAGING_SERVICE_NAME_ENV_KEY = "RENDER_STAGING_SERVICE_NAME";
export const RENDER_PRODUCTION_SERVICE_ID_ENV_KEY = "RENDER_PRODUCTION_SERVICE_ID";
export const PRODUCTION_CANDIDATE_CI_GREEN_ENV_KEY = "PRODUCTION_CANDIDATE_CI_GREEN";

const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;
const DEFAULT_POLL_MS = 10 * 1000;
const DEPLOY_SUMMARY_ROOT =
  ".release-runtime/ai-estimate-staging-release-candidate-operations-seal/render-staging-deploy-lineage";

type EnvLike = Record<string, string | undefined>;

type VersionPayload = {
  source_sha?: unknown;
  branch?: unknown;
  runtime?: unknown;
  catalog_version?: unknown;
  [key: string]: unknown;
};

type DeployMode = "deploy_hook" | "render_api";

type DeployTriggerResult = {
  deploy_started: boolean;
  deploy_request_http_status: number | null;
  deploy_request_error: string | null;
};

export type DeployPreflightResult = {
  blockers: string[];
  worktree_clean: boolean;
  upstream_sync: string;
  head_matches_upstream: boolean;
  source_sha_valid: boolean;
  branch_allowed_for_staging: boolean;
  production_candidate_ci_green: boolean;
};

type VersionReadResult = {
  payload: VersionPayload | null;
  http_status: number | null;
  error: string | null;
};

type WaitResult = {
  deploy_completed: boolean;
  last_version_payload: VersionPayload | null;
  last_version_http_status: number | null;
  last_version_error: string | null;
  lineage_poll_attempts: number;
  elapsed_ms: number;
};

export type RenderDeployCredentialDetection = ReturnType<typeof detectRenderDeployCredentials>;
export type RenderStagingDeployLineageSummary = ReturnType<typeof buildRenderStagingDeployLineageSummary>;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function boolFlag(name: string): boolean {
  return hasFlag(name) || text(argValue(name)).toLowerCase() === "true";
}

function safeCurrentUpstreamSync(): string {
  try {
    return currentUpstreamSync();
  } catch {
    return "upstream_missing";
  }
}

function gitOutput(args: string[]): string {
  const { spawnSync } = require("node:child_process") as typeof import("node:child_process");
  const result = spawnSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    return "";
  }
  return String(result.stdout ?? "").trim();
}

function currentWorktreeClean(): boolean {
  return gitOutput(["status", "--porcelain=v1", "--untracked-files=all"]).length === 0;
}

function isValidGitSha(value: string): boolean {
  return /^[0-9a-f]{40}$/i.test(value);
}

function envBool(value: string | undefined): boolean {
  return ["1", "true", "yes", "green"].includes(text(value).toLowerCase());
}

function redactRenderUrl(value: string): string {
  return value
    .replace(/https:\/\/api\.render\.com\/deploy\/[^?\s"']+/gi, "https://api.render.com/deploy/[redacted-service]")
    .replace(/([?&]key=)[^&\s"']+/gi, "$1[redacted]");
}

function firstPresentEnv(keys: readonly string[], env: EnvLike): string | null {
  for (const key of keys) {
    const value = text(env[key]);
    if (value) return value;
  }
  return null;
}

function firstPresentEnvKey(keys: readonly string[], env: EnvLike): string | null {
  for (const key of keys) {
    if (text(env[key])) return key;
  }
  return null;
}

export function detectRenderDeployCredentials(env: EnvLike = process.env) {
  const deployHook = text(env[RENDER_STAGING_DEPLOY_HOOK_ENV_KEY]);
  const hasDeployHook = deployHook.length > 0;
  let deployHookHostAllowed = false;
  let deployHookLooksRedactable = false;
  let deployHookProductionServiceRejected = true;
  let deployHookServiceMatchesStagingEnv = true;
  let stagingServiceIdProductionRejected = true;
  if (deployHook) {
    try {
      const url = new URL(deployHook);
      deployHookHostAllowed = url.hostname.toLowerCase() === "api.render.com";
      const hookKey = url.searchParams.get("key");
      const redactedHook = redactRenderUrl(deployHook);
      deployHookLooksRedactable = Boolean(hookKey) && redactedHook !== deployHook && !redactedHook.includes(hookKey ?? "");
      const pathServiceId = url.pathname.split("/").filter(Boolean).pop() ?? "";
      const stagingServiceId = text(env[RENDER_STAGING_SERVICE_ID_ENV_KEY]);
      const productionServiceId = text(env[RENDER_PRODUCTION_SERVICE_ID_ENV_KEY]);
      deployHookServiceMatchesStagingEnv = !stagingServiceId || pathServiceId === stagingServiceId;
      deployHookProductionServiceRejected = !productionServiceId || pathServiceId !== productionServiceId;
    } catch {
      deployHookHostAllowed = false;
      deployHookLooksRedactable = false;
      deployHookProductionServiceRejected = false;
      deployHookServiceMatchesStagingEnv = false;
    }
  }
  const apiKeyName = firstPresentEnvKey(RENDER_API_KEY_ENV_KEYS, env);
  const hasServiceId = text(env[RENDER_STAGING_SERVICE_ID_ENV_KEY]).length > 0;
  const stagingServiceId = text(env[RENDER_STAGING_SERVICE_ID_ENV_KEY]);
  const productionServiceId = text(env[RENDER_PRODUCTION_SERVICE_ID_ENV_KEY]);
  stagingServiceIdProductionRejected = !productionServiceId || stagingServiceId !== productionServiceId;
  const serviceName = text(env[RENDER_STAGING_SERVICE_NAME_ENV_KEY]) || REQUIRED_RENDER_STAGING_SERVICE_NAME;
  const stagingServiceNameMatches = serviceName === REQUIRED_RENDER_STAGING_SERVICE_NAME;
  const deploy_access_env_keys_present = [
    hasDeployHook ? RENDER_STAGING_DEPLOY_HOOK_ENV_KEY : "",
    apiKeyName ?? "",
    hasServiceId ? RENDER_STAGING_SERVICE_ID_ENV_KEY : "",
    text(env[RENDER_STAGING_SERVICE_NAME_ENV_KEY]) ? RENDER_STAGING_SERVICE_NAME_ENV_KEY : "",
  ].filter(Boolean);

  return {
    render_deploy_credentials_detected: hasDeployHook || Boolean(apiKeyName && hasServiceId),
    render_staging_deploy_hook_present: hasDeployHook,
    render_staging_deploy_hook_redacted: true,
    deploy_hook_host_allowed: !hasDeployHook || deployHookHostAllowed,
    deploy_hook_secret_redaction_verified: !hasDeployHook || deployHookLooksRedactable,
    deploy_hook_service_matches_staging_env: deployHookServiceMatchesStagingEnv,
    deploy_hook_production_service_rejected: deployHookProductionServiceRejected,
    staging_service_id_production_rejected: stagingServiceIdProductionRejected,
    staging_service_name_matches_expected: stagingServiceNameMatches,
    deploy_hook_mode_available: hasDeployHook,
    render_api_mode_available: Boolean(apiKeyName && hasServiceId),
    deploy_access_env_keys_present,
    deploy_access_detection_methods: [
      hasDeployHook ? "deploy_hook" : "",
      apiKeyName && hasServiceId ? "render_api" : "",
    ].filter(Boolean),
  };
}

export function selectRenderDeployMode(
  credentials: RenderDeployCredentialDetection,
  input: { preferApi?: boolean; clearCache?: boolean } = {},
): DeployMode | null {
  if ((input.preferApi || input.clearCache) && credentials.render_api_mode_available) return "render_api";
  if (credentials.deploy_hook_mode_available) return "deploy_hook";
  if (credentials.render_api_mode_available) return "render_api";
  return null;
}

export function buildDeployHookTriggerUrl(deployHookUrl: string, commit: string): string {
  const url = new URL(deployHookUrl);
  url.searchParams.set("ref", commit);
  return url.toString();
}

function sanitizeOperationalError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return redactRenderUrl(raw)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/key=[^&\s"']+/gi, "key=[redacted]");
}

export function buildDeployPreflight(input: {
  commit: string;
  branch: string;
  upstreamSync: string;
  confirmDeploy: boolean;
  env: EnvLike;
}): DeployPreflightResult {
  const worktreeClean = currentWorktreeClean();
  const headMatchesUpstream = input.upstreamSync === "0 0";
  const sourceShaValid = isValidGitSha(input.commit);
  const branchAllowedForStaging = input.branch === REQUIRED_RENDER_STAGING_BRANCH;
  const productionCandidateCiGreen = envBool(input.env[PRODUCTION_CANDIDATE_CI_GREEN_ENV_KEY]);
  const blockers = [
    input.confirmDeploy ? "" : STOP_RENDER_STAGING_DEPLOY_CONFIRMATION_MISSING_NO_GREEN,
    worktreeClean ? "" : "STOP_PRODUCTION_WORKTREE_NOT_CLEAN",
    headMatchesUpstream ? "" : "STOP_PRODUCTION_HEAD_NOT_UPSTREAM",
    sourceShaValid ? "" : "STOP_PRODUCTION_SOURCE_SHA_MISSING",
    branchAllowedForStaging ? "" : "STOP_RENDER_STAGING_DEPLOY_BRANCH_NOT_PRODUCTION_CANDIDATE",
    productionCandidateCiGreen ? "" : "STOP_PRODUCTION_CI_BASELINE_NOT_GREEN",
  ].filter(Boolean);
  return {
    blockers,
    worktree_clean: worktreeClean,
    upstream_sync: input.upstreamSync,
    head_matches_upstream: headMatchesUpstream,
    source_sha_valid: sourceShaValid,
    branch_allowed_for_staging: branchAllowedForStaging,
    production_candidate_ci_green: productionCandidateCiGreen,
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function triggerDeployWithHook(input: {
  env: EnvLike;
  commit: string;
  timeoutMs: number;
}): Promise<DeployTriggerResult> {
  const hook = text(input.env[RENDER_STAGING_DEPLOY_HOOK_ENV_KEY]);
  if (!hook) {
    return {
      deploy_started: false,
      deploy_request_http_status: null,
      deploy_request_error: "RENDER_STAGING_DEPLOY_HOOK_URL_MISSING",
    };
  }

  try {
    const response = await fetchWithTimeout(
      buildDeployHookTriggerUrl(hook, input.commit),
      { method: "POST", headers: { accept: "application/json" } },
      input.timeoutMs,
    );
    return {
      deploy_started: response.ok,
      deploy_request_http_status: response.status,
      deploy_request_error: response.ok ? null : `RENDER_DEPLOY_HOOK_HTTP_${response.status}`,
    };
  } catch (error) {
    return {
      deploy_started: false,
      deploy_request_http_status: null,
      deploy_request_error: sanitizeOperationalError(error),
    };
  }
}

async function triggerDeployWithRenderApi(input: {
  env: EnvLike;
  commit: string;
  clearCache: boolean;
  timeoutMs: number;
}): Promise<DeployTriggerResult> {
  const apiKey = firstPresentEnv(RENDER_API_KEY_ENV_KEYS, input.env);
  const serviceId = text(input.env[RENDER_STAGING_SERVICE_ID_ENV_KEY]);
  if (!apiKey || !serviceId) {
    return {
      deploy_started: false,
      deploy_request_http_status: null,
      deploy_request_error: "RENDER_API_KEY_OR_STAGING_SERVICE_ID_MISSING",
    };
  }

  try {
    const response = await fetchWithTimeout(
      `https://api.render.com/v1/services/${encodeURIComponent(serviceId)}/deploys`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          commitId: input.commit,
          clearCache: input.clearCache ? "clear" : "do_not_clear",
        }),
      },
      input.timeoutMs,
    );
    return {
      deploy_started: response.ok,
      deploy_request_http_status: response.status,
      deploy_request_error: response.ok ? null : `RENDER_API_DEPLOY_HTTP_${response.status}`,
    };
  } catch (error) {
    return {
      deploy_started: false,
      deploy_request_http_status: null,
      deploy_request_error: sanitizeOperationalError(error),
    };
  }
}

async function readStagingVersion(baseUrl: string, timeoutMs: number): Promise<VersionReadResult> {
  try {
    const response = await fetchWithTimeout(
      `${baseUrl}/api/version`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "cache-control": "no-cache",
        },
      },
      timeoutMs,
    );
    if (!response.ok) {
      return {
        payload: null,
        http_status: response.status,
        error: `STAGING_VERSION_HTTP_${response.status}`,
      };
    }
    const payload = await response.json().catch(() => null);
    return {
      payload: payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload as VersionPayload
        : null,
      http_status: response.status,
      error: payload ? null : "STAGING_VERSION_JSON_INVALID",
    };
  } catch (error) {
    return {
      payload: null,
      http_status: null,
      error: sanitizeOperationalError(error),
    };
  }
}

function versionMatchesLineage(payload: VersionPayload | null, input: { commit: string; branch: string }): boolean {
  return (
    text(payload?.source_sha) === input.commit &&
    text(payload?.branch) === input.branch &&
    text(payload?.runtime) === "staging" &&
    text(payload?.catalog_version) === REQUIRED_STAGING_CATALOG_VERSION
  );
}

async function waitForStagingLineage(input: {
  baseUrl: string;
  commit: string;
  branch: string;
  timeoutMs: number;
  pollMs: number;
}): Promise<WaitResult> {
  const startedAt = Date.now();
  const deadline = startedAt + input.timeoutMs;
  let attempts = 0;
  let lastRead: VersionReadResult = {
    payload: null,
    http_status: null,
    error: "STAGING_VERSION_NOT_POLLED",
  };

  while (Date.now() <= deadline) {
    attempts += 1;
    lastRead = await readStagingVersion(input.baseUrl, Math.min(input.pollMs, 30_000));
    if (versionMatchesLineage(lastRead.payload, input)) {
      return {
        deploy_completed: true,
        last_version_payload: lastRead.payload,
        last_version_http_status: lastRead.http_status,
        last_version_error: lastRead.error,
        lineage_poll_attempts: attempts,
        elapsed_ms: Date.now() - startedAt,
      };
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise((resolve) => setTimeout(resolve, Math.min(input.pollMs, remaining)));
  }

  return {
    deploy_completed: false,
    last_version_payload: lastRead.payload,
    last_version_http_status: lastRead.http_status,
    last_version_error: lastRead.error ?? "STAGING_LINEAGE_TIMEOUT",
    lineage_poll_attempts: attempts,
    elapsed_ms: Date.now() - startedAt,
  };
}

export function buildRenderStagingDeployLineageSummary(input: {
  baseUrl: string;
  commit: string;
  branch: string;
  upstreamSync: string;
  dryRun: boolean;
  confirmDeploy: boolean;
  preflight: DeployPreflightResult;
  credentials: RenderDeployCredentialDetection;
  deployMode: DeployMode | null;
  clearCacheRequested: boolean;
  trigger: DeployTriggerResult;
  wait: WaitResult;
  timeoutMs: number;
  pollMs: number;
}) {
  const payload = input.wait.last_version_payload;
  const payloadSourceSha = text(payload?.source_sha);
  const payloadRuntime = text(payload?.runtime);
  const payloadCatalogVersion = text(payload?.catalog_version);
  const credentialBlockers = input.credentials.render_deploy_credentials_detected
    ? []
    : ["STOP_RENDER_DEPLOY_CREDENTIALS_MISSING_NO_GREEN"];
  const blockers = [
    ...input.preflight.blockers,
    ...credentialBlockers,
    input.credentials.deploy_hook_host_allowed ? "" : "RENDER_DEPLOY_HOOK_HOST_INVALID",
    input.credentials.deploy_hook_secret_redaction_verified ? "" : "RENDER_DEPLOY_HOOK_REDACTION_NOT_PROVEN",
    input.credentials.deploy_hook_service_matches_staging_env ? "" : "RENDER_DEPLOY_HOOK_SERVICE_MISMATCH",
    input.credentials.deploy_hook_production_service_rejected ? "" : "STOP_UNAUTHORIZED_RENDER_DEPLOY",
    input.credentials.staging_service_id_production_rejected ? "" : "STOP_UNAUTHORIZED_RENDER_DEPLOY",
    input.credentials.staging_service_name_matches_expected ? "" : "RENDER_STAGING_SERVICE_NAME_MISMATCH",
    input.deployMode ? "" : "RENDER_DEPLOY_MODE_NOT_AVAILABLE",
    input.trigger.deploy_started ? "" : "RENDER_DEPLOY_NOT_STARTED",
    input.trigger.deploy_request_error ? `RENDER_DEPLOY_TRIGGER_FAILED:${input.trigger.deploy_request_error}` : "",
    input.wait.deploy_completed ? "" : "RENDER_DEPLOY_LINEAGE_TIMEOUT",
    payloadSourceSha === input.commit ? "" : "STAGING_SOURCE_SHA_NOT_PROVEN",
    payloadRuntime === "staging" ? "" : "STAGING_RUNTIME_NOT_STAGING",
    payloadCatalogVersion === REQUIRED_STAGING_CATALOG_VERSION ? "" : "STAGING_CATALOG_VERSION_MISMATCH",
  ].filter(Boolean);

  return {
    final_status: blockers.includes("STOP_RENDER_DEPLOY_CREDENTIALS_MISSING_NO_GREEN")
      ? STOP_RENDER_DEPLOY_CREDENTIALS_MISSING_NO_GREEN
      : blockers.length === 0
        ? GREEN_RENDER_STAGING_DEPLOY_LINEAGE_READY
        : STOP_RENDER_STAGING_DEPLOY_LINEAGE_FAILED_NO_GREEN,
    render_deploy_automation_created: true,
    dry_run: input.dryRun,
    confirm_staging_deploy: input.confirmDeploy,
    production_side_effects: input.trigger.deploy_started,
    deploy_hook_mode_supported: true,
    render_api_mode_supported: true,
    deploy_secret_not_logged: true,
    deploy_started: input.trigger.deploy_started,
    deploy_completed: input.wait.deploy_completed,
    deploy_mode: input.deployMode,
    clear_cache_requested: input.clearCacheRequested,
    clear_cache_applied: input.deployMode === "render_api" && input.clearCacheRequested,
    deploy_timeout_bounded: Number.isFinite(input.timeoutMs) && input.timeoutMs > 0 && input.timeoutMs <= DEFAULT_TIMEOUT_MS,
    poll_interval_ms: input.pollMs,
    source_sha: input.commit,
    branch: input.branch,
    upstream_sync: input.upstreamSync,
    worktree_clean: input.preflight.worktree_clean,
    head_matches_upstream: input.preflight.head_matches_upstream,
    branch_allowed_for_staging: input.preflight.branch_allowed_for_staging,
    production_candidate_ci_green: input.preflight.production_candidate_ci_green,
    generated_at: new Date().toISOString(),
    staging_url: input.baseUrl,
    target_service: REQUIRED_RENDER_STAGING_SERVICE_NAME,
    version_endpoint_path: "/api/version",
    version_payload: payload,
    deploy_request_http_status: input.trigger.deploy_request_http_status,
    last_version_http_status: input.wait.last_version_http_status,
    last_version_error: input.wait.last_version_error,
    lineage_poll_attempts: input.wait.lineage_poll_attempts,
    elapsed_ms: input.wait.elapsed_ms,
    staging_source_sha_matches_head: payloadSourceSha === input.commit,
    staging_runtime_is_staging: payloadRuntime === "staging",
    staging_catalog_version_matches_11610: payloadCatalogVersion === REQUIRED_STAGING_CATALOG_VERSION,
    render_deploy_credentials_detected: input.credentials.render_deploy_credentials_detected,
    render_staging_deploy_hook_present: input.credentials.render_staging_deploy_hook_present,
    render_staging_deploy_hook_redacted: input.credentials.render_staging_deploy_hook_redacted,
    deploy_hook_host_allowed: input.credentials.deploy_hook_host_allowed,
    deploy_hook_secret_redaction_verified: input.credentials.deploy_hook_secret_redaction_verified,
    deploy_hook_service_matches_staging_env: input.credentials.deploy_hook_service_matches_staging_env,
    deploy_hook_production_service_rejected: input.credentials.deploy_hook_production_service_rejected,
    staging_service_id_production_rejected: input.credentials.staging_service_id_production_rejected,
    staging_service_name_matches_expected: input.credentials.staging_service_name_matches_expected,
    deploy_access_env_keys_present: input.credentials.deploy_access_env_keys_present,
    deploy_access_detection_methods: input.credentials.deploy_access_detection_methods,
    fake_green_claimed: false,
    blocking_reasons: blockers,
  };
}

export function buildRenderStagingDeployDryRunSummary(input: {
  baseUrl: string;
  commit: string;
  branch: string;
  upstreamSync: string;
  credentials: RenderDeployCredentialDetection;
}) {
  const blockers = [
    isValidGitSha(input.commit) ? "" : "STOP_PRODUCTION_SOURCE_SHA_MISSING",
    input.baseUrl.includes("onrender.com") ? "" : "RENDER_STAGING_BASE_URL_NOT_RENDER",
    input.credentials.deploy_hook_host_allowed ? "" : "RENDER_DEPLOY_HOOK_HOST_INVALID",
    input.credentials.deploy_hook_secret_redaction_verified ? "" : "RENDER_DEPLOY_HOOK_REDACTION_NOT_PROVEN",
    input.credentials.deploy_hook_service_matches_staging_env ? "" : "RENDER_DEPLOY_HOOK_SERVICE_MISMATCH",
    input.credentials.deploy_hook_production_service_rejected ? "" : "STOP_UNAUTHORIZED_RENDER_DEPLOY",
    input.credentials.staging_service_id_production_rejected ? "" : "STOP_UNAUTHORIZED_RENDER_DEPLOY",
    input.credentials.staging_service_name_matches_expected ? "" : "RENDER_STAGING_SERVICE_NAME_MISMATCH",
  ].filter(Boolean);
  return {
    final_status: blockers.length === 0
      ? GREEN_RENDER_STAGING_DEPLOY_DRY_RUN_READY
      : STOP_RENDER_STAGING_DEPLOY_LINEAGE_FAILED_NO_GREEN,
    dry_run: true,
    confirm_staging_deploy: false,
    production_side_effects: false,
    deploy_started: false,
    deploy_completed: false,
    deploy_request_http_status: null,
    deploy_mode: null,
    source_sha: input.commit,
    branch: input.branch,
    upstream_sync: input.upstreamSync,
    staging_url: input.baseUrl,
    target_service: REQUIRED_RENDER_STAGING_SERVICE_NAME,
    version_endpoint_path: "/api/version",
    staging_source_sha_matches_head: false,
    staging_runtime_is_staging: false,
    staging_catalog_version_matches_11610: false,
    render_deploy_credentials_detected: input.credentials.render_deploy_credentials_detected,
    render_staging_deploy_hook_present: input.credentials.render_staging_deploy_hook_present,
    render_staging_deploy_hook_redacted: input.credentials.render_staging_deploy_hook_redacted,
    deploy_hook_host_allowed: input.credentials.deploy_hook_host_allowed,
    deploy_hook_secret_redaction_verified: input.credentials.deploy_hook_secret_redaction_verified,
    deploy_hook_service_matches_staging_env: input.credentials.deploy_hook_service_matches_staging_env,
    deploy_hook_production_service_rejected: input.credentials.deploy_hook_production_service_rejected,
    staging_service_id_production_rejected: input.credentials.staging_service_id_production_rejected,
    staging_service_name_matches_expected: input.credentials.staging_service_name_matches_expected,
    deploy_access_env_keys_present: input.credentials.deploy_access_env_keys_present,
    deploy_access_detection_methods: input.credentials.deploy_access_detection_methods,
    fake_green_claimed: false,
    blocking_reasons: blockers,
  };
}

export async function deployRenderStagingAndWaitForLineage(input: {
  url?: string | null;
  commit?: string | null;
  clearCache?: boolean;
  confirmDeploy?: boolean;
  writeSummary?: boolean;
  timeoutMs?: number;
  pollMs?: number;
  env?: EnvLike;
} = {}) {
  const env = input.env ?? process.env;
  const baseUrl = normalizeBaseUrl(input.url) ?? DEFAULT_RENDER_STAGING_URL;
  const commit = text(input.commit) || currentSourceSha();
  const branch = currentBranch();
  const upstreamSync = safeCurrentUpstreamSync();
  const timeoutMs = Math.min(input.timeoutMs ?? DEFAULT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const pollMs = Math.min(input.pollMs ?? DEFAULT_POLL_MS, 60_000);
  const clearCache = Boolean(input.clearCache);
  const confirmDeploy = Boolean(input.confirmDeploy);
  const credentials = detectRenderDeployCredentials(env);
  const deployMode = selectRenderDeployMode(credentials, {
    preferApi: boolFlag("prefer-api"),
    clearCache,
  });

  if (!confirmDeploy) {
    const dryRunSummary = buildRenderStagingDeployDryRunSummary({
      baseUrl,
      commit,
      branch,
      upstreamSync,
      credentials,
    });
    if (input.writeSummary === false) {
      return {
        artifactPath: `${DEPLOY_SUMMARY_ROOT}/not-written/summary.json`,
        artifact: dryRunSummary,
      };
    }
    return writeRuntimeJson(DEPLOY_SUMMARY_ROOT, dryRunSummary);
  }

  const preflight = buildDeployPreflight({
    commit,
    branch,
    upstreamSync,
    confirmDeploy,
    env,
  });

  let trigger: DeployTriggerResult = {
    deploy_started: false,
    deploy_request_http_status: null,
    deploy_request_error: preflight.blockers.length > 0
      ? `DEPLOY_PREFLIGHT_BLOCKED:${preflight.blockers.join(",")}`
      : deployMode
        ? null
        : "RENDER_DEPLOY_CREDENTIALS_MISSING",
  };
  if (preflight.blockers.length === 0 && deployMode === "render_api") {
    trigger = await triggerDeployWithRenderApi({ env, commit, clearCache, timeoutMs: Math.min(timeoutMs, 60_000) });
  } else if (preflight.blockers.length === 0 && deployMode === "deploy_hook") {
    trigger = await triggerDeployWithHook({ env, commit, timeoutMs: Math.min(timeoutMs, 60_000) });
  }

  const wait = trigger.deploy_started
    ? await waitForStagingLineage({ baseUrl, commit, branch, timeoutMs, pollMs })
    : {
        deploy_completed: false,
        last_version_payload: null,
        last_version_http_status: null,
        last_version_error: "DEPLOY_NOT_STARTED",
        lineage_poll_attempts: 0,
        elapsed_ms: 0,
      };

  const summary = buildRenderStagingDeployLineageSummary({
    baseUrl,
    commit,
    branch,
    upstreamSync,
    dryRun: false,
    confirmDeploy,
    preflight,
    credentials,
    deployMode,
    clearCacheRequested: clearCache,
    trigger,
    wait,
    timeoutMs,
    pollMs,
  });

  if (input.writeSummary === false) {
    return {
      artifactPath: `${DEPLOY_SUMMARY_ROOT}/not-written/summary.json`,
      artifact: summary,
    };
  }
  return writeRuntimeJson(DEPLOY_SUMMARY_ROOT, summary);
}

if (require.main === module) {
  void deployRenderStagingAndWaitForLineage({
    url: argValue("url"),
    commit: argValue("commit"),
    clearCache: boolFlag("clear-cache"),
    confirmDeploy: hasFlag("confirm-staging-deploy"),
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
    timeoutMs: positiveInt(argValue("timeout-ms"), DEFAULT_TIMEOUT_MS),
    pollMs: positiveInt(argValue("poll-ms"), DEFAULT_POLL_MS),
  }).then((result) => {
    console.info(JSON.stringify({
      final_status: result.artifact.final_status,
      dry_run: result.artifact.dry_run,
      production_side_effects: result.artifact.production_side_effects,
      target_service: result.artifact.target_service,
      source_sha: result.artifact.source_sha,
      deploy_mode: result.artifact.deploy_mode,
      deploy_started: result.artifact.deploy_started,
      deploy_completed: result.artifact.deploy_completed,
      staging_source_sha_matches_head: result.artifact.staging_source_sha_matches_head,
      staging_runtime_is_staging: result.artifact.staging_runtime_is_staging,
      staging_catalog_version_matches_11610: result.artifact.staging_catalog_version_matches_11610,
      blocking_reasons: result.artifact.blocking_reasons.slice(0, 20),
      artifact: result.artifactPath,
    }, null, 2));
    if (result.artifact.blocking_reasons.length > 0) process.exitCode = 1;
  }).catch((error) => {
    console.error(sanitizeOperationalError(error));
    process.exit(1);
  });
}
