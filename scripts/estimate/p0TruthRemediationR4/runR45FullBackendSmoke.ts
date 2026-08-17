import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

const API_ROOT = String(process.env.R45_CANONICAL_API_ROOT
  ?? "http://127.0.0.1:8766/canonical-estimate").replace(/\/+$/, "");
const DATABASE_URL = process.env.R45_FULL_ACCEPTANCE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/p0_r45_acceptance_full_20260817";
const OUTPUT = resolve(process.env.R45_BACKEND_SMOKE_OUTPUT
  ?? ".release-runtime/p0-estimate-truth-remediation-r4/evidence/13-web/ISOLATED_FULL_BACKEND_CONTRACT_SMOKE_8766.json");
const JOURNAL = resolve(".release-runtime/p0-estimate-truth-remediation-r4/evidence/RUN_JOURNAL.ndjson");

function assert(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}

async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: "Bearer local-r45-proof",
      ...(init.body == null ? {} : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`HTTP_${response.status}:${path}:${JSON.stringify(payload)}`);
  }
  return payload as Record<string, any>;
}

async function waitForJob(jobId: string) {
  const started = Date.now();
  while (Date.now() - started < 60_000) {
    const payload = await api(`jobs/${encodeURIComponent(jobId)}`);
    if (["succeeded", "failed", "cancelled"].includes(String(payload.status))) return payload;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`JOB_TIMEOUT:${jobId}`);
}

async function waitForArtifact(revisionId: string, kind: "pdf" | "procurement") {
  const started = Date.now();
  while (Date.now() - started < 60_000) {
    const payload = await api(`revisions/${encodeURIComponent(revisionId)}/artifacts/${kind}`);
    if (["ready", "failed"].includes(String(payload.status))) return payload;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`ARTIFACT_TIMEOUT:${revisionId}:${kind}`);
}

