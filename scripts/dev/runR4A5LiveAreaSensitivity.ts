import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const SUCCESSOR_RECEIPT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a5-exact-ui-confirm-durability-1/12_FORMULA_DEPENDENCY_SUCCESSOR.json",
);
const OUTPUT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a5-exact-ui-confirm-durability-1/13_LIVE_AREA_100_200_300.json",
);
const CATALOG_ID = "canonical-work:expanded:battens_counterbattens";
const CONTRACT = "r568-r4-a5-live-area-sensitivity.v1";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function login(): Promise<{ headers: Record<string, string>; principal: Json }> {
  const credentials = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Json;
  const principal = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(credentials.provider_url === PROVIDER && credentials.publishable_key
    && principal?.email && principal?.password, "R4_A5_LOCAL_CONSUMER_CREDENTIALS_RED");
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: principal.email, password: principal.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const session = await response.json().catch(() => null) as Json | null;
  invariant(response.ok && session?.access_token, `R4_A5_LOGIN_HTTP_${response.status}`);
  return {
    headers: {
      apikey: credentials.publishable_key,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    principal: { role: principal.role, userId: session.user?.id ?? null },
  };
}

async function request(headers: Record<string, string>, path: string, init?: RequestInit): Promise<{
  status: number;
  body: Json;
  requestId: string | null;
}> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  return { status: response.status, body, requestId: response.headers.get("x-request-id") };
}

async function waitJob(headers: Record<string, string>, jobId: string): Promise<Json> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const result = await request(headers, `jobs/${jobId}`);
    invariant(result.status === 200, `R4_A5_JOB_HTTP_${result.status}`);
    const status = String(result.body.status ?? "").toLocaleLowerCase("en-US");
    if (status === "succeeded") return result.body;
    if (status === "failed" || status === "cancelled") {
      throw new Error(`R4_A5_JOB_${status.toLocaleUpperCase("en-US")}:${String(result.body.errorCode ?? "UNKNOWN")}`);
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 125));
  }
  throw new Error(`R4_A5_JOB_TIMEOUT:${jobId}`);
}

