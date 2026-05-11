import fs from "fs";
import { execFileSync } from "child_process";

import { buildSafeCacheKey } from "../../src/shared/scale/cacheKeySafety";
import { getCachePolicy } from "../../src/shared/scale/cachePolicies";
import {
  CACHE_READ_THROUGH_ONE_ROUTE,
  CACHE_READ_THROUGH_ONE_ROUTE_MODE,
  CACHE_READ_THROUGH_ONE_ROUTE_PERCENT,
  buildCacheReadThroughOneRouteApplyEnv,
} from "../../src/shared/scale/cacheShadowRuntime";
import {
  classifyProductionBusinessReadonlyCanaryErrorCode,
  resolveProductionBusinessReadonlyCanaryServerAuthSecret,
} from "../load/productionBusinessReadonlyCanary";

type EnvMap = Record<string, string | undefined>;
type JsonRecord = Record<string, unknown>;
type RenderEnvItem = {
  envVar?: { key?: string; value?: string };
  key?: string;
  value?: string;
};
type PreviousEnvValue = {
  present: boolean;
  value: string;
};
type ApiResult = {
  ok: boolean;
  status: number;
  body: unknown;
};
type DeployRecord = {
  status?: string;
  commit?: { id?: string };
  commitId?: string;
};
type RouteCallResult = {
  ok: boolean;
  status: number | null;
  statusClass: string;
  bodyOk: boolean | null;
  cacheHit: boolean | null;
  responseBytesBucket: string;
  contractShape: string;
  errorCategory: string;
  latencyMs: number | null;
};
type MonitorCounts = {
  status: number | null;
  shadowReadAttemptedCount: number | null;
  hitCount: number | null;
  missCount: number | null;
  readThroughCount: number | null;
  skippedCount: number | null;
  errorCount: number | null;
  routeMetricsRedactionSafe: boolean | null;
  outputRedactionSafe: boolean;
};
type RollbackResult = {
  attempted: boolean;
  restored: boolean;
  deployTriggered: boolean;
  live: boolean;
  latestStatus: string;
  health: number | null;
  ready: number | null;
  ok: boolean;
};
type FinalStatus =
  | "GREEN_CACHE_MARKETPLACE_SEARCH_PERMANENTLY_ENABLED"
  | "BLOCKED_CACHE_RUNTIME_NOT_SCOPED_TO_ONE_ROUTE"
  | "BLOCKED_CACHE_SECOND_HIT_FAILED_ROLLED_BACK"
  | "BLOCKED_CACHE_HEALTH_NOT_GREEN_ROLLED_BACK";

const WAVE = "S_CACHE_03_MARKETPLACE_SEARCH_PERMANENT_ONE_ROUTE_ENABLE";
const TARGET_ROUTE = CACHE_READ_THROUGH_ONE_ROUTE;
const TARGET_ROUTE_PATH = "/api/staging-bff/read/marketplace-catalog-search";
const NON_ALLOWED_ROUTE = "warehouse.ledger.list";
const NON_ALLOWED_ROUTE_PATH = "/api/staging-bff/read/warehouse-ledger-list";
const MATRIX_PATH = "artifacts/S_CACHE_03_MARKETPLACE_SEARCH_PERMANENT_ENABLE_matrix.json";
const PROOF_PATH = "artifacts/S_CACHE_03_MARKETPLACE_SEARCH_PERMANENT_ENABLE_proof.md";
const METRICS_PATH = "artifacts/S_CACHE_03_MARKETPLACE_SEARCH_PERMANENT_ENABLE_metrics.json";
const ENV_FILE = ".env.agent.staging.local";
const COMPANY_CLASS = "company-cache-s03-permanent";
const QUERY_PREFIX = "cement bishkek";

export const CACHE_MARKETPLACE_SEARCH_PERMANENT_ENV_VALUES =
  buildCacheReadThroughOneRouteApplyEnv("persistent");
export const CACHE_MARKETPLACE_SEARCH_PERMANENT_ARTIFACTS = Object.freeze({
  matrix: MATRIX_PATH,
  proof: PROOF_PATH,
  metrics: METRICS_PATH,
});
export const CACHE_MARKETPLACE_SEARCH_PERMANENT_ROUTE = TARGET_ROUTE;
export const CACHE_MARKETPLACE_SEARCH_NON_ALLOWED_ROUTE = NON_ALLOWED_ROUTE;

const PREREQUISITES = Object.freeze([
  {
    name: "S_CACHE_01",
    path: "artifacts/S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF_matrix.json",
    statusKeys: ["status", "final_status"],
    greenStatuses: ["GREEN_CACHE_COLD_MISS_DETERMINISTIC_PROOF_READY"],
  },
  {
    name: "S_CACHE_02",
    path: "artifacts/S_CACHE_02_COLD_MISS_PROOF_RATCHET_matrix.json",
    statusKeys: ["status", "final_status"],
    greenStatuses: ["GREEN_CACHE_COLD_MISS_PROOF_RATCHET_READY"],
  },
  {
    name: "S_NIGHT_CACHE_08",
    path: "artifacts/S_NIGHT_CACHE_08_COLD_MISS_SECOND_HIT_PROOF_matrix.json",
    statusKeys: ["status", "final_status"],
    greenStatuses: ["GREEN_CACHE_COLD_MISS_SECOND_HIT_PROOF"],
  },
  {
    name: "S_CACHE_RATE_01",
    path: "artifacts/S_CACHE_RATE_01_FLAG_INVENTORY_matrix.json",
    statusKeys: ["final_status", "status"],
    greenStatuses: ["GREEN_CACHE_RATE_FLAG_INVENTORY_READY"],
  },
] as const);