async function main() {
  const database = new Client({ connectionString: DATABASE_URL, application_name: "r45-full-backend-smoke" });
  await database.connect();
  let seed: Record<string, any>;
  let inventory: Record<string, number>;
  try {
    seed = (await database.query(`
      select def.catalog_id, def.release_id,
             jsonb_agg(jsonb_build_object(
               'parameterId',p.parameter_id,
               'valueType',p.value_type,
               'required',p.required,
               'defaultValue',p.default_value,
               'constraints',p.constraints_json
             ) order by p.ordinal) parameters
      from public.estimate_definition_version def
      join public.estimate_definition_release rel on rel.id=def.release_id and rel.status='active'
      join public.estimate_parameter_definition p on p.definition_version_id=def.id
      where not exists (
        select 1 from public.estimate_resource_spec rs
        where rs.definition_version_id=def.id and nullif(trim(rs.semantic_owner),'') is not null
        group by rs.semantic_owner having count(*) > 1
      )
      group by def.id,def.catalog_id,def.release_id
      having bool_and(p.value_type in ('decimal','integer','boolean','enum','text'))
      order by exists(select 1 from public.estimate_revision r where r.catalog_id=def.catalog_id) desc,
               count(*) filter (where p.required=true) asc,count(*) asc,def.catalog_id
      limit 1
    `)).rows[0];
    const counts = (await database.query(`select
      (select count(*)::integer from public.estimate_work_identity where retired_at is null) identities,
      (select count(*)::integer from public.estimate_definition_version def join public.estimate_definition_release rel on rel.id=def.release_id where rel.status='active') definitions,
      (select count(*)::integer from public.estimate_parameter_definition) parameters,
      (select count(*)::integer from public.estimate_resource_spec) resources,
      (select count(*)::integer from public.estimate_search_document doc join public.estimate_search_index_release rel on rel.id=doc.search_release_id where rel.status='active') search_documents
    `)).rows[0];
    inventory = Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, Number(value)]));
  } finally {
    await database.end();
  }
  assert(seed?.catalog_id && Array.isArray(seed?.parameters), "SMOKE_SEED_DEFINITION_NOT_FOUND");
  const baselineParameters = Object.fromEntries(seed.parameters.flatMap((parameter: Record<string, any>) => {
    if (parameter.defaultValue != null) return [[parameter.parameterId, parameter.defaultValue]];
    const constraints = parameter.constraints && typeof parameter.constraints === "object" ? parameter.constraints : {};
    if (parameter.valueType === "boolean") return parameter.required === true ? [[parameter.parameterId, false]] : [];
    if (parameter.valueType === "enum") return parameter.required === true ? [[parameter.parameterId, constraints.values?.[0]]] : [];
    if (parameter.valueType === "text") return parameter.required === true ? [[parameter.parameterId, "Базовое значение"]] : [];
    const minimum = Number(constraints.min ?? 1);
    const bounded = Number.isFinite(minimum) ? Math.max(minimum, 1) : 1;
    return [[parameter.parameterId, parameter.valueType === "integer" ? Math.ceil(bounded) : bounded]];
  }));

  const startedAt = new Date().toISOString();
  const search = await api("search/catalog?query=%D0%BB%D0%B0&pageSize=100");
  assert(search.literalTotalCount === 3523, "SEARCH_LA_TOTAL_NOT_3523");
  assert(search.items?.length === 100, "SEARCH_LA_FIRST_PAGE_NOT_100");

  const catalog = await api(`catalog/${encodeURIComponent(seed.catalog_id)}`);
  assert(catalog.item?.catalogId === seed.catalog_id, "CATALOG_LOAD_MISMATCH");

  const selectedSearch = await api(`search/catalog?query=${encodeURIComponent(String(catalog.item.titleRu))}&pageSize=100`);
  const selected = selectedSearch.items?.find((item: Record<string, any>) => item.catalogId === seed.catalog_id);
  assert(selected?.publicationState === "ADMITTED_BACKEND", "SEED_NOT_ADMITTED_IN_SEARCH");

  const draft = await api("drafts", {
    method: "POST",
    body: JSON.stringify({
      originalQuery: catalog.item.titleRu,
      title: `R4.5 smoke ${catalog.item.titleRu}`,
      searchIndexReleaseId: selectedSearch.searchIndexReleaseId,
      searchResultSetHash: selectedSearch.resultSetSha256,
      selectedCatalogIds: [seed.catalog_id],
      deviceId: "r45-full-backend-smoke",
    }),
  });
  const loadedDraft = await api(`drafts/${encodeURIComponent(draft.draft.draftId)}`);
  assert(loadedDraft.draft?.draftId === draft.draft.draftId, "DRAFT_ROUNDTRIP_FAILED");

  const compile = await api("jobs/compile", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `r45-smoke-${randomUUID()}`,
      catalogId: seed.catalog_id,
      parameters: baselineParameters,
      currencyCode: "KGS",
      priceSnapshotIds: [],
    }),
  });
  const job = await waitForJob(compile.jobId);
  assert(job.status === "succeeded" && job.resultRevisionId, `COMPILE_FAILED:${job.errorCode ?? job.status}`);

  const revision = await api(`revisions/${encodeURIComponent(job.resultRevisionId)}`);
  const rows = await api(`revisions/${encodeURIComponent(job.resultRevisionId)}/rows?limit=200`);
  const history = await api(`revisions?catalogId=${encodeURIComponent(seed.catalog_id)}&limit=30`);
  assert(revision.revisionId === job.resultRevisionId, "REVISION_LOAD_FAILED");
  assert(rows.rows?.length > 0, "REVISION_ROWS_EMPTY");
  assert(history.revisions?.some((item: Record<string, any>) => item.revisionId === job.resultRevisionId), "HISTORY_MISSING_NEW_REVISION");

  const artifacts: Record<string, any> = {};
  for (const kind of ["pdf", "procurement"] as const) {
    const created = await api(`revisions/${encodeURIComponent(job.resultRevisionId)}/artifacts/${kind}`, {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: `r45-smoke-${kind}-${randomUUID()}` }),
    });
    const ready = await waitForArtifact(job.resultRevisionId, kind);
    assert(ready.status === "ready" && ready.sha256 && ready.byteSize > 0 && ready.signedUrl, `ARTIFACT_${kind.toUpperCase()}_NOT_READY`);
    const fileResponse = await fetch(ready.signedUrl);
    const bytes = new Uint8Array(await fileResponse.arrayBuffer());
    const actualSha256 = createHash("sha256").update(bytes).digest("hex");
    assert(fileResponse.ok && actualSha256 === ready.sha256, `ARTIFACT_${kind.toUpperCase()}_HASH_MISMATCH`);
    artifacts[kind] = { artifactId: ready.artifactId, byteSize: bytes.byteLength, sha256: actualSha256, createJobId: created.jobId };
  }

  const evidence = {
    schemaVersion: "p0-estimate-truth-remediation-r4.5-full-backend-smoke.v1",
    status: "GREEN_ISOLATED_FULL_BACKEND_8766",
    startedAt,
    completedAt: new Date().toISOString(),
    apiRoot: API_ROOT,
    databaseName: new URL(DATABASE_URL).pathname.slice(1),
    inventory,
    search: {
      query: "ла",
      literalTotalCount: search.literalTotalCount,
      globalLiteralTotalCount: search.globalLiteralTotalCount,
      externalLiteralTotalCount: search.externalLiteralTotalCount,
      shownCount: search.shownCount,
      searchIndexReleaseId: search.searchIndexReleaseId,
      searchIndexSnapshotSha256: search.searchIndexSnapshotSha256,
    },
    catalog: { catalogId: seed.catalog_id, titleRu: catalog.item.titleRu, definitionVersion: catalog.item.definitionVersion },
    draft: { draftId: draft.draft.draftId, roundtrip: true },
    compile: { jobId: compile.jobId, revisionId: job.resultRevisionId, rowCount: revision.rowCount, checksumSha256: revision.checksumSha256 },
    history: { containsNewRevision: true, returned: history.revisions.length },
    artifacts,
    limitations: [
      "Это локальная полная acceptance-БД, не production.",
      "Полный охват 4503/4503 и устранение BOQ-дефектов этим smoke-тестом не доказаны.",
    ],
  };
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  mkdirSync(dirname(JOURNAL), { recursive: true });
  appendFileSync(JOURNAL, `${JSON.stringify({
    at: evidence.completedAt,
    status: evidence.status,
    messageRu: "Полный локальный backend на 8766 прошёл поиск, каталог, черновик, расчёт, историю, строки, PDF и закупочный артефакт.",
    evidence: OUTPUT,
    overall: "RED_UNTIL_ACTIVE_8081_AND_FULL_R45_ACCEPTANCE",
  })}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
