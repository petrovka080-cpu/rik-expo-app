import { createHash, randomBytes } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { connect } from "node:net";
import { dirname, relative, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const BACKEND_URL = "http://127.0.0.1:8765";
const BACKEND_PORT = 8765;
const BACKEND_SOURCE = resolve("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts");
const PURPOSE = "estimate_candidate_admission_r3";
const ENVIRONMENT = "local-developer-r568";
const MINIMUM_TTL_SECONDS = 6 * 60 * 60;
const CAPABILITY_TTL_HOURS = 24;
const MASTER_SHA256 = "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde";
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const EVIDENCE_ROOT = resolve(
  String(process.env.LOCAL_DEVELOPER_EVIDENCE_ROOT ?? "").trim() ||
    ".release-runtime/r568/runtime/local-developer-current",
);
const OUTPUT = resolve(EVIDENCE_ROOT, "backend.json");
const PREFLIGHT_ONLY = process.argv.includes("--preflight");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function requiredEnvironment(name: string): string {
  const value = String(process.env[name] ?? "").trim();
  invariant(value, `R568_${name}_REQUIRED`);
  return value;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function resolveLocalImport(importer: string, specifier: string): string | null {
  const base = resolve(dirname(importer), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.mjs`,
    resolve(base, "index.ts"),
    resolve(base, "index.tsx"),
  ];
  return candidates.find((candidate) => (
    existsSync(candidate) && statSync(candidate).isFile()
  )) ?? null;
}

function backendRuntimeClosureSha256(entryPath: string): string {
  const visited = new Set<string>();
  const visit = (path: string): void => {
    const absolute = resolve(path);
    if (visited.has(absolute)) return;
    visited.add(absolute);
    const source = readFileSync(absolute, "utf8");
    const importPattern = /(?:from\s+|import\s*)["'](\.{1,2}\/[^"']+)["']/gu;
    const imports = [...source.matchAll(importPattern)]
      .map((match) => resolveLocalImport(absolute, String(match[1] ?? "")))
      .filter((value): value is string => Boolean(value))
      .sort();
    for (const imported of imports) visit(imported);
  };
  visit(entryPath);
  const hash = createHash("sha256");
  for (const path of [...visited].sort()) {
    hash.update(relative(process.cwd(), path).replace(/\\/gu, "/"));
    hash.update("\0");
    hash.update(readFileSync(path));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function portOwner(): { pid: number; name: string; commandLine: string } | null {
  const script = [
    "$c=Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1",
    "if($null -eq $c){'null';exit 0}",
    "$p=Get-CimInstance Win32_Process -Filter \"ProcessId=$($c.OwningProcess)\" -ErrorAction SilentlyContinue",
    "if($null -eq $p){'null';exit 0}",
    "[pscustomobject]@{pid=[int]$p.ProcessId;name=[string]$p.Name;commandLine=[string]$p.CommandLine}|ConvertTo-Json -Compress",
  ].join(";");
  const raw = execFileSync("powershell", ["-NoProfile", "-Command", script], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10_000,
  }).trim();
  return raw && raw !== "null" ? JSON.parse(raw) : null;
}

function isOwnedBackend(owner: ReturnType<typeof portOwner>): boolean {
  if (!owner || owner.name.toLocaleLowerCase() !== "node.exe") return false;
  const command = owner.commandLine.replace(/\\/gu, "/").toLocaleLowerCase();
  return command.includes("servecanonicalestimatelocalr1.ts");
}

function manifestOwnedByCurrentWorktree(manifest: Json | null): boolean {
  const manifestRoot = String(manifest?.workingDirectory ?? "").replace(/\\/gu, "/").toLocaleLowerCase();
  const currentRoot = process.cwd().replace(/\\/gu, "/").toLocaleLowerCase();
  return manifestRoot === currentRoot;
}

async function portOpen(): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const socket = connect({ host: "127.0.0.1", port: BACKEND_PORT });
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolvePromise(value);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(500, () => finish(false));
  });
}

async function waitForPort(expectedOpen: boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await portOpen() === expectedOpen) return true;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }
  return false;
}

async function authenticatedManifest(credentials: Json): Promise<Json | null> {
  const director = Array.isArray(credentials.principals)
    ? credentials.principals.find((entry: Json) => entry.role === "director")
    : null;
  invariant(director?.email && director?.password && credentials.publishable_key, "R568_MANIFEST_CREDENTIALS_RED");
  const login = await fetch(`${credentials.provider_url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: director.email, password: director.password }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!login?.ok) return null;
  const session = await login.json().catch(() => null) as Json | null;
  if (!session?.access_token) return null;
  const response = await fetch(`${BACKEND_URL}/runtime-manifest`, {
    headers: {
      apikey: credentials.publishable_key,
      Authorization: `Bearer ${session.access_token}`,
    },
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!response?.ok) return null;
  return response.json().catch(() => null) as Promise<Json | null>;
}

function manifestMatches(manifest: Json | null, desired: Json): boolean {
  const tuple = manifest?.compatibilityTuple ?? {};
  return manifest?.runtimeRole === "FULL_CANONICAL_ESTIMATE_BACKEND" &&
    manifest?.authMode === "STRICT_SESSION_INTROSPECTION" &&
    manifest?.capabilityTenantBinding === "request-principal" &&
    manifest?.capability?.status === "ACTIVE" &&
    Number(manifest?.capability?.ttlSeconds ?? 0) >= MINIMUM_TTL_SECONDS &&
    Number(manifest?.activeCompileJobCount ?? -1) === 0 &&
    tuple.definitionReleaseId === desired.releaseId &&
    tuple.searchReleaseId === desired.searchReleaseId &&
    tuple.sourceHead === desired.sourceHead &&
    tuple.sourceTree === desired.sourceTree &&
    tuple.frontendSourceTreeHash === desired.frontendSourceTreeHash &&
    tuple.frontendProductSourceHash === desired.frontendProductSourceHash &&
    tuple.frontendJsBundleFingerprint === desired.frontendJsBundleFingerprint &&
    tuple.backendRuntimeSourceSha256 === desired.backendRuntimeSourceSha256 &&
    tuple.capabilityId === desired.capabilityId;
}

function startBackend(input: {
  publicKey: string;
  providerUrl: string;
  desired: Json;
  capability: Json;
}): number {
  const runtimeDirectory = resolve(EVIDENCE_ROOT, "runtime", `backend-${input.desired.sourceTree.slice(0, 12)}`);
  mkdirSync(runtimeDirectory, { recursive: true });
  const stdout = openSync(resolve(runtimeDirectory, "stdout.log"), "a");
  const stderr = openSync(resolve(runtimeDirectory, "stderr.log"), "a");
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
      CANONICAL_ESTIMATE_SUPABASE_AUTH_URL: input.providerUrl,
      CANONICAL_ESTIMATE_SUPABASE_AUTH_API_KEY: input.publicKey,
      CANONICAL_ESTIMATE_SUPABASE_PRINCIPAL_RPC: "r541_current_principal",
      CANONICAL_ESTIMATE_TARGET_RELEASE_ID: input.desired.releaseId,
      CANONICAL_ESTIMATE_CONTENT_ADMISSION_RELEASE_ID: input.desired.releaseId,
      CANONICAL_ESTIMATE_ALLOW_PREPARED_RELEASE_COMPILE: "true",
      CANONICAL_ESTIMATE_RUNTIME_ENVIRONMENT: ENVIRONMENT,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ENVIRONMENT: ENVIRONMENT,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ID: input.capability.id,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_BINDING: "request-principal",
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_RELEASE_ID: input.desired.releaseId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SEARCH_RELEASE_ID: input.desired.searchReleaseId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_EXPIRES_AT: new Date(input.capability.expires_at).toISOString(),
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_PURPOSE: PURPOSE,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_HEAD: input.desired.sourceHead,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_TREE: input.desired.sourceTree,
      CANONICAL_ESTIMATE_CUMULATIVE_MANIFEST: "true",
      CANONICAL_ESTIMATE_LOCAL_PORT: String(BACKEND_PORT),
      ESTIMATE_MIGRATION_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_SEARCH_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID: input.desired.searchReleaseId,
      CANONICAL_ESTIMATE_ADMISSION_RUN_ID: `r568-local-${input.desired.sourceTree.slice(0, 12)}`,
      CANONICAL_ESTIMATE_LOCAL_DATABASE_POOL_MAX: "8",
      R45_RUNTIME_SOURCE_HEAD: input.desired.sourceHead,
      R45_RUNTIME_SOURCE_TREE: input.desired.sourceTree,
      R45_RUNTIME_SPEC_SHA256: MASTER_SHA256,
      R568_FRONTEND_SOURCE_TREE_HASH: input.desired.frontendSourceTreeHash,
      R568_FRONTEND_PRODUCT_SOURCE_HASH: input.desired.frontendProductSourceHash,
      R568_FRONTEND_JS_BUNDLE_FINGERPRINT: input.desired.frontendJsBundleFingerprint,
      R568_FRONTEND_BUILD_COMMIT: input.desired.sourceHead,
      CANONICAL_ESTIMATE_RUNTIME_SOURCE_SHA256: input.desired.backendRuntimeSourceSha256,
      CANONICAL_ESTIMATE_LOCAL_ARTIFACT_SECRET: randomBytes(48).toString("base64url"),
      CANONICAL_ESTIMATE_REQUEST_AUDIT_LOG: resolve(runtimeDirectory, "request-audit.jsonl"),
    },
  });
  closeSync(stdout);
  closeSync(stderr);
  invariant(child.pid, "R568_BACKEND_PID_MISSING");
  child.unref();
  return child.pid;
}

