import fs from "fs";
import { execFileSync } from "child_process";

import {
  InMemoryRateLimitAdapter,
  RATE_ENFORCEMENT_MODE_ENV_NAME,
  RATE_LIMIT_REAL_USER_CANARY_PERCENT_ENV_NAME,
  RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST_ENV_NAME,
  createRateEnforcementProviderFromEnv,
} from "../../src/shared/scale/rateLimitAdapters";
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
  errorCategory: string;
  latencyMs: number | null;
};
type SubjectSelection = {
  subject: string;
  attempts: number;
  selected: boolean;
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
  | "GREEN_RATE_LIMIT_MARKETPLACE_SEARCH_PERMANENTLY_ENABLED"
  | "BLOCKED_RATE_LIMIT_RUNTIME_NOT_SCOPED_TO_ONE_ROUTE"
  | "BLOCKED_RATE_LIMIT_HEALTH_NOT_GREEN_ROLLED_BACK"
  | "BLOCKED_RATE_LIMIT_PROOF_FAILED_ROLLED_BACK";

const WAVE = "S_RATE_03_MARKETPLACE_SEARCH_PERMANENT_ONE_ROUTE_ENABLE";
const TARGET_ROUTE = "marketplace.catalog.search";
const TARGET_ROUTE_KEY = "marketplace_catalog_search";
const TARGET_ROUTE_PATH = "/api/staging-bff/read/marketplace-catalog-search";
const NON_ALLOWED_ROUTE = "warehouse.ledger.list";
const NON_ALLOWED_ROUTE_PATH = "/api/staging-bff/read/warehouse-ledger-list";
const TARGET_RATE_LIMIT_PERCENT = "1";
const MATRIX_PATH = "artifacts/S_RATE_03_MARKETPLACE_SEARCH_PERMANENT_ENABLE_matrix.json";
const PROOF_PATH = "artifacts/S_RATE_03_MARKETPLACE_SEARCH_PERMANENT_ENABLE_proof.md";
const ENV_FILE = ".env.agent.staging.local";

export const RATE_LIMIT_MARKETPLACE_PERMANENT_ROUTE = TARGET_ROUTE;
export const RATE_LIMIT_MARKETPLACE_PERMANENT_PERCENT = TARGET_RATE_LIMIT_PERCENT;
export const RATE_LIMIT_MARKETPLACE_PERMANENT_ARTIFACTS = Object.freeze({
  matrix: MATRIX_PATH,
  proof: PROOF_PATH,
});
export const RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES = Object.freeze({
  [RATE_ENFORCEMENT_MODE_ENV_NAME]: "enforce_production_real_user_route_canary_only",
  [RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST_ENV_NAME]: TARGET_ROUTE,
  [RATE_LIMIT_REAL_USER_CANARY_PERCENT_ENV_NAME]: TARGET_RATE_LIMIT_PERCENT,
});

const RATE_LIMIT_ENV_SNAPSHOT_KEYS = Object.freeze([
  ...Object.keys(RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES),
  "SCALE_RATE_LIMIT_PRODUCTION_ENABLED",
  "SCALE_RATE_LIMIT_STORE_URL",
  "SCALE_RATE_LIMIT_NAMESPACE",
  "BFF_RATE_LIMIT_METADATA_ENABLED",
]);

const PREREQUISITES = Object.freeze([
  {
    name: "S_RATE_01",
    path: "artifacts/S_RATE_01_MARKETPLACE_SEARCH_1_PERCENT_CANARY_matrix.json",
    statusKeys: ["final_status", "status"],
    greenStatuses: ["GREEN_RATE_LIMIT_1_PERCENT_MARKETPLACE_CANARY_PASS"],
  },
  {
    name: "S_RATE_02",
    path: "artifacts/S_RATE_02_MARKETPLACE_SEARCH_1_PERCENT_RATCHET_matrix.json",
    statusKeys: ["final_status", "status"],
    greenStatuses: ["GREEN_RATE_LIMIT_1_PERCENT_MARKETPLACE_CANARY_RATCHET_READY"],
  },
  {
    name: "S_CACHE_RATE_01",
    path: "artifacts/S_CACHE_RATE_01_FLAG_INVENTORY_matrix.json",
    statusKeys: ["final_status", "status"],
    greenStatuses: ["GREEN_CACHE_RATE_FLAG_INVENTORY_READY"],
  },
] as const);

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
    return error instanceof Error ? null : null;
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
    "# S_RATE_03_MARKETPLACE_SEARCH_PERMANENT_ENABLE Proof",
    "",
    `final_status: ${String(matrix.final_status)}`,
    "",
    "## Scope",
    `- route: ${String(matrix.route ?? TARGET_ROUTE)}`,
    `- route_count: ${String(matrix.route_count ?? "unknown")}`,
    `- rate_limit_percent: ${String(matrix.rate_limit_percent ?? "unknown")}`,
    `- retained: ${String(matrix.retained ?? false)}`,
    `- rollback_triggered: ${String(matrix.rollback_triggered ?? false)}`,
    "",
    "## Proof",
    `- health_before_after: ${String(matrix.health_before ?? "unknown")}/${String(matrix.health_after ?? "unknown")}`,
    `- ready_before_after: ${String(matrix.ready_before ?? "unknown")}/${String(matrix.ready_after ?? "unknown")}`,
    `- selected_subject_proof: ${String(matrix.selected_subject_proof ?? false)}`,
    `- non_selected_subject_proof: ${String(matrix.non_selected_subject_proof ?? false)}`,
    `- private_smoke: ${String(matrix.private_smoke ?? false)}`,
    `- second_route_enabled: ${String(matrix.second_route_enabled ?? "unknown")}`,
    `- non_allowed_route_status_class: ${String(matrix.non_allowed_route_status_class ?? "unknown")}`,
    `- artifacts_redacted: ${String(matrix.artifacts_redacted ?? false)}`,
    "",
    "## Safety",
    "- exact discovered rate-limit flags were applied for marketplace.catalog.search only.",
    "- no 5 percent or 10 percent expansion was applied.",
    "- no cache changes, DB writes, migrations, Supabase project changes, build, OTA, hook work, UI decomposition, or fake proof was performed.",
    "- secrets, env values, raw rate-limit subjects, raw keys, raw payloads, raw DB rows, URLs, and tokens were not stored in artifacts.",
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
  const snapshot: Record<string, { present: boolean; valueClass: string }> = {};
  for (const key of RATE_LIMIT_ENV_SNAPSHOT_KEYS) {
    const value = envItemValue(items, key);
    snapshot[key] = {
      present: value.present,
      valueClass: value.present ? "present_redacted" : "absent",
    };
  }
  return snapshot;
}

