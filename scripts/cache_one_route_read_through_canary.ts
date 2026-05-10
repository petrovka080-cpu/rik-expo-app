import fs from "fs";
import { execFileSync } from "child_process";

import { buildSafeCacheKey } from "../src/shared/scale/cacheKeySafety";
import { getCachePolicy } from "../src/shared/scale/cachePolicies";
import {
  classifyProductionBusinessReadonlyCanaryErrorCode,
  resolveProductionBusinessReadonlyCanaryServerAuthSecret,
} from "./load/productionBusinessReadonlyCanary";

type EnvMap = Record<string, string | undefined>;

type FinalStatus =
  | "GREEN_CACHE_ONE_ROUTE_PASS_AND_ROLLED_BACK"
  | "BLOCKED_CACHE_CANARY_FAILED_ROLLED_BACK"
  | "BLOCKED_CACHE_CANARY_FAILED_ROLLBACK_FAILED";

type Matrix = Record<string, unknown> & {
  final_status: FinalStatus;
};

type RenderEnvItem = {
  envVar?: { key?: string; value?: string };
  key?: string;
  value?: string;
};

type DeployRecord = {
  id?: string;
  status?: string;
  commit?: { id?: string };
  commitId?: string;
};

type ApiResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

type EnvSnapshotValue = {
  present: boolean;
  valueClass: "present_redacted" | "absent";
};

type PreviousEnvValue = {
  present: boolean;
  value: string;
};

type RouteCallResult = {
  ok: boolean;
  status: number | null;
  statusClass: string;
  cacheHit: boolean | null;
  contractShape: string;
  errorCategory: string;
};

const WAVE = "S_CACHE_02_ONE_ROUTE_READ_THROUGH_CANARY";
const MATRIX_PATH = "artifacts/S_CACHE_02_ONE_ROUTE_READ_THROUGH_CANARY_matrix.json";
const PROOF_PATH = "artifacts/S_CACHE_02_ONE_ROUTE_READ_THROUGH_CANARY_proof.md";
const ENV_FILE = ".env.agent.staging.local";

const CANARY_ROUTE = "marketplace.catalog.search";
const CANARY_PATH = "/api/staging-bff/read/marketplace-catalog-search";
const CANARY_PERCENT = "1";
const UTF8_QUERY_PREFIX = "\u0446\u0435\u043c\u0435\u043d\u0442 \u0411\u0438\u0448\u043a\u0435\u043a";
const CANARY_COMPANY_CLASS = "company-cache-s02-one-route";

const REQUIRED_APPROVALS = [
  "CACHE_CANARY_APPROVED",
  "ROLLBACK_APPROVED",
  "S_CACHE_PRODUCTION_READ_THROUGH_CANARY_PREFLIGHT_APPROVED",
  "S_CACHE_PRODUCTION_READ_THROUGH_CANARY_APPLY_APPROVED",
  "S_CACHE_PRODUCTION_READ_THROUGH_CANARY_ROLLBACK_APPROVED",
] as const;

const CACHE_ENV_WRITE_VALUES: Readonly<Record<string, string>> = Object.freeze({
  SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
  SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
  SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED: "true",
  SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: CANARY_ROUTE,
  SCALE_REDIS_CACHE_SHADOW_PERCENT: CANARY_PERCENT,
});

const CACHE_ENV_SNAPSHOT_KEYS = [
  ...Object.keys(CACHE_ENV_WRITE_VALUES),
  "SCALE_REDIS_CACHE_NAMESPACE",
  "SCALE_REDIS_CACHE_URL",
  "REDIS_URL",
  "SCALE_REDIS_CACHE_COMMAND_TIMEOUT_MS",
] as const;

const inProgressDeployStatuses = new Set([
  "created",
  "build_in_progress",
  "update_in_progress",
  "pre_deploy_in_progress",
  "deploy_in_progress",
  "live_pending",
]);

const failedDeployStatuses = new Set([
  "build_failed",
  "update_failed",
  "pre_deploy_failed",
  "deploy_failed",
  "canceled",
]);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function loadEnv(path: string): EnvMap {
  const env: EnvMap = {};
  if (!fs.existsSync(path)) return env;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line) || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    if (key) env[key] = line.slice(index + 1).trim();
  }
  return env;
}

