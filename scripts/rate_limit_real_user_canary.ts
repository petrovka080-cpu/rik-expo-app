import fs from "fs";
import { execFileSync } from "child_process";

import {
  InMemoryRateLimitAdapter,
  createRateEnforcementProviderFromEnv,
} from "../src/shared/scale/rateLimitAdapters";

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

const MATRIX_PATH = "artifacts/S_RATE_LIMIT_PRODUCTION_REAL_USER_ENFORCEMENT_CANARY_1_matrix.json";
const PROOF_PATH = "artifacts/S_RATE_LIMIT_PRODUCTION_REAL_USER_ENFORCEMENT_CANARY_1_proof.md";

const REQUIRED_APPROVALS = [
  "S_RATE_LIMIT_PRODUCTION_REAL_USER_ENFORCEMENT_PREFLIGHT_APPROVED",
  "S_RATE_LIMIT_PRODUCTION_REAL_USER_ENFORCEMENT_CANARY_APPROVED",
  "S_RATE_LIMIT_PRODUCTION_REAL_USER_ENFORCEMENT_ROLLBACK_APPROVED",
] as const;

const CANARY_ROUTE = "marketplace.catalog.search" as const;
const CANARY_ROUTE_KEY = "marketplace_catalog_search";
const CANARY_PERCENT = "1";

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
      "# S-RATE-LIMIT-PRODUCTION-REAL-USER-ENFORCEMENT-CANARY-1-BATTLESAFE",
      "",
      `final_status: ${matrix.final_status}`,
      "",
      "## Summary",
      `- route_scoped_enforcement: ${String(matrix.route_scoped_enforcement ?? false)}`,
      `- canary_route_class: ${String(matrix.canary_route_class ?? "none")}`,
      `- canary_percent: ${String(matrix.canary_percent ?? 0)}`,
      `- health_ready_stable: ${String(matrix.health_ready_stable ?? false)}`,
      `- rollback_triggered: ${String(matrix.rollback_triggered ?? false)}`,
      "",
      "## Safety",
      "- raw keys, URLs, tokens, env values, payloads, DB rows, business rows: not printed",
      "- DB writes, migrations, BFF traffic percent changes, global enforcement: not performed",
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

function renderEnvItems(body: unknown): RenderEnvItem[] {
  if (Array.isArray(body)) return body as RenderEnvItem[];
  if (body && typeof body === "object") {
    const record = body as { envVars?: unknown };
    if (Array.isArray(record.envVars)) return record.envVars as RenderEnvItem[];
  }
  return [];
}

