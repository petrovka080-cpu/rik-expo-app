import { createHmac, randomBytes } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const OLD_RECEIPT = resolve(process.env.R555_CURRENT_BACKEND_RECEIPT
  ?? ".release-runtime/r555/evidence/08_R555_STRICT_BACKEND_RESTART.json");
const CANDIDATE_RECEIPT = resolve(process.env.R555_RUNTIME_TARGET_RECEIPT
  ?? ".release-runtime/r555/evidence/08A_R555_MATERIAL_FIRST_SEARCH_SNAPSHOT_APPLY.json");
const OUTPUT = resolve(process.env.R555_RESTART_OUTPUT
  ?? ".release-runtime/r555/evidence/08B_R555_STRICT_BACKEND_SEARCH_REBIND.json");
const SUPABASE_EXE = "C:/Users/User/.local/share/supabase/v2.105.0/supabase.exe";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function statusEnvironment(): Record<string, string> {
  const output = execFileSync(SUPABASE_EXE, ["status", "-o", "env"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, SUPABASE_PROJECT_ID: "rik-r52-a7-provider-20260824" },
    timeout: 30_000,
  });
  const values: Record<string, string> = {};
  for (const line of output.split(/\r?\n/u)) {
    const match = /^([A-Z][A-Z0-9_]*)=(?:"([^"]*)"|'([^']*)'|(.*))$/u.exec(line.trim());
    if (match) values[match[1]] = String(match[2] ?? match[3] ?? match[4] ?? "").trim();
  }
  return values;
}

function localGatewayApiKey(): string {
  const inspectEnvironment = (container: string): Record<string, string> => {
    const output = execFileSync("docker", [
    "inspect",
    "--format",
    "{{json .Config.Env}}",
      container,
    ], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 15_000,
    });
    const rows = JSON.parse(output) as string[];
    return Object.fromEntries(rows.map((row) => {
      const separator = row.indexOf("=");
      return separator < 1 ? [row, ""] : [row.slice(0, separator), row.slice(separator + 1)];
    }));
  };
  const gateway = inspectEnvironment("supabase_kong_rik-r52-a7-provider-20260824");
  const configured = String(gateway.SUPABASE_ANON_KEY ?? gateway.ANON_KEY ?? "");
  if (configured) return configured;
  const auth = inspectEnvironment("supabase_auth_rik-r52-a7-provider-20260824");
  const secret = String(auth.GOTRUE_JWT_SECRET ?? auth.JWT_SECRET ?? "");
  invariant(secret.length >= 32, "R555_LOCAL_AUTH_JWT_SECRET_MISSING");
  const now = Math.floor(Date.now() / 1_000);
  const encodedHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify({ role: "anon", iss: "supabase", iat: now, exp: now + 3_600 })).toString("base64url");
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", secret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

async function portOpen(port: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const socket = connect({ host: "127.0.0.1", port });
    const finish = (value: boolean): void => {
      socket.destroy();
      resolvePromise(value);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(500, () => finish(false));
  });
}

async function waitForPort(port: number, expectedOpen: boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await portOpen(port) === expectedOpen) return true;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  return false;
}

