import { createHash, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  ASPHALT_INSTALL_KRER27_ACCEPTANCE_INPUT,
  ASPHALT_INSTALL_KRER27_CATALOG_ID,
} from "../../../src/lib/estimate/v4/asphaltInstallLargeAreaKrer27ProfileR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s26-4.asphalt-install-ordinary-backend-acceptance.v1";
const MASTER_SHA256 = "a83e58cabc738d0a9265cda2a3a1061891a0b6009836ccbab0bac7f1a086e2d6";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const CREDENTIALS_PATH = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/s26-4/asphalt-install-ordinary-backend");
const PORT = Number(process.env.S264_ASPHALT_BACKEND_PORT ?? 8766);
const API_ROOT = `http://127.0.0.1:${PORT}/canonical-estimate`;
const ENVIRONMENT = "s26-4-asphalt-install-ordinary-local";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S264_ASPHALT_ORDINARY_BACKEND:${code}`);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function numeric(value: unknown, code: string): number {
  const parsed = Number(value);
  invariant(Number.isFinite(parsed), `${code}:${String(value)}`);
  return parsed;
}

function closeTo(value: unknown, expected: number, code: string): void {
  invariant(Math.abs(numeric(value, code) - expected) < 1e-8,
    `${code}:${String(value)}:${expected}`);
}

async function startBackend(env: Json): Promise<{ child: ChildProcess; logs: string[] }> {
  const logs: string[] = [];
  const child = spawn(process.execPath, [
    resolve("node_modules/tsx/dist/cli.mjs"),
    resolve("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"),
  ], {
    cwd: resolve("."),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  await new Promise<void>((ready, reject) => {
    const timeout = setTimeout(() => reject(new Error(
      `S264_ASPHALT_ORDINARY_BACKEND:READY_TIMEOUT:${logs.join("").slice(-3_000)}`,
    )), 45_000);
    const onText = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      logs.push(text);
      if (text.includes('"status":"READY"')) {
        clearTimeout(timeout);
        ready();
      }
    };
    child.stdout?.on("data", onText);
    child.stderr?.on("data", onText);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`S264_ASPHALT_ORDINARY_BACKEND:EARLY_EXIT:${code}:${logs.join("").slice(-3_000)}`));
    });
  });
  return { child, logs };
}

async function stopBackend(child: ChildProcess): Promise<void> {
  if (child.exitCode != null) return;
  const exited = new Promise<void>((resolveExit) => child.once("exit", () => resolveExit()));
  child.kill("SIGTERM");
  await Promise.race([exited, new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 5_000))]);
  if (child.exitCode == null) child.kill("SIGKILL");
}

async function login(credentials: Json): Promise<string> {
  const principal = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(principal?.email && principal?.password, "CONSUMER_CREDENTIALS_MISSING");
  const response = await fetch(`${credentials.provider_url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "content-type": "application/json" },
    body: JSON.stringify({ email: principal.email, password: principal.password }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok && typeof body.access_token === "string",
    `CONSUMER_LOGIN_${response.status}`);
  return body.access_token;
}

async function api(token: string, path: string, init?: RequestInit): Promise<Json> {
  const response = await fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.body == null ? {} : { "content-type": "application/json" }),
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(180_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `HTTP_${response.status}:${path}:${JSON.stringify(body).slice(0, 2_000)}`);
  return body;
}

async function waitJob(token: string, jobId: string): Promise<Json> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(token, `jobs/${jobId}`);
    if (job.status === "succeeded") return job;
    invariant(!["failed", "cancelled"].includes(String(job.status)),
      `JOB_${String(job.status)}:${jobId}:${String(job.errorCode ?? "")}`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`S264_ASPHALT_ORDINARY_BACKEND:JOB_TIMEOUT:${jobId}`);
}