function writeArtifacts(matrix: Matrix): void {
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync(MATRIX_PATH, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    PROOF_PATH,
    [
      "# S_CACHE_02_ONE_ROUTE_READ_THROUGH_CANARY Proof",
      "",
      `final_status: ${matrix.final_status}`,
      "",
      "## Summary",
      `- route: ${CANARY_ROUTE}`,
      `- route_count: ${String(matrix.route_allowlist_count ?? 0)}`,
      `- canary_percent: ${String(matrix.canary_percent ?? "not_run")}`,
      `- first_request_miss_read_through: ${String(matrix.first_request_miss_read_through ?? false)}`,
      `- second_request_hit: ${String(matrix.second_request_hit ?? false)}`,
      `- response_contract_unchanged: ${String(matrix.response_contract_unchanged ?? false)}`,
      `- rollback_triggered: ${String(matrix.rollback_triggered ?? false)}`,
      `- rollback_succeeded: ${String(matrix.rollback_succeeded ?? false)}`,
      "",
      "## Safety",
      "- cache env snapshot values are redacted to presence/value class only.",
      "- no DB writes, migrations, Supabase project changes, rate-limit changes, load tests, OTA/EAS/TestFlight/native builds, or production mutation routes were performed.",
      "- raw cache keys, cache values, URLs, tokens, env values, request payloads, DB rows, and business rows were not printed.",
      "",
    ].join("\n"),
    "utf8",
  );
}

function finish(matrix: Matrix, exitCode: number): never {
  writeArtifacts(matrix);
  console.log(
    JSON.stringify({
      final_status: matrix.final_status,
      artifact_json: MATRIX_PATH,
      artifact_proof: PROOF_PATH,
    }),
  );
  process.exit(exitCode);
}

function gitText(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function getDeploy(item: unknown): DeployRecord {
  const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
  return record.deploy && typeof record.deploy === "object"
    ? (record.deploy as DeployRecord)
    : (record as DeployRecord);
}

function renderEnvItems(body: unknown): RenderEnvItem[] {
  if (Array.isArray(body)) return body as RenderEnvItem[];
  if (!body || typeof body !== "object") return [];
  const record = body as Record<string, unknown>;
  if (Array.isArray(record.envVars)) return record.envVars as RenderEnvItem[];
  if (Array.isArray(record.data)) return record.data as RenderEnvItem[];
  return [];
}

function envItemValue(items: readonly RenderEnvItem[], key: string): PreviousEnvValue {
  for (const item of items) {
    const envVar = item.envVar ?? item;
    if (envVar.key === key && typeof envVar.value === "string") {
      return { present: envVar.value.length > 0, value: envVar.value };
    }
  }
  return { present: false, value: "" };
}

function redactedSnapshot(items: readonly RenderEnvItem[]): Record<string, EnvSnapshotValue> {
  return Object.fromEntries(
    CACHE_ENV_SNAPSHOT_KEYS.map((key) => {
      const value = envItemValue(items, key);
      return [
        key,
        {
          present: value.present,
          valueClass: value.present ? "present_redacted" : "absent",
        } satisfies EnvSnapshotValue,
      ];
    }),
  );
}

function statusClass(status: number | null): string {
  return status == null ? "error" : `${Math.trunc(status / 100)}xx`;
}

function hashForCacheReadThroughPercent(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function selectedForPercent(key: string, percent: number): boolean {
  if (percent >= 100) return true;
  if (percent <= 0) return false;
  return hashForCacheReadThroughPercent(key) % 100 < percent;
}

function buildCanaryInput(nonce: string): Record<string, unknown> {
  return {
    companyId: CANARY_COMPANY_CLASS,
    query: `${UTF8_QUERY_PREFIX} ${nonce}`,
    category: "materials",
    page: 1,
    pageSize: 1,
    locale: "ru-KG",
    filters: {
      kind: "material",
      scope: "public",
      sort: "price",
      direction: "asc",
    },
  };
}

function findPercentSelectedCanaryInput(): {
  input: Record<string, unknown>;
  attempts: number;
  utf8Used: true;
} {
  const policy = getCachePolicy(CANARY_ROUTE);
  if (!policy) throw new Error("cache_policy_missing");
  const prefix = `s-cache-02-one-route-${Date.now().toString(36)}`;
  for (let index = 0; index < 20_000; index += 1) {
    const input = buildCanaryInput(`${prefix}-${index.toString(36)}`);
    const keyResult = buildSafeCacheKey(policy, input);
    if (keyResult.ok && selectedForPercent(keyResult.key, Number(CANARY_PERCENT))) {
      return { input, attempts: index + 1, utf8Used: true };
    }
  }
  throw new Error("percent_selected_key_unavailable");
}

function contractShapeOf(body: unknown): string {
  if (!body || typeof body !== "object") return JSON.stringify(body);
  const record = { ...(body as Record<string, unknown>) };
  const timing = record.serverTiming;
  if (timing && typeof timing === "object") {
    const timingRecord = { ...(timing as Record<string, unknown>) };
    delete timingRecord.cacheHit;
    record.serverTiming = timingRecord;
  }
  return JSON.stringify(record);
}

function cacheHitFromBody(body: unknown): boolean | null {
  if (!body || typeof body !== "object") return null;
  const timing = (body as Record<string, unknown>).serverTiming;
  if (!timing || typeof timing !== "object") return null;
  const cacheHit = (timing as Record<string, unknown>).cacheHit;
  return typeof cacheHit === "boolean" ? cacheHit : null;
}

async function readBffErrorCategory(response: Response, bodyText: string): Promise<string> {
  if (response.ok) return "none";
  try {
    const parsed: unknown = bodyText ? JSON.parse(bodyText) : null;
    const error =
      parsed && typeof parsed === "object" && "error" in parsed
        ? (parsed as { error?: unknown }).error
        : null;
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: unknown }).code
        : null;
    return classifyProductionBusinessReadonlyCanaryErrorCode(code);
  } catch (_error: unknown) {
    return "error_code_unavailable";
  }
}