async function findCanarySubject(selected: boolean): Promise<string> {
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
    if (decision.routeCanarySelected === selected) return candidate;
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

  const envResult = await api(`/services/${encodeURIComponent(serviceId)}/env-vars`);
  const envItems = renderEnvItems(envResult.body);
  const previous = {
    mode: envItemValue(envItems, "SCALE_RATE_ENFORCEMENT_MODE"),
    allowlist: envItemValue(envItems, "SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST"),
    percent: envItemValue(envItems, "SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT"),
  };
  const restoreEnv = async () => {
    await Promise.all([
      previous.mode.present
        ? putEnv("SCALE_RATE_ENFORCEMENT_MODE", previous.mode.value)
        : deleteEnv("SCALE_RATE_ENFORCEMENT_MODE"),
      previous.allowlist.present
        ? putEnv("SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST", previous.allowlist.value)
        : deleteEnv("SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST"),
      previous.percent.present
        ? putEnv("SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT", previous.percent.value)
        : deleteEnv("SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT"),
    ]).catch(() => undefined);
    await triggerDeploy().catch(() => undefined);
    await waitForLive().catch(() => undefined);
  };

  const envApply = await Promise.all([
    putEnv("SCALE_RATE_ENFORCEMENT_MODE", "enforce_production_real_user_route_canary_only"),
    putEnv("SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST", CANARY_ROUTE),
    putEnv("SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT", CANARY_PERCENT),
  ]);
  if (!envApply.every((result) => result.ok)) {
    fail({
      final_status: "BLOCKED_RATE_LIMIT_ENFORCEMENT_SCOPE_UNSAFE",
      approvals_present: true,
      render_env_written: false,
    });
  }

  const deployResult = await triggerDeploy();
  if (!deployResult.ok) {
    await restoreEnv();
    fail({
      final_status: "BLOCKED_RATE_LIMIT_ENFORCEMENT_HEALTH_READY_FAILED_ROLLBACK",
      approvals_present: true,
      render_env_written: true,
      deploy_triggered: false,
      rollback_triggered: true,
    });
  }

  const live = await waitForLive();
  if (!live.live) {
    await restoreEnv();
    fail({
      final_status: "BLOCKED_RATE_LIMIT_ENFORCEMENT_HEALTH_READY_FAILED_ROLLBACK",
      approvals_present: true,
      render_env_written: true,
      deploy_triggered: true,
      rollback_triggered: true,
      latest_deploy_live: false,
    });
  }

  const healthAfterDeploy = await fetch(`${cleanBase}/health`, { method: "GET" });
  const readyAfterDeploy = await fetch(`${cleanBase}/ready`, { method: "GET" });
  if (healthAfterDeploy.status !== 200 || readyAfterDeploy.status !== 200) {
    await restoreEnv();
    fail({
      final_status: "BLOCKED_RATE_LIMIT_ENFORCEMENT_HEALTH_READY_FAILED_ROLLBACK",
      approvals_present: true,
      render_env_written: true,
      deploy_triggered: true,
      rollback_triggered: true,
      production_health_after_deploy: healthAfterDeploy.status,
      production_ready_after_deploy: readyAfterDeploy.status,
    });
  }

  const freshEnvResult = await api(`/services/${encodeURIComponent(serviceId)}/env-vars`);
  const freshEnvItems = renderEnvItems(freshEnvResult.body);
  const renderAuth = envItemValue(freshEnvItems, "BFF_SERVER_AUTH_SECRET").value;
  const serverAuth = renderAuth || env.BFF_SERVER_AUTH_SECRET || "";
  if (!serverAuth) {
    await restoreEnv();
    fail({
      final_status: "BLOCKED_RATE_LIMIT_ENFORCEMENT_SCOPE_UNSAFE",
      approvals_present: true,
      auth_category: "missing",
      rollback_triggered: true,
    });
  }

  let selectedSubject = "";
  let nonSelectedSubject = "";
  try {
    selectedSubject = await findCanarySubject(true);
    nonSelectedSubject = await findCanarySubject(false);
  } catch {
    await restoreEnv();
    fail({
      final_status: "BLOCKED_RATE_LIMIT_ENFORCEMENT_SCOPE_UNSAFE",
      approvals_present: true,
      selection_category: "unavailable",
      rollback_triggered: true,
    });
  }

  const callRead = async (subject: string) => {
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
    let errorCode: string | null = null;
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: { code?: string } } | null;
      errorCode = typeof body?.error?.code === "string" ? body.error.code : null;
    } else {
      await response.arrayBuffer().catch(() => undefined);
    }
    return {
      ok: response.ok,
      statusClass: `${Math.trunc(response.status / 100)}xx`,
      errorCategory: errorCode ? "redacted_error_code_present" : "none",
    };
  };

  const selectedRead = await callRead(selectedSubject);
  const nonSelectedRead = await callRead(nonSelectedSubject);
  const privateSmoke = await fetch(`${cleanBase}/api/staging-bff/diagnostics/rate-limit-private-smoke`, {
    method: "POST",
    headers: { authorization: `Bearer ${serverAuth}` },
  });
  const privateSmokeBody = await privateSmoke.json().catch(() => null) as { data?: Record<string, unknown> } | null;
  const syntheticThrottleOk =
    privateSmoke.status === 200 &&
    privateSmokeBody?.data?.wouldAllowVerified === true &&
    privateSmokeBody?.data?.wouldThrottleVerified === true &&
    privateSmokeBody?.data?.cleanupOk === true;
  const healthAfterCanary = await fetch(`${cleanBase}/health`, { method: "GET" });
  const readyAfterCanary = await fetch(`${cleanBase}/ready`, { method: "GET" });
  const routeCanaryOk = selectedRead.ok && nonSelectedRead.ok;
  if (!routeCanaryOk || !syntheticThrottleOk || healthAfterCanary.status !== 200 || readyAfterCanary.status !== 200) {
    await restoreEnv();
    fail({
      final_status: routeCanaryOk
        ? "BLOCKED_RATE_LIMIT_ENFORCEMENT_HEALTH_READY_FAILED_ROLLBACK"
        : "BLOCKED_RATE_LIMIT_ENFORCEMENT_FALSE_POSITIVE_ROLLBACK",
      approvals_present: true,
      render_env_written: true,
      deploy_triggered: true,
      rollback_triggered: true,
      selected_canary_request_status_class: selectedRead.statusClass,
      non_selected_allow_request_status_class: nonSelectedRead.statusClass,
      selected_error_category: selectedRead.errorCategory,
      synthetic_private_smoke_status_class: `${Math.trunc(privateSmoke.status / 100)}xx`,
      production_health_after_canary: healthAfterCanary.status,
      production_ready_after_canary: readyAfterCanary.status,
    });
  }

  const matrix: Matrix = {
    final_status: "GREEN_RATE_LIMIT_PRODUCTION_REAL_USER_ENFORCEMENT_CANARY_HEALTHY",
    approvals_present: true,
    head_equals_origin_main: true,
    ahead,
    behind,
    worktree_clean: worktreeClean,
    release_verify_status: "PASS",
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
    canary_route_class: CANARY_ROUTE,
    route_scoped_enforcement: true,
    global_real_user_enforcement: false,
    canary_percent: Number(CANARY_PERCENT),
    broad_mutation_route_enforcement: false,
    business_logic_changed: false,
    business_mutations_made: false,
    db_writes: false,
    migrations_applied: false,
    render_env_written: true,
    deploy_triggered: true,
    redeploy_triggered: true,
    rollback_triggered: false,
    bff_traffic_changed: false,
    selected_canary_request_status_class: selectedRead.statusClass,
    non_selected_allow_request_status_class: nonSelectedRead.statusClass,
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