function startBackend(options: {
  authUrl: string;
  authApiKey: string;
  releaseId: string;
  searchReleaseId: string;
  capability: Json;
  sourceHead: string;
  sourceTree: string;
  runtimeDirectory: string;
}): number {
  mkdirSync(options.runtimeDirectory, { recursive: true });
  const stdoutPath = resolve(options.runtimeDirectory, "backend.stdout.log");
  const stderrPath = resolve(options.runtimeDirectory, "backend.stderr.log");
  const stdout = openSync(stdoutPath, "a");
  const stderr = openSync(stderrPath, "a");
  const child = spawn(process.execPath, [
    "--import",
    "tsx",
    "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
  ], {
    cwd: process.cwd(),
    detached: true,
    windowsHide: true,
    stdio: ["ignore", stdout, stderr],
    env: {
      ...process.env,
      CANONICAL_ESTIMATE_LOCAL_AUTH_MODE: "STRICT_SESSION_INTROSPECTION",
      CANONICAL_ESTIMATE_SUPABASE_AUTH_URL: options.authUrl,
      CANONICAL_ESTIMATE_SUPABASE_AUTH_API_KEY: options.authApiKey,
      CANONICAL_ESTIMATE_SUPABASE_PRINCIPAL_RPC: "r541_current_principal",
      CANONICAL_ESTIMATE_TARGET_RELEASE_ID: options.releaseId,
      CANONICAL_ESTIMATE_CONTENT_ADMISSION_RELEASE_ID: options.releaseId,
      CANONICAL_ESTIMATE_ALLOW_PREPARED_RELEASE_COMPILE: "true",
      CANONICAL_ESTIMATE_RUNTIME_ENVIRONMENT: String(options.capability.environment),
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ENVIRONMENT: String(options.capability.environment),
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ID: String(options.capability.id),
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_BINDING: "request-principal",
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_RELEASE_ID: options.releaseId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SEARCH_RELEASE_ID: options.searchReleaseId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_EXPIRES_AT: new Date(options.capability.expires_at).toISOString(),
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_PURPOSE: String(options.capability.purpose),
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_HEAD: options.sourceHead,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_TREE: options.sourceTree,
      CANONICAL_ESTIMATE_CUMULATIVE_MANIFEST: "true",
      CANONICAL_ESTIMATE_LOCAL_PORT: "8765",
      ESTIMATE_MIGRATION_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_SEARCH_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID: options.searchReleaseId,
      CANONICAL_ESTIMATE_ADMISSION_RUN_ID: `r555-local-gate-${options.searchReleaseId}`,
      CANONICAL_ESTIMATE_LOCAL_DATABASE_POOL_MAX: "8",
      R45_RUNTIME_SOURCE_HEAD: options.sourceHead,
      R45_RUNTIME_SOURCE_TREE: options.sourceTree,
      R45_RUNTIME_SPEC_SHA256: "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007",
      CANONICAL_ESTIMATE_LOCAL_ARTIFACT_SECRET: randomBytes(48).toString("base64url"),
      CANONICAL_ESTIMATE_REQUEST_AUDIT_LOG: resolve(options.runtimeDirectory, "request-audit.jsonl"),
    },
  });
  closeSync(stdout);
  closeSync(stderr);
  invariant(child.pid, "R555_BACKEND_PID_MISSING");
  child.unref();
  return child.pid;
}

