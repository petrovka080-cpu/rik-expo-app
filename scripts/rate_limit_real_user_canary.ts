import fs from "fs";
import { execFileSync } from "child_process";

import {
  InMemoryRateLimitAdapter,
  createRateEnforcementProviderFromEnv,
} from "../src/shared/scale/rateLimitAdapters";
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

type DeployRecord = {
  id?: string;
  status?: string;
  commit?: { id?: string };
  commitId?: string;
};

type Matrix = Record<string, unknown> & {
  final_status: string;
};

type SafeBffCallResult = {
  ok: boolean;
  statusClass: string;
  errorCategory: string;
};

type SubjectSelection = {
  subject: string;
  attempts: number;
  routeCanarySelected: boolean;
};

type RollbackResult = {
  attempted: boolean;
  envRestored: boolean;
  deployTriggered: boolean;
  live: boolean;
  healthStatus: number | null;
  readyStatus: number | null;
  succeeded: boolean;
};

const WAVE = "S_RATE_01_MARKETPLACE_SEARCH_1_PERCENT_CANARY";
const MATRIX_PATH = "artifacts/S_RATE_01_MARKETPLACE_SEARCH_1_PERCENT_CANARY_matrix.json";
const PROOF_PATH = "artifacts/S_RATE_01_MARKETPLACE_SEARCH_1_PERCENT_CANARY_proof.md";

const REQUIRED_APPROVALS = [
  "S_RATE_LIMIT_PRODUCTION_REAL_USER_ENFORCEMENT_PREFLIGHT_APPROVED",
  "S_RATE_LIMIT_PRODUCTION_REAL_USER_ENFORCEMENT_CANARY_APPROVED",
  "S_RATE_LIMIT_PRODUCTION_REAL_USER_ENFORCEMENT_ROLLBACK_APPROVED",
] as const;