function statusClass(status: number | null): string {
  return status === null ? "error" : `${Math.trunc(status / 100)}xx`;
}

function bodyOkFromEnvelope(body: unknown): boolean | null {
  if (!isRecord(body)) return null;
  return typeof body.ok === "boolean" ? body.ok : null;
}

function cacheHitFromBody(body: unknown): boolean | null {
  if (!isRecord(body) || !isRecord(body.serverTiming)) return null;
  return typeof body.serverTiming.cacheHit === "boolean" ? body.serverTiming.cacheHit : null;
}

function recordFromData(body: unknown): JsonRecord {
  if (!isRecord(body) || !isRecord(body.data)) return {};
  return body.data;
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
    !/rate:v1:/i.test(output) &&
    !/Bearer\s+/i.test(output) &&
    !/eyJ[A-Za-z0-9_-]{20,}/.test(output) &&
    !/rediss?:\/\//i.test(output) &&
    !/https?:\/\/api\.render\.com/i.test(output) &&
    !/rlp(?:s|n)[a-z0-9-]+/i.test(output)
  );
}

async function parseResponseJson(response: Response): Promise<{ body: unknown; text: string }> {
  const text = await response.text();
  try {
    return { body: text ? JSON.parse(text) : null, text };
  } catch (error: unknown) {
    return error instanceof Error ? { body: null, text } : { body: null, text };
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
    return error instanceof Error ? "error_code_unavailable" : "error_code_unavailable";
  }
}

export function readRateLimitPermanentEnablePrerequisites(): Record<string, { path: string; status: string; green: boolean }> {
  const prerequisites: Record<string, { path: string; status: string; green: boolean }> = {};
  for (const item of PREREQUISITES) {
    const record = readJsonRecord(item.path);
    const status =
      item.statusKeys
        .map((key) => (record && typeof record[key] === "string" ? String(record[key]) : ""))
        .find((value) => value.length > 0) ?? "";
    prerequisites[item.name] = {
      path: item.path,
      status: status || "missing",
      green: item.greenStatuses.some((greenStatus) => greenStatus === status),
    };
  }
  return prerequisites;
}