async function allRows(token: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await api(token, `revisions/${revisionId}/rows?${query}`);
    rows.push(...(Array.isArray(page.rows) ? page.rows : []));
    cursor = String(page.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function artifact(token: string, revisionId: string, kind: "pdf" | "procurement", runId: string) {
  const query = kind === "pdf" ? "?documentProfile=professional_v1" : "";
  const request = await api(token, `revisions/${revisionId}/artifacts/${kind}`, {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `${CONTRACT}:${runId}:${kind}`,
      ...(kind === "pdf" ? { documentProfile: "professional_v1" } : {}),
    }),
  });
  if (request.jobId) await waitJob(token, String(request.jobId));
  const metadata = await api(token, `revisions/${revisionId}/artifacts/${kind}${query}`);
  invariant(metadata.status === "ready" && typeof metadata.signedUrl === "string",
    `${kind.toUpperCase()}_NOT_READY`);
  const response = await fetch(metadata.signedUrl, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(180_000),
  });
  invariant(response.ok, `${kind.toUpperCase()}_DOWNLOAD_${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  invariant(sha256(bytes) === metadata.sha256, `${kind.toUpperCase()}_SHA_MISMATCH`);
  return { metadata, bytes };
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const runId = randomUUID();
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8")) as Json;
  const releaseId = String(current.definitionReleaseId ?? "");
  const searchReleaseId = String(current.searchReleaseId ?? "");
  invariant(current.owner === "S26_4_ASPHALT_INSTALL_KRER27_SUCCESSOR", "CURRENT_OWNER_DRIFT");
  invariant(current.definitionReleaseStatus === "prepared" && current.searchReleaseStatus === "draft",
    "CURRENT_RELEASE_STATE_RED");
  invariant(String(credentials.provider_url) === "http://127.0.0.1:54321",
    "NON_LOCAL_AUTH_PROVIDER_FORBIDDEN");

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "s26-4-asphalt-install-ordinary-backend",
  });
  await client.connect();
  let backend: { child: ChildProcess; logs: string[] } | null = null;
  try {
    const release = (await client.query(`select source_commit,source_tree,status,metadata
      from public.estimate_definition_release where id=$1`, [releaseId])).rows[0] as Json;
    invariant(release?.status === "prepared" && release.metadata?.masterSha256 === MASTER_SHA256,
      "RELEASE_PROVENANCE_RED");
    const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
    invariant(consumer?.user_id && credentials.test_tenant_id, "CONSUMER_PRINCIPAL_MISSING");

    const capabilityId = randomUUID();
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    await client.query(`update public.estimate_candidate_capability_r3
      set revoked_at=now()
      where environment=$1 and tenant_id=$2 and release_id=$3 and search_release_id=$4
        and purpose='estimate_candidate_admission_r3' and revoked_at is null`, [
      ENVIRONMENT, credentials.test_tenant_id, releaseId, searchReleaseId,
    ]);
    await client.query(`insert into public.estimate_candidate_capability_r3(
      id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,
      source_head,source_tree,issued_by)
      values($1,$2,$3,$4,$5,$6,'estimate_candidate_admission_r3',$7,$8,$9)`, [
      capabilityId, ENVIRONMENT, credentials.test_tenant_id, releaseId, searchReleaseId,
      expiresAt, release.source_commit, release.source_tree,
      "runS264AsphaltInstallOrdinaryBackendAcceptance",
    ]);
    const auditLog = resolve(OUTPUT_ROOT, `http-${runId}.jsonl`);
    backend = await startBackend({
      ESTIMATE_MIGRATION_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_SEARCH_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_TARGET_RELEASE_ID: releaseId,
      CANONICAL_ESTIMATE_CONTENT_ADMISSION_RELEASE_ID: releaseId,
      CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID: searchReleaseId,
      CANONICAL_ESTIMATE_ALLOW_PREPARED_RELEASE_COMPILE: "true",
      CANONICAL_ESTIMATE_CUMULATIVE_MANIFEST: "true",
      CANONICAL_ESTIMATE_ADMISSION_RUN_ID: runId,
      CANONICAL_ESTIMATE_RUNTIME_ENVIRONMENT: ENVIRONMENT,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ID: capabilityId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ENVIRONMENT: ENVIRONMENT,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_BINDING: "request-principal",
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_RELEASE_ID: releaseId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SEARCH_RELEASE_ID: searchReleaseId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_EXPIRES_AT: expiresAt,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_PURPOSE: "estimate_candidate_admission_r3",
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_HEAD: release.source_commit,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_TREE: release.source_tree,
      CANONICAL_ESTIMATE_LOCAL_AUTH_MODE: "STRICT_SESSION_INTROSPECTION",
      CANONICAL_ESTIMATE_SUPABASE_AUTH_URL: credentials.provider_url,
      CANONICAL_ESTIMATE_SUPABASE_AUTH_API_KEY: credentials.publishable_key,
      CANONICAL_ESTIMATE_SUPABASE_PRINCIPAL_MODE: "CANONICAL_RPC",
      CANONICAL_ESTIMATE_SUPABASE_PRINCIPAL_RPC: "r541_current_principal",
      CANONICAL_ESTIMATE_LOCAL_PORT: String(PORT),
      CANONICAL_ESTIMATE_REQUEST_AUDIT_LOG: auditLog,
      CANONICAL_ESTIMATE_LOCAL_ARTIFACT_SECRET: sha256(`${CONTRACT}:${runId}:artifact`),
      R45_RUNTIME_SOURCE_HEAD: release.source_commit,
      R45_RUNTIME_SOURCE_TREE: release.source_tree,
      R45_RUNTIME_SPEC_SHA256: MASTER_SHA256,
    });

    const token = await login(credentials);
    const manifest = await api(token, "runtime-manifest");
    invariant(manifest.authMode === "STRICT_SESSION_INTROSPECTION"
      && manifest.compatibilityTuple?.definitionReleaseId === releaseId
      && manifest.compatibilityTuple?.searchReleaseId === searchReleaseId,
    "RUNTIME_MANIFEST_RED");

    const query = "асфальтирование 5000 м²";
    const search = await api(token, `search/catalog?query=${encodeURIComponent(query)}&pageSize=50&scope=WORKS`);
    const items = Array.isArray(search.items) ? search.items as Json[] : [];
    const selectedIndex = items.findIndex((entry) => entry.catalogId === ASPHALT_INSTALL_KRER27_CATALOG_ID);
    invariant(search.searchIndexReleaseId === searchReleaseId, "SEARCH_RELEASE_DRIFT");
    invariant(selectedIndex === 0 && items[0]?.estimateReady === true,
      `FULL_ASPHALT_NOT_FIRST:${selectedIndex}:${items.slice(0, 5).map((entry) => entry.catalogId).join(",")}`);
    invariant(items[0]?.definitionReleaseId === releaseId, "SEARCH_DEFINITION_RELEASE_DRIFT");

    const accepted = await api(token, "jobs/compile", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: `${CONTRACT}:${runId}:first-estimate`,
        catalogId: ASPHALT_INSTALL_KRER27_CATALOG_ID,
        parameters: { area_m2: 5_000 },
        currencyCode: "KGS",
        priceSnapshotIds: [],
        sourceRequestText: query,
        primaryMeasureParameterId: "area_m2",
      }),
    });
    const job = await waitJob(token, String(accepted.jobId));
    const revisionId = String(job.resultRevisionId ?? "");
    invariant(/^[0-9a-f-]{36}$/iu.test(revisionId), `REVISION_ID_RED:${revisionId}`);
    const revision = await api(token, `revisions/${revisionId}`);
    const rows = await allRows(token, revisionId);
    invariant(revision.releaseId === releaseId
      && revision.searchReleaseId === searchReleaseId
      && revision.catalogId === ASPHALT_INSTALL_KRER27_CATALOG_ID,
    "REVISION_IDENTITY_RED");
    invariant(rows.length === 56 && Number(revision.rowCount) === 56,
      `ROW_COUNT_${rows.length}:${revision.rowCount}`);
    invariant((revision.preliminaryNeeds ?? []).length === 0, "FIRST_ESTIMATE_HAS_BLOCKING_NEEDS");
    invariant(rows.every((row) => row.quantity != null && numeric(row.quantity, `ROW_QUANTITY:${row.rowId}`) > 0),
      "NONPOSITIVE_OR_MISSING_QUANTITY");
    invariant(rows.every((row) => row.unitPrice == null && row.amount == null),
      "UNKNOWN_PRICE_SEMANTICS_RED");
    closeTo(rows.find((row) => row.rowId === "asphalt:material:hot-dense-fine-mix")?.quantity,
      589, "HOT_MIX_QUANTITY");
    closeTo(rows.find((row) => row.rowId === "asphalt:material:road-bitumen")?.quantity,
      0.5, "ROAD_BITUMEN_QUANTITY");
    closeTo(rows.find((row) => row.rowId === "asphalt:delivery:ton-km")?.quantity,
      11_780, "HAUL_TON_KM_QUANTITY");
    closeTo(rows.find((row) => row.rowId === "asphalt:delivery:truck-machine-hours")?.quantity,
      45, "DELIVERY_TRUCK_QUANTITY");

    const professionalPdf = await artifact(token, revisionId, "pdf", runId);
    const procurement = await artifact(token, revisionId, "procurement", runId);
    invariant(professionalPdf.bytes.subarray(0, 4).toString("ascii") === "%PDF",
      "PDF_MAGIC_RED");
    invariant(Number(professionalPdf.metadata.metadata?.sourceRowCount) === 56,
      "PDF_SOURCE_ROW_COUNT_RED");
    const procurementJson = JSON.parse(procurement.bytes.toString("utf8")) as Json;
    invariant(procurementJson.revisionId === revisionId && procurementJson.releaseId === releaseId,
      "PROCUREMENT_IDENTITY_RED");
    const procurementRows = Array.isArray(procurementJson.rows) ? procurementJson.rows as Json[] : [];
    invariant(procurementRows.length > 0
      && procurementRows.some((row) => row.rowId === "asphalt:material:hot-dense-fine-mix"),
    "PROCUREMENT_COMPOSITION_RED");

    const reopened = await api(token, `revisions/${revisionId}`);
    const reopenedRows = await allRows(token, revisionId);
    invariant(reopened.checksumSha256 === revision.checksumSha256 && reopenedRows.length === 56,
      "REOPEN_PARITY_RED");
    const databaseAudit = (await client.query(`select revision.id,revision.owner_user_id,
        revision.organization_id,revision.release_id,revision.search_release_id,revision.catalog_id,
        revision.row_count,revision.status,revision.input_parameters,
        count(row.row_id)::int persisted_rows,
        count(*) filter(where row.included_in_estimate)::int included_in_estimate_rows,
        count(*) filter(where row.unit_price is null)::int unknown_price_rows
      from public.estimate_revision revision
      join public.estimate_revision_row row on row.revision_id=revision.id
      where revision.id=$1 group by revision.id`, [revisionId])).rows[0] as Json;
    invariant(databaseAudit.owner_user_id === consumer.user_id
      && databaseAudit.organization_id === credentials.test_tenant_id
      && Number(databaseAudit.persisted_rows) === 56
      && Number(databaseAudit.unknown_price_rows) === 56,
    `DATABASE_AUDIT_RED:${JSON.stringify(databaseAudit)}`);

    const reportUnsigned = {
      contract: CONTRACT,
      generatedAt: new Date().toISOString(),
      runId,
      status: "GREEN_S26_4_ASPHALT_INSTALL_ORDINARY_CONSUMER_BACKEND_ROUTE",
      masterSha256: MASTER_SHA256,
      productionAccessed: false,
      definitionReleaseId: releaseId,
      searchReleaseId,
      authentication: {
        mode: manifest.authMode,
        role: "consumer",
        ownerUserId: consumer.user_id,
        organizationId: credentials.test_tenant_id,
      },
      search: {
        query,
        selectedIndex,
        selectedCatalogId: items[0]?.catalogId,
        selectedMatchType: items[0]?.matchType,
        parsedQuantity: search.parsedQuantity,
        parsedUnit: search.parsedUnit,
      },
      firstEstimate: {
        input: { area_m2: 5_000 },
        runtimeProfileInput: ASPHALT_INSTALL_KRER27_ACCEPTANCE_INPUT,
        revisionId,
        rowCount: rows.length,
        blockingNeeds: (revision.preliminaryNeeds ?? []).length,
        unknownPriceRows: rows.filter((row) => row.unitPrice == null).length,
        rows: rows.map((row) => ({
          rowId: row.rowId,
          titleRu: row.titleRu,
          category: row.category,
          quantity: row.quantity,
          unitId: row.unitId,
          includedInEstimate: row.includedInEstimate,
          procurementEligible: row.procurementEligible,
          calculationTrace: row.calculationTrace,
          normativeTrace: row.normativeTrace,
        })),
      },
      professionalPdf: {
        artifactId: professionalPdf.metadata.artifactId,
        sha256: professionalPdf.metadata.sha256,
        byteSize: professionalPdf.bytes.length,
        sourceRowCount: professionalPdf.metadata.metadata?.sourceRowCount,
      },
      procurement: {
        artifactId: procurement.metadata.artifactId,
        sha256: procurement.metadata.sha256,
        rowCount: procurementRows.length,
      },
      reopen: { exactChecksum: true, rowCount: reopenedRows.length },
      databaseAudit,
      requestAuditLog: auditLog,
    };
    const report = { ...reportUnsigned, sha256: sha256(JSON.stringify(stable(reportUnsigned))) };
    const outputPath = resolve(OUTPUT_ROOT, `acceptance-${runId}.json`);
    const latestPath = resolve(OUTPUT_ROOT, "acceptance.json");
    atomicJson(outputPath, report);
    atomicJson(latestPath, report);
    process.stdout.write(`${JSON.stringify({
      status: report.status,
      outputPath,
      revisionId,
      rowCount: rows.length,
      unknownPriceRows: rows.filter((row) => row.unitPrice == null).length,
      pdfSha256: professionalPdf.metadata.sha256,
      procurementRowCount: procurementRows.length,
    }, null, 2)}\n`);
  } finally {
    if (backend) await stopBackend(backend.child).catch(() => undefined);
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