async function main(): Promise<void> {
  const providerUrl = requiredEnvironment("LOCAL_DEVELOPER_PROVIDER_URL");
  const publicKey = requiredEnvironment("LOCAL_DEVELOPER_PROVIDER_PUBLIC_KEY");
  const sourceHead = requiredEnvironment("LOCAL_DEVELOPER_BUILD_COMMIT");
  const sourceTree = requiredEnvironment("LOCAL_DEVELOPER_SOURCE_TREE_HASH");
  const frontendProductSourceHash = requiredEnvironment("LOCAL_DEVELOPER_PRODUCT_SOURCE_HASH");
  const frontendJsBundleFingerprint = requiredEnvironment("LOCAL_DEVELOPER_JS_BUNDLE_FINGERPRINT");
  const requestedReleaseId = requiredEnvironment("LOCAL_DEVELOPER_DEFINITION_RELEASE_ID");
  const requestedSearchReleaseId = requiredEnvironment("LOCAL_DEVELOPER_SEARCH_RELEASE_ID");
  invariant(/^http:\/\/(?:127\.0\.0\.1|localhost):54321$/u.test(providerUrl), "R568_NON_LOCAL_PROVIDER_FORBIDDEN");
  const credentials = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Json;
  const tenantId = String(credentials.test_tenant_id ?? "");
  invariant(tenantId, "R568_TENANT_ID_MISSING");

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r568-local-backend-manager" });
  await client.connect();
  let capability: Json;
  let capabilityAction: "REUSED" | "ROTATED" | "WOULD_ROTATE";
  let activeJobs = 0;
  let basis: Json;
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtextextended('r568-local-backend-manager',0))");
    basis = (await client.query(`
      select definition.id::text release_id,search.id::text search_release_id
      from public.estimate_definition_release definition
      join public.estimate_search_index_release search
        on search.id=$2::uuid
        and search.metadata->>'definitionReleaseId'=definition.id::text
      where definition.id=$1::uuid and definition.status='prepared' and search.status='draft'
    `, [requestedReleaseId, requestedSearchReleaseId])).rows[0] as Json;
    invariant(basis?.release_id === requestedReleaseId
      && basis?.search_release_id === requestedSearchReleaseId, "R568_EXACT_RELEASE_BASIS_MISSING");
    const candidates = (await client.query(`
      select * from public.estimate_candidate_capability_r3
      where environment=$1 and tenant_id=$2 and release_id=$3 and search_release_id=$4
        and source_head=$5 and source_tree=$6 and purpose=$7
        and revoked_at is null and expires_at>clock_timestamp()
      order by created_at desc,id for update
    `, [ENVIRONMENT, tenantId, basis.release_id, basis.search_release_id, sourceHead, sourceTree, PURPOSE])).rows as Json[];
    const reusable = candidates.length === 1 &&
      new Date(candidates[0].expires_at).getTime() - Date.now() >= MINIMUM_TTL_SECONDS * 1_000;
    if (reusable) {
      capability = candidates[0];
      capabilityAction = "REUSED";
    } else if (PREFLIGHT_ONLY) {
      capability = candidates[0] ?? {};
      capabilityAction = "WOULD_ROTATE";
    } else {
      await client.query(`
        update public.estimate_candidate_capability_r3
        set revoked_at=clock_timestamp()
        where environment=$1 and tenant_id=$2 and revoked_at is null
      `, [ENVIRONMENT, tenantId]);
      capability = (await client.query(`
        insert into public.estimate_candidate_capability_r3(
          environment,tenant_id,release_id,search_release_id,expires_at,purpose,
          source_head,source_tree,issued_by
        ) values($1,$2,$3,$4,clock_timestamp()+($5::text || ' hours')::interval,$6,$7,$8,$9)
        returning *
      `, [
        ENVIRONMENT,
        tenantId,
        basis.release_id,
        basis.search_release_id,
        String(CAPABILITY_TTL_HOURS),
        PURPOSE,
        sourceHead,
        sourceTree,
        "ensureLocalDeveloperCanonicalBackendR568",
      ])).rows[0] as Json;
      capabilityAction = "ROTATED";
    }
    activeJobs = Number((await client.query(`
      select count(*)::integer count from public.estimate_compile_job
      where upper(status) in ('QUEUED','RUNNING','CLAIMED','RETRY_WAIT')
    `)).rows[0]?.count ?? 0);
    if (PREFLIGHT_ONLY) await client.query("rollback");
    else await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }

  const desired = {
    releaseId: String(basis!.release_id),
    searchReleaseId: String(basis!.search_release_id),
    sourceHead,
    sourceTree,
    frontendSourceTreeHash: sourceTree,
    frontendProductSourceHash,
    frontendJsBundleFingerprint,
    backendRuntimeSourceSha256: backendRuntimeClosureSha256(BACKEND_SOURCE),
    capabilityId: String(capability!.id ?? ""),
  };
  const ownerBefore = portOwner();
  if (ownerBefore && !isOwnedBackend(ownerBefore)) throw new Error(`R568_BACKEND_FOREIGN_OWNER_PID_${ownerBefore.pid}`);
  const manifestBefore = ownerBefore ? await authenticatedManifest(credentials) : null;
  if (ownerBefore && !manifestOwnedByCurrentWorktree(manifestBefore)) {
    throw new Error(`R568_BACKEND_WORKTREE_OWNER_RED_PID_${ownerBefore.pid}`);
  }
  const exactBefore = manifestMatches(manifestBefore, desired);

  if (PREFLIGHT_ONLY) {
    process.stdout.write(`${JSON.stringify({
      status: exactBefore ? "GREEN_R568_BACKEND_EXACT" : "R568_BACKEND_RESTART_REQUIRED",
      action: exactBefore ? "REUSE" : capabilityAction,
      active_jobs: activeJobs,
      production_requests: 0,
    })}\n`);
    return;
  }
  invariant(activeJobs === 0, `R568_ACTIVE_COMPILE_JOBS_${activeJobs}`);
  let backendAction: "REUSED" | "RESTARTED" = "REUSED";
  let backendPid = ownerBefore?.pid ?? 0;
  if (!exactBefore) {
    if (ownerBefore) {
      process.kill(ownerBefore.pid, "SIGTERM");
      invariant(await waitForPort(false, 15_000), `R568_BACKEND_STOP_TIMEOUT_PID_${ownerBefore.pid}`);
    }
    backendPid = startBackend({ publicKey, providerUrl, desired, capability: capability! });
    invariant(await waitForPort(true, 25_000), `R568_BACKEND_START_TIMEOUT_PID_${backendPid}`);
    backendAction = "RESTARTED";
  }
  const manifest = await authenticatedManifest(credentials);
  invariant(manifestMatches(manifest, desired), "R568_RUNTIME_MANIFEST_TUPLE_RED");
  const receipt = {
    schema_version: "rik-expo-app.r568.local-developer-canonical-backend.v1",
    generated_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    status: "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT",
    backend_action: backendAction,
    capability_action: capabilityAction,
    backend_pid: backendPid,
    active_compile_jobs: activeJobs,
    compatibility_tuple: manifest!.compatibilityTuple,
    capability: {
      id: manifest!.capability.id,
      status: manifest!.capability.status,
      expires_at: manifest!.capability.expiresAt,
      ttl_seconds: manifest!.capability.ttlSeconds,
      purpose: manifest!.capability.purpose,
    },
    frontend_build_identity: manifest!.frontendBuildIdentity,
    credentials_printed: false,
    tokens_captured: false,
    production_requests: 0,
    production_accessed: false,
    deployed: false,
    merged: false,
    released: false,
    ota: false,
  };
  atomicJson(OUTPUT, receipt);
  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    backend_action: backendAction,
    capability_action: capabilityAction,
    backend_pid: backendPid,
    active_compile_jobs: activeJobs,
    definition_release_id: desired.releaseId,
    search_release_id: desired.searchReleaseId,
    capability_id: desired.capabilityId,
    capability_expires_at: receipt.capability.expires_at,
    evidence_root: EVIDENCE_ROOT,
    request_audit_path: resolve(
      EVIDENCE_ROOT,
      "runtime",
      `backend-${desired.sourceTree.slice(0, 12)}`,
      "request-audit.jsonl",
    ),
    production_requests: 0,
  })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
