import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "pg";

import { argument, invariant, type Json } from "./r4WorkGroupSurfaceShared";

const MASTER_SHA256 = "44084dd37cf6c6612e39fdf2aded9a34acef752e7742ee18985a8be316288585";
const SOURCE_SHA_RE = /^[0-9a-f]{64}$/u;
const ROOT = resolve(".release-runtime/real-useful-estimates-r4");
const AGGREGATE_PATH = join(ROOT, "evidence/current-green/11_WORK_GROUP_BACKEND_AGGREGATE_R4.json");
const NODE = process.execPath;
const TSX = resolve("node_modules/tsx/dist/cli.mjs");
const SERVER = resolve("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts");
const WEB = resolve("scripts/estimate/r4/runR4WorkGroupWebSurface.ts");
const ANDROID = resolve("scripts/estimate/r4/runR4WorkGroupAndroidSurface.ts");
const SOURCE_IDENTITY = join(ROOT, "evidence/current-green/13_CURRENT_SOURCE_IDENTITY_R4.json");
const WEB_BUILD = join(ROOT, "evidence/current-green/14_WEB_PRODUCTION_BUILD_R4.json");
const ANDROID_BUILD = join(ROOT, "evidence/current-green/15_ANDROID_NORMAL_APK_R4.json");

type Surface = "web" | "android";

type Batch = {
  batch_id: string;
  release_id: string;
  release_key: string;
  work_groups: number;
  cases: number;
  summary: { path: string };
  ledger: { path: string };
};

type RuntimeBinding = {
  capabilityId: string;
  environment: string;
  tenantId: string;
  releaseId: string;
  searchReleaseId: string;
  expiresAt: string;
  purpose: string;
  sourceHead: string;
  sourceTree: string;
};

function surfaces(): Surface[] {
  const value = argument("surfaces", "web,android").split(",").map((item) => item.trim()).filter(Boolean);
  invariant(value.length > 0 && value.every((item) => item === "web" || item === "android"),
    "R4_ORCHESTRATOR_SURFACES_RED");
  return value as Surface[];
}

async function binding(client: Client, batch: Batch): Promise<RuntimeBinding> {
  const summary = JSON.parse(readFileSync(resolve(batch.summary.path), "utf8")) as Json;
  const capabilityId = String(summary.capability?.id ?? "");
  const result = await client.query(`
    select c.id::text capability_id,c.environment,c.tenant_id::text,c.release_id::text,
      c.search_release_id::text,c.expires_at,c.purpose,r.source_commit,r.source_tree
    from public.estimate_candidate_capability_r3 c
    join public.estimate_definition_release r on r.id=c.release_id
    where c.id=$1 and c.revoked_at is null
  `, [capabilityId]);
  const row = result.rows[0] as Json | undefined;
  invariant(row && row.release_id === batch.release_id, `R4_ORCHESTRATOR_CAPABILITY_RED:${batch.batch_id}`);
  invariant(Date.parse(String(row.expires_at)) > Date.now() + 60_000,
    `R4_ORCHESTRATOR_CAPABILITY_EXPIRED:${batch.batch_id}:${row.expires_at}`);
  return {
    capabilityId: String(row.capability_id),
    environment: String(row.environment),
    tenantId: String(row.tenant_id),
    releaseId: String(row.release_id),
    searchReleaseId: String(row.search_release_id),
    expiresAt: new Date(String(row.expires_at)).toISOString(),
    purpose: String(row.purpose),
    sourceHead: String(row.source_commit),
    sourceTree: String(row.source_tree),
  };
}

async function waitForServer(
  apiRoot: string,
  releaseId: string,
  searchReleaseId: string,
  workIdentity: string,
  databaseName: string,
): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const headers = { Authorization: "Bearer local-dev-runtime-token" };
      const response = await fetch(`${apiRoot}/runtime-manifest`, {
        headers,
        signal: AbortSignal.timeout(5_000),
      });
      const catalogResponse = await fetch(
        `${apiRoot}/catalog/${encodeURIComponent(workIdentity)}?releaseId=${encodeURIComponent(releaseId)}`,
        {
          headers,
          signal: AbortSignal.timeout(5_000),
        },
      );
      const [body, catalog] = await Promise.all([
        response.json() as Promise<Json>,
        catalogResponse.json() as Promise<Json>,
      ]);
      if (response.ok && catalogResponse.ok && body.database?.name === databaseName
        && body.searchRelease?.id === searchReleaseId && body.specSha256 === MASTER_SHA256
        && catalog.item?.releaseId === releaseId && catalog.item?.catalogId === workIdentity) return;
    } catch {
      // The isolated server is still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`R4_ORCHESTRATOR_SERVER_TIMEOUT:${releaseId}`);
}

