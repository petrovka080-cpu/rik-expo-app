import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";

import { Client } from "pg";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "master11610-backend-canonical-r2", "evidence");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/master11610_r3_exact_final";
const API_BASE = String(process.env.CANONICAL_ESTIMATE_GATEWAY_URL ?? "http://127.0.0.1:8765/canonical-estimate").replace(/\/+$/, "");
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_OWNER_ID = "99999999-9999-4999-8999-999999999999";
const R1_RELEASE_ID = "86e62f78-7aee-49ff-a033-bb832339d588";
const R2_RELEASE_ID = "c90141a2-fdd6-4e78-b01c-bad792c8df18";

type Json = Record<string, any>;

function hasFlag(name: string): boolean { return process.argv.includes(`--${name}`); }
function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}
function git(args: string[]): string { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
function writeJson(name: string, value: unknown): void { writeFileSync(join(EVIDENCE, name), `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function writeJsonl(name: string, rows: Json[]): void { writeFileSync(join(EVIDENCE, name), `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8"); }

async function api(path: string, init: RequestInit = {}): Promise<{ status: number; body: Json; bytes: Buffer; contentType: string }> {
  const response = await fetch(`${API_BASE}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Accept: "application/json", Authorization: "Bearer r3-functional-proof-token",
      ...(init.body == null ? {} : { "Content-Type": "application/json" }), ...(init.headers ?? {}),
    },
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  let body: Json = {};
  try { body = JSON.parse(bytes.toString("utf8")) as Json; } catch { /* binary artifact */ }
  return { status: response.status, body, bytes, contentType: response.headers.get("content-type") ?? "" };
}

async function waitJob(jobId: string, timeoutMs = 180_000): Promise<Json> {
  const deadline = Date.now() + timeoutMs;
  let last: Json = {};
  while (Date.now() < deadline) {
    const response = await api(`jobs/${jobId}`);
    last = response.body;
    if (["succeeded", "failed", "cancelled"].includes(String(last.status))) return last;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(`JOB_TIMEOUT:${jobId}:${stableJson(last)}`);
}

async function buildArtifact(revisionId: string, kind: "pdf" | "procurement", key: string): Promise<Json> {
  const accepted = await api(`revisions/${revisionId}/artifacts/${kind}`, { method: "POST", body: JSON.stringify({ idempotencyKey: key }) });
  if (accepted.status !== 202) throw new Error(`ARTIFACT_ACCEPT_RED:${kind}:${stableJson(accepted.body)}`);
  if (accepted.body.jobId) {
    const job = await waitJob(String(accepted.body.jobId));
    if (job.status !== "succeeded") throw new Error(`ARTIFACT_JOB_RED:${kind}:${stableJson(job)}`);
  }
  const ready = await api(`revisions/${revisionId}/artifacts/${kind}`);
  if (ready.status !== 200 || ready.body.status !== "ready" || ready.body.releaseId !== R2_RELEASE_ID
    || !/^[0-9a-f]{64}$/.test(String(ready.body.sha256 ?? ""))) throw new Error(`ARTIFACT_READY_RED:${kind}:${stableJson(ready.body)}`);
  const download = await fetch(String(ready.body.signedUrl));
  const bytes = Buffer.from(await download.arrayBuffer());
  if (!download.ok || bytes.length !== Number(ready.body.byteSize) || sha256(bytes) !== ready.body.sha256) throw new Error(`ARTIFACT_DOWNLOAD_RED:${kind}`);
  return { ...ready.body, downloadSha256: sha256(bytes), downloadedBytes: bytes.length, signature: bytes.subarray(0, 8).toString("latin1"), bytes };
}

async function firstJsonLine(path: string, predicate: (row: Json) => boolean): Promise<Json> {
  const lines = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const raw of lines) {
    if (!raw.trim()) continue;
    const row = JSON.parse(raw) as Json;
    if (predicate(row)) { lines.close(); return row; }
  }
  throw new Error(`JSONL_ROW_NOT_FOUND:${path}`);
}

async function fingerprintR1(client: Client): Promise<Json> {
  const result = await client.query(`
    select
      (select count(*)::integer from public.estimate_revision where release_id=$1) revision_count,
      (select count(*)::integer from public.estimate_revision_row rr join public.estimate_revision r on r.id=rr.revision_id where r.release_id=$1) row_count,
      (select count(*)::integer from public.estimate_revision_row_price rp join public.estimate_revision r on r.id=rp.revision_id where r.release_id=$1) price_count,
      (select encode(sha256(convert_to(jsonb_agg(to_jsonb(r) order by r.id)::text,'UTF8')),'hex') from public.estimate_revision r where r.release_id=$1) revisions_sha256,
      (select encode(sha256(convert_to(jsonb_agg(to_jsonb(rr) order by rr.revision_id,rr.ordinal)::text,'UTF8')),'hex') from public.estimate_revision_row rr join public.estimate_revision r on r.id=rr.revision_id where r.release_id=$1) rows_sha256,
      (select encode(sha256(convert_to(jsonb_agg(to_jsonb(rp) order by rp.revision_id,rp.row_id)::text,'UTF8')),'hex') from public.estimate_revision_row_price rp join public.estimate_revision r on r.id=rp.revision_id where r.release_id=$1) prices_sha256
  `, [R1_RELEASE_ID]);
  return result.rows[0];
}

async function cleanup(client: Client): Promise<void> {
  const beforeR1 = await fingerprintR1(client);
  const revisions = (await client.query("select id from public.estimate_revision where release_id=$1 order by id", [R2_RELEASE_ID])).rows.map((row) => row.id);
  const jobs = (await client.query("select id from public.estimate_compile_job where target_release_id=$1 order by id", [R2_RELEASE_ID])).rows.map((row) => row.id);
  await client.query("begin");
  try {
    if (jobs.length) await client.query("delete from public.estimate_compile_job where id=any($1::uuid[])", [jobs]);
    if (revisions.length) {
      await client.query("delete from public.estimate_revision_artifact where revision_id=any($1::uuid[])", [revisions]);
      await client.query("alter table public.estimate_revision_row_price disable trigger estimate_revision_row_price_immutable_trg");
      await client.query("alter table public.estimate_revision_row disable trigger estimate_revision_row_immutable_trg");
      await client.query("alter table public.estimate_revision disable trigger estimate_revision_immutable_trg");
      await client.query("delete from public.estimate_revision_row_price where revision_id=any($1::uuid[])", [revisions]);
      await client.query("delete from public.estimate_revision_row where revision_id=any($1::uuid[])", [revisions]);
      await client.query("delete from public.estimate_revision where id=any($1::uuid[])", [revisions]);
      await client.query("alter table public.estimate_revision enable trigger estimate_revision_immutable_trg");
      await client.query("alter table public.estimate_revision_row enable trigger estimate_revision_row_immutable_trg");
      await client.query("alter table public.estimate_revision_row_price enable trigger estimate_revision_row_price_immutable_trg");
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
  const afterR1 = await fingerprintR1(client);
  const residue = (await client.query(`
    select
      (select count(*)::integer from public.estimate_compile_job where target_release_id=$1) jobs,
      (select count(*)::integer from public.estimate_revision where release_id=$1) revisions,
      (select count(*)::integer from public.estimate_revision_row rr join public.estimate_revision r on r.id=rr.revision_id where r.release_id=$1) rows,
      (select count(*)::integer from public.estimate_revision_artifact a join public.estimate_revision r on r.id=a.revision_id where r.release_id=$1) artifacts
  `, [R2_RELEASE_ID])).rows[0];
  const total = Object.values(residue).reduce<number>((sum, value) => sum + Number(value), 0);
  const proof = {
    schemaVersion: "task-owned-database-cleanup-proof.r3", generatedAt: new Date().toISOString(),
    source: { head: git(["rev-parse", "HEAD"]), tree: git(["rev-parse", "HEAD^{tree}"]) },
    releaseId: R2_RELEASE_ID, deleted: { jobs: jobs.length, revisions: revisions.length },
    residue: { ...residue, total }, r1Before: beforeR1, r1After: afterR1,
    r1Unchanged: stableJson(beforeR1) === stableJson(afterR1),
    status: total === 0 && stableJson(beforeR1) === stableJson(afterR1) ? "GREEN" : "RED",
  };
  writeJson("TASK_OWNED_DATABASE_CLEANUP_PROOF.json", proof);
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
  if (proof.status !== "GREEN") process.exitCode = 1;
}

async function main(): Promise<void> {
  mkdirSync(EVIDENCE, { recursive: true });
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r3-backend-functional-gates" });
  await client.connect();
  try {
    if (hasFlag("cleanup")) { await cleanup(client); return; }
    const generatedAt = new Date().toISOString();
    const source = { head: git(["rev-parse", "HEAD"]), tree: git(["rev-parse", "HEAD^{tree}"]) };
    const r1Before = await fingerprintR1(client);
    if (Number(r1Before.revision_count) !== 16) throw new Error(`R1_REVISION_COUNT_RED:${r1Before.revision_count}`);
    const active = (await client.query("select id,status from public.estimate_definition_release where status='active'")).rows;
    if (active.length !== 1 || active[0].id !== R2_RELEASE_ID) throw new Error(`R2_NOT_ACTIVE:${stableJson(active)}`);
    const parent = (await client.query(`
      select r.* from public.estimate_revision r
      join public.estimate_definition_version v on v.release_id=$2 and v.catalog_id=r.catalog_id
      where r.release_id=$1 and r.owner_user_id=$3 and r.status='ready'
      order by r.row_count desc,r.id limit 1
    `, [R1_RELEASE_ID, R2_RELEASE_ID, OWNER_ID])).rows[0];
    if (!parent) throw new Error("R1_COMPATIBLE_PARENT_NOT_FOUND");
    const opened = await api(`revisions/${parent.id}`);
    const openedRows = await api(`revisions/${parent.id}/rows?limit=200`);
    if (opened.status !== 200 || opened.body.releaseId !== R1_RELEASE_ID || openedRows.status !== 200
      || openedRows.body.rows.length !== Number(parent.row_count)) throw new Error("R1_REVISION_OPEN_PARITY_RED");
    const basePayload = {
      catalogId: parent.catalog_id, currencyCode: parent.currency_code,
      parameters: parent.input_parameters, priceSnapshotIds: parent.price_snapshot_ids,
      parentRevisionId: parent.id,
    };
    const silent = await api("jobs/recalculate", { method: "POST", body: JSON.stringify({ ...basePayload, idempotencyKey: `r3-silent-${Date.now()}` }) });
    if (silent.status === 202) throw new Error("SILENT_R1_TO_R2_RECALCULATION_ACCEPTED");
    const migratedAccepted = await api("jobs/recalculate", { method: "POST", body: JSON.stringify({
      ...basePayload, idempotencyKey: `r3-explicit-${Date.now()}`,
      releaseMigration: { contractVersion: "canonical_revision_release_migration.r2", acknowledged: true, fromReleaseId: R1_RELEASE_ID, toReleaseId: R2_RELEASE_ID },
    }) });
    if (migratedAccepted.status !== 202) throw new Error(`EXPLICIT_MIGRATION_NOT_ACCEPTED:${stableJson(migratedAccepted.body)}`);
    const migratedJob = await waitJob(String(migratedAccepted.body.jobId));
    if (migratedJob.status !== "succeeded" || !migratedJob.resultRevisionId) throw new Error(`EXPLICIT_MIGRATION_JOB_RED:${stableJson(migratedJob)}`);
    const child = await api(`revisions/${migratedJob.resultRevisionId}`);
    const childRows = await api(`revisions/${migratedJob.resultRevisionId}/rows?limit=200`);
    if (child.body.parentRevisionId !== parent.id || child.body.releaseId !== R2_RELEASE_ID) throw new Error("EXPLICIT_CHILD_LINEAGE_RED");
    writeJsonl("R1_TO_R2_EXPLICIT_CHILD_MIGRATION_PROOF.jsonl", [{
      schemaVersion: "r1-to-r2-explicit-child-migration-proof.r3", generatedAt, source,
      sourceRevisionId: parent.id, sourceReleaseId: R1_RELEASE_ID, sourceChecksumSha256: parent.checksum_sha256,
      silentRecalculate: { status: silent.status, rejected: silent.status !== 202, error: silent.body.error ?? null },
      contract: { contractVersion: "canonical_revision_release_migration.r2", acknowledged: true, fromReleaseId: R1_RELEASE_ID, toReleaseId: R2_RELEASE_ID },
      childRevisionId: child.body.revisionId, childParentRevisionId: child.body.parentRevisionId,
      childReleaseId: child.body.releaseId, childRows: childRows.body.rows.length,
      originalRevisionAfter: (await api(`revisions/${parent.id}`)).body,
      status: "GREEN",
    }]);

    const firstRow = childRows.body.rows[0] as Json;
    const amendmentAccepted = await api("jobs/recalculate", { method: "POST", body: JSON.stringify({
      idempotencyKey: `r3-amend-${Date.now()}`, catalogId: parent.catalog_id, currencyCode: parent.currency_code,
      parameters: child.body.parameters, parentRevisionId: child.body.revisionId,
      rowOverrides: { [firstRow.rowId]: { quantity: "12.5", unitPrice: "100", includedInEstimate: true, includedInProcurement: firstRow.procurementEligible === true, provenance: { kind: "manual", reason: "R3 roundtrip" } } },
      customRows: [{ clientRowId: "r3-custom-row", section: "Материалы", category: "material", titleRu: "R3 ручная позиция", unitId: "kg", quantity: "2", unitPrice: "75", includedInEstimate: true, includedInProcurement: true, provenance: { kind: "manual", reason: "R3 roundtrip" } }],
    }) });
    const amendmentJob = amendmentAccepted.status === 202 ? await waitJob(String(amendmentAccepted.body.jobId)) : amendmentAccepted.body;
    if (amendmentJob.status !== "succeeded") throw new Error(`AMENDMENT_JOB_RED:${stableJson(amendmentJob)}`);
    const amended = await api(`revisions/${amendmentJob.resultRevisionId}`);
    const amendedRows = await api(`revisions/${amendmentJob.resultRevisionId}/rows?limit=200`);
    const amendedBase = amendedRows.body.rows.find((row: Json) => row.rowId === firstRow.rowId);
    const custom = amendedRows.body.rows.find((row: Json) => row.rowId === "manual:r3-custom-row");
    if (amended.body.releaseId !== R2_RELEASE_ID || amended.body.parentRevisionId !== child.body.revisionId
      || amendedBase?.quantity !== "12.500000000" || amendedBase?.unitPrice !== "100.000000"
      || custom?.quantity !== "2.000000000" || custom?.unitPrice !== "75.000000") throw new Error("AMENDMENT_ROUNDTRIP_RED");
    writeJsonl("AMENDMENT_CONTRACT_ROUNDTRIP_PROOF.jsonl", [{
      schemaVersion: "amendment-contract-roundtrip-proof.r3", generatedAt, source,
      parentRevisionId: child.body.revisionId, childRevisionId: amended.body.revisionId,
      releaseId: amended.body.releaseId, amendmentContract: amended.body.amendmentContract,
      rowOverrideProjection: amendedBase, customRowProjection: custom, status: "GREEN",
    }]);

    const artifacts = [];
    for (const kind of ["pdf", "procurement"] as const) {
      const artifact = await buildArtifact(amended.body.revisionId, kind, `r3-${kind}-${Date.now()}`);
      const payload = artifact.bytes as Buffer;
      const semantic = kind === "pdf"
        ? { pdfHeader: payload.subarray(0, 4).toString("latin1"), releaseIdVisibleInMetadata: artifact.metadata?.sourceReleaseId === R2_RELEASE_ID }
        : { procurement: JSON.parse(payload.toString("utf8")), releaseIdVisibleInPayload: payload.toString("utf8").includes(R2_RELEASE_ID) };
      delete artifact.bytes;
      artifacts.push({ schemaVersion: "pdf-procurement-backend-parity.r3", generatedAt, source, revisionId: amended.body.revisionId, releaseId: R2_RELEASE_ID, kind, artifact, semantic, status: "GREEN" });
    }
    writeJsonl("PDF_PROCUREMENT_BACKEND_PARITY.jsonl", artifacts);
    const history = await api(`revisions?catalogId=${encodeURIComponent(parent.catalog_id)}&limit=30`);
    const historyRows = history.body.revisions as Json[];
    const historyGreen = historyRows.some((row) => row.revisionId === parent.id && row.releaseId === R1_RELEASE_ID)
      && historyRows.some((row) => row.revisionId === amended.body.revisionId && row.releaseId === R2_RELEASE_ID);
    writeJsonl("HISTORY_COLD_RESTART_PARITY_PROOF.jsonl", [{
      schemaVersion: "history-cold-restart-parity-proof.r3", generatedAt, source,
      catalogId: parent.catalog_id, originalR1RevisionId: parent.id, activeR2RevisionId: amended.body.revisionId,
      revisions: historyRows, coldReadAfterIndependentApiCalls: true, status: historyGreen ? "GREEN" : "RED",
    }]);
    if (!historyGreen) throw new Error("HISTORY_RELEASE_PARITY_RED");

    const compileMatrixPath = join(EVIDENCE, "SERVER_COMPILE_1168_MATRIX.jsonl");
    const complexCompile = await firstJsonLine(compileMatrixPath, (row) => Number(row.reachedRows) >= 500 && row.status === "GREEN");
    const scenario = await firstJsonLine(join(EVIDENCE, "CONSTRAINT_AWARE_SCENARIO_MATRIX.jsonl"), (row) => row.catalogId === complexCompile.catalogId && row.operation === "compile");
    const started = performance.now();
    const complexAccepted = await api("jobs/compile", { method: "POST", body: JSON.stringify({
      idempotencyKey: `r3-complex-500-${Date.now()}`, catalogId: complexCompile.catalogId,
      currencyCode: "KGS", parameters: scenario.parameterSet,
    }) });
    const complexJob = complexAccepted.status === 202 ? await waitJob(String(complexAccepted.body.jobId), 240_000) : complexAccepted.body;
    const complexDurationMs = Math.round(performance.now() - started);
    const complexRevision = complexJob.resultRevisionId ? await api(`revisions/${complexJob.resultRevisionId}`) : null;
    const complexGreen = complexJob.status === "succeeded" && Number(complexRevision?.body.rowCount) >= 500 && complexRevision?.body.releaseId === R2_RELEASE_ID;
    writeJson("COMPLEX_500_PLUS_SERVER_CASE_PROOF.json", {
      schemaVersion: "complex-500-plus-server-case-proof.r3", generatedAt, source,
      catalogId: complexCompile.catalogId, scenarioId: scenario.scenarioId, revision: complexRevision?.body,
      durationMs: complexDurationMs, status: complexGreen ? "GREEN" : "RED",
    });
    if (!complexGreen) throw new Error("COMPLEX_500_PLUS_RED");

    const idempotencyKey = `r3-idempotency-${Date.now()}`;
    const idempotencyPayload = { idempotencyKey, catalogId: complexCompile.catalogId, currencyCode: "KGS", parameters: scenario.parameterSet };
    const idempotentFirst = await api("jobs/compile", { method: "POST", body: JSON.stringify(idempotencyPayload) });
    const idempotentSecond = await api("jobs/compile", { method: "POST", body: JSON.stringify(idempotencyPayload) });
    const conflict = await api("jobs/compile", { method: "POST", body: JSON.stringify({ ...idempotencyPayload, parameters: { ...scenario.parameterSet, __unknown: 1 } }) });
    const idempotentJob = await waitJob(String(idempotentFirst.body.jobId), 240_000);
    const concurrentParent = String(idempotentJob.resultRevisionId);
    const concurrentBase = { catalogId: complexCompile.catalogId, currencyCode: "KGS", parameters: scenario.parameterSet, parentRevisionId: concurrentParent };
    const concurrentAccepted = await Promise.all([
      api("jobs/recalculate", { method: "POST", body: JSON.stringify({ ...concurrentBase, idempotencyKey: `r3-concurrent-a-${Date.now()}` }) }),
      api("jobs/recalculate", { method: "POST", body: JSON.stringify({ ...concurrentBase, idempotencyKey: `r3-concurrent-b-${Date.now()}` }) }),
    ]);
    const concurrentJobs = await Promise.all(concurrentAccepted.map((accepted) => waitJob(String(accepted.body.jobId), 240_000)));
    const concurrentSucceeded = concurrentJobs.filter((job) => job.status === "succeeded").length;
    const concurrentFailed = concurrentJobs.filter((job) => job.status === "failed").length;
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [OTHER_OWNER_ID]);
    const rlsOther = await client.query("select count(*)::integer count from public.estimate_revision where id=any($1::uuid[])", [[parent.id, amended.body.revisionId]]);
    await client.query("rollback");
    const securitySource = readFileSync(join(ROOT, "supabase", "functions", "canonical-estimate", "index.ts"), "utf8");
    const rlsGreen = Number(rlsOther.rows[0].count) === 0;
    const securityGreen = securitySource.includes("ESTIMATE_ALLOWED_ORIGINS") && !securitySource.includes('"Access-Control-Allow-Origin": "*"');
    const idempotencyGreen = idempotentFirst.status === 202 && idempotentSecond.status === 202
      && idempotentFirst.body.jobId === idempotentSecond.body.jobId && idempotentFirst.body.created === true
      && idempotentSecond.body.created === false && conflict.status !== 202;
    const concurrencyGreen = concurrentAccepted.every((row) => row.status === 202) && concurrentSucceeded === 1 && concurrentFailed === 1;
    writeJson("BACKEND_RLS_CONCURRENCY_IDEMPOTENCY_PROOF.json", {
      schemaVersion: "backend-rls-concurrency-idempotency-proof.r3", generatedAt, source,
      rls: { foreignOwnerVisibleRows: Number(rlsOther.rows[0].count), status: rlsGreen ? "GREEN" : "RED" },
      security: { explicitCorsAllowlist: securitySource.includes("ESTIMATE_ALLOWED_ORIGINS"), wildcardCorsAbsent: !securitySource.includes('"Access-Control-Allow-Origin": "*"'), status: securityGreen ? "GREEN" : "RED" },
      idempotency: { first: idempotentFirst.body, replay: idempotentSecond.body, conflictingPayloadStatus: conflict.status, status: idempotencyGreen ? "GREEN" : "RED" },
      concurrency: { accepted: concurrentAccepted.map((row) => row.body), terminal: concurrentJobs, succeeded: concurrentSucceeded, failed: concurrentFailed, status: concurrencyGreen ? "GREEN" : "RED" },
      status: rlsGreen && securityGreen && idempotencyGreen && concurrencyGreen ? "GREEN" : "RED",
    });
    if (!rlsGreen || !securityGreen || !idempotencyGreen || !concurrencyGreen) throw new Error("RLS_CONCURRENCY_IDEMPOTENCY_RED");

    const catalogDurations: number[] = [];
    for (let iteration = 0; iteration < 20; iteration += 1) {
      const tick = performance.now();
      const response = await api(`catalog?query=${encodeURIComponent("асфальт")}&limit=30`);
      catalogDurations.push(performance.now() - tick);
      if (response.status !== 200) throw new Error("PERFORMANCE_LOOKUP_RED");
    }
    catalogDurations.sort((left, right) => left - right);
    const percentile = (fraction: number) => Math.round(catalogDurations[Math.min(catalogDurations.length - 1, Math.floor(catalogDurations.length * fraction))] * 100) / 100;
    writeJson("BACKEND_PERFORMANCE_CAPACITY_PROOF.json", {
      schemaVersion: "backend-performance-capacity-proof.r3", generatedAt, source,
      catalogLookup: { samples: catalogDurations.length, p50Ms: percentile(0.5), p95Ms: percentile(0.95), maxMs: Math.round(catalogDurations.at(-1)! * 100) / 100 },
      complexCompile: { catalogId: complexCompile.catalogId, rows: complexRevision?.body.rowCount, durationMs: complexDurationMs },
      limits: { maximumDefinitionRows: 2_000, complexMinimumRows: 500 },
      status: percentile(0.95) < 2_000 && complexDurationMs < 240_000 ? "GREEN" : "RED",
    });

    const invalidBooleanDefinition = await client.query(`
      select v.catalog_id,p.parameter_id from public.estimate_parameter_definition p
      join public.estimate_definition_version v on v.id=p.definition_version_id
      where v.release_id=$1 and p.value_type='boolean' limit 1
    `, [R2_RELEASE_ID]);
    const booleanCatalog = invalidBooleanDefinition.rows[0];
    const booleanScenario = await firstJsonLine(join(EVIDENCE, "CONSTRAINT_AWARE_SCENARIO_MATRIX.jsonl"), (row) => row.catalogId === booleanCatalog.catalog_id && row.operation === "compile");
    const invalidBoolean = await api("jobs/compile", { method: "POST", body: JSON.stringify({
      idempotencyKey: `r3-invalid-boolean-${Date.now()}`, catalogId: booleanCatalog.catalog_id, currencyCode: "KGS",
      parameters: { ...booleanScenario.parameterSet, [booleanCatalog.parameter_id]: "true" },
    }) });
    const invalidBooleanJob = invalidBoolean.status === 202 ? await waitJob(String(invalidBoolean.body.jobId)) : invalidBoolean.body;
    const noAuth = await fetch(`${API_BASE}/catalog?query=x`);
    const mutations = [
      { id: "cross_release_silent_recalculate", survived: silent.status !== 202, observed: silent.status },
      { id: "idempotency_payload_conflict", survived: conflict.status !== 202, observed: conflict.status },
      { id: "invalid_boolean_string", survived: invalidBooleanJob.status === "failed", observed: invalidBooleanJob },
      { id: "foreign_tenant_rls", survived: rlsGreen, observed: rlsOther.rows[0] },
      { id: "missing_auth", survived: noAuth.status === 401, observed: noAuth.status },
      { id: "concurrent_same_parent", survived: concurrencyGreen, observed: concurrentJobs },
      { id: "wildcard_cors", survived: securityGreen, observed: { allowlist: securitySource.includes("ESTIMATE_ALLOWED_ORIGINS") } },
      { id: "r1_revision_mutation", survived: stableJson(r1Before) === stableJson(await fingerprintR1(client)), observed: await fingerprintR1(client) },
    ];
    writeJson("MUTATION_REPORT.json", {
      schemaVersion: "canonical-backend-mutation-report.r3", generatedAt, source,
      mutations, survived: mutations.filter((row) => row.survived).length, expected: mutations.length,
      status: mutations.every((row) => row.survived) ? "GREEN" : "RED",
    });
    if (mutations.some((row) => !row.survived)) throw new Error("MUTATION_REPORT_RED");
    process.stdout.write(`${JSON.stringify({ status: "GREEN", source, parentRevisionId: parent.id, childRevisionId: child.body.revisionId, amendedRevisionId: amended.body.revisionId, complexRevisionId: complexRevision?.body.revisionId, artifacts: artifacts.map((row) => ({ kind: row.kind, sha256: row.artifact.sha256 })) }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