async function main(): Promise<void> {
  const oldReceipt = JSON.parse(readFileSync(OLD_RECEIPT, "utf8")) as Json;
  const candidateReceipt = JSON.parse(readFileSync(CANDIDATE_RECEIPT, "utf8")) as Json;
  invariant([
    "GREEN_LOCAL_REGRESSION_CANDIDATE_PREPARED_NOT_ACTIVE",
    "GREEN_LOCAL_SEARCH_SNAPSHOT_APPLIED_NOT_ACTIVE",
    "GREEN_LOCAL_ASPHALT_CANONICAL_SUCCESSOR_PREPARED_NOT_ACTIVE",
    "GREEN_R555_FULL_CUMULATIVE_CONSUMER_CAPABILITY",
  ].includes(String(candidateReceipt.status)), "R555_CANDIDATE_RECEIPT_RED");
  const targetSearchReleaseId = String(
    candidateReceipt.candidate_search_release_id ?? candidateReceipt.search_release_id ?? "",
  );
  const candidateTenantId = String(
    candidateReceipt.consumer_tenant_id ?? candidateReceipt.tenant_id ?? "",
  );
  const oldPid = Number(oldReceipt.backend?.pid);
  invariant(Number.isInteger(oldPid) && oldPid > 0, "R555_OLD_PID_INVALID");
  process.kill(oldPid, 0);
  invariant(await portOpen(8765), "R555_OLD_BACKEND_PORT_NOT_OPEN");

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r555-strict-backend-restart" });
  await client.connect();
  let candidateCapability: Json;
  let oldCapability: Json;
  try {
    const liveJobs = (await client.query(`select status,count(*)::int count
      from public.estimate_compile_job where upper(status) in ('QUEUED','RUNNING','CLAIMED') group by status`)).rows as Json[];
    invariant(liveJobs.reduce((sum, row) => sum + Number(row.count), 0) === 0,
      `R555_BACKEND_RESTART_LIVE_JOBS:${JSON.stringify(liveJobs)}`);
    candidateCapability = (await client.query(`select * from public.estimate_candidate_capability_r3
      where id=$1 and revoked_at is null and expires_at>now()`, [candidateReceipt.capability_id])).rows[0] as Json;
    invariant(candidateCapability?.release_id === candidateReceipt.candidate_release_id, "R555_CANDIDATE_CAPABILITY_DRIFT");
    invariant(candidateCapability?.search_release_id === targetSearchReleaseId, "R555_CANDIDATE_SEARCH_CAPABILITY_DRIFT");
    oldCapability = (await client.query(`select * from public.estimate_candidate_capability_r3
      where release_id=$1 and search_release_id=$2 and tenant_id=$3 and revoked_at is null and expires_at>now()
      order by created_at desc limit 1`, [
      oldReceipt.backend.target_release_id,
      oldReceipt.backend.search_release_id,
      candidateTenantId,
    ])).rows[0] as Json;
    invariant(oldCapability, "R555_OLD_CAPABILITY_RECOVERY_MISSING");
  } finally {
    await client.end();
  }
  const environment = statusEnvironment();
  const authUrl = environment.API_URL ?? environment.SUPABASE_URL;
  const authApiKey = environment.ANON_KEY ?? environment.SUPABASE_ANON_KEY
    ?? environment.PUBLISHABLE_KEY ?? localGatewayApiKey();
  invariant(authUrl && /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/u.test(authUrl), "R555_LOCAL_AUTH_URL_INVALID");
  invariant(authApiKey && authApiKey.length > 20,
    `R555_LOCAL_AUTH_API_KEY_MISSING:AVAILABLE_KEYS=${Object.keys(environment).sort().join(",")}`);

  const runtimeDirectory = resolve(`.release-runtime/r555/runtime/strict-backend-${String(candidateReceipt.source_tree).slice(0, 12)}-${targetSearchReleaseId.slice(0, 8)}`);
  process.kill(oldPid, "SIGTERM");
  invariant(await waitForPort(8765, false, 15_000), "R555_OLD_BACKEND_DID_NOT_STOP");
  let newPid = 0;
  try {
    newPid = startBackend({
      authUrl,
      authApiKey,
      releaseId: String(candidateReceipt.candidate_release_id),
      searchReleaseId: targetSearchReleaseId,
      capability: candidateCapability!,
      sourceHead: String(candidateReceipt.source_head),
      sourceTree: String(candidateReceipt.source_tree),
      runtimeDirectory,
    });
    invariant(await waitForPort(8765, true, 20_000), "R555_NEW_BACKEND_DID_NOT_START");
  } catch (error) {
    if (newPid) process.kill(newPid, "SIGTERM");
    await waitForPort(8765, false, 5_000);
    const recoveryDirectory = resolve(".release-runtime/r555/runtime/recovered-r542-strict-backend");
    const recoveryPid = startBackend({
      authUrl,
      authApiKey,
      releaseId: String(oldReceipt.backend.target_release_id),
      searchReleaseId: String(oldReceipt.backend.search_release_id),
      capability: oldCapability!,
      sourceHead: String(oldReceipt.backend.source_head),
      sourceTree: String(oldReceipt.backend.source_tree),
      runtimeDirectory: recoveryDirectory,
    });
    const recovered = await waitForPort(8765, true, 20_000);
    throw new Error(`${error instanceof Error ? error.message : String(error)};RECOVERY_PID=${recoveryPid};RECOVERED=${recovered}`);
  }

  const receipt = {
    schema_version: "rik-expo-app-r555.strict-backend-restart.v1",
    generated_utc: new Date().toISOString(),
    status: "GREEN_R555_STRICT_BACKEND_READY",
    master_sha256: "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007",
    predecessor_pid: oldPid,
    backend: {
      pid: newPid,
      port: 8765,
      auth_mode: "STRICT_SESSION_INTROSPECTION",
      principal_rpc: "r541_current_principal",
      capability_tenant_binding: "request-principal",
      admission_run_id_owner: "SERVER_RUNTIME",
      admission_run_id_value_persisted: false,
      database_pool_maximum: 8,
      database: { host: "127.0.0.1", port: "55432", name: "rik_r4_runtime_b5_v2" },
      source_head: candidateReceipt.source_head,
      source_tree: candidateReceipt.source_tree,
      target_release_id: candidateReceipt.candidate_release_id,
      search_release_id: targetSearchReleaseId,
      price_snapshot_id: candidateReceipt.price_snapshot_id,
    },
    logs: {
      stdout: resolve(runtimeDirectory, "backend.stdout.log"),
      stderr: resolve(runtimeDirectory, "backend.stderr.log"),
    },
    secrets: {
      service_role_in_browser: false,
      artifact_secret_persisted: false,
      raw_access_token_persisted: false,
      auth_api_key_persisted: false,
    },
    live_jobs_at_handoff: 0,
    production_accessed: false,
    deployed: false,
    merged: false,
    released: false,
    ota: false,
  };
  writeJson(OUTPUT, receipt);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