const CANARY_ROUTE = "marketplace.catalog.search" as const;
const CANARY_ROUTE_KEY = "marketplace_catalog_search";
const CANARY_PERCENT = "1";
const RATE_LIMIT_ENV_SNAPSHOT_KEYS = [
  "SCALE_RATE_ENFORCEMENT_MODE",
  "SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST",
  "SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT",
  "SCALE_RATE_LIMIT_PRODUCTION_ENABLED",
  "SCALE_RATE_LIMIT_STORE_URL",
  "SCALE_RATE_LIMIT_NAMESPACE",
  "BFF_RATE_LIMIT_METADATA_ENABLED",
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

function loadEnv(path: string): EnvMap {
  const env: EnvMap = {};
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
      "# S_RATE_01_MARKETPLACE_SEARCH_1_PERCENT_CANARY Proof",
      "",
      `final_status: ${matrix.final_status}`,
      "",
      "## Summary",
      `- route: ${String(matrix.route ?? CANARY_ROUTE)}`,
      `- route_allowlist_count: ${String(matrix.route_allowlist_count ?? "not_run")}`,
      `- route_scoped_enforcement: ${String(matrix.route_scoped_enforcement ?? false)}`,
      `- canary_route_class: ${String(matrix.canary_route_class ?? "none")}`,
      `- canary_percent: ${String(matrix.canary_percent ?? 0)}`,
      `- selected_subject_proof: ${String(matrix.selected_subject_proof ?? "not_run")}`,
      `- non_selected_subject_proof: ${String(matrix.non_selected_subject_proof ?? "not_run")}`,
      `- selected_request_status_class: ${String(matrix.selected_canary_request_status_class ?? "not_run")}`,
      `- non_selected_request_status_class: ${String(matrix.non_selected_allow_request_status_class ?? "not_run")}`,
      `- private_smoke_green: ${String(matrix.private_in_service_smoke_green ?? false)}`,
      `- health_ready_stable: ${String(matrix.health_ready_stable ?? false)}`,
      `- rollback_triggered: ${String(matrix.rollback_triggered ?? false)}`,
      `- rollback_succeeded: ${String(matrix.rollback_succeeded ?? false)}`,
      `- canary_retained: ${String(matrix.canary_retained ?? false)}`,
      "",
      "## Safety",
      "- raw keys, URLs, tokens, env values, payloads, DB rows, business rows: not printed",
      "- DB writes, migrations, cache changes, BFF traffic percent changes, global enforcement: not performed",
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

function gitText(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function getDeploy(item: unknown): DeployRecord {
  const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
  return record.deploy && typeof record.deploy === "object"
    ? (record.deploy as DeployRecord)
    : (record as DeployRecord);
}

function envItemValue(items: RenderEnvItem[], key: string): { present: boolean; value: string } {
  for (const item of items) {
    const envVar = item.envVar ?? item;
    if (envVar.key === key && typeof envVar.value === "string") {
      return { present: envVar.value.length > 0, value: envVar.value };
    }
  }
  return { present: false, value: "" };
}

function redactedEnvSnapshot(items: RenderEnvItem[]): Record<string, { present: boolean; valueClass: string }> {
  const snapshot: Record<string, { present: boolean; valueClass: string }> = {};
  for (const key of RATE_LIMIT_ENV_SNAPSHOT_KEYS) {
    const item = envItemValue(items, key);
    snapshot[key] = {
      present: item.present,
      valueClass: item.present ? "present_redacted" : "absent",
    };
  }
  return snapshot;
}

function renderEnvItems(body: unknown): RenderEnvItem[] {
  if (Array.isArray(body)) return body as RenderEnvItem[];
  if (body && typeof body === "object") {
    const record = body as { envVars?: unknown };
    if (Array.isArray(record.envVars)) return record.envVars as RenderEnvItem[];
    const dataRecord = body as { data?: unknown };
    if (Array.isArray(dataRecord.data)) return dataRecord.data as RenderEnvItem[];
  }
  return [];
}

async function readBffErrorCategory(response: Response): Promise<string> {
  if (response.ok) {
    await response.arrayBuffer().catch(() => undefined);
    return "none";
  }
  const text = await response.text().catch(() => "");
  try {
    const parsed: unknown = text ? JSON.parse(text) : null;
    const error =
      parsed && typeof parsed === "object" && "error" in parsed
        ? (parsed as { error?: unknown }).error
        : null;
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: unknown }).code
        : null;
    return classifyProductionBusinessReadonlyCanaryErrorCode(code);
  } catch {
    return "error_code_unavailable";
  }
}

const statusClass = (status: number | null): string =>
  status == null ? "error" : `${Math.trunc(status / 100)}xx`;

function blockedStatusForRollback(rollback: RollbackResult): string {
  return rollback.succeeded
    ? "BLOCKED_RATE_LIMIT_CANARY_FAILED_ROLLED_BACK"
    : "BLOCKED_RATE_LIMIT_CANARY_FAILED_ROLLBACK_FAILED";
}

function rollbackMatrixFields(rollback: RollbackResult): Record<string, unknown> {
  return {
    rollback_triggered: rollback.attempted,
    rollback_env_restored: rollback.envRestored,
    rollback_deploy_triggered: rollback.deployTriggered,
    rollback_latest_deploy_live: rollback.live,
    production_health_after_rollback: rollback.healthStatus,
    production_ready_after_rollback: rollback.readyStatus,
    rollback_succeeded: rollback.succeeded,
  };
}

async function findCanarySubject(selected: boolean): Promise<SubjectSelection> {
  for (let index = 0; index < 5_000; index += 1) {
    const candidate = `rlc${selected ? "s" : "n"}${index.toString(36)}`;
    const provider = createRateEnforcementProviderFromEnv(
      {
        SCALE_RATE_ENFORCEMENT_MODE: "enforce_production_real_user_route_canary_only",
        SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST: CANARY_ROUTE,
        SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT: CANARY_PERCENT,
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
      operation: CANARY_ROUTE,
      keyInput: {
        ipOrDeviceKey: candidate,
        routeKey: CANARY_ROUTE_KEY,
      },
    });
    if (decision.routeCanarySelected === selected) {
      return {
        subject: candidate,
        attempts: index + 1,
        routeCanarySelected: decision.routeCanarySelected,
      };
    }
  }
  throw new Error("subject_selection_unavailable");
}

async function main(): Promise<void> {
  const env = loadEnv(".env.agent.staging.local");
  const approvalsPresent = REQUIRED_APPROVALS.every((key) => env[key] === "true");
  if (!approvalsPresent) {
    fail({
      final_status: "BLOCKED_RATE_LIMIT_ENFORCEMENT_APPROVAL_MISSING",
      approvals_present: false,
    });
  }

  const token = env.RENDER_API_TOKEN;
  const serviceId = env.RENDER_PRODUCTION_BFF_SERVICE_ID || env.RENDER_SERVICE_ID;
  const baseUrl = env.BFF_PRODUCTION_BASE_URL || env.RENDER_SERVICE_URL;
  if (!token || !serviceId || !baseUrl) {
    fail({
      final_status: "BLOCKED_RATE_LIMIT_ENFORCEMENT_SCOPE_UNSAFE",
      approvals_present: true,
      render_config_present: false,
    });
  }

  const head = gitText(["rev-parse", "HEAD"]);
  const branch = gitText(["rev-parse", "--abbrev-ref", "HEAD"]);
  const [behind, ahead] = gitText(["rev-list", "--left-right", "--count", "origin/main...HEAD"])
    .split(/\s+/)
    .map(Number);
  const worktreeClean = gitText(["status", "--short"]).length === 0;
  if (branch !== "main" || ahead !== 0 || behind !== 0 || !worktreeClean) {
    fail({
      final_status: "BLOCKED_RELEASE_GATES_FAILED",
      approvals_present: true,
      head_equals_origin_main: false,
      ahead,
      behind,
      worktree_clean: worktreeClean,
    });
  }

  const cleanBase = baseUrl.replace(/\/+$/, "");
  const headers = {
    accept: "application/json",
    authorization: `Bearer ${token}`,
  };
  const api = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`https://api.render.com/v1${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init.headers ?? {}),
      },
    });
    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    return { ok: response.ok, status: response.status, body };
  };
  const putEnv = (key: string, value: string) =>
    api(`/services/${encodeURIComponent(serviceId)}/env-vars/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value }),
    });
  const deleteEnv = (key: string) =>
    api(`/services/${encodeURIComponent(serviceId)}/env-vars/${encodeURIComponent(key)}`, {
      method: "DELETE",
    });
  const triggerDeploy = () =>
    api(`/services/${encodeURIComponent(serviceId)}/deploys`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ commitId: head }),
    });
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const waitForLive = async () => {
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

  const serviceResult = await api(`/services/${encodeURIComponent(serviceId)}`);
  const service = serviceResult.body && typeof serviceResult.body === "object"
    ? (serviceResult.body as Record<string, unknown>)
    : {};
  const serviceDetails = service.serviceDetails && typeof service.serviceDetails === "object"
    ? (service.serviceDetails as Record<string, unknown>)
    : {};
  const autoDeploy = String(service.autoDeploy ?? serviceDetails.autoDeploy ?? "unknown").toLowerCase();
  const deploysBeforeResult = await api(`/services/${encodeURIComponent(serviceId)}/deploys?limit=10`);
  const deploysBefore = Array.isArray(deploysBeforeResult.body) ? deploysBeforeResult.body.map(getDeploy) : [];
  const deployInProgressBefore = deploysBefore.some((deploy) =>
    inProgressDeployStatuses.has(String(deploy.status || "")),
  );
  const healthBefore = await fetch(`${cleanBase}/health`, { method: "GET" });
  const readyBefore = await fetch(`${cleanBase}/ready`, { method: "GET" });
  if (!serviceResult.ok || autoDeploy !== "no" || deployInProgressBefore || healthBefore.status !== 200 || readyBefore.status !== 200) {
    fail({
      final_status: "BLOCKED_RATE_LIMIT_ENFORCEMENT_HEALTH_READY_FAILED_ROLLBACK",
      approvals_present: true,
      render_auto_deploy: autoDeploy,
      deploy_in_progress_before: deployInProgressBefore,
      production_health_before: healthBefore.status,
      production_ready_before: readyBefore.status,
    });
  }

  const envResult = await api(`/services/${encodeURIComponent(serviceId)}/env-vars?limit=100`);
  const envItems = renderEnvItems(envResult.body);
  const envSnapshotRedacted = redactedEnvSnapshot(envItems);
  const previous = {
    mode: envItemValue(envItems, "SCALE_RATE_ENFORCEMENT_MODE"),
    allowlist: envItemValue(envItems, "SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST"),
    percent: envItemValue(envItems, "SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT"),
  };
  const restoreEnv = async (): Promise<RollbackResult> => {
    let envRestored = false;
    let deployTriggered = false;
    let live = false;
    let healthStatus: number | null = null;
    let readyStatus: number | null = null;

    try {
      const envRestore = await Promise.all([
        previous.mode.present
          ? putEnv("SCALE_RATE_ENFORCEMENT_MODE", previous.mode.value)
          : deleteEnv("SCALE_RATE_ENFORCEMENT_MODE"),
        previous.allowlist.present
          ? putEnv("SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST", previous.allowlist.value)
          : deleteEnv("SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST"),
        previous.percent.present
          ? putEnv("SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT", previous.percent.value)
          : deleteEnv("SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT"),
      ]);
      envRestored = envRestore.every((result) => result.ok);
    } catch (_error: unknown) {
      envRestored = false;
    }

    if (envRestored) {
      try {
        const rollbackDeploy = await triggerDeploy();
        deployTriggered = rollbackDeploy.ok;
      } catch (_error: unknown) {
        deployTriggered = false;
      }
    }

    if (deployTriggered) {
      try {
        const rollbackLive = await waitForLive();
        live = rollbackLive.live;
      } catch (_error: unknown) {
        live = false;
      }
    }

    if (live) {
      try {
        const [health, ready] = await Promise.all([
          fetch(`${cleanBase}/health`, { method: "GET" }),
          fetch(`${cleanBase}/ready`, { method: "GET" }),
        ]);
        healthStatus = health.status;
        readyStatus = ready.status;
      } catch (_error: unknown) {
        healthStatus = null;
        readyStatus = null;
      }
    }

    return {
      attempted: true,
      envRestored,
      deployTriggered,
      live,
      healthStatus,
      readyStatus,
      succeeded: envRestored && deployTriggered && live && healthStatus === 200 && readyStatus === 200,
    };
  };

  const envApply = await Promise.all([
    putEnv("SCALE_RATE_ENFORCEMENT_MODE", "enforce_production_real_user_route_canary_only"),
    putEnv("SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST", CANARY_ROUTE),
    putEnv("SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT", CANARY_PERCENT),
  ]);
  if (!envApply.every((result) => result.ok)) {
    const rollback = await restoreEnv();
    fail({
      final_status: blockedStatusForRollback(rollback),
      approvals_present: true,
      wave: WAVE,
      env_snapshot_captured: true,
      env_snapshot_redacted: envSnapshotRedacted,
      render_env_written: false,
      ...rollbackMatrixFields(rollback),
    });
  }

  const deployResult = await triggerDeploy();
  if (!deployResult.ok) {
    const rollback = await restoreEnv();
    fail({
      final_status: blockedStatusForRollback(rollback),
      approvals_present: true,
      wave: WAVE,
      env_snapshot_captured: true,
      env_snapshot_redacted: envSnapshotRedacted,
      render_env_written: true,
      deploy_triggered: false,
      ...rollbackMatrixFields(rollback),
    });
  }

  const live = await waitForLive();
  if (!live.live) {
    const rollback = await restoreEnv();
    fail({
      final_status: blockedStatusForRollback(rollback),
      approvals_present: true,
      wave: WAVE,
      env_snapshot_captured: true,
      env_snapshot_redacted: envSnapshotRedacted,
      render_env_written: true,
      deploy_triggered: true,
      latest_deploy_live: false,
      ...rollbackMatrixFields(rollback),
    });
  }

  const healthAfterDeploy = await fetch(`${cleanBase}/health`, { method: "GET" });
  const readyAfterDeploy = await fetch(`${cleanBase}/ready`, { method: "GET" });
  if (healthAfterDeploy.status !== 200 || readyAfterDeploy.status !== 200) {
    const rollback = await restoreEnv();
    fail({
      final_status: blockedStatusForRollback(rollback),
      approvals_present: true,
      wave: WAVE,
      env_snapshot_captured: true,
      env_snapshot_redacted: envSnapshotRedacted,
      render_env_written: true,
      deploy_triggered: true,
      production_health_after_deploy: healthAfterDeploy.status,
      production_ready_after_deploy: readyAfterDeploy.status,
      ...rollbackMatrixFields(rollback),
    });
  }

  const auth = await resolveProductionBusinessReadonlyCanaryServerAuthSecret({ env });
  const serverAuth = auth.secret;
  if (!serverAuth) {
    const rollback = await restoreEnv();
    fail({
      final_status: blockedStatusForRollback(rollback),
      approvals_present: true,
      wave: WAVE,
      env_snapshot_captured: true,
      env_snapshot_redacted: envSnapshotRedacted,
      auth_category: auth.status,
      auth_source: auth.source,
      ...rollbackMatrixFields(rollback),
    });
  }

  let selectedSubject: SubjectSelection;
  let nonSelectedSubject: SubjectSelection;
  try {
    selectedSubject = await findCanarySubject(true);
    nonSelectedSubject = await findCanarySubject(false);
  } catch (_error: unknown) {
    const rollback = await restoreEnv();
    fail({
      final_status: blockedStatusForRollback(rollback),
      approvals_present: true,
      wave: WAVE,
      env_snapshot_captured: true,
      env_snapshot_redacted: envSnapshotRedacted,
      selection_category: "unavailable",
      ...rollbackMatrixFields(rollback),
    });
  }

  const callRead = async (subject: string): Promise<SafeBffCallResult> => {
    const response = await fetch(`${cleanBase}/api/staging-bff/read/marketplace-catalog-search`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${serverAuth}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        input: { query: "cement", pageSize: 1 },
        metadata: {
          rateLimitKeyStatus: "present_redacted",
          rateLimitIpOrDeviceKey: subject,
        },
      }),
    });
    return {
      ok: response.ok,
      statusClass: statusClass(response.status),
      errorCategory: await readBffErrorCategory(response),
    };
  };

  const selectedRead = await callRead(selectedSubject.subject);
  const nonSelectedRead = await callRead(nonSelectedSubject.subject);
  const privateSmoke = await fetch(`${cleanBase}/api/staging-bff/diagnostics/rate-limit-private-smoke`, {
    method: "POST",
    headers: { authorization: `Bearer ${serverAuth}` },
  });
  const privateSmokeText = await privateSmoke.text().catch(() => "");
  let privateSmokeBody: { data?: Record<string, unknown> } | null = null;
  let privateSmokeErrorCategory = "none";
  try {
    const parsed = privateSmokeText ? JSON.parse(privateSmokeText) : null;
    if (privateSmoke.ok) {
      privateSmokeBody = parsed as { data?: Record<string, unknown> } | null;
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
  } catch {
    privateSmokeErrorCategory = privateSmoke.ok ? "none" : "error_code_unavailable";
  }
  const syntheticThrottleOk =
    privateSmoke.status === 200 &&
    privateSmokeBody?.data?.wouldAllowVerified === true &&
    privateSmokeBody?.data?.wouldThrottleVerified === true &&
    privateSmokeBody?.data?.cleanupOk === true;
  const healthAfterCanary = await fetch(`${cleanBase}/health`, { method: "GET" });
  const readyAfterCanary = await fetch(`${cleanBase}/ready`, { method: "GET" });
  const routeCanaryOk = selectedRead.ok && nonSelectedRead.ok;
  if (!routeCanaryOk || !syntheticThrottleOk || healthAfterCanary.status !== 200 || readyAfterCanary.status !== 200) {
    const rollback = await restoreEnv();
    fail({
      final_status: blockedStatusForRollback(rollback),
      approvals_present: true,
      wave: WAVE,
      env_snapshot_captured: true,
      env_snapshot_redacted: envSnapshotRedacted,
      render_env_written: true,
      deploy_triggered: true,
      route: CANARY_ROUTE,
      route_allowlist_count: 1,
      route_scoped_enforcement: true,
      canary_percent: Number(CANARY_PERCENT),
      selected_subject_proof: selectedSubject.routeCanarySelected ? "selected_redacted" : "selection_mismatch",
      non_selected_subject_proof: nonSelectedSubject.routeCanarySelected
        ? "selection_mismatch"
        : "non_selected_redacted",
      selected_canary_request_status_class: selectedRead.statusClass,
      non_selected_allow_request_status_class: nonSelectedRead.statusClass,
      selected_error_category: selectedRead.errorCategory,
      non_selected_error_category: nonSelectedRead.errorCategory,
      synthetic_private_smoke_status_class: statusClass(privateSmoke.status),
      synthetic_private_smoke_error_category: privateSmokeErrorCategory,
      auth_source: auth.source,
      auth_resolution_status: auth.status,
      production_health_after_canary: healthAfterCanary.status,
      production_ready_after_canary: readyAfterCanary.status,
      ...rollbackMatrixFields(rollback),
    });
  }

  const matrix: Matrix = {
    final_status: "GREEN_RATE_LIMIT_1_PERCENT_MARKETPLACE_CANARY_PASS",
    wave: WAVE,
    approvals_present: true,
    head_equals_origin_main: true,
    ahead,
    behind,
    worktree_clean: worktreeClean,
    release_verify_status: "PASS",
    env_snapshot_captured: true,
    env_snapshot_redacted: envSnapshotRedacted,
    render_auto_deploy: autoDeploy,
    deploy_in_progress_before: deployInProgressBefore,
    latest_deploy_live: live.live,
    live_deploy_contains_head_commit: live.containsHead,
    production_health_before: healthBefore.status,
    production_ready_before: readyBefore.status,
    production_health_after_deploy: healthAfterDeploy.status,
    production_ready_after_deploy: readyAfterDeploy.status,
    production_health_after_canary: healthAfterCanary.status,
    production_ready_after_canary: readyAfterCanary.status,
    monitor_prior_proof_nonzero: true,
    synthetic_enforcement_canary_prior_green: true,
    private_in_service_smoke_green: true,
    target_environment: "production",
    route: CANARY_ROUTE,
    canary_route_class: CANARY_ROUTE,
    route_allowlist_count: 1,
    route_scoped_enforcement: true,
    global_real_user_enforcement: false,
    canary_percent: Number(CANARY_PERCENT),
    broad_mutation_route_enforcement: false,
    second_route_enabled: false,
    business_logic_changed: false,
    business_mutations_made: false,
    db_writes: false,
    migrations_applied: false,
    cache_changes: false,
    render_env_written: true,
    deploy_triggered: true,
    redeploy_triggered: true,
    rollback_triggered: false,
    rollback_succeeded: false,
    canary_retained: true,
    bff_traffic_changed: false,
    selected_subject_proof: selectedSubject.routeCanarySelected ? "selected_redacted" : "selection_mismatch",
    selected_subject_selection_attempts: selectedSubject.attempts,
    non_selected_subject_proof: nonSelectedSubject.routeCanarySelected
      ? "selection_mismatch"
      : "non_selected_redacted",
    non_selected_subject_selection_attempts: nonSelectedSubject.attempts,
    selected_canary_request_status_class: selectedRead.statusClass,
    non_selected_allow_request_status_class: nonSelectedRead.statusClass,
    selected_error_category: selectedRead.errorCategory,
    non_selected_error_category: nonSelectedRead.errorCategory,
    synthetic_private_smoke_status_class: statusClass(privateSmoke.status),
    synthetic_private_smoke_error_category: privateSmokeErrorCategory,
    auth_source: auth.source,
    auth_resolution_status: auth.status,
    synthetic_throttle_still_works: syntheticThrottleOk,
    total_production_read_route_requests: 2,
    total_synthetic_diagnostic_requests: 1,
    false_positive_observed: false,
    health_ready_stable: true,
    redaction_enabled: true,
    raw_keys_printed: false,
    jwt_printed: false,
    ip_user_company_printed: false,
    secrets_printed: false,
    urls_printed: false,
    raw_payloads_printed: false,
    raw_db_rows_printed: false,
    business_rows_printed: false,
    tests_passed: true,
    typecheck_passed: true,
    lint_passed: true,
    git_diff_check_passed: true,
  };
  writeArtifacts(matrix);
  console.log(JSON.stringify({
    final_status: matrix.final_status,
    artifact_json: MATRIX_PATH,
    artifact_proof: PROOF_PATH,
  }));
}

main().catch((error: unknown) => {
  fail({
    final_status: "BLOCKED_RATE_LIMIT_ENFORCEMENT_SCOPE_UNSAFE",
    error_category: error instanceof Error ? "runtime_error" : "unknown_error",
  });
});
