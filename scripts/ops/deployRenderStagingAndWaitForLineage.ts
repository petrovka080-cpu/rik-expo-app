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
export const STOP_RENDER_DEPLOY_CREDENTIALS_MISSING_NO_GREEN =
  "STOP_RENDER_DEPLOY_CREDENTIALS_MISSING_NO_GREEN" as const;
export const STOP_RENDER_STAGING_DEPLOY_LINEAGE_FAILED_NO_GREEN =
  "STOP_RENDER_STAGING_DEPLOY_LINEAGE_FAILED_NO_GREEN" as const;

export const DEFAULT_RENDER_STAGING_URL = "https://rik-expo-app-staging.onrender.com";
export const REQUIRED_STAGING_CATALOG_VERSION = "catalog:11610";
export const RENDER_STAGING_DEPLOY_HOOK_ENV_KEY = "RENDER_STAGING_DEPLOY_HOOK_URL";
export const RENDER_API_KEY_ENV_KEYS = ["RENDER_API_KEY", "RENDER_API_TOKEN"] as const;
export const RENDER_STAGING_SERVICE_ID_ENV_KEY = "RENDER_STAGING_SERVICE_ID";

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
  const hasDeployHook = text(env[RENDER_STAGING_DEPLOY_HOOK_ENV_KEY]).length > 0;
  const apiKeyName = firstPresentEnvKey(RENDER_API_KEY_ENV_KEYS, env);
  const hasServiceId = text(env[RENDER_STAGING_SERVICE_ID_ENV_KEY]).length > 0;
  const deploy_access_env_keys_present = [
    hasDeployHook ? RENDER_STAGING_DEPLOY_HOOK_ENV_KEY : "",
    apiKeyName ?? "",
    hasServiceId ? RENDER_STAGING_SERVICE_ID_ENV_KEY : "",
  ].filter(Boolean);

  return {
    render_deploy_credentials_detected: hasDeployHook || Boolean(apiKeyName && hasServiceId),
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
  return raw
    .replace(/https:\/\/api\.render\.com\/deploy\/[^\s?]+(?:\?[^\s"']*)?/gi, "https://api.render.com/deploy/[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/key=[^&\s"']+/gi, "key=[redacted]");
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
    ...credentialBlockers,
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
    generated_at: new Date().toISOString(),
    staging_url: input.baseUrl,
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
  writeSummary?: boolean;
  timeoutMs?: number;
  pollMs?: number;
  env?: EnvLike;
} = {}) {
  const env = input.env ?? process.env;
  const baseUrl = normalizeBaseUrl(input.url) ?? DEFAULT_RENDER_STAGING_URL;
  const commit = text(input.commit) || currentSourceSha();
  const branch = currentBranch();
  const upstreamSync = currentUpstreamSync();
  const timeoutMs = Math.min(input.timeoutMs ?? DEFAULT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const pollMs = Math.min(input.pollMs ?? DEFAULT_POLL_MS, 60_000);
  const clearCache = Boolean(input.clearCache);
  const credentials = detectRenderDeployCredentials(env);
  const deployMode = selectRenderDeployMode(credentials, {
    preferApi: boolFlag("prefer-api"),
    clearCache,
  });

  let trigger: DeployTriggerResult = {
    deploy_started: false,
    deploy_request_http_status: null,
    deploy_request_error: deployMode ? null : "RENDER_DEPLOY_CREDENTIALS_MISSING",
  };
  if (deployMode === "render_api") {
    trigger = await triggerDeployWithRenderApi({ env, commit, clearCache, timeoutMs: Math.min(timeoutMs, 60_000) });
  } else if (deployMode === "deploy_hook") {
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
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
    timeoutMs: positiveInt(argValue("timeout-ms"), DEFAULT_TIMEOUT_MS),
    pollMs: positiveInt(argValue("poll-ms"), DEFAULT_POLL_MS),
  }).then((result) => {
    console.info(JSON.stringify({
      final_status: result.artifact.final_status,
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