function launch(command: string[], logPath: string, environment: NodeJS.ProcessEnv = process.env): ChildProcess {
  mkdirSync(resolve(logPath, ".."), { recursive: true });
  const output = createWriteStream(logPath, { flags: "a" });
  const child = spawn(NODE, command, { cwd: process.cwd(), env: environment, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout?.pipe(output, { end: false });
  child.stderr?.pipe(output, { end: false });
  child.once("exit", () => output.end());
  return child;
}

async function exitCode(child: ChildProcess, label: string): Promise<void> {
  const code = await new Promise<number | null>((resolveExit, rejectExit) => {
    child.once("error", rejectExit);
    child.once("exit", resolveExit);
  });
  invariant(code === 0, `R4_ORCHESTRATOR_CHILD_RED:${label}:${code}`);
}

async function stop(child: ChildProcess): Promise<void> {
  if (child.exitCode != null || child.killed) return;
  const exited = new Promise<void>((resolveExit) => child.once("exit", () => resolveExit()));
  child.kill("SIGTERM");
  await Promise.race([exited, new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 5_000))]);
  if (child.exitCode == null) child.kill("SIGKILL");
}

async function main(): Promise<void> {
  const selectedSurfaces = surfaces();
  const sourceSha = argument("source-sha");
  const webBuildSha = argument("web-build-sha");
  const apkSha = argument("apk-sha");
  invariant(SOURCE_SHA_RE.test(sourceSha), "R4_ORCHESTRATOR_SOURCE_SHA_REQUIRED");
  invariant(!selectedSurfaces.includes("web") || SOURCE_SHA_RE.test(webBuildSha),
    "R4_ORCHESTRATOR_WEB_BUILD_SHA_REQUIRED");
  invariant(!selectedSurfaces.includes("android") || SOURCE_SHA_RE.test(apkSha),
    "R4_ORCHESTRATOR_APK_SHA_REQUIRED");
  const databaseUrl = argument("database-url", "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime");
  invariant(/^postgresql:\/\/postgres@127\.0\.0\.1:55432\/rik_r4_runtime(?:_b5_v2)?$/u.test(databaseUrl),
    "R4_ORCHESTRATOR_NON_DISPOSABLE_DATABASE_DENIED");
  const databaseName = new URL(databaseUrl).pathname.slice(1);
  const port = Number(argument("port", "8765"));
  invariant(port === 8765, "R4_ORCHESTRATOR_LOCAL_PORT_RED");
  const apiRoot = `http://127.0.0.1:${port}/canonical-estimate`;
  const baseUrl = argument("base-url", "http://127.0.0.1:8181");
  invariant(/^http:\/\/127\.0\.0\.1:\d+$/u.test(baseUrl), "R4_ORCHESTRATOR_WEB_BASE_URL_RED");
  const apkPath = resolve(argument("apk", "android/app/build/outputs/apk/release/app-release.apk"));
  const sourceIdentity = JSON.parse(readFileSync(SOURCE_IDENTITY, "utf8")) as Json;
  const webBuild = selectedSurfaces.includes("web")
    ? JSON.parse(readFileSync(WEB_BUILD, "utf8")) as Json : null;
  const androidBuild = selectedSurfaces.includes("android")
    ? JSON.parse(readFileSync(ANDROID_BUILD, "utf8")) as Json : null;
  invariant(sourceIdentity.exact_product_source_sha256 === sourceSha,
    "R4_ORCHESTRATOR_CURRENT_SOURCE_IDENTITY_RED");
  invariant(!webBuild || (webBuild.exact_product_source_sha256 === sourceSha
    && webBuild.aggregate?.sha256 === webBuildSha), "R4_ORCHESTRATOR_WEB_BUILD_BINDING_RED");
  invariant(!androidBuild || (androidBuild.exact_product_source_sha256 === sourceSha
    && androidBuild.apk?.sha256 === apkSha), "R4_ORCHESTRATOR_ANDROID_BUILD_BINDING_RED");
  const batchFilter = argument("batch");
  const aggregate = JSON.parse(readFileSync(AGGREGATE_PATH, "utf8")) as Json;
  invariant(aggregate.master_sha256 === MASTER_SHA256
    && aggregate.status === "GREEN_BACKEND_ALL_BATCHES_SURFACES_PENDING", "R4_ORCHESTRATOR_AGGREGATE_RED");
  const batches = (aggregate.batches as Batch[]).filter((batch) => !batchFilter || batch.batch_id === batchFilter);
  invariant(batches.length > 0, `R4_ORCHESTRATOR_BATCH_NOT_FOUND:${batchFilter}`);
  const client = new Client({ connectionString: databaseUrl, application_name: "r4-surface-orchestrator" });
  await client.connect();
  try {
    for (const batch of batches) {
      const target = await binding(client, batch);
      const firstBackendCase = JSON.parse(readFileSync(resolve(batch.ledger.path), "utf8")
        .split(/\r?\n/u).find(Boolean) ?? "null") as Json | null;
      const workIdentity = String(firstBackendCase?.work_identity ?? "");
      invariant(workIdentity.length > 0 && firstBackendCase?.release_id === target.releaseId,
        `R4_ORCHESTRATOR_BACKEND_BINDING_RED:${batch.batch_id}`);
      const runtimeDirectory = join(ROOT, "evidence/current-green/work-group-runtime/surface-runtime");
      const auditLog = join(runtimeDirectory, `${batch.batch_id.toLowerCase()}-audit.jsonl`);
      const serverLog = join(runtimeDirectory, `${batch.batch_id.toLowerCase()}-backend.log`);
      const environment = {
        ...process.env,
        ESTIMATE_MIGRATION_DATABASE_URL: databaseUrl,
        CANONICAL_ESTIMATE_SEARCH_DATABASE_URL: databaseUrl,
        CANONICAL_ESTIMATE_TARGET_RELEASE_ID: target.releaseId,
        CANONICAL_ESTIMATE_CONTENT_ADMISSION_RELEASE_ID: target.releaseId,
        CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID: target.searchReleaseId,
        CANONICAL_ESTIMATE_ALLOW_PREPARED_RELEASE_COMPILE: "true",
        CANONICAL_ESTIMATE_CUMULATIVE_MANIFEST: "true",
        CANONICAL_ESTIMATE_ADMISSION_RUN_ID: `r4-surface-${batch.batch_id.toLowerCase()}`,
        CANONICAL_ESTIMATE_RUNTIME_ENVIRONMENT: target.environment,
        CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ID: target.capabilityId,
        CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ENVIRONMENT: target.environment,
        CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_ID: target.tenantId,
        CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_RELEASE_ID: target.releaseId,
        CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SEARCH_RELEASE_ID: target.searchReleaseId,
        CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_EXPIRES_AT: target.expiresAt,
        CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_PURPOSE: target.purpose,
        CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_HEAD: target.sourceHead,
        CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_TREE: target.sourceTree,
        R45_RUNTIME_SOURCE_HEAD: target.sourceHead,
        R45_RUNTIME_SOURCE_TREE: target.sourceTree,
        R45_RUNTIME_SPEC_SHA256: MASTER_SHA256,
        CANONICAL_ESTIMATE_LOCAL_PORT: String(port),
        CANONICAL_ESTIMATE_LOCAL_DATABASE_POOL_MAX: "12",
        CANONICAL_ESTIMATE_REQUEST_AUDIT_LOG: auditLog,
      };
      const server = launch([TSX, SERVER], serverLog, environment);
      try {
        await waitForServer(apiRoot, target.releaseId, target.searchReleaseId, workIdentity, databaseName);
        const jobs: Array<Promise<void>> = [];
        const surfaceChildren: ChildProcess[] = [];
        if (selectedSurfaces.includes("web")) {
          const webLog = join(runtimeDirectory, `${batch.batch_id.toLowerCase()}-web.log`);
          const web = launch([TSX, WEB,
            `--batch=${batch.batch_id}`, `--source-sha=${sourceSha}`, `--build-sha=${webBuildSha}`,
            `--base-url=${baseUrl}`, `--api-root=${apiRoot}`, "--workers=8",
          ], webLog);
          surfaceChildren.push(web);
          jobs.push(exitCode(web, `${batch.batch_id}:WEB`));
        }
        if (selectedSurfaces.includes("android")) {
          const androidLog = join(runtimeDirectory, `${batch.batch_id.toLowerCase()}-android.log`);
          const android = launch([TSX, ANDROID,
            `--batch=${batch.batch_id}`, `--source-sha=${sourceSha}`, `--build-sha=${apkSha}`,
            `--api-root=${apiRoot}`, `--audit-log=${auditLog}`, `--apk=${apkPath}`,
          ], androidLog);
          surfaceChildren.push(android);
          jobs.push(exitCode(android, `${batch.batch_id}:ANDROID`));
        }
        try {
          await Promise.all(jobs);
        } catch (error) {
          await Promise.all(surfaceChildren.map(stop));
          throw error;
        }
      } finally {
        await stop(server);
      }
    }
  } finally {
    await client.end();
  }
  process.stdout.write(`${JSON.stringify({ status: "GREEN_R4_REQUESTED_SURFACES", batches: batches.length,
    surfaces: selectedSurfaces, production_accessed: false }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
