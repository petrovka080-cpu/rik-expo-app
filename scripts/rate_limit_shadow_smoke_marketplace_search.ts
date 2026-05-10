import { execFileSync } from "child_process";
import fs from "fs";

import {
  InMemoryRateLimitAdapter,
  RateLimitStoreAdapter,
  RuntimeRateEnforcementProvider,
  createRateLimitShadowMonitor,
  observeRateLimitPrivateSmokeInShadowMonitor,
  runRateLimitPrivateSyntheticSmoke,
  type RateLimitStoreFetch,
} from "../src/shared/scale/rateLimitAdapters";
import {
  getRateEnforcementPolicy,
  type RateLimitEnforcementOperation,
} from "../src/shared/scale/rateLimitPolicies";
import { InMemoryScaleObservabilityAdapter } from "../src/shared/scale/scaleObservabilityAdapters";
import {
  classifyProductionBusinessReadonlyCanaryErrorCode,
  resolveProductionBusinessReadonlyCanaryServerAuthSecret,
} from "./load/productionBusinessReadonlyCanary";

type EnvMap = Record<string, string>;

type RenderEnvItem = {
  envVar?: { key?: string; value?: string };
  key?: string;
  value?: string;
};

type Matrix = Record<string, unknown> & {
  final_status: string;
};

const WAVE = "S_NIGHT_RATE_10_SHADOW_SMOKE_MARKETPLACE_SEARCH";
const ROUTE: RateLimitEnforcementOperation = "marketplace.catalog.search";
const ROUTE_KEY = "marketplace_catalog_search";
const MATRIX_PATH = "artifacts/S_NIGHT_RATE_10_SHADOW_SMOKE_MARKETPLACE_SEARCH_matrix.json";
const PROOF_PATH = "artifacts/S_NIGHT_RATE_10_SHADOW_SMOKE_MARKETPLACE_SEARCH_proof.md";
const ENV_PATH = ".env.agent.staging.local";

const SELECTED_SYNTHETIC_SUBJECT = "synthetic-wave10-marketplace-selected";
const NON_SELECTED_SYNTHETIC_SUBJECT = "synthetic-wave10-marketplace-non-selected";

const inProgressDeployStatuses = new Set([
  "created",
  "build_in_progress",
  "update_in_progress",
  "pre_deploy_in_progress",
  "deploy_in_progress",
  "live_pending",
]);

function loadEnv(path: string): EnvMap {
  if (!fs.existsSync(path)) return {};
  const env: EnvMap = {};
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line) || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    if (key) env[key] = line.slice(index + 1).trim();
  }
  return env;
}

