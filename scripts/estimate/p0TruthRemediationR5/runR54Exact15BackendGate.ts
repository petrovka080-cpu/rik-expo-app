import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_SHA256 = "992fddec1b95f95fff14b17057a88246a6d8466252a7f7cf41d2174c054904b0";
const API_ROOT = String(process.env.R54_CANONICAL_API_ROOT
  ?? "http://127.0.0.1:8777/canonical-estimate").replace(/\/+$/u, "");
const DATABASE_URL = process.env.R54_CANDIDATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/p0_r53_exact15_candidate";
const FROZEN_IDS_PATH = resolve(
  ".release-runtime/p0-one-monolith-r54/evidence/05-baseline/EXACT15_FROZEN_IDS.json",
);
const OUTPUT_PATH = resolve(
  ".release-runtime/p0-one-monolith-r54/evidence/05-baseline/EXACT15_BACKEND_ADMISSION_15_OF_15.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function api(path: string, init: RequestInit = {}): Promise<Json> {
  const response = await fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: "Bearer local-r54-exact15-proof",
      ...(init.body == null ? {} : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null) as Json | null;
  if (!response.ok) throw new Error(`HTTP_${response.status}:${path}:${JSON.stringify(payload)}`);
  return payload ?? {};
}

async function waitForJob(jobId: string): Promise<Json> {
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    const job = await api(`jobs/${encodeURIComponent(jobId)}`);
    if (["succeeded", "failed", "cancelled"].includes(String(job.status))) return job;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`R54_JOB_TIMEOUT:${jobId}`);
}