const CACHE_ENV_SNAPSHOT_KEYS = Object.freeze([
  ...Object.keys(CACHE_MARKETPLACE_SEARCH_PERMANENT_ENV_VALUES),
  "SCALE_REDIS_CACHE_NAMESPACE",
  "SCALE_REDIS_CACHE_URL",
  "REDIS_URL",
  "SCALE_REDIS_CACHE_COMMAND_TIMEOUT_MS",
]);

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

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isRenderEnvItem = (value: unknown): value is RenderEnvItem => isRecord(value);

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

function readJsonRecord(path: string): JsonRecord | null {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(path, "utf8"));
    return isRecord(parsed) ? parsed : null;
  } catch (error: unknown) {
    if (error instanceof Error) return null;
    return null;
  }
}

function writeJson(path: string, value: unknown): void {
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(path: string, value: string): void {
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync(path, value, "utf8");
}

function renderProof(matrix: JsonRecord): string {
  return [
    "# S_CACHE_03_MARKETPLACE_SEARCH_PERMANENT_ENABLE Proof",
    "",
    `final_status: ${String(matrix.final_status)}`,
    "",
    "## Scope",
    `- route: ${TARGET_ROUTE}`,
    `- route_count: ${String(matrix.route_count ?? "unknown")}`,
    `- retained: ${String(matrix.retained ?? false)}`,
    `- rollback_triggered: ${String(matrix.rollback_triggered ?? false)}`,
    "",
    "## Proof",
    `- health_before_after: ${String(matrix.health_before ?? "unknown")}/${String(matrix.health_after ?? "unknown")}`,
    `- ready_before_after: ${String(matrix.ready_before ?? "unknown")}/${String(matrix.ready_after ?? "unknown")}`,
    `- baseline_status_class: ${String(matrix.baseline_status_class ?? "unknown")}`,
    `- first_request_cold_miss: ${String(matrix.first_request_cold_miss ?? false)}`,
    `- cache_write_inferred: ${String(matrix.cache_write_inferred ?? false)}`,
    `- cacheHit_second_call: ${String(matrix.cacheHit_second_call ?? false)}`,
    `- non_allowed_route_cache_commands: ${String(matrix.non_allowed_route_cache_commands ?? "unknown")}`,
    `- runtime_scoped_to_one_route: ${String(matrix.runtime_scoped_to_one_route ?? false)}`,
    `- metrics_redacted: ${String(matrix.metrics_redacted ?? false)}`,
    "",
    "## Safety",
    "- cache env values are the exact discovered marketplace.catalog.search one-route flags.",
    "- no cache route expansion, rate-limit change, DB write, migration, Supabase project change, OTA, build, hook work, UI decomposition, or fake proof was performed.",
    "- secrets, live env values, raw cache keys, raw payloads, raw DB rows, URLs, and tokens were not stored in artifacts.",
    "",
  ].join("\n");
}

function gitText(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function getDeploy(item: unknown): DeployRecord {
  if (!isRecord(item)) return {};
  const deploy = item.deploy;
  return isRecord(deploy) ? deploy : item;
}

function renderEnvItems(body: unknown): RenderEnvItem[] {
  if (Array.isArray(body)) return body.filter(isRenderEnvItem);
  if (!isRecord(body)) return [];
  if (Array.isArray(body.envVars)) return body.envVars.filter(isRenderEnvItem);
  if (Array.isArray(body.data)) return body.data.filter(isRenderEnvItem);
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

function redactedEnvSnapshot(items: readonly RenderEnvItem[]): Record<string, { present: boolean; valueClass: string }> {
  return Object.fromEntries(
    CACHE_ENV_SNAPSHOT_KEYS.map((key) => {
      const value = envItemValue(items, key);
      return [key, { present: value.present, valueClass: value.present ? "present_redacted" : "absent" }];
    }),
  );
}

function statusClass(status: number | null): string {
  return status === null ? "error" : `${Math.trunc(status / 100)}xx`;
}

function hashForPercent(value: string): number {
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
  return hashForPercent(key) % 100 < percent;
}

function buildMarketplaceInput(nonce: string): JsonRecord {
  return {
    companyId: COMPANY_CLASS,
    query: `${QUERY_PREFIX} ${nonce}`,
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

function findPercentSelectedInput(label: string): { input: JsonRecord; attempts: number } {
  const policy = getCachePolicy(TARGET_ROUTE);
  if (!policy) throw new Error("cache_policy_missing");
  const prefix = `${label}-${Date.now().toString(36)}`;
  for (let index = 0; index < 30_000; index += 1) {
    const input = buildMarketplaceInput(`${prefix}-${index.toString(36)}`);
    const keyResult = buildSafeCacheKey(policy, input);
    if (keyResult.ok && selectedForPercent(keyResult.key, Number(CACHE_READ_THROUGH_ONE_ROUTE_PERCENT))) {
      return { input, attempts: index + 1 };
    }
  }
  throw new Error("percent_selected_cache_key_unavailable");
}

function byteSizeBucket(text: string): string {
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes <= 16 * 1024) return "le_16kb";
  if (bytes <= 64 * 1024) return "le_64kb";
  if (bytes <= 128 * 1024) return "le_128kb";
  if (bytes <= 256 * 1024) return "le_256kb";
  return "gt_256kb";
}

function cacheHitFromBody(body: unknown): boolean | null {
  if (!isRecord(body) || !isRecord(body.serverTiming)) return null;
  return typeof body.serverTiming.cacheHit === "boolean" ? body.serverTiming.cacheHit : null;
}

function bodyOkFromEnvelope(body: unknown): boolean | null {
  if (!isRecord(body)) return null;
  return typeof body.ok === "boolean" ? body.ok : null;
}

function contractShapeOf(body: unknown): string {
  if (!isRecord(body)) return JSON.stringify(body);
  const record: JsonRecord = { ...body };
  if (isRecord(record.serverTiming)) {
    const timing: JsonRecord = { ...record.serverTiming };
    delete timing.cacheHit;
    record.serverTiming = timing;
  }
  return JSON.stringify(record);
}

function recordFromData(body: unknown): JsonRecord {
  if (!isRecord(body) || !isRecord(body.data)) return {};
  return body.data;
}

function numericField(record: JsonRecord, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanField(record: JsonRecord, key: string): boolean | null {
  const value = record[key];
  return typeof value === "boolean" ? value : null;
}

function stringField(record: JsonRecord, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function requireString(value: string | undefined, name: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw new Error(`${name}_missing`);
}

function requireRouteCall(value: RouteCallResult | null, name: string): RouteCallResult {
  if (value) return value;
  throw new Error(`${name}_missing`);
}

function outputRedactionSafe(value: unknown): boolean {
  const output = JSON.stringify(value ?? null);
  return (
    !output.includes("cache:v1:") &&
    !output.includes(COMPANY_CLASS) &&
    !output.includes(QUERY_PREFIX) &&
    !output.includes("s-cache-03") &&
    !/Bearer\s+/i.test(output) &&
    !/eyJ[A-Za-z0-9_-]{20,}/.test(output) &&
    !/rediss?:\/\//i.test(output) &&
    !/https?:\/\/api\.render\.com/i.test(output)
  );
}

function monitorCounts(response: { status: number | null; body: unknown } | null): MonitorCounts {
  const data = recordFromData(response?.body);
  return {
    status: response?.status ?? null,
    shadowReadAttemptedCount: numericField(data, "shadowReadAttemptedCount"),
    hitCount: numericField(data, "hitCount"),
    missCount: numericField(data, "missCount"),
    readThroughCount: numericField(data, "readThroughCount"),
    skippedCount: numericField(data, "skippedCount"),
    errorCount: numericField(data, "errorCount"),
    routeMetricsRedactionSafe: booleanField(data, "routeMetricsRedactionSafe"),
    outputRedactionSafe: outputRedactionSafe(response?.body),
  };
}

function countDelta(
  before: MonitorCounts | null,
  after: MonitorCounts | null,
  key: keyof Pick<
    MonitorCounts,
    "shadowReadAttemptedCount" | "hitCount" | "missCount" | "readThroughCount" | "skippedCount" | "errorCount"
  >,
): number | null {
  const left = before?.[key];
  const right = after?.[key];
  return typeof left === "number" && typeof right === "number" ? right - left : null;
}

function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index];
}

async function parseResponseJson(response: Response): Promise<{ body: unknown; text: string }> {
  const text = await response.text();
  try {
    return { body: text ? JSON.parse(text) : null, text };
  } catch (error: unknown) {
    if (error instanceof Error) return { body: null, text };
    return { body: null, text };
  }
}

async function readBffErrorCategory(response: Response, bodyText: string): Promise<string> {
  if (response.ok) return "none";
  try {
    const parsed: unknown = bodyText ? JSON.parse(bodyText) : null;
    const error = isRecord(parsed) && isRecord(parsed.error) ? parsed.error : null;
    const code = error && typeof error.code === "string" ? error.code : null;
    return classifyProductionBusinessReadonlyCanaryErrorCode(code);
  } catch (error: unknown) {
    if (error instanceof Error) return "error_code_unavailable";
    return "error_code_unavailable";
  }
}

export function readCachePermanentEnablePrerequisites(): Record<string, { path: string; status: string; green: boolean }> {
  return Object.fromEntries(
    PREREQUISITES.map((item) => {
      const record = readJsonRecord(item.path);
      const status = item.statusKeys
        .map((key) => (record && typeof record[key] === "string" ? String(record[key]) : ""))
        .find((value) => value.length > 0) ?? "";
      return [
        item.name,
        {
          path: item.path,
          status: status || "missing",
          green: item.greenStatuses.some((greenStatus) => greenStatus === status),
        },
      ];
    }),
  );
}

function buildBaseMatrix(extra: JsonRecord = {}): JsonRecord {
  return {
    wave: WAVE,
    generated_at: new Date().toISOString(),
    route: TARGET_ROUTE,
    android_build: false,
    ota: false,
    rate_limit_changes: false,
    db_writes: false,
    migrations_applied: false,
    supabase_project_changes: false,
    production_mutation_calls: false,
    hook_work: false,
    ui_decomposition: false,
    fake_pass: false,
    secrets_printed: false,
    env_values_printed: false,
    raw_cache_keys_printed: false,
    raw_payloads_printed: false,
    raw_db_rows_printed: false,
    ...extra,
  };
}

function writeArtifacts(matrix: JsonRecord, metrics: JsonRecord): void {
  writeJson(MATRIX_PATH, matrix);
  writeJson(METRICS_PATH, metrics);
  writeText(PROOF_PATH, renderProof(matrix));
}

function finish(matrix: JsonRecord, metrics: JsonRecord, exitCode: number): never {
  writeArtifacts(matrix, metrics);
  console.log(
    JSON.stringify({
      final_status: matrix.final_status,
      artifact_matrix: MATRIX_PATH,
      artifact_metrics: METRICS_PATH,
      artifact_proof: PROOF_PATH,
    }),
  );
  process.exit(exitCode);
}

async function main(): Promise<void> {
  const fileEnv = loadEnv(ENV_FILE);
  const env: EnvMap = { ...process.env, ...fileEnv };
  const head = gitText(["rev-parse", "HEAD"]);
  const originMain = gitText(["rev-parse", "origin/main"]);
  const [ahead, behind] = gitText(["rev-list", "--left-right", "--count", "HEAD...origin/main"])
    .split(/\s+/)
    .map(Number);
  const worktreeCleanIgnoringUntracked = gitText(["status", "--short", "--untracked-files=no"]).length === 0;
  const prerequisites = readCachePermanentEnablePrerequisites();
  const prerequisitesGreen = Object.values(prerequisites).every((item) => item.green);
  const token = env.RENDER_API_TOKEN;
  const serviceId = env.RENDER_PRODUCTION_BFF_SERVICE_ID || env.RENDER_SERVICE_ID;
  const baseUrl = env.BFF_PRODUCTION_BASE_URL || env.RENDER_SERVICE_URL;
  const auth = await resolveProductionBusinessReadonlyCanaryServerAuthSecret({ env });
  const baseMatrix = buildBaseMatrix({
    head,
    origin_main: originMain,
    head_equals_origin_main: head === originMain,
    ahead,
    behind,
    worktree_clean_ignoring_untracked: worktreeCleanIgnoringUntracked,
    prerequisites,
    prerequisites_green: prerequisitesGreen,
    render_config_present: Boolean(token && serviceId && baseUrl),
    auth_source: auth.source,
    auth_resolution_status: auth.status,
  });

  const blockedBeforeApply = (
    finalStatus: FinalStatus,
    blockedReason: string,
    extra: JsonRecord = {},
  ): never =>
    finish(
      {
        ...baseMatrix,
        ...extra,
        final_status: finalStatus,
        blocked_reason: blockedReason,
        route_count: 0,
        retained: false,
        rollback_triggered: false,
        rollback_succeeded: true,
      },
      {
        route: TARGET_ROUTE,
        blocked_reason: blockedReason,
        retained: false,
        env_written: false,
      },
      2,
    );

  if (head !== originMain || ahead !== 0 || behind !== 0 || !worktreeCleanIgnoringUntracked) {
    blockedBeforeApply("BLOCKED_CACHE_RUNTIME_NOT_SCOPED_TO_ONE_ROUTE", "git_preflight_failed");
  }
  if (!prerequisitesGreen) {
    blockedBeforeApply("BLOCKED_CACHE_RUNTIME_NOT_SCOPED_TO_ONE_ROUTE", "prerequisite_artifact_not_green");
  }
  if (!token || !serviceId || !baseUrl || !auth.secret) {
    blockedBeforeApply("BLOCKED_CACHE_RUNTIME_NOT_SCOPED_TO_ONE_ROUTE", "render_bff_or_auth_config_missing");
  }

  const renderApiToken = requireString(token, "render_api_token");
  const renderServiceId = requireString(serviceId, "render_service_id");
  const runtimeBaseUrl = requireString(baseUrl, "runtime_base_url");
  const cleanBase = runtimeBaseUrl.replace(/\/+$/, "");
  const api = async (apiPath: string, init: RequestInit = {}): Promise<ApiResult> => {
    const response = await fetch(`https://api.render.com/v1${apiPath}`, {
      ...init,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${renderApiToken}`,
        ...(init.headers ?? {}),
      },
    });
    const parsed = await parseResponseJson(response);
    return { ok: response.ok, status: response.status, body: parsed.body };
  };
  const fetchJson = async (
    runtimePath: string,
    init: RequestInit = {},
  ): Promise<{ status: number | null; body: unknown }> => {
    try {
      const response = await fetch(`${cleanBase}${runtimePath}`, {
        ...init,
        headers: {
          accept: "application/json",
          ...(init.headers ?? {}),
        },
      });
      return { status: response.status, body: (await parseResponseJson(response)).body };
    } catch (error: unknown) {
      if (error instanceof Error) return { status: null, body: null };
      return { status: null, body: null };
    }
  };
  const putEnv = (key: string, value: string): Promise<ApiResult> =>
    api(`/services/${encodeURIComponent(renderServiceId)}/env-vars/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value }),
    });
  const deleteEnv = (key: string): Promise<ApiResult> =>
    api(`/services/${encodeURIComponent(renderServiceId)}/env-vars/${encodeURIComponent(key)}`, {
      method: "DELETE",
    });
  const triggerDeploy = (): Promise<ApiResult> =>
    api(`/services/${encodeURIComponent(renderServiceId)}/deploys`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ commitId: head }),
    });
  const waitForLive = async (): Promise<{ live: boolean; latestStatus: string; containsHead: boolean | "unknown" }> => {
    let latestStatus = "unknown";
    let containsHead: boolean | "unknown" = "unknown";
    for (let attempt = 0; attempt < 72; attempt += 1) {
      await sleep(attempt === 0 ? 5_000 : 10_000);
      const result = await api(`/services/${encodeURIComponent(renderServiceId)}/deploys?limit=5`);
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
  const envKeyMatchesExpectedValue = async (key: string, expectedValue: string): Promise<boolean> => {
    const result = await api(`/services/${encodeURIComponent(renderServiceId)}/env-vars/${encodeURIComponent(key)}`);
    if (!result.ok || !isRecord(result.body)) return false;
    const envVar = isRecord(result.body.envVar) ? result.body.envVar : result.body;
    return envVar.key === key && envVar.value === expectedValue;
  };
  const waitForAppliedEnv = async (): Promise<{ ready: boolean; mismatched: string[] }> => {
    const entries = Object.entries(CACHE_MARKETPLACE_SEARCH_PERMANENT_ENV_VALUES);
    let mismatched = entries.map(([key]) => key);
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const checks = await Promise.all(
        entries.map(async ([key, expected]) => ({
          key,
          ok: await envKeyMatchesExpectedValue(key, expected),
        })),
      );
      mismatched = checks.filter((check) => !check.ok).map((check) => check.key);
      if (mismatched.length === 0) return { ready: true, mismatched: [] };
      await sleep(2_500);
    }
    return { ready: false, mismatched };
  };
  const callReadRoute = async (path: string, input: JsonRecord): Promise<RouteCallResult> => {
    const started = Date.now();
    try {
      const response = await fetch(`${cleanBase}${path}`, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${auth.secret}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          input,
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
        bodyOk: bodyOkFromEnvelope(parsed.body),
        cacheHit: cacheHitFromBody(parsed.body),
        responseBytesBucket: byteSizeBucket(parsed.text),
        contractShape: contractShapeOf(parsed.body),
        errorCategory: await readBffErrorCategory(response, parsed.text),
        latencyMs: Date.now() - started,
      };
    } catch (error: unknown) {
      return {
        ok: false,
        status: null,
        statusClass: "error",
        bodyOk: null,
        cacheHit: null,
        responseBytesBucket: "not_run",
        contractShape: error instanceof Error ? "transport_error" : "unknown_error",
        errorCategory: "transport_error",
        latencyMs: null,
      };
    }
  };
  const restoreEnv = async (previous: Record<string, PreviousEnvValue>): Promise<RollbackResult> => {
    let restored = false;
    let deployTriggered = false;
    let live = false;
    let latestStatus = "not_run";
    let health: number | null = null;
    let ready: number | null = null;
    try {
      const results = await Promise.all(
        Object.keys(CACHE_MARKETPLACE_SEARCH_PERMANENT_ENV_VALUES).map((key) =>
          previous[key]?.present ? putEnv(key, previous[key].value) : deleteEnv(key),
        ),
      );
      restored = results.every((result) => result.ok || result.status === 404);
    } catch (error: unknown) {
      restored = error instanceof Error ? false : false;
    }
    if (restored) {
      try {
        const deploy = await triggerDeploy();
        deployTriggered = deploy.ok;
        if (deployTriggered) {
          const liveResult = await waitForLive();
          live = liveResult.live;
          latestStatus = liveResult.latestStatus;
        }
      } catch (error: unknown) {
        deployTriggered = error instanceof Error ? false : false;
      }
    }
    if (live) {
      const [healthResult, readyResult] = await Promise.all([fetchJson("/health"), fetchJson("/ready")]);
      health = healthResult.status;
      ready = readyResult.status;
    }
    return {
      attempted: true,
      restored,
      deployTriggered,
      live,
      latestStatus,
      health,
      ready,
      ok: restored && deployTriggered && live && health === 200 && ready === 200,
    };
  };
  const rollbackAndFinish = async (
    finalStatus: FinalStatus,
    blockedReason: string,
    previous: Record<string, PreviousEnvValue>,
    extra: JsonRecord = {},
  ): Promise<never> => {
    const rollback = await restoreEnv(previous);
    return finish(
      {
        ...baseMatrix,
        ...extra,
        final_status: finalStatus,
        blocked_reason: blockedReason,
        retained: false,
        rollback_triggered: rollback.attempted,
        rollback_env_restored: rollback.restored,
        rollback_deploy_triggered: rollback.deployTriggered,
        rollback_latest_deploy_live: rollback.live,
        rollback_latest_deploy_status: rollback.latestStatus,
        rollback_succeeded: rollback.ok,
        health_after_rollback: rollback.health,
        ready_after_rollback: rollback.ready,
      },
      {
        route: TARGET_ROUTE,
        blocked_reason: blockedReason,
        retained: false,
        rollback_succeeded: rollback.ok,
      },
      2,
    );
  };

  const [serviceResult, deploysBeforeResult, healthBefore, readyBefore, envResult] = await Promise.all([
    api(`/services/${encodeURIComponent(renderServiceId)}`),
    api(`/services/${encodeURIComponent(renderServiceId)}/deploys?limit=10`),
    fetchJson("/health"),
    fetchJson("/ready"),
    api(`/services/${encodeURIComponent(renderServiceId)}/env-vars?limit=100`),
  ]);
  const service = isRecord(serviceResult.body) ? serviceResult.body : {};
  const serviceDetails = isRecord(service.serviceDetails) ? service.serviceDetails : {};
  const autoDeploy = String(service.autoDeploy ?? serviceDetails.autoDeploy ?? "unknown").toLowerCase();
  const autoDeploySafe = autoDeploy === "no" || autoDeploy === "false";
  const deploysBefore = Array.isArray(deploysBeforeResult.body) ? deploysBeforeResult.body.map(getDeploy) : [];
  const deployInProgressBefore = deploysBefore.some((deploy) =>
    inProgressDeployStatuses.has(String(deploy.status || "")),
  );
  const envItems = renderEnvItems(envResult.body);
  const previous: Record<string, PreviousEnvValue> = {};
  for (const key of Object.keys(CACHE_MARKETPLACE_SEARCH_PERMANENT_ENV_VALUES)) {
    previous[key] = envItemValue(envItems, key);
  }
  const envSnapshotRedacted = redactedEnvSnapshot(envItems);
  const baselineInput = findPercentSelectedInput("s-cache-03-baseline");
  const baselineRead =
    serviceResult.ok &&
    autoDeploySafe &&
    !deployInProgressBefore &&
    healthBefore.status === 200 &&
    readyBefore.status === 200
      ? await callReadRoute(TARGET_ROUTE_PATH, baselineInput.input)
      : null;
  if (
    !serviceResult.ok ||
    !autoDeploySafe ||
    deployInProgressBefore ||
    healthBefore.status !== 200 ||
    readyBefore.status !== 200 ||
    !baselineRead?.ok
  ) {
    blockedBeforeApply("BLOCKED_CACHE_HEALTH_NOT_GREEN_ROLLED_BACK", "pre_apply_health_ready_or_baseline_failed", {
      render_auto_deploy: autoDeploy,
      deploy_in_progress_before: deployInProgressBefore,
      health_before: healthBefore.status,
      ready_before: readyBefore.status,
      baseline_status_class: baselineRead?.statusClass ?? "not_run",
    });
  }
  const confirmedBaselineRead = requireRouteCall(baselineRead, "baseline_read");

  try {
  const applyResults = await Promise.all(
    Object.entries(CACHE_MARKETPLACE_SEARCH_PERMANENT_ENV_VALUES).map(([key, value]) => putEnv(key, value)),
  );
  if (!applyResults.every((result) => result.ok)) {
    await rollbackAndFinish("BLOCKED_CACHE_RUNTIME_NOT_SCOPED_TO_ONE_ROUTE", "cache_env_apply_failed", previous, {
      health_before: healthBefore.status,
      ready_before: readyBefore.status,
      baseline_status_class: confirmedBaselineRead.statusClass,
      env_snapshot_redacted: envSnapshotRedacted,
    });
  }
  const appliedEnv = await waitForAppliedEnv();
  if (!appliedEnv.ready) {
    await rollbackAndFinish("BLOCKED_CACHE_RUNTIME_NOT_SCOPED_TO_ONE_ROUTE", "cache_env_not_exact_after_apply", previous, {
      health_before: healthBefore.status,
      ready_before: readyBefore.status,
      baseline_status_class: confirmedBaselineRead.statusClass,
      env_snapshot_redacted: envSnapshotRedacted,
      applied_env_mismatched_keys: appliedEnv.mismatched,
    });
  }

  const deployResult = await triggerDeploy();
  const live: { live: boolean; latestStatus: string; containsHead: boolean | "unknown" } = deployResult.ok
    ? await waitForLive()
    : { live: false, latestStatus: "deploy_trigger_failed", containsHead: "unknown" };
  const [healthAfterDeploy, readyAfterDeploy] = await Promise.all([fetchJson("/health"), fetchJson("/ready")]);
  if (!live.live || healthAfterDeploy.status !== 200 || readyAfterDeploy.status !== 200) {
    await rollbackAndFinish("BLOCKED_CACHE_HEALTH_NOT_GREEN_ROLLED_BACK", "post_apply_health_ready_failed", previous, {
      health_before: healthBefore.status,
      ready_before: readyBefore.status,
      baseline_status_class: confirmedBaselineRead.statusClass,
      deploy_triggered: deployResult.ok,
      latest_deploy_live: live.live,
      latest_deploy_status: live.latestStatus,
      health_after: healthAfterDeploy.status,
      ready_after: readyAfterDeploy.status,
      env_snapshot_redacted: envSnapshotRedacted,
    });
  }

  const readyData = isRecord(readyAfterDeploy.body) && isRecord(readyAfterDeploy.body.data)
    ? readyAfterDeploy.body.data
    : {};
  const runtime = isRecord(readyData.cacheShadowRuntime) ? readyData.cacheShadowRuntime : {};
  const diagnostics = isRecord(runtime.readinessDiagnostics) ? runtime.readinessDiagnostics : {};
  const runtimeDiagnostics = isRecord(readyData.runtimeDiagnostics) ? readyData.runtimeDiagnostics : {};
  const routeCount = typeof runtime.routeAllowlistCount === "number" ? runtime.routeAllowlistCount : null;
  const routeName = stringField(diagnostics, "routeName", "unknown");
  const readThroughEnabled = runtime.readThroughV1Enabled === true;
  const runtimeCommitShort = stringField(runtimeDiagnostics, "runtimeCommitShort", stringField(readyData, "runtimeCommitShort", "unknown"));
  const runtimeCommitMatchesHead =
    runtimeCommitShort !== "unknown" &&
    (head.startsWith(runtimeCommitShort) || runtimeCommitShort.startsWith(head.slice(0, runtimeCommitShort.length)));
  const runtimeScoped =
    runtime.status === "configured" &&
    runtime.enabled === true &&
    runtime.mode === CACHE_READ_THROUGH_ONE_ROUTE_MODE &&
    readThroughEnabled &&
    runtime.percent === Number(CACHE_READ_THROUGH_ONE_ROUTE_PERCENT) &&
    routeCount === 1 &&
    routeName === TARGET_ROUTE &&
    stringField(diagnostics, "cacheRuntimeSource", "unknown") === "process_env" &&
    stringField(diagnostics, "routeAllowlistSource", "unknown") === "process_env" &&
    diagnostics.readThroughV1EnvRawPresent === true &&
    stringField(diagnostics, "readThroughV1EnvValueClass", "unknown") === "truthy";
  if (!runtimeScoped) {
    await rollbackAndFinish("BLOCKED_CACHE_RUNTIME_NOT_SCOPED_TO_ONE_ROUTE", "cache_runtime_not_scoped_to_one_route", previous, {
      health_before: healthBefore.status,
      ready_before: readyBefore.status,
      baseline_status_class: confirmedBaselineRead.statusClass,
      deploy_triggered: deployResult.ok,
      latest_deploy_live: live.live,
      latest_deploy_status: live.latestStatus,
      deploy_commit_matches_head: live.containsHead,
      health_after: healthAfterDeploy.status,
      ready_after: readyAfterDeploy.status,
      runtime_commit_short: runtimeCommitShort,
      runtime_commit_matches_head: runtimeCommitMatchesHead,
      runtime_status: runtime.status ?? "unknown",
      runtime_enabled: runtime.enabled ?? "unknown",
      runtime_mode: runtime.mode ?? "unknown",
      runtime_percent: runtime.percent ?? "unknown",
      read_through_v1_enabled: readThroughEnabled,
      route_count: routeCount,
      route_name: routeName,
      cache_runtime_source: stringField(diagnostics, "cacheRuntimeSource", "unknown"),
      route_allowlist_source: stringField(diagnostics, "routeAllowlistSource", "unknown"),
      read_through_v1_env_raw_present: diagnostics.readThroughV1EnvRawPresent ?? "unknown",
      read_through_v1_env_value_class: stringField(diagnostics, "readThroughV1EnvValueClass", "unknown"),
      env_snapshot_redacted: envSnapshotRedacted,
    });
  }

  const authHeaders = { authorization: `Bearer ${auth.secret}` };
  const monitorBefore = await fetchJson("/api/staging-bff/monitor/cache-shadow", {
    method: "GET",
    headers: authHeaders,
  });
  const diagnosticResponse = await fetchJson("/api/staging-bff/diagnostics/cache-shadow-canary", {
    method: "POST",
    headers: authHeaders,
  });
  const selectedInput = findPercentSelectedInput("s-cache-03-main");
  const firstRead = await callReadRoute(TARGET_ROUTE_PATH, selectedInput.input);
  await sleep(500);
  const monitorAfterFirst = await fetchJson("/api/staging-bff/monitor/cache-shadow", {
    method: "GET",
    headers: authHeaders,
  });
  const secondRead = await callReadRoute(TARGET_ROUTE_PATH, selectedInput.input);
  await sleep(500);
  const monitorAfterSecond = await fetchJson("/api/staging-bff/monitor/cache-shadow", {
    method: "GET",
    headers: authHeaders,
  });
  const monitorBeforeNonAllowed = monitorCounts(monitorAfterSecond);
  const nonAllowedRead = await callReadRoute(NON_ALLOWED_ROUTE_PATH, {
    page: 1,
    pageSize: 1,
    filters: { scope: "public", kind: "material" },
  });
  await sleep(500);
  const monitorAfterNonAllowed = await fetchJson("/api/staging-bff/monitor/cache-shadow", {
    method: "GET",
    headers: authHeaders,
  });
  const [healthAfter, readyAfter] = await Promise.all([fetchJson("/health"), fetchJson("/ready")]);
  const beforeCounts = monitorCounts(monitorBefore);
  const afterFirstCounts = monitorCounts(monitorAfterFirst);
  const afterSecondCounts = monitorCounts(monitorAfterSecond);
  const afterNonAllowedCounts = monitorCounts(monitorAfterNonAllowed);
  const firstMissDelta = countDelta(beforeCounts, afterFirstCounts, "missCount");
  const firstReadThroughDelta = countDelta(beforeCounts, afterFirstCounts, "readThroughCount");
  const secondHitDelta = countDelta(afterFirstCounts, afterSecondCounts, "hitCount");
  const nonAllowedCacheCommands = countDelta(monitorBeforeNonAllowed, afterNonAllowedCounts, "shadowReadAttemptedCount");
  const nonAllowedSkippedDelta = countDelta(monitorBeforeNonAllowed, afterNonAllowedCounts, "skippedCount");
  const cacheErrorDelta = countDelta(beforeCounts, afterNonAllowedCounts, "errorCount");
  const diagnosticData = recordFromData(diagnosticResponse.body);
  const diagnosticGreen =
    diagnosticResponse.status === 200 &&
    stringField(diagnosticData, "status", "unknown") === "ready" &&
    booleanField(diagnosticData, "commandSetOk") === true &&
    booleanField(diagnosticData, "commandGetOk") === true &&
    booleanField(diagnosticData, "commandValueMatched") === true &&
    booleanField(diagnosticData, "commandDeleteOk") === true &&
    booleanField(diagnosticData, "cleanupOk") === true;
  const firstRequestColdMiss =
    firstRead.ok &&
    firstRead.bodyOk === true &&
    firstRead.cacheHit === false &&
    (firstMissDelta ?? 0) > 0 &&
    (firstReadThroughDelta ?? 0) > 0;
  const cacheHitSecondCall = secondRead.ok && secondRead.bodyOk === true && secondRead.cacheHit === true && (secondHitDelta ?? 0) > 0;
  const nonAllowedFallback =
    nonAllowedRead.ok &&
    nonAllowedRead.bodyOk === true &&
    nonAllowedRead.cacheHit === false &&
    nonAllowedCacheCommands === 0 &&
    (nonAllowedSkippedDelta ?? 0) > 0;
  const responseContractUnchanged =
    confirmedBaselineRead.contractShape === firstRead.contractShape &&
    firstRead.contractShape === secondRead.contractShape;
  const metricsRedacted =
    outputRedactionSafe(diagnosticResponse.body) &&
    beforeCounts.outputRedactionSafe &&
    afterFirstCounts.outputRedactionSafe &&
    afterSecondCounts.outputRedactionSafe &&
    afterNonAllowedCounts.outputRedactionSafe &&
    afterNonAllowedCounts.routeMetricsRedactionSafe === true &&
    diagnostics.envValuesExposed === false &&
    diagnostics.secretsExposed === false;
  const latencyValues = [confirmedBaselineRead, firstRead, secondRead, nonAllowedRead]
    .map((item) => item.latencyMs)
    .filter((item): item is number => typeof item === "number");
  const metrics: JsonRecord = {
    route: TARGET_ROUTE,
    route_count: routeCount,
    retained: true,
    baseline_cacheHit: confirmedBaselineRead.cacheHit,
    first_call_cacheHit: firstRead.cacheHit,
    second_call_cacheHit: secondRead.cacheHit,
    cacheHit_second_call: cacheHitSecondCall,
    first_miss_delta: firstMissDelta,
    first_read_through_delta: firstReadThroughDelta,
    second_hit_delta: secondHitDelta,
    non_allowed_route: NON_ALLOWED_ROUTE,
    non_allowed_route_cache_commands: nonAllowedCacheCommands,
    non_allowed_route_skipped_delta: nonAllowedSkippedDelta,
    cache_error_delta: cacheErrorDelta,
    diagnostic_green: diagnosticGreen,
    p50_ms: percentile(latencyValues, 0.5),
    p95_ms: percentile(latencyValues, 0.95),
    p99_ms: percentile(latencyValues, 0.99),
    sample_calls: latencyValues.length,
    metrics_redacted: metricsRedacted,
  };
  const probeGreen =
    diagnosticGreen &&
    firstRequestColdMiss &&
    cacheHitSecondCall &&
    nonAllowedFallback &&
    responseContractUnchanged &&
    cacheErrorDelta === 0 &&
    healthAfter.status === 200 &&
    readyAfter.status === 200 &&
    metricsRedacted;
  if (!probeGreen) {
    await rollbackAndFinish("BLOCKED_CACHE_SECOND_HIT_FAILED_ROLLED_BACK", "cache_runtime_probe_failed", previous, {
      health_before: healthBefore.status,
      ready_before: readyBefore.status,
      health_after: healthAfter.status,
      ready_after: readyAfter.status,
      baseline_status_class: confirmedBaselineRead.statusClass,
      baseline_cacheHit: confirmedBaselineRead.cacheHit,
      route_count: routeCount,
      route_name: routeName,
      runtime_scoped_to_one_route: runtimeScoped,
      diagnostic_green: diagnosticGreen,
      first_request_cold_miss: firstRequestColdMiss,
      cache_write_inferred: firstRequestColdMiss,
      cacheHit_second_call: cacheHitSecondCall,
      non_allowed_route_cache_commands: nonAllowedCacheCommands,
      non_allowed_route_provider_fallback: nonAllowedFallback,
      response_contract_unchanged: responseContractUnchanged,
      metrics_redacted: metricsRedacted,
      env_snapshot_redacted: envSnapshotRedacted,
    });
  }

  finish(
    {
      ...baseMatrix,
      final_status: "GREEN_CACHE_MARKETPLACE_SEARCH_PERMANENTLY_ENABLED",
      health_before: healthBefore.status,
      ready_before: readyBefore.status,
      health_after: healthAfter.status,
      ready_after: readyAfter.status,
      baseline_status_class: confirmedBaselineRead.statusClass,
      baseline_body_ok: confirmedBaselineRead.bodyOk,
      baseline_cacheHit: confirmedBaselineRead.cacheHit,
      deploy_triggered: deployResult.ok,
      latest_deploy_live: live.live,
      latest_deploy_status: live.latestStatus,
      deploy_commit_matches_head: live.containsHead,
      runtime_commit_short: runtimeCommitShort,
      runtime_commit_matches_head: runtimeCommitMatchesHead,
      runtime_status: runtime.status ?? "unknown",
      runtime_enabled: runtime.enabled ?? "unknown",
      runtime_mode: runtime.mode ?? "unknown",
      runtime_percent: runtime.percent ?? "unknown",
      read_through_v1_enabled: readThroughEnabled,
      route_count: routeCount,
      route_name: routeName,
      runtime_scoped_to_one_route: runtimeScoped,
      env_snapshot_redacted: envSnapshotRedacted,
      cache_env_keys_written_count: Object.keys(CACHE_MARKETPLACE_SEARCH_PERMANENT_ENV_VALUES).length,
      retained: true,
      rollback_triggered: false,
      rollback_succeeded: "not_needed",
      first_request_cold_miss: firstRequestColdMiss,
      cache_write_inferred: firstRequestColdMiss,
      cacheHit_second_call: cacheHitSecondCall,
      non_allowed_route: NON_ALLOWED_ROUTE,
      non_allowed_route_cache_commands: nonAllowedCacheCommands,
      non_allowed_route_provider_fallback: nonAllowedFallback,
      response_contract_unchanged: responseContractUnchanged,
      cache_shadow_diagnostic_green: diagnosticGreen,
      metrics_redacted: metricsRedacted,
      raw_cache_keys_stored: false,
      raw_payloads_stored: false,
      credentials_in_cli_args: false,
      credentials_in_artifacts: false,
    },
    metrics,
    0,
  );
  } catch (error: unknown) {
    const blockedReason = error instanceof Error ? error.message : "runtime_exception_after_env_apply";
    await rollbackAndFinish("BLOCKED_CACHE_SECOND_HIT_FAILED_ROLLED_BACK", blockedReason, previous, {
      health_before: healthBefore.status,
      ready_before: readyBefore.status,
      baseline_status_class: confirmedBaselineRead.statusClass,
      env_snapshot_redacted: envSnapshotRedacted,
      runtime_exception_after_env_apply: true,
    });
  }
}

const normalizedEntryPoint = process.argv[1]?.replace(/\\/g, "/") ?? "";
if (normalizedEntryPoint.endsWith("scripts/runtime/cacheMarketplaceSearchPermanentEnable.ts")) {
  main().catch((error: unknown) => {
    const errorCategory = error instanceof Error ? error.message : "unknown_error";
    finish(
      buildBaseMatrix({
        final_status: "BLOCKED_CACHE_SECOND_HIT_FAILED_ROLLED_BACK",
        blocked_reason: errorCategory,
        retained: false,
        rollback_triggered: "unknown",
        rollback_succeeded: false,
      }),
      {
        route: TARGET_ROUTE,
        blocked_reason: errorCategory,
        retained: false,
      },
      2,
    );
  });
}