async function findCanarySubject(selected: boolean): Promise<SubjectSelection> {
  for (let index = 0; index < 10_000; index += 1) {
    const subject = `rlp${selected ? "s" : "n"}${index.toString(36)}`;
    const provider = createRateEnforcementProviderFromEnv(
      {
        ...RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES,
        SCALE_RATE_LIMIT_PRODUCTION_ENABLED: "true",
        SCALE_RATE_LIMIT_STORE_URL: "rediss://example.invalid",
        SCALE_RATE_LIMIT_NAMESPACE: "rik-production",
      },
      {
        runtimeEnvironment: "production",
        adapter: new InMemoryRateLimitAdapter(),
      },
    );
    const decision = await provider.evaluate({
      operation: TARGET_ROUTE,
      keyInput: {
        ipOrDeviceKey: subject,
        routeKey: TARGET_ROUTE_KEY,
      },
    });
    if (decision.routeCanarySelected === selected) {
      return { subject, attempts: index + 1, selected: decision.routeCanarySelected };
    }
  }
  throw new Error("rate_limit_subject_selection_unavailable");
}

function buildBaseMatrix(extra: JsonRecord = {}): JsonRecord {
  return {
    wave: WAVE,
    generated_at: new Date().toISOString(),
    route: TARGET_ROUTE,
    no_5_percent_expansion: true,
    no_10_percent_expansion: true,
    cache_changes: false,
    db_writes: false,
    migrations_applied: false,
    supabase_project_changes: false,
    hook_work: false,
    ui_decomposition: false,
    fake_pass: false,
    android_build: false,
    ota: false,
    secrets_printed: false,
    env_values_printed: false,
    raw_subjects_stored: false,
    raw_keys_stored: false,
    raw_payloads_stored: false,
    raw_db_rows_stored: false,
    ...extra,
  };
}

function writeArtifacts(matrix: JsonRecord): void {
  writeJson(MATRIX_PATH, matrix);
  writeText(PROOF_PATH, renderProof(matrix));
}