async function revisionRows(revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor: string | null = null;
  do {
    const payload = await api(`revisions/${encodeURIComponent(revisionId)}/rows?limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    rows.push(...(payload.rows ?? []));
    cursor = payload.nextCursor ?? null;
  } while (cursor);
  return rows;
}

async function waitForArtifact(revisionId: string, kind: "pdf" | "procurement"): Promise<Json> {
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    const artifact = await api(`revisions/${encodeURIComponent(revisionId)}/artifacts/${kind}`);
    if (["ready", "failed"].includes(String(artifact.status))) return artifact;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`R54_ARTIFACT_TIMEOUT:${revisionId}:${kind}`);
}

function nextNumericValue(row: Json): number | null {
  const current = Number(row.default_value);
  if (!Number.isFinite(current)) return null;
  const constraints = row.constraints_json ?? {};
  const candidates = row.value_type === "integer"
    ? [current + 1, current > 1 ? current - 1 : null]
    : [current * 1.1, current + 1, current > 0.1 ? current - 0.1 : null];
  for (const raw of candidates) {
    if (raw == null || !Number.isFinite(raw) || raw === current) continue;
    const value = row.value_type === "integer" ? Math.round(raw) : Number(raw.toPrecision(12));
    if ((constraints.min == null || value >= Number(constraints.min))
      && (constraints.max == null || value <= Number(constraints.max))) return value;
  }
  return null;
}

async function loadMutationCandidates(client: Client, catalogId: string): Promise<Json[]> {
  return (await client.query(`
    select p.*
    from public.estimate_parameter_definition p
    join public.estimate_definition_version v on v.id=p.definition_version_id
    join public.estimate_definition_release r on r.id=v.release_id and r.status='active'
    where v.catalog_id=$1
      and p.value_type in ('decimal','integer')
      and p.default_value is not null
      and p.parameter_id <> 'PI'
      and jsonb_typeof(p.truth_metadata->'resource_branch_consumers')='array'
      and jsonb_array_length(p.truth_metadata->'resource_branch_consumers')>0
    order by jsonb_array_length(p.truth_metadata->'resource_branch_consumers') desc,p.ordinal
  `, [catalogId])).rows;
}

async function artifactProof(revisionId: string, kind: "pdf" | "procurement"): Promise<Json> {
  const created = await api(`revisions/${encodeURIComponent(revisionId)}/artifacts/${kind}`, {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: `r54-exact15-${kind}-${randomUUID()}` }),
  });
  const artifact = await waitForArtifact(revisionId, kind);
  invariant(artifact.status === "ready", `R54_${kind.toUpperCase()}_FAILED:${revisionId}:${artifact.errorCode}`);
  invariant(artifact.signedUrl && artifact.sha256 && artifact.byteSize > 0, `R54_${kind.toUpperCase()}_INCOMPLETE:${revisionId}`);
  const response = await fetch(artifact.signedUrl);
  const bytes = new Uint8Array(await response.arrayBuffer());
  invariant(response.ok && sha256(bytes) === artifact.sha256, `R54_${kind.toUpperCase()}_HASH_MISMATCH:${revisionId}`);
  return {
    jobId: created.jobId,
    artifactId: artifact.artifactId,
    byteSize: bytes.byteLength,
    sha256: artifact.sha256,
    sourceRevisionChecksumSha256: artifact.metadata?.sourceRevisionChecksumSha256,
  };
}

async function runCase(client: Client, catalogId: string): Promise<Json> {
  const compileCreated = await api("jobs/compile", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `r54-exact15-compile-${catalogId}-${randomUUID()}`,
      catalogId,
      parameters: {},
      currencyCode: "KGS",
      priceSnapshotIds: [],
    }),
  });
  const compileJob = await waitForJob(compileCreated.jobId);
  invariant(compileJob.status === "succeeded" && compileJob.resultRevisionId,
    `R54_COMPILE_FAILED:${catalogId}:${compileJob.errorCode ?? compileJob.status}`);
  const baselineRevision = await api(`revisions/${encodeURIComponent(compileJob.resultRevisionId)}`);
  const baselineRows = await revisionRows(compileJob.resultRevisionId);
  invariant(baselineRows.length > 0 && baselineRows.length === baselineRevision.rowCount,
    `R54_BASELINE_ROWS_INCOMPLETE:${catalogId}:${baselineRows.length}/${baselineRevision.rowCount}`);

  const visibleFormulaInputs = new Set(baselineRows.flatMap((row) => row.calculationTrace?.inputParameterIds ?? []));
  const candidates = await loadMutationCandidates(client, catalogId);
  const mutation = candidates.map((row) => ({ row, value: nextNumericValue(row) }))
    .find((candidate) => candidate.value != null && visibleFormulaInputs.has(candidate.row.parameter_id));
  invariant(mutation, `R54_MUTATION_PARAMETER_NOT_FOUND:${catalogId}`);

  const recalculateCreated = await api("jobs/recalculate", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `r54-exact15-recalculate-${catalogId}-${randomUUID()}`,
      catalogId,
      parentRevisionId: baselineRevision.revisionId,
      parameters: { [mutation.row.parameter_id]: mutation.value },
      currencyCode: "KGS",
      priceSnapshotIds: [],
    }),
  });
  const recalculateJob = await waitForJob(recalculateCreated.jobId);
  invariant(recalculateJob.status === "succeeded" && recalculateJob.resultRevisionId,
    `R54_RECALCULATE_FAILED:${catalogId}:${recalculateJob.errorCode ?? recalculateJob.status}`);
  invariant(recalculateJob.resultRevisionId !== baselineRevision.revisionId, `R54_REVISION_NOT_IMMUTABLE:${catalogId}`);
  const refinedRevision = await api(`revisions/${encodeURIComponent(recalculateJob.resultRevisionId)}`);
  const refinedRows = await revisionRows(recalculateJob.resultRevisionId);
  invariant(refinedRows.length > 0 && refinedRows.length === refinedRevision.rowCount,
    `R54_REFINED_ROWS_INCOMPLETE:${catalogId}:${refinedRows.length}/${refinedRevision.rowCount}`);

  const refinedById = new Map(refinedRows.map((row) => [row.rowId, row]));
  const changedRows = baselineRows.filter((row) => refinedById.get(row.rowId)?.quantity !== row.quantity);
  const unrelatedDrift = baselineRows.filter((row) => {
    const inputs = row.calculationTrace?.inputParameterIds ?? [];
    return !inputs.includes(mutation.row.parameter_id)
      && refinedById.get(row.rowId)?.rowSha256 !== row.rowSha256;
  });
  invariant(changedRows.length > 0, `R54_DEPENDENT_ROWS_NOT_CHANGED:${catalogId}:${mutation.row.parameter_id}`);
  invariant(unrelatedDrift.length === 0, `R54_UNRELATED_ROW_DRIFT:${catalogId}:${unrelatedDrift.length}`);

  const pdf = await artifactProof(refinedRevision.revisionId, "pdf");
  const procurement = await artifactProof(refinedRevision.revisionId, "procurement");
  invariant(pdf.sourceRevisionChecksumSha256 === refinedRevision.checksumSha256,
    `R54_PDF_REVISION_HASH_MISMATCH:${catalogId}`);
  invariant(procurement.sourceRevisionChecksumSha256 === refinedRevision.checksumSha256,
    `R54_PROCUREMENT_REVISION_HASH_MISMATCH:${catalogId}`);

  return {
    catalogId,
    compile: {
      jobId: compileCreated.jobId,
      revisionId: baselineRevision.revisionId,
      checksumSha256: baselineRevision.checksumSha256,
      rowCount: baselineRows.length,
      compilerOwner: baselineRevision.compilerOwner,
      status: "GREEN",
    },
    recalculate: {
      jobId: recalculateCreated.jobId,
      parentRevisionId: baselineRevision.revisionId,
      revisionId: refinedRevision.revisionId,
      checksumSha256: refinedRevision.checksumSha256,
      mutation: { parameterId: mutation.row.parameter_id, before: mutation.row.default_value, after: mutation.value },
      changedRows: changedRows.map((row) => row.rowId),
      unrelatedRowDrift: [],
      status: "GREEN",
    },
    artifacts: { pdf, procurement, status: "GREEN" },
    status: "GREEN",
  };
}

async function main(): Promise<void> {
  const frozen = JSON.parse(readFileSync(FROZEN_IDS_PATH, "utf8")) as Json;
  invariant(frozen.specSha256 === SPEC_SHA256 && frozen.denominator === 15, "R54_EXACT15_FROZEN_IDENTITY_MISMATCH");
  const retryCatalogIds = String(process.env.R54_EXACT15_RETRY_CATALOG_IDS ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  const frozenCatalogIds = frozen.catalogIds as string[];
  invariant(retryCatalogIds.every((catalogId) => frozenCatalogIds.includes(catalogId)), "R54_EXACT15_RETRY_ID_OUTSIDE_FROZEN_SET");
  const prior = retryCatalogIds.length > 0 && existsSync(OUTPUT_PATH)
    ? JSON.parse(readFileSync(OUTPUT_PATH, "utf8")) as Json
    : null;
  invariant(retryCatalogIds.length === 0 || prior?.denominator === 15, "R54_EXACT15_RETRY_EVIDENCE_MISSING");
  const attemptCatalogIds = retryCatalogIds.length > 0 ? retryCatalogIds : frozenCatalogIds;
  const attemptSet = new Set(attemptCatalogIds);
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r54-exact15-backend-gate" });
  await client.connect();
  const startedAt = new Date().toISOString();
  const results: Json[] = (prior?.results ?? []).filter((result: Json) => !attemptSet.has(result.catalogId));
  const repairQueue: Json[] = (prior?.repairQueue ?? []).filter((result: Json) => !attemptSet.has(result.catalogId));
  try {
    for (const catalogId of attemptCatalogIds) {
      try {
        results.push(await runCase(client, catalogId));
      } catch (error) {
        repairQueue.push({ catalogId, error: error instanceof Error ? error.message : String(error) });
      }
    }
  } finally {
    await client.end();
  }
  results.sort((left, right) => frozenCatalogIds.indexOf(left.catalogId) - frozenCatalogIds.indexOf(right.catalogId));
  const evidence = {
    schemaVersion: "p0-one-monolith-r54-exact15-backend-admission.v1",
    specSha256: SPEC_SHA256,
    startedAt,
    completedAt: new Date().toISOString(),
    apiRoot: API_ROOT,
    candidateDatabase: new URL(DATABASE_URL).pathname.replace(/^\//u, ""),
    sourceDatabaseWrites: 0,
    active8081Cutover: false,
    denominator: 15,
    attemptCatalogIds,
    priorGreenResultsRetained: retryCatalogIds.length > 0,
    exact15BackendCompile: `${results.filter((result) => result.compile?.status === "GREEN").length}/15`,
    exact15BackendRecalculate: `${results.filter((result) => result.recalculate?.status === "GREEN").length}/15`,
    exact15BackendArtifacts: `${results.filter((result) => result.artifacts?.status === "GREEN").length}/15`,
    repairQueue,
    results,
    status: results.length === 15 && repairQueue.length === 0 ? "GREEN" : "RED",
  };
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: evidence.status,
    exact15BackendCompile: evidence.exact15BackendCompile,
    exact15BackendRecalculate: evidence.exact15BackendRecalculate,
    exact15BackendArtifacts: evidence.exact15BackendArtifacts,
    repairQueue,
    evidencePath: OUTPUT_PATH,
  }, null, 2)}\n`);
  if (evidence.status !== "GREEN") process.exitCode = 1;
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