function gitText(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function renderEnvItems(body: unknown): RenderEnvItem[] {
  if (Array.isArray(body)) return body as RenderEnvItem[];
  if (!body || typeof body !== "object") return [];
  const envVars = (body as { envVars?: unknown }).envVars;
  if (Array.isArray(envVars)) return envVars as RenderEnvItem[];
  const data = (body as { data?: unknown }).data;
  return Array.isArray(data) ? (data as RenderEnvItem[]) : [];
}

function envItemValue(items: RenderEnvItem[], key: string): string {
  for (const item of items) {
    const envVar = item.envVar ?? item;
    if (envVar.key === key && typeof envVar.value === "string") return envVar.value;
  }
  return "";
}

function classifyMode(value: string): string {
  if (!value) return "absent";
  if (value === "disabled") return "disabled";
  if (value === "observe_only") return "observe_only";
  if (value === "enforce_production_real_user_route_canary_only") return "route_canary_enforcement";
  if (value === "enforce_production_synthetic_canary_only") return "synthetic_canary_enforcement";
  if (value === "enforce_staging_test_namespace_only") return "staging_test_namespace_enforcement";
  return "other_present_redacted";
}

function statusClass(status: number | null): string {
  return status === null ? "not_run" : `${Math.trunc(status / 100)}xx`;
}

function writeArtifacts(matrix: Matrix): void {
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync(MATRIX_PATH, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    PROOF_PATH,
    [
      "# S_NIGHT_RATE_10_SHADOW_SMOKE_MARKETPLACE_SEARCH Proof",
      "",
      `final_status: ${matrix.final_status}`,
      "",
      "## Scope",
      `- route: ${String(matrix.route)}`,
      `- mode: ${String(matrix.shadow_mode)}`,
      `- enforcement_enabled_this_wave: ${String(matrix.enforcement_enabled_this_wave)}`,
      `- deploy_triggered: ${String(matrix.deploy_triggered)}`,
      `- cache_changes: ${String(matrix.cache_changes)}`,
      "",
      "## Deterministic Shadow Proof",
      `- provider_status: ${String(matrix.provider_status)}`,
      `- shadow_allow_decision: ${String(matrix.shadow_allow_decision)}`,
      `- shadow_throttle_decision: ${String(matrix.shadow_throttle_decision)}`,
      `- selected_synthetic_subject: ${String(matrix.selected_synthetic_subject_proof)}`,
      `- non_selected_subject: ${String(matrix.non_selected_subject_proof)}`,
      `- selected_response_blocked: ${String(matrix.selected_response_blocked)}`,
      `- non_selected_response_blocked: ${String(matrix.non_selected_response_blocked)}`,
      "",
      "## Metrics",
      `- before_observed_decision_count: ${String(matrix.monitor_before_observed_decision_count)}`,
      `- after_observed_decision_count: ${String(matrix.monitor_observed_decision_count)}`,
      `- before_would_allow_count: ${String(matrix.monitor_before_would_allow_count)}`,
      `- after_would_allow_count: ${String(matrix.monitor_would_allow_count)}`,
      `- before_would_throttle_count: ${String(matrix.monitor_before_would_throttle_count)}`,
      `- after_would_throttle_count: ${String(matrix.monitor_would_throttle_count)}`,
      `- key_cardinality_redacted: ${String(matrix.monitor_key_cardinality_redacted)}`,
      `- aggregate_events_recorded: ${String(matrix.monitor_aggregate_events_recorded)}`,
      `- aggregate_metrics_recorded: ${String(matrix.monitor_aggregate_metrics_recorded)}`,
      `- redaction_safe: ${String(matrix.redaction_safe)}`,
      "",
      "## Live Context",
      `- production_env_mode_class: ${String(matrix.production_env_mode_class)}`,
      `- production_private_smoke_status_class: ${String(matrix.production_private_smoke_status_class)}`,
      `- production_health_before_after: ${String(matrix.production_health_before)}/${String(matrix.production_health_after)}`,
      `- production_ready_before_after: ${String(matrix.production_ready_before)}/${String(matrix.production_ready_after)}`,
      "",
      "## Safety",
      "- raw subjects, keys, URLs, tokens, env values, payloads, DB rows, business rows: not printed",
      "- no enforcement enablement, no all-routes rollout, no cache changes, no deploy, no DB writes",
      "",
    ].join("\n"),
    "utf8",
  );
}

function fail(matrix: Matrix, exitCode = 2): never {
  writeArtifacts(matrix);
  console.log(JSON.stringify({
    final_status: matrix.final_status,
    artifact_json: MATRIX_PATH,
    artifact_proof: PROOF_PATH,
  }));
  process.exit(exitCode);
}

function createPrivateSmokeFetch(nowMs: number): RateLimitStoreFetch {
  const counts = new Map<string, number>();
  const operations = new Map<string, unknown>();
  return async (_input, init) => {
    const body = JSON.parse(init.body) as Record<string, unknown>;
    const command = String(body.command ?? "");
    const key = String(body.key ?? "");
    const policy = body.policy && typeof body.policy === "object"
      ? (body.policy as Record<string, unknown>)
      : {};
    const maxRequests = Number(policy.maxRequests ?? 1);
    const burst = Number(policy.burst ?? 1);
    const windowMs = Number(policy.windowMs ?? 60_000);
    const cost = Number(body.cost ?? 1);
    let result: unknown = null;

    if ((command === "check" || command === "consume") && key) {
      const current = counts.get(key) ?? 0;
      const next = current + cost;
      operations.set(key, body.operation);
      if (command === "consume" && next <= maxRequests + burst) counts.set(key, next);
      result = {
        state: next <= maxRequests ? "allowed" : next <= maxRequests + burst ? "soft_limited" : "hard_limited",
        key,
        operation: body.operation,
        remaining: Math.max(0, maxRequests - next),
        resetAtMs: nowMs + windowMs,
        retryAfterMs: next > maxRequests + burst ? 1_000 : null,
      };
    }

    if (command === "reset" && key) {
      counts.delete(key);
      operations.delete(key);
      result = { ok: true };
    }

    if (command === "status" && key) {
      result = {
        key,
        operation: operations.get(key),
        count: counts.get(key) ?? 0,
        resetAtMs: nowMs + windowMs,
      };
    }

    if (command === "refund" && key) {
      counts.set(key, Math.max(0, (counts.get(key) ?? 0) - cost));
      result = { ok: true };
    }

    return {
      ok: true,
      json: async () => ({ result }),
    };
  };
}

async function readRenderRuntimeContext(env: EnvMap): Promise<Record<string, unknown>> {
  const token = env.RENDER_API_TOKEN;
  const serviceId = env.RENDER_PRODUCTION_BFF_SERVICE_ID || env.RENDER_SERVICE_ID;
  if (!token || !serviceId) {
    return {
      render_config_present: false,
      production_env_mode_class: "not_read",
      production_route_allowlist_count: 0,
      production_canary_percent_class: "not_read",
      render_deploy_in_progress_before: false,
    };
  }

  const headers = {
    accept: "application/json",
    authorization: `Bearer ${token}`,
  };
  try {
    const [envResponse, deploysResponse] = await Promise.all([
      fetch(`https://api.render.com/v1/services/${encodeURIComponent(serviceId)}/env-vars?limit=100`, {
        headers,
      }),
      fetch(`https://api.render.com/v1/services/${encodeURIComponent(serviceId)}/deploys?limit=10`, {
        headers,
      }),
    ]);
    const envText = await envResponse.text();
    const deploysText = await deploysResponse.text();
    let envBody: unknown = null;
    let deploysBody: unknown = null;
    try {
      envBody = envText ? JSON.parse(envText) : null;
    } catch (error: unknown) {
      envBody = null;
    }
    try {
      deploysBody = deploysText ? JSON.parse(deploysText) : null;
    } catch (error: unknown) {
      deploysBody = null;
    }
    const items = renderEnvItems(envBody);
    const mode = envItemValue(items, "SCALE_RATE_ENFORCEMENT_MODE");
    const allowlist = envItemValue(items, "SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST")
      .split(/[,\s]+/)
      .filter(Boolean);
    const deploys = Array.isArray(deploysBody) ? deploysBody : [];
    const deployInProgress = deploys.some((item) => {
      const deploy = item && typeof item === "object" && "deploy" in item
        ? (item as { deploy?: unknown }).deploy
        : item;
      if (!deploy || typeof deploy !== "object") return false;
      const status = String((deploy as { status?: unknown }).status ?? "");
      return inProgressDeployStatuses.has(status);
    });
    return {
      render_config_present: true,
      render_env_read_status_class: statusClass(envResponse.status),
      render_deploys_read_status_class: statusClass(deploysResponse.status),
      production_env_mode_class: classifyMode(mode),
      production_route_allowlist_count: allowlist.length,
      production_canary_percent_class: envItemValue(items, "SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT")
        ? "present_redacted"
        : "absent",
      production_rate_limit_store_present: Boolean(envItemValue(items, "SCALE_RATE_LIMIT_STORE_URL")),
      production_rate_limit_namespace_present: Boolean(envItemValue(items, "SCALE_RATE_LIMIT_NAMESPACE")),
      production_rate_limit_metadata_enabled_present: Boolean(envItemValue(items, "BFF_RATE_LIMIT_METADATA_ENABLED")),
      render_deploy_in_progress_before: deployInProgress,
      render_values_printed: false,
    };
  } catch (error: unknown) {
    return {
      render_config_present: true,
      render_runtime_context_error_category: error instanceof Error ? "fetch_failed" : "unknown",
      production_env_mode_class: "not_read",
      production_route_allowlist_count: 0,
      production_canary_percent_class: "not_read",
      render_deploy_in_progress_before: false,
      render_values_printed: false,
    };
  }
}

async function readProductionStatus(env: EnvMap): Promise<Record<string, unknown>> {
  const baseUrl = env.BFF_PRODUCTION_BASE_URL || env.RENDER_SERVICE_URL;
  if (!baseUrl) {
    return {
      production_base_url_present: false,
      production_health_before: null,
      production_ready_before: null,
      production_health_after: null,
      production_ready_after: null,
      production_private_smoke_attempted: false,
    };
  }
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const fetchStatus = async (path: string): Promise<number | null> => {
    try {
      const response = await fetch(`${cleanBase}${path}`, { method: "GET" });
      await response.arrayBuffer().catch((error: unknown) => {
        if (error instanceof Error) return undefined;
        return undefined;
      });
      return response.status;
    } catch (error: unknown) {
      return null;
    }
  };

  const healthBefore = await fetchStatus("/health");
  const readyBefore = await fetchStatus("/ready");
  const auth = await resolveProductionBusinessReadonlyCanaryServerAuthSecret({ env });
  let privateSmokeStatus: number | null = null;
  let privateSmokeStatusValue = "not_run";
  let privateSmokeErrorCategory = "not_run";
  if (auth.secret) {
    try {
      const response = await fetch(`${cleanBase}/api/staging-bff/diagnostics/rate-limit-private-smoke`, {
        method: "POST",
        headers: { authorization: `Bearer ${auth.secret}` },
      });
      privateSmokeStatus = response.status;
      const text = await response.text().catch((error: unknown) => {
        if (error instanceof Error) return "";
        return "";
      });
      try {
        const parsed = text ? JSON.parse(text) : null;
        if (response.ok && parsed && typeof parsed === "object" && "data" in parsed) {
          const data = (parsed as { data?: unknown }).data;
          privateSmokeStatusValue =
            data && typeof data === "object" && typeof (data as { status?: unknown }).status === "string"
              ? String((data as { status?: unknown }).status)
              : "ready_payload_unavailable";
          privateSmokeErrorCategory = "none";
        } else {
          const error =
            parsed && typeof parsed === "object" && "error" in parsed
              ? (parsed as { error?: unknown }).error
              : null;
          const code =
            error && typeof error === "object" && "code" in error
              ? (error as { code?: unknown }).code
              : null;
          privateSmokeErrorCategory = classifyProductionBusinessReadonlyCanaryErrorCode(code);
        }
      } catch (error: unknown) {
        privateSmokeErrorCategory = response.ok ? "none" : "error_code_unavailable";
      }
    } catch (error: unknown) {
      privateSmokeStatus = null;
      privateSmokeErrorCategory = error instanceof Error ? "fetch_failed" : "unknown";
    }
  }
  const healthAfter = await fetchStatus("/health");
  const readyAfter = await fetchStatus("/ready");
  return {
    production_base_url_present: true,
    production_health_before: healthBefore,
    production_ready_before: readyBefore,
    production_health_after: healthAfter,
    production_ready_after: readyAfter,
    production_private_smoke_attempted: Boolean(auth.secret),
    production_private_smoke_status_class: statusClass(privateSmokeStatus),
    production_private_smoke_payload_status: privateSmokeStatusValue,
    production_private_smoke_error_category: privateSmokeErrorCategory,
    production_auth_source: auth.source,
    production_auth_resolution_status: auth.status,
    production_auth_secret_printed: false,
    production_urls_printed: false,
  };
}

async function main(): Promise<void> {
  const env = loadEnv(ENV_PATH);
  const branch = gitText(["rev-parse", "--abbrev-ref", "HEAD"]);
  const head = gitText(["rev-parse", "HEAD"]);
  const originMain = gitText(["rev-parse", "origin/main"]);
  const [behind, ahead] = gitText(["rev-list", "--left-right", "--count", "origin/main...HEAD"])
    .split(/\s+/)
    .map(Number);
  const worktreeClean = gitText(["status", "--short"]).length === 0;
  if (branch !== "main" || head !== originMain || ahead !== 0 || behind !== 0) {
    fail({
      final_status: "BLOCKED_RELEASE_GATES_FAILED",
      wave: WAVE,
      branch,
      head,
      origin_main: originMain,
      head_equals_origin_main: head === originMain,
      ahead,
      behind,
      worktree_clean: worktreeClean,
    });
  }

  const policy = getRateEnforcementPolicy(ROUTE);
  if (!policy) {
    fail({
      final_status: "BLOCKED_RATE_LIMIT_SHADOW_SMOKE_POLICY_MISSING",
      wave: WAVE,
      route: ROUTE,
    });
  }

  const nowMs = 1_800_000;
  const adapter = new InMemoryRateLimitAdapter({ now: () => nowMs });
  const provider = new RuntimeRateEnforcementProvider({
    mode: "observe_only",
    runtimeEnvironment: "staging",
    adapter,
    namespace: "rik-staging-shadow-smoke",
  });
  const observability = new InMemoryScaleObservabilityAdapter({ nowMs: () => nowMs });
  const monitor = createRateLimitShadowMonitor({ observability });
  const initialSnapshot = monitor.snapshot();
  const selectedKeyInput = {
    ipOrDeviceKey: SELECTED_SYNTHETIC_SUBJECT,
    routeKey: ROUTE_KEY,
  };
  const nonSelectedKeyInput = {
    ipOrDeviceKey: NON_SELECTED_SYNTHETIC_SUBJECT,
    routeKey: ROUTE_KEY,
  };

  const selectedAllowDecision = await provider.evaluate({
    operation: ROUTE,
    keyInput: selectedKeyInput,
    nowMs,
  });
  await monitor.observe(selectedAllowDecision);
  const selectedThrottleDecision = await provider.evaluate({
    operation: ROUTE,
    keyInput: selectedKeyInput,
    cost: policy.maxRequests + policy.burst + 1,
    nowMs,
  });
  await monitor.observe(selectedThrottleDecision);
  const nonSelectedAllowDecision = await provider.evaluate({
    operation: ROUTE,
    keyInput: nonSelectedKeyInput,
    nowMs,
  });
  await monitor.observe(nonSelectedAllowDecision);

  const privateSmokeAdapter = new RateLimitStoreAdapter({
    storeUrl: "https://rate-limit-store.invalid",
    namespace: "rik-staging-shadow-smoke",
    fetchImpl: createPrivateSmokeFetch(nowMs),
  });
  const privateSmoke = await runRateLimitPrivateSyntheticSmoke({
    adapter: privateSmokeAdapter,
    nowMs,
  });
  const privateSmokeMonitorResult = await observeRateLimitPrivateSmokeInShadowMonitor({
    monitor,
    result: privateSmoke,
  });

  const snapshot = monitor.snapshot();
  const serialized = JSON.stringify({
    snapshot,
    events: observability.events,
    metrics: observability.metrics,
    privateSmoke,
  });
  const redactionSafe =
    !serialized.includes(SELECTED_SYNTHETIC_SUBJECT) &&
    !serialized.includes(NON_SELECTED_SYNTHETIC_SUBJECT) &&
    !serialized.includes("rate:v1:") &&
    !serialized.includes("rate-limit-store.invalid");
  const providerHealth = provider.getHealth();
  const runtimeContext = await readRenderRuntimeContext(env);
  const productionStatus = await readProductionStatus(env);
  const routeShadowPass =
    selectedAllowDecision.operation === ROUTE &&
    selectedAllowDecision.providerState === "allowed" &&
    selectedAllowDecision.action === "observe" &&
    selectedAllowDecision.blocked === false &&
    selectedAllowDecision.realUsersBlocked === false &&
    selectedThrottleDecision.operation === ROUTE &&
    selectedThrottleDecision.providerState === "hard_limited" &&
    selectedThrottleDecision.action === "observe" &&
    selectedThrottleDecision.blocked === false &&
    selectedThrottleDecision.realUsersBlocked === false &&
    nonSelectedAllowDecision.providerState === "allowed" &&
    nonSelectedAllowDecision.blocked === false &&
    snapshot.wouldAllowCount >= 3 &&
    snapshot.wouldThrottleCount >= 2 &&
    snapshot.blockedDecisionsObserved === 0 &&
    snapshot.realUsersBlocked === false &&
    privateSmoke.status === "ready" &&
    privateSmokeMonitorResult.allowObserved &&
    privateSmokeMonitorResult.throttleObserved &&
    redactionSafe;

  const matrix: Matrix = {
    final_status: routeShadowPass
      ? "GREEN_RATE_LIMIT_SHADOW_SMOKE_MARKETPLACE_SEARCH"
      : "BLOCKED_RATE_LIMIT_SHADOW_SMOKE_MARKETPLACE_SEARCH_FAILED",
    wave: WAVE,
    generated_at: new Date().toISOString(),
    head,
    origin_main: originMain,
    head_equals_origin_main: head === originMain,
    ahead,
    behind,
    worktree_clean_at_runner_start: worktreeClean,
    runner_started_after_wave_edits: !worktreeClean,
    route: ROUTE,
    route_scope_count: 1,
    all_routes_enabled: false,
    shadow_mode: "observe_only",
    provider_status: "configured_local_deterministic",
    provider_kind: providerHealth.providerEnabled ? "in_memory" : "disabled",
    provider_enabled: providerHealth.providerEnabled,
    provider_external_network_enabled: providerHealth.externalNetworkEnabled,
    provider_blocks_real_users_globally: providerHealth.blocksRealUsersGlobally,
    provider_runtime_environment: providerHealth.runtimeEnvironment,
    selected_synthetic_subject_proof: "selected_synthetic_subject_redacted",
    non_selected_subject_proof: "non_selected_synthetic_subject_redacted",
    shadow_allow_decision: selectedAllowDecision.providerState,
    shadow_throttle_decision: selectedThrottleDecision.providerState,
    selected_response_blocked: selectedThrottleDecision.blocked,
    non_selected_response_blocked: nonSelectedAllowDecision.blocked,
    real_users_blocked: false,
    enforcement_enabled_this_wave: false,
    enforcement_action_used: "observe",
    route_policy_window_ms: policy.windowMs,
    route_policy_max_requests: policy.maxRequests,
    route_policy_burst: policy.burst,
    monitor_before_observed_decision_count: initialSnapshot.observedDecisionCount,
    monitor_before_would_allow_count: initialSnapshot.wouldAllowCount,
    monitor_before_would_throttle_count: initialSnapshot.wouldThrottleCount,
    monitor_before_key_cardinality_redacted: initialSnapshot.keyCardinalityRedacted,
    monitor_before_blocked_decisions_observed: initialSnapshot.blockedDecisionsObserved,
    monitor_observed_decision_count: snapshot.observedDecisionCount,
    monitor_would_allow_count: snapshot.wouldAllowCount,
    monitor_would_throttle_count: snapshot.wouldThrottleCount,
    monitor_key_cardinality_redacted: snapshot.keyCardinalityRedacted,
    monitor_invalid_decision_count: snapshot.invalidDecisionCount,
    monitor_blocked_decisions_observed: snapshot.blockedDecisionsObserved,
    monitor_aggregate_events_recorded: snapshot.aggregateEventsRecorded,
    monitor_aggregate_metrics_recorded: snapshot.aggregateMetricsRecorded,
    monitor_raw_keys_stored: snapshot.rawKeysStored,
    monitor_raw_keys_printed: snapshot.rawKeysPrinted,
    monitor_raw_payload_logged: snapshot.rawPayloadLogged,
    monitor_pii_logged: snapshot.piiLogged,
    observability_events_redacted: observability.events.every((event) => event.redacted === true),
    observability_metric_count: observability.metrics.length,
    private_smoke_path_available: true,
    private_smoke_status: privateSmoke.status,
    private_smoke_would_allow_verified: privateSmoke.wouldAllowVerified,
    private_smoke_would_throttle_verified: privateSmoke.wouldThrottleVerified,
    private_smoke_cleanup_ok: privateSmoke.cleanupOk,
    private_smoke_ttl_bounded: privateSmoke.ttlBounded,
    private_smoke_enforcement_enabled: privateSmoke.enforcementEnabled,
    private_smoke_production_user_blocked: privateSmoke.productionUserBlocked,
    private_smoke_raw_key_returned: privateSmoke.rawKeyReturned,
    private_smoke_raw_payload_logged: privateSmoke.rawPayloadLogged,
    private_smoke_pii_logged: privateSmoke.piiLogged,
    redaction_safe: redactionSafe,
    route_scope_unchanged: true,
    no_enforcement: true,
    no_all_routes: true,
    no_cache_changes: true,
    cache_changes: false,
    no_deploy: true,
    deploy_triggered: false,
    no_env_writes: true,
    render_env_write_triggered: false,
    no_db_writes: true,
    db_writes: false,
    no_migrations: true,
    no_rate_limit_config_mutation: true,
    no_load_test: true,
    total_production_business_route_requests: 0,
    ...runtimeContext,
    ...productionStatus,
    secrets_printed: false,
    env_values_printed: false,
    urls_printed: false,
    raw_keys_printed: false,
    raw_payloads_printed: false,
    business_rows_printed: false,
  };
  writeArtifacts(matrix);
  console.log(JSON.stringify({
    final_status: matrix.final_status,
    artifact_json: MATRIX_PATH,
    artifact_proof: PROOF_PATH,
  }));
  if (!routeShadowPass) process.exit(2);
}

main().catch((error: unknown) => {
  fail({
    final_status: "BLOCKED_RATE_LIMIT_SHADOW_SMOKE_MARKETPLACE_SEARCH_FAILED",
    wave: WAVE,
    error_category: error instanceof Error ? "runtime_error" : "unknown_error",
  });
});