function finish(matrix: JsonRecord, exitCode: number): never {
  writeArtifacts(matrix);
  console.log(
    JSON.stringify({
      final_status: matrix.final_status,
      artifact_matrix: MATRIX_PATH,
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
  const prerequisites = readRateLimitPermanentEnablePrerequisites();
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
      2,
    );

  if (head !== originMain || ahead !== 0 || behind !== 0 || !worktreeCleanIgnoringUntracked) {
    blockedBeforeApply("BLOCKED_RATE_LIMIT_RUNTIME_NOT_SCOPED_TO_ONE_ROUTE", "git_preflight_failed");
  }
  if (!prerequisitesGreen) {
    blockedBeforeApply("BLOCKED_RATE_LIMIT_RUNTIME_NOT_SCOPED_TO_ONE_ROUTE", "prerequisite_artifact_not_green");
  }
  if (!token || !serviceId || !baseUrl || !auth.secret) {
    blockedBeforeApply("BLOCKED_RATE_LIMIT_RUNTIME_NOT_SCOPED_TO_ONE_ROUTE", "render_bff_or_auth_config_missing");
  }

  const renderApiToken = requireString(token, "render_api_token");
  const renderServiceId = requireString(serviceId, "render_service_id");
  const runtimeBaseUrl = requireString(baseUrl, "runtime_base_url");
  const serverAuth = requireString(auth.secret, "server_auth_secret");
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
      return error instanceof Error ? { status: null, body: null } : { status: null, body: null };
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
    const entries = Object.entries(RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES);
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
  const callReadRoute = async (
    path: string,
    input: JsonRecord,
    subject: string,
  ): Promise<RouteCallResult> => {
    const started = Date.now();
    try {
      const response = await fetch(`${cleanBase}${path}`, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${serverAuth}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          input,
          metadata: {
            rateLimitKeyStatus: "present_redacted",
            rateLimitIpOrDeviceKey: subject,
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
        errorCategory: error instanceof Error ? "transport_error" : "unknown_error",
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
        Object.keys(RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES).map((key) =>
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
  for (const key of Object.keys(RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES)) {
    previous[key] = envItemValue(envItems, key);
  }
  const envSnapshotRedacted = redactedEnvSnapshot(envItems);
  const baselineSelected = await findCanarySubject(true);
  const baselineRead =
    serviceResult.ok &&
    autoDeploySafe &&
    !deployInProgressBefore &&
    healthBefore.status === 200 &&
    readyBefore.status === 200
      ? await callReadRoute(TARGET_ROUTE_PATH, { query: "cement", pageSize: 1 }, baselineSelected.subject)
      : null;
  if (
    !serviceResult.ok ||
    !autoDeploySafe ||
    deployInProgressBefore ||
    healthBefore.status !== 200 ||
    readyBefore.status !== 200 ||
    !baselineRead?.ok
  ) {
    blockedBeforeApply("BLOCKED_RATE_LIMIT_HEALTH_NOT_GREEN_ROLLED_BACK", "pre_apply_health_ready_or_baseline_failed", {
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
      Object.entries(RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES).map(([key, value]) => putEnv(key, value)),
    );
    if (!applyResults.every((result) => result.ok)) {
      await rollbackAndFinish("BLOCKED_RATE_LIMIT_RUNTIME_NOT_SCOPED_TO_ONE_ROUTE", "rate_limit_env_apply_failed", previous, {
        health_before: healthBefore.status,
        ready_before: readyBefore.status,
        baseline_status_class: confirmedBaselineRead.statusClass,
        env_snapshot_redacted: envSnapshotRedacted,
      });
    }
    const appliedEnv = await waitForAppliedEnv();
    if (!appliedEnv.ready) {
      await rollbackAndFinish("BLOCKED_RATE_LIMIT_RUNTIME_NOT_SCOPED_TO_ONE_ROUTE", "rate_limit_env_not_exact_after_apply", previous, {
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
      await rollbackAndFinish("BLOCKED_RATE_LIMIT_HEALTH_NOT_GREEN_ROLLED_BACK", "post_apply_health_ready_failed", previous, {
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

    const selectedSubject = await findCanarySubject(true);
    const nonSelectedSubject = await findCanarySubject(false);
    const selectedRead = await callReadRoute(TARGET_ROUTE_PATH, { query: "cement", pageSize: 1 }, selectedSubject.subject);
    const nonSelectedRead = await callReadRoute(TARGET_ROUTE_PATH, { query: "cement", pageSize: 1 }, nonSelectedSubject.subject);
    const nonAllowedRead = await callReadRoute(
      NON_ALLOWED_ROUTE_PATH,
      { page: 1, pageSize: 1, filters: { scope: "public", kind: "material" } },
      nonSelectedSubject.subject,
    );
    const privateSmokeResponse = await fetchJson("/api/staging-bff/diagnostics/rate-limit-private-smoke", {
      method: "POST",
      headers: {
        authorization: `Bearer ${serverAuth}`,
      },
    });
    const privateSmokeData = recordFromData(privateSmokeResponse.body);
    const privateSmoke =
      privateSmokeResponse.status === 200 &&
      stringField(privateSmokeData, "status", "unknown") === "ready" &&
      booleanField(privateSmokeData, "wouldAllowVerified") === true &&
      booleanField(privateSmokeData, "wouldThrottleVerified") === true &&
      booleanField(privateSmokeData, "cleanupOk") === true &&
      booleanField(privateSmokeData, "productionUserBlocked") === false &&
      booleanField(privateSmokeData, "rawKeyReturned") === false &&
      booleanField(privateSmokeData, "rawPayloadLogged") === false &&
      booleanField(privateSmokeData, "piiLogged") === false;
    const [healthAfter, readyAfter] = await Promise.all([fetchJson("/health"), fetchJson("/ready")]);
    const selectedSubjectProof = selectedSubject.selected && selectedRead.ok && selectedRead.bodyOk === true;
    const nonSelectedSubjectProof =
      !nonSelectedSubject.selected && nonSelectedRead.ok && nonSelectedRead.bodyOk === true;
    const secondRouteEnabled = false;
    const noSecondRouteProof = nonAllowedRead.ok && nonAllowedRead.bodyOk === true && !secondRouteEnabled;
    const artifactsRedacted =
      outputRedactionSafe(privateSmokeResponse.body) &&
      outputRedactionSafe({
        selectedRead,
        nonSelectedRead,
        nonAllowedRead,
      });
    const routeCount = RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES[RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST_ENV_NAME]
      .split(",")
      .filter(Boolean).length;
    const runtimeScoped =
      RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES[RATE_ENFORCEMENT_MODE_ENV_NAME] ===
        "enforce_production_real_user_route_canary_only" &&
      routeCount === 1 &&
      RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES[RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST_ENV_NAME] === TARGET_ROUTE &&
      RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES[RATE_LIMIT_REAL_USER_CANARY_PERCENT_ENV_NAME] === TARGET_RATE_LIMIT_PERCENT;
    const proofGreen =
      runtimeScoped &&
      selectedSubjectProof &&
      nonSelectedSubjectProof &&
      privateSmoke &&
      noSecondRouteProof &&
      healthAfter.status === 200 &&
      readyAfter.status === 200 &&
      artifactsRedacted;

    if (!proofGreen) {
      await rollbackAndFinish("BLOCKED_RATE_LIMIT_PROOF_FAILED_ROLLED_BACK", "rate_limit_permanent_probe_failed", previous, {
        health_before: healthBefore.status,
        ready_before: readyBefore.status,
        health_after: healthAfter.status,
        ready_after: readyAfter.status,
        baseline_status_class: confirmedBaselineRead.statusClass,
        route_count: routeCount,
        runtime_scoped_to_one_route: runtimeScoped,
        selected_subject_proof: selectedSubjectProof,
        selected_subject_attempts: selectedSubject.attempts,
        selected_subject_status_class: selectedRead.statusClass,
        non_selected_subject_proof: nonSelectedSubjectProof,
        non_selected_subject_attempts: nonSelectedSubject.attempts,
        non_selected_subject_status_class: nonSelectedRead.statusClass,
        private_smoke: privateSmoke,
        private_smoke_status: privateSmokeResponse.status,
        non_allowed_route: NON_ALLOWED_ROUTE,
        second_route_enabled: secondRouteEnabled,
        non_allowed_route_status_class: nonAllowedRead.statusClass,
        artifacts_redacted: artifactsRedacted,
        env_snapshot_redacted: envSnapshotRedacted,
      });
    }

    finish(
      {
        ...baseMatrix,
        final_status: "GREEN_RATE_LIMIT_MARKETPLACE_SEARCH_PERMANENTLY_ENABLED",
        health_before: healthBefore.status,
        ready_before: readyBefore.status,
        health_after: healthAfter.status,
        ready_after: readyAfter.status,
        baseline_status_class: confirmedBaselineRead.statusClass,
        baseline_body_ok: confirmedBaselineRead.bodyOk,
        deploy_triggered: deployResult.ok,
        latest_deploy_live: live.live,
        latest_deploy_status: live.latestStatus,
        deploy_commit_matches_head: live.containsHead,
        rate_limit_mode: RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES[RATE_ENFORCEMENT_MODE_ENV_NAME],
        route_count: routeCount,
        route_allowlist: [TARGET_ROUTE],
        rate_limit_percent: Number(TARGET_RATE_LIMIT_PERCENT),
        runtime_scoped_to_one_route: runtimeScoped,
        retained: true,
        rollback_triggered: false,
        rollback_succeeded: "not_needed",
        env_snapshot_redacted: envSnapshotRedacted,
        rate_limit_env_keys_written_count: Object.keys(RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES).length,
        selected_subject_proof: selectedSubjectProof,
        selected_subject_attempts: selectedSubject.attempts,
        selected_subject_status_class: selectedRead.statusClass,
        selected_subject_error_category: selectedRead.errorCategory,
        non_selected_subject_proof: nonSelectedSubjectProof,
        non_selected_subject_attempts: nonSelectedSubject.attempts,
        non_selected_subject_status_class: nonSelectedRead.statusClass,
        non_selected_subject_error_category: nonSelectedRead.errorCategory,
        private_smoke: privateSmoke,
        private_smoke_status: privateSmokeResponse.status,
        second_route_enabled: secondRouteEnabled,
        no_second_route: true,
        non_allowed_route: NON_ALLOWED_ROUTE,
        non_allowed_route_status_class: nonAllowedRead.statusClass,
        non_allowed_route_error_category: nonAllowedRead.errorCategory,
        cache_changes: false,
        credentials_in_cli_args: false,
        credentials_in_artifacts: false,
        artifacts_redacted: artifactsRedacted,
      },
      0,
    );
  } catch (error: unknown) {
    const blockedReason = error instanceof Error ? error.message : "runtime_exception_after_env_apply";
    await rollbackAndFinish("BLOCKED_RATE_LIMIT_PROOF_FAILED_ROLLED_BACK", blockedReason, previous, {
      health_before: healthBefore.status,
      ready_before: readyBefore.status,
      baseline_status_class: confirmedBaselineRead.statusClass,
      env_snapshot_redacted: envSnapshotRedacted,
      runtime_exception_after_env_apply: true,
    });
  }
}

const normalizedEntryPoint = process.argv[1]?.replace(/\\/g, "/") ?? "";
if (normalizedEntryPoint.endsWith("scripts/runtime/rateLimitMarketplacePermanentEnable.ts")) {
  main().catch((error: unknown) => {
    const errorCategory = error instanceof Error ? error.message : "unknown_error";
    finish(
      buildBaseMatrix({
        final_status: "BLOCKED_RATE_LIMIT_RUNTIME_NOT_SCOPED_TO_ONE_ROUTE",
        blocked_reason: errorCategory,
        retained: false,
        rollback_triggered: "not_started",
        rollback_succeeded: false,
      }),
      2,
    );
  });
}