async function main(): Promise<void> {
  const successor = JSON.parse(readFileSync(SUCCESSOR_RECEIPT, "utf8")) as Json;
  invariant(successor.status === "GREEN_SUCCESSOR_PREPARED_NOT_ACTIVE", "R4_A5_SUCCESSOR_NOT_PREPARED");
  const releaseId = String(successor.successor.releaseId);
  const searchReleaseId = String(successor.successor.searchReleaseId);
  const { headers, principal } = await login();
  const manifest = await request(headers, "runtime-manifest");
  invariant(manifest.status === 200
    && manifest.body.compatibilityTuple?.definitionReleaseId === releaseId
    && manifest.body.compatibilityTuple?.searchReleaseId === searchReleaseId
    && manifest.body.capability?.status === "ACTIVE", "R4_A5_RUNTIME_TUPLE_RED");
  const search = await request(headers, `search/catalog?query=${encodeURIComponent("обрешётка контробрешётка")}&pageSize=100`);
  invariant(search.status === 200 && search.body.searchIndexReleaseId === searchReleaseId, "R4_A5_SEARCH_RELEASE_RED");
  const exact = (search.body.items as Json[]).find((item) => item.catalogId === CATALOG_ID);
  invariant(exact?.estimateReady === true, "R4_A5_REPAIRED_CATALOG_NOT_READY");
  invariant(!(search.body.items as Json[]).some((item) => item.contentAdmission?.reasons?.includes("QUARANTINED")
    && item.estimateReady === true), "R4_A5_QUARANTINED_CATALOG_SELECTABLE");

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r4-a5-live-area-sensitivity-proof" });
  await client.connect();
  const cases: Json[] = [];
  try {
    for (const area of [100, 200, 300]) {
      const prompt = `Кровля, мансарды и кровельные окна обрешётка и контробрешётка ${area} кв метров`;
      const idempotencyKey = `${CONTRACT}-${sha256(`${releaseId}:${area}`).slice(0, 48)}`;
      const payload = {
        idempotencyKey,
        catalogId: CATALOG_ID,
        sourceRequestText: prompt,
        primaryMeasureParameterId: "area_m2",
        parameters: { area_m2: area, insulation_mm: 200, roof_windows_count: 4 },
        currencyCode: "KGS",
      };
      const first = await request(headers, "jobs/compile", { method: "POST", body: JSON.stringify(payload) });
      const repeated = await request(headers, "jobs/compile", { method: "POST", body: JSON.stringify(payload) });
      invariant(first.status === 202 && repeated.status === 202, `R4_A5_COMPILE_HTTP_${area}:${first.status}/${repeated.status}`);
      invariant(first.body.jobId === repeated.body.jobId, `R4_A5_COMPILE_NOT_IDEMPOTENT:${area}`);
      const terminal = await waitJob(headers, String(first.body.jobId));
      const revisionId = String(terminal.resultRevisionId ?? "");
      invariant(revisionId, `R4_A5_REVISION_MISSING:${area}`);
      const revision = (await client.query(`select id::text,release_id::text,catalog_id,input_parameters,
        user_input_snapshot,source_request_text,display_title_ru,primary_measure_parameter_id,
        primary_measure_value::text,primary_measure_unit_id,row_count,totals,checksum_sha256,
        revision_contract_version from public.estimate_revision where id=$1`, [revisionId])).rows[0] as Json | undefined;
      invariant(revision?.release_id === releaseId && revision.catalog_id === CATALOG_ID,
        `R4_A5_REVISION_IDENTITY_RED:${area}`);
      invariant(revision.primary_measure_parameter_id === "area_m2"
        && Number(revision.primary_measure_value) === area && revision.primary_measure_unit_id === "m2",
      `R4_A5_PRIMARY_MEASURE_RED:${area}`);
      invariant(Number(revision.input_parameters?.area_m2) === area
        && Number(revision.user_input_snapshot?.area_m2) === area,
      `R4_A5_USER_INPUT_SNAPSHOT_RED:${area}`);
      invariant(String(revision.display_title_ru).includes(`${area} м²`), `R4_A5_TITLE_AREA_RED:${area}`);
      invariant(Number(revision.row_count) === 45, `R4_A5_ROW_COUNT_RED:${area}`);
      const rows = (await client.query(`select row.row_id,row.quantity::text,row.unit_id,row.unit_price::text,
        row.amount::text,row.calculation_trace,spec.category,spec.ordinal
        from public.estimate_revision_row row
        join public.estimate_resource_spec spec on spec.id=row.resource_spec_id
        where row.revision_id=$1 order by spec.ordinal`, [revisionId])).rows as Json[];
      invariant(rows.length === 45, `R4_A5_ROWS_RED:${area}`);
      const covering = rows.find((row) => row.row_id === "covering_area_m2");
      const coveringAreaQuantity = Number(covering?.quantity);
      invariant(coveringAreaQuantity === area * 1.08, `R4_A5_COVERING_AREA_RED:${area}:${covering?.quantity}`);
      const formulaDependencyRows = rows.filter((row) =>
        Array.isArray(row.calculation_trace?.inputParameterIds)
          && row.calculation_trace.inputParameterIds.length > 0).length;
      invariant(formulaDependencyRows === 41, `R4_A5_TRACE_DEPENDENCY_RED:${area}:${formulaDependencyRows}`);
      const categoryCounts = Object.fromEntries([...new Set(rows.map((row) => row.category))]
        .sort().map((category) => [category, rows.filter((row) => row.category === category).length]));
      invariant(JSON.stringify(categoryCounts) === JSON.stringify({ equipment: 7, material: 22, service: 9, transport: 3, work: 4 }),
        `R4_A5_LIVE_CATEGORY_RED:${area}:${JSON.stringify(categoryCounts)}`);
      cases.push({
        area,
        prompt,
        jobId: first.body.jobId,
        repeatedJobId: repeated.body.jobId,
        idempotent: first.body.jobId === repeated.body.jobId,
        revisionId,
        checksumSha256: revision.checksum_sha256,
        displayTitleRu: revision.display_title_ru,
        rowCount: rows.length,
        categoryCounts,
        coveringAreaQuantity,
        formulaDependencyRows,
        explicitFixedQuantityRows: rows.length - formulaDependencyRows,
        pricedRows: rows.filter((row) => row.unit_price != null).length,
        total: revision.totals?.grandTotal ?? null,
      });
    }
  } finally {
    await client.end();
  }
  invariant(JSON.stringify(cases.map((entry) => entry.coveringAreaQuantity)) === JSON.stringify([108, 216, 324]),
    "R4_A5_LIVE_SENSITIVITY_RED");
  const receipt = {
    schemaVersion: CONTRACT,
    capturedAt: new Date().toISOString(),
    status: "GREEN_LIVE_AREA_100_200_300",
    backend: {
      origin: BACKEND,
      definitionReleaseId: releaseId,
      searchReleaseId,
      capabilityId: manifest.body.compatibilityTuple.capabilityId,
      sourceHead: manifest.body.compatibilityTuple.sourceHead,
      sourceTree: manifest.body.compatibilityTuple.sourceTree,
    },
    principal,
    search: {
      query: "обрешётка контробрешётка",
      exactCatalogId: exact.catalogId,
      exactDefinitionVersionId: exact.definitionVersionId,
      estimateReady: exact.estimateReady,
    },
    cases,
    invariant: "The primary user measure is input; every BOQ quantity is a backend formula result.",
    silentFallbackAllowed: false,
    credentialsPrinted: false,
    tokensCaptured: false,
    productionRequests: 0,
    productionReady: false,
  };
  atomicJson(OUTPUT, receipt);
  process.stdout.write(`${JSON.stringify({
    output: OUTPUT,
    status: receipt.status,
    releaseId,
    searchReleaseId,
    cases: cases.map((entry) => ({
      area: entry.area,
      title: entry.displayTitleRu,
      covering: entry.coveringAreaQuantity,
      rows: entry.rowCount,
      formulaDependencies: entry.formulaDependencyRows,
      idempotent: entry.idempotent,
    })),
  }, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