async function parseResponseJson(response: Response): Promise<{ body: unknown; text: string }> {
  const text = await response.text();
  try {
    return { body: text ? JSON.parse(text) : null, text };
  } catch (_error: unknown) {
    return { body: null, text };
  }
}

async function main(): Promise<void> {
  const fileEnv = loadEnv(ENV_FILE);
  const env: EnvMap = { ...process.env, ...fileEnv };
  const approvals = Object.fromEntries(REQUIRED_APPROVALS.map((key) => [key, env[key] === "true"]));
  const approvalsPresent = Object.values(approvals).every(Boolean);
  if (!approvalsPresent) {
    finish(
      {
        wave: WAVE,
        final_status: "BLOCKED_CACHE_CANARY_FAILED_ROLLED_BACK",
        approvals,
        approvals_present: false,
        cache_env_written: false,
        rollback_required: false,
        rollback_triggered: false,
        rollback_succeeded: true,
      },
      2,
    );
  }

  const head = gitText(["rev-parse", "HEAD"]);
  const originMain = gitText(["rev-parse", "origin/main"]);
  const [ahead, behind] = gitText(["rev-list", "--left-right", "--count", "HEAD...origin/main"])
    .split(/\s+/)
    .map(Number);
  const worktreeClean = gitText(["status", "--short"]).length === 0;
  if (head !== originMain || ahead !== 0 || behind !== 0 || !worktreeClean) {
    finish(
      {
        wave: WAVE,
        final_status: "BLOCKED_CACHE_CANARY_FAILED_ROLLED_BACK",
        approvals,
        approvals_present: true,
        head,
        origin_main: originMain,
        head_equals_origin_main: head === originMain,
        ahead,
        behind,
        worktree_clean: worktreeClean,
        cache_env_written: false,
        rollback_required: false,
        rollback_triggered: false,
        rollback_succeeded: true,
      },
      2,
    );
  }

  const token = env.RENDER_API_TOKEN;
  const serviceId = env.RENDER_PRODUCTION_BFF_SERVICE_ID || env.RENDER_SERVICE_ID;
  const baseUrl = env.BFF_PRODUCTION_BASE_URL || env.RENDER_SERVICE_URL;
  if (!token || !serviceId || !baseUrl) {
    finish(
      {
        wave: WAVE,
        final_status: "BLOCKED_CACHE_CANARY_FAILED_ROLLED_BACK",
        approvals,
        approvals_present: true,
        render_config_present: false,
        cache_env_written: false,
        rollback_required: false,
        rollback_triggered: false,
        rollback_succeeded: true,
      },
      2,
    );
  }

  const cleanBase = baseUrl.replace(/\/+$/, "");
  const api = async (path: string, init: RequestInit = {}): Promise<ApiResult> => {
    const response = await fetch(`https://api.render.com/v1${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (_error: unknown) {
      body = null;
    }
    return { ok: response.ok, status: response.status, body };
  };

  const putEnv = (key: string, value: string): Promise<ApiResult> =>
    api(`/services/${encodeURIComponent(serviceId)}/env-vars/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value }),
    });

  const deleteEnv = (key: string): Promise<ApiResult> =>
    api(`/services/${encodeURIComponent(serviceId)}/env-vars/${encodeURIComponent(key)}`, {
      method: "DELETE",
    });

  const triggerDeploy = (): Promise<ApiResult> =>
    api(`/services/${encodeURIComponent(serviceId)}/deploys`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ commitId: head }),
    });

  const waitForLive = async (): Promise<{
    live: boolean;
    latestStatus: string;
    containsHead: boolean | "unknown";
  }> => {
    let latestStatus = "unknown";
    let containsHead: boolean | "unknown" = "unknown";
    for (let attempt = 0; attempt < 72; attempt += 1) {
      await sleep(attempt === 0 ? 5_000 : 10_000);
      const result = await api(`/services/${encodeURIComponent(serviceId)}/deploys?limit=5`);
      const deploys = Array.isArray(result.body) ? result.body.map(getDeploy) : [];
      const latest = deploys[0] ?? {};
      latestStatus = String(latest.status || "unknown");
      const commitId = String(latest.commit?.id || latest.commitId || "");
      containsHead = commitId ? commitId.startsWith(head) || head.startsWith(commitId) : "unknown";
      if (latestStatus === "live") return { live: true, latestStatus, containsHead };
      if (failedDeployStatuses.has(latestStatus)) return { live: false, latestStatus, containsHead };
    }
    return { live: false, latestStatus, containsHead };
  };

  const fetchJson = async (path: string, init: RequestInit = {}): Promise<{ status: number | null; body: unknown }> => {
    try {
      const response = await fetch(`${cleanBase}${path}`, {
        ...init,
        headers: {
          accept: "application/json",
          ...(init.headers ?? {}),
        },
      });
      return { status: response.status, body: (await parseResponseJson(response)).body };
    } catch (_error: unknown) {
      return { status: null, body: null };
    }
  };

  const serviceResult = await api(`/services/${encodeURIComponent(serviceId)}`);
  const service = serviceResult.body && typeof serviceResult.body === "object"
    ? (serviceResult.body as Record<string, unknown>)
    : {};
  const serviceDetails = service.serviceDetails && typeof service.serviceDetails === "object"
    ? (service.serviceDetails as Record<string, unknown>)
    : {};
  const autoDeploy = String(service.autoDeploy ?? serviceDetails.autoDeploy ?? "unknown").toLowerCase();
  const autoDeploySafe = autoDeploy === "no" || autoDeploy === "false";
  const deploysBeforeResult = await api(`/services/${encodeURIComponent(serviceId)}/deploys?limit=10`);
  const deploysBefore = Array.isArray(deploysBeforeResult.body)
    ? deploysBeforeResult.body.map(getDeploy)
    : [];
  const deployInProgressBefore = deploysBefore.some((deploy) =>
    inProgressDeployStatuses.has(String(deploy.status || "")),
  );
  const healthBefore = await fetchJson("/health");
  const readyBefore = await fetchJson("/ready");
  const envResult = await api(`/services/${encodeURIComponent(serviceId)}/env-vars?limit=100`);
  const envItems = renderEnvItems(envResult.body);
  const previous = Object.fromEntries(
    Object.keys(CACHE_ENV_WRITE_VALUES).map((key) => [key, envItemValue(envItems, key)]),
  ) as Record<string, PreviousEnvValue>;
  const snapshot = redactedSnapshot(envItems);

  const auth = await resolveProductionBusinessReadonlyCanaryServerAuthSecret({ env });
  const canarySelection = findPercentSelectedCanaryInput();

  const callReadRoute = async (): Promise<RouteCallResult> => {
    if (!auth.secret) {
      return {
        ok: false,
        status: null,
        statusClass: "error",
        cacheHit: null,
        contractShape: "auth_missing",
        errorCategory: "auth_category",
      };
    }
    try {
      const response = await fetch(`${cleanBase}${CANARY_PATH}`, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${auth.secret}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          input: canarySelection.input,
          metadata: {
            cacheCanary: "present_redacted",
          },
        }),
      });
      const parsed = await parseResponseJson(response);
      return {
        ok: response.ok,
        status: response.status,
        statusClass: statusClass(response.status),
        cacheHit: cacheHitFromBody(parsed.body),
        contractShape: contractShapeOf(parsed.body),
        errorCategory: await readBffErrorCategory(response, parsed.text),
      };
    } catch (_error: unknown) {
      return {
        ok: false,
        status: null,
        statusClass: "error",
        cacheHit: null,
        contractShape: "request_error",
        errorCategory: "transport_error",
      };
    }
  };

  const buildBaseMatrix = (): Matrix => ({
    wave: WAVE,
    final_status: "BLOCKED_CACHE_CANARY_FAILED_ROLLED_BACK",
    approvals,
    approvals_present: true,
    head,
    origin_main: originMain,
    head_equals_origin_main: true,
    ahead,
    behind,
    worktree_clean_before: true,
    render_config_present: true,
    render_auto_deploy: autoDeploy,
    deploy_in_progress_before: deployInProgressBefore,
    production_health_before: healthBefore.status,
    production_ready_before: readyBefore.status,
    env_snapshot_captured: envResult.ok,
    env_snapshot_redacted: snapshot,
    auth_source: auth.source,
    auth_resolution_status: auth.status,
    route: CANARY_ROUTE,
    route_path_class: "marketplace_catalog_search",
    route_allowlist_count: 1,
    route_readonly: true,
    canary_percent: Number(CANARY_PERCENT),
    unique_cache_key_strategy: "utf8_query_nonce_percent_selected_redacted",
    utf8_input_used: canarySelection.utf8Used,
    percent_selection_attempts: canarySelection.attempts,
    cache_env_written: false,
    rollback_required: false,
    rollback_triggered: false,
    rollback_succeeded: true,
    db_writes: false,
    migrations_applied: false,
    rate_limit_changes: false,
    load_test_run: false,
    supabase_project_changes: false,
    production_mutation_calls: false,
    secrets_printed: false,
    env_values_printed: false,
    urls_printed: false,
    raw_cache_keys_printed: false,
    raw_cache_values_printed: false,
    raw_payloads_printed: false,
    raw_db_rows_printed: false,
    business_rows_printed: false,
  });

  const baseMatrix = buildBaseMatrix();
  const preflightOk =
    serviceResult.ok &&
    envResult.ok &&
    autoDeploySafe &&
    !deployInProgressBefore &&
    healthBefore.status === 200 &&
    readyBefore.status === 200 &&
    auth.secret.length > 0;

  const baselineRead = preflightOk ? await callReadRoute() : null;
  if (!preflightOk || !baselineRead?.ok) {
    finish(
      {
        ...baseMatrix,
        final_status: "BLOCKED_CACHE_CANARY_FAILED_ROLLED_BACK",
        preflight_ok: false,
        service_api_read_ok: serviceResult.ok,
        env_api_read_ok: envResult.ok,
        render_auto_deploy_safe: autoDeploySafe,
        baseline_read_status_class: baselineRead?.statusClass ?? "not_run",
        baseline_read_error_category: baselineRead?.errorCategory ?? "not_run",
      },
      2,
    );
  }

  const restoreEnv = async (): Promise<{ attempted: true; ok: boolean; live: boolean; latestStatus: string }> => {
    const restoreResults = await Promise.all(
      Object.keys(CACHE_ENV_WRITE_VALUES).map((key) =>
        previous[key].present ? putEnv(key, previous[key].value) : deleteEnv(key),
      ),
    );
    const envOk = restoreResults.every((result) => result.ok || result.status === 404);
    const deploy = await triggerDeploy();
    const live = deploy.ok ? await waitForLive() : { live: false, latestStatus: "deploy_trigger_failed", containsHead: "unknown" as const };
    return { attempted: true, ok: envOk && live.live, live: live.live, latestStatus: live.latestStatus };
  };

  const applyResults = await Promise.all(
    Object.entries(CACHE_ENV_WRITE_VALUES).map(([key, value]) => putEnv(key, value)),
  );
  if (!applyResults.every((result) => result.ok)) {
    const rollback = await restoreEnv();
    finish(
      {
        ...baseMatrix,
        final_status: rollback.ok
          ? "BLOCKED_CACHE_CANARY_FAILED_ROLLED_BACK"
          : "BLOCKED_CACHE_CANARY_FAILED_ROLLBACK_FAILED",
        baseline_read_status_class: baselineRead.statusClass,
        baseline_cache_hit: baselineRead.cacheHit,
        cache_env_written: false,
        rollback_required: true,
        rollback_triggered: rollback.attempted,
        rollback_succeeded: rollback.ok,
        rollback_latest_deploy_status: rollback.latestStatus,
      },
      2,
    );
  }

  const deployResult = await triggerDeploy();
  const live = deployResult.ok
    ? await waitForLive()
    : { live: false, latestStatus: "deploy_trigger_failed", containsHead: "unknown" as const };
  const healthAfterDeploy = await fetchJson("/health");
  const readyAfterDeploy = await fetchJson("/ready");
  const runtime =
    readyAfterDeploy.body && typeof readyAfterDeploy.body === "object"
      ? (((readyAfterDeploy.body as Record<string, unknown>).data as Record<string, unknown> | undefined)
          ?.cacheShadowRuntime as Record<string, unknown> | undefined)
      : undefined;
  const runtimeScoped =
    runtime?.status === "configured" &&
    runtime?.enabled === true &&
    runtime?.mode === "read_through" &&
    runtime?.readThroughV1Enabled === true &&
    runtime?.percent === Number(CANARY_PERCENT) &&
    runtime?.routeAllowlistCount === 1;

  let firstRead: RouteCallResult | null = null;
  let secondRead: RouteCallResult | null = null;
  let monitorAfter: { status: number | null; body: unknown } | null = null;
  let redactionSafe = false;
  if (live.live && healthAfterDeploy.status === 200 && readyAfterDeploy.status === 200 && runtimeScoped) {
    firstRead = await callReadRoute();
    await sleep(500);
    secondRead = await callReadRoute();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      monitorAfter = await fetchJson("/api/staging-bff/monitor/cache-shadow", {
        method: "GET",
        headers: auth.secret ? { authorization: `Bearer ${auth.secret}` } : {},
      });
      const output = JSON.stringify(monitorAfter.body);
      const hasCounts =
        output.includes('"hitCount"') &&
        output.includes('"missCount"') &&
        output.includes('"readThroughCount"');
      if (monitorAfter.status === 200 && hasCounts) break;
      await sleep(500);
    }
    const monitorOutput = JSON.stringify(monitorAfter?.body ?? null);
    redactionSafe =
      monitorAfter?.status === 200 &&
      !monitorOutput.includes("cache:v1:") &&
      !monitorOutput.includes(CANARY_COMPANY_CLASS) &&
      !monitorOutput.includes(UTF8_QUERY_PREFIX) &&
      !monitorOutput.includes("s-cache-02-one-route") &&
      !monitorOutput.toLowerCase().includes("token") &&
      !monitorOutput.toLowerCase().includes("secret");
  }

  const firstRequestMiss = firstRead?.ok === true && firstRead.cacheHit === false;
  const secondRequestHit = secondRead?.ok === true && secondRead.cacheHit === true;
  const responseContractUnchanged =
    Boolean(firstRead && secondRead) &&
    baselineRead.contractShape === firstRead?.contractShape &&
    firstRead.contractShape === secondRead?.contractShape;
  const canaryPassed =
    live.live &&
    healthAfterDeploy.status === 200 &&
    readyAfterDeploy.status === 200 &&
    runtimeScoped &&
    firstRequestMiss &&
    secondRequestHit &&
    responseContractUnchanged &&
    redactionSafe;

  const rollback = await restoreEnv();
  const healthAfterRollback = await fetchJson("/health");
  const readyAfterRollback = await fetchJson("/ready");
  const rollbackStable = rollback.ok && healthAfterRollback.status === 200 && readyAfterRollback.status === 200;

  const finalStatus: FinalStatus = canaryPassed && rollbackStable
    ? "GREEN_CACHE_ONE_ROUTE_PASS_AND_ROLLED_BACK"
    : rollbackStable
      ? "BLOCKED_CACHE_CANARY_FAILED_ROLLED_BACK"
      : "BLOCKED_CACHE_CANARY_FAILED_ROLLBACK_FAILED";

  finish(
    {
      ...baseMatrix,
      final_status: finalStatus,
      preflight_ok: true,
      service_api_read_ok: serviceResult.ok,
      env_api_read_ok: envResult.ok,
      render_auto_deploy_safe: autoDeploySafe,
      baseline_read_status_class: baselineRead.statusClass,
      baseline_cache_hit: baselineRead.cacheHit,
      cache_env_written: true,
      approved_cache_env_keys_written_count: Object.keys(CACHE_ENV_WRITE_VALUES).length,
      deploy_triggered: deployResult.ok,
      latest_deploy_live: live.live,
      live_deploy_contains_head_commit: live.containsHead,
      production_health_after_deploy: healthAfterDeploy.status,
      production_ready_after_deploy: readyAfterDeploy.status,
      runtime_status: runtime?.status ?? "unknown",
      runtime_mode: runtime?.mode ?? "unknown",
      runtime_read_through_v1_enabled: runtime?.readThroughV1Enabled ?? "unknown",
      runtime_percent: runtime?.percent ?? "unknown",
      runtime_route_allowlist_count: runtime?.routeAllowlistCount ?? "unknown",
      runtime_scoped_only: runtimeScoped,
      first_read_status_class: firstRead?.statusClass ?? "not_run",
      second_read_status_class: secondRead?.statusClass ?? "not_run",
      first_request_miss_read_through: firstRequestMiss,
      second_request_hit: secondRequestHit,
      response_contract_unchanged: responseContractUnchanged,
      utf8_safe: canarySelection.utf8Used,
      monitor_status: monitorAfter?.status ?? "not_run",
      metrics_redacted: redactionSafe,
      rollback_required: true,
      rollback_triggered: rollback.attempted,
      rollback_succeeded: rollbackStable,
      rollback_latest_deploy_status: rollback.latestStatus,
      production_health_after_rollback: healthAfterRollback.status,
      production_ready_after_rollback: readyAfterRollback.status,
      canary_retained: false,
      retention_policy_explicitly_allowed: false,
      total_read_route_requests: 3,
      total_production_mutation_requests: 0,
      cache_canary_passed: canaryPassed,
    },
    finalStatus === "GREEN_CACHE_ONE_ROUTE_PASS_AND_ROLLED_BACK" ? 0 : 2,
  );
}

main().catch((error: unknown) => {
  finish(
    {
      wave: WAVE,
      final_status: "BLOCKED_CACHE_CANARY_FAILED_ROLLED_BACK",
      error_category: error instanceof Error ? error.message : "unknown_error",
      cache_env_written: "unknown",
      rollback_triggered: false,
      rollback_succeeded: false,
      secrets_printed: false,
    },
    2,
  );
});
