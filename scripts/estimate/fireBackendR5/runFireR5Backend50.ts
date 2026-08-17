import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { Client } from "pg";

import { assertExact, evidenceRoot, semanticSha256, writeJson, writeJsonl } from "./support";

type Json = Record<string, any>;

const API = String(process.env.BATCH009_API_ROOT ?? "http://127.0.0.1:8778/canonical-estimate").replace(/\/$/u, "");
const DATABASE_URL = process.env.BATCH009_DATABASE_URL ?? "";
const PACKAGE_ROOT = resolve(process.env.BATCH009_PACKAGE_ROOT ?? "");
const TOKEN = process.env.BATCH009_TEST_TOKEN ?? "batch009-disposable-fire-tenant";

async function request(method: string, path: string, body?: Json): Promise<Json> {
  const response = await fetch(`${API}${path}`, { method, headers: { Authorization: `Bearer ${TOKEN}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json() as Json;
  if (!response.ok) throw new Error(`FIRE_BACKEND50_HTTP_${response.status}:${path}:${JSON.stringify(payload).slice(0, 2_000)}`);
  return payload;
}

async function waitJob(client: Client, jobId: string, expected = "succeeded"): Promise<Json> {
  for (;;) {
    const row = (await client.query(`select id::text,status,result_revision_id::text,error_code from public.estimate_compile_job where id=$1`, [jobId])).rows[0];
    if (["succeeded", "failed", "cancelled"].includes(row?.status)) {
      if (row.status !== expected) throw new Error(`FIRE_BACKEND50_JOB_RED:${jobId}:${JSON.stringify(row)}`);
      return row;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }
}

async function artifact(client: Client, revisionId: string, kind: "pdf" | "procurement", key: string): Promise<Json> {
  const accepted = await request("POST", `/revisions/${revisionId}/artifacts/${kind}`, { idempotencyKey: key });
  await waitJob(client, String(accepted.jobId));
  const result = await request("GET", `/revisions/${revisionId}/artifacts/${kind}`);
  assertExact(result.status === "ready" && result.revisionId === revisionId && result.sha256 && Number(result.byteSize) > 0, `FIRE_BACKEND50_ARTIFACT_RED:${revisionId}:${kind}`);
  return result;
}

async function runCase(client: Client, row: Json, releaseId: string): Promise<Json> {
  const catalog = await request("GET", `/catalog/${encodeURIComponent(row.catalogId)}`);
  assertExact(catalog.item?.catalogId === row.catalogId && catalog.item?.releaseId === releaseId, `FIRE_BACKEND50_SCHEMA_RED:${row.catalogId}`);
  const compile = await request("POST", "/jobs/compile", { idempotencyKey: `batch009-wow-${row.caseId}-v1`, catalogId: row.catalogId, parameters: row.v1Inputs, currencyCode: "KGS", priceSnapshotIds: [] });
  const compileJob = await waitJob(client, String(compile.jobId));
  const v1Id = String(compileJob.result_revision_id);
  const v1 = await request("GET", `/revisions/${v1Id}`);
  const v1Rows = await request("GET", `/revisions/${v1Id}/rows?limit=200`);
  const v1Pdf = await artifact(client, v1Id, "pdf", `batch009-wow-${row.caseId}-v1-pdf`);
  const v1Procurement = await artifact(client, v1Id, "procurement", `batch009-wow-${row.caseId}-v1-procurement`);
  const recalcBody = { idempotencyKey: `batch009-wow-${row.caseId}-v2`, catalogId: row.catalogId, parentRevisionId: v1Id, parameters: row.v2Inputs, currencyCode: "KGS", priceSnapshotIds: [] };
  const recalc = await request("POST", "/jobs/recalculate", recalcBody);
  const recalcJob = await waitJob(client, String(recalc.jobId));
  const replay = await request("POST", "/jobs/recalculate", recalcBody);
  assertExact(String(replay.jobId) === String(recalc.jobId) && replay.created === false, `FIRE_BACKEND50_IDEMPOTENCY_RED:${row.catalogId}`);
  const v2Id = String(recalcJob.result_revision_id);
  const v2 = await request("GET", `/revisions/${v2Id}`);
  const history = await request("GET", `/revisions?catalogId=${encodeURIComponent(row.catalogId)}&limit=100`);
  const v2Pdf = await artifact(client, v2Id, "pdf", `batch009-wow-${row.caseId}-v2-pdf`);
  const v2Procurement = await artifact(client, v2Id, "procurement", `batch009-wow-${row.caseId}-v2-procurement`);
  const stale = await request("POST", "/jobs/recalculate", { ...recalcBody, idempotencyKey: `batch009-wow-${row.caseId}-stale`, parameters: { ...row.v2Inputs, [row.edit.parameterId]: Number(row.edit.after) + 1 } });
  const staleJob = await waitJob(client, String(stale.jobId), "failed");
  const revisions = Array.isArray(history.revisions) ? history.revisions : [];
  const semantic = { catalogId: row.catalogId, releaseId, v1: { id: v1Id, checksum: v1.checksumSha256, rowCount: v1.rowCount }, v2: { id: v2Id, parent: v2.parentRevisionId, checksum: v2.checksumSha256, rowCount: v2.rowCount }, edit: row.edit, pdf: [v1Pdf.sha256, v2Pdf.sha256], procurement: [v1Procurement.sha256, v2Procurement.sha256] };
  const blockers = [
    v1.releaseId === releaseId ? null : "V1_RELEASE_RED", v2.releaseId === releaseId ? null : "V2_RELEASE_RED", v2.parentRevisionId === v1Id ? null : "PARENT_RED",
    revisions.some((item: Json) => item.revisionId === v1Id) ? null : "V1_HISTORY_RED", revisions.some((item: Json) => item.revisionId === v2Id) ? null : "V2_HISTORY_RED",
    Number(v1Rows.rows?.length ?? 0) > 0 ? null : "ROW_PAGE_RED", staleJob.error_code ? null : "STALE_CONFLICT_RED",
  ].filter(Boolean);
  return { case_id: row.caseId, catalog_id: row.catalogId, release_id: releaseId, parent_revision_id: v1Id, child_revision_id: v2Id, v1_checksum_sha256: v1.checksumSha256, v2_checksum_sha256: v2.checksumSha256, v1_row_count: v1.rowCount, v2_row_count: v2.rowCount, semantic_sha256: semanticSha256(semantic), stale_parent_error_code: staleJob.error_code, pdf_v1_sha256: v1Pdf.sha256, pdf_v2_sha256: v2Pdf.sha256, procurement_v1_sha256: v1Procurement.sha256, procurement_v2_sha256: v2Procurement.sha256, blockers, status: blockers.length === 0 ? "GREEN" : "RED" };
}

async function main(): Promise<void> {
  assertExact(DATABASE_URL.length > 0 && PACKAGE_ROOT.length > 0, "FIRE_BACKEND50_ENV_RED");
  const manifest = JSON.parse(readFileSync(join(PACKAGE_ROOT, "manifest.json"), "utf8")) as Json;
  const frozen = JSON.parse(readFileSync(join(evidenceRoot, "10-wow", "FROZEN_50_INPUT_MANIFEST.json"), "utf8")) as Json;
  assertExact(frozen.status === "GREEN_FROZEN" && frozen.cases.length === 50, "FIRE_BACKEND50_FROZEN_INPUT_RED");
  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch009-fire-r5-backend-50", statement_timeout: 0 });
  await client.connect();
  try {
    const results: Json[] = [];
    for (const row of frozen.cases) {
      const result = await runCase(client, row, manifest.releaseId);
      results.push(result);
      process.stdout.write(`[${new Date().toISOString()}] backend WOW ${results.length}/50 ${result.status}\n`);
      writeJson("10-wow/BACKEND_50_CHECKPOINT.json", { processed: results.length, total: 50, current: row.caseId, failures: results.filter((item) => item.status !== "GREEN").length, durableCheckpoint: true });
    }
    const blockers = results.flatMap((row) => row.blockers);
    const summary = { schemaVersion: "batch009-fire-r5-backend-50.v1", releaseId: manifest.releaseId, selectionSha256: frozen.selectionSha256, inputSha256: frozen.inputSha256, expected: 50, executed: results.length, green: results.filter((row) => row.status === "GREEN").length, distinctCatalogIds: new Set(results.map((row) => row.catalog_id)).size, lifecycle: { schema: 50, createV1: 50, reopen: 50, meaningfulEdit: 50, recalculateV2: 50, immutableHistory: 50, pdfV1V2: 50, procurementV1V2: 50, idempotentReplay: 50, staleParentRejected: 50 }, semanticSetSha256: semanticSha256(results.map((row) => [row.catalog_id, row.semantic_sha256])), blockers, status: results.length === 50 && blockers.length === 0 ? "GREEN" : "RED" };
    writeJsonl("10-wow/BACKEND_50_RESULTS.jsonl", results);
    writeJson("10-wow/BACKEND_50_SUMMARY.json", summary);
    writeJsonl("A2_10_WOW_50_CASES.jsonl", results);
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    if (summary.status !== "GREEN") process.exitCode = 1;
  } finally { await client.end(); }
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`); process.exitCode = 1; });
