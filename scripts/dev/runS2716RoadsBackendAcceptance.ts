import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { ASPHALT_COMPACTION_PROFILE_CATALOG_ID } from "../../src/lib/estimate/v4/asphaltCompactionPreliminaryProfileR1";
import { ASPHALT_INSTALL_KRER27_CATALOG_ID } from "../../src/lib/estimate/v4/asphaltInstallLargeAreaKrer27ProfileR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-16.roads-backend-acceptance.v1";
const API_ROOT = process.env.S2716_BACKEND_ORIGIN ?? "http://127.0.0.1:8765/canonical-estimate";
const BROKER_URL = process.env.S2716_LOCAL_DEVELOPER_BROKER_URL ?? "http://127.0.0.1:54329";
const LOCAL_WEB_ORIGIN = process.env.S2716_LOCAL_WEB_ORIGIN ?? "http://localhost:8081";
const RELEASE_ID = "5800af1e-fe52-58e4-8484-e8a28542f761";
const SEARCH_RELEASE_ID = "3d76d2ef-ef83-5082-a8ea-c6928e56fcee";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_ROOT = resolve(".release-runtime/r568/s27-16/acceptance/roads-backend");
let activeToken = "";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S27_16_ROADS_BACKEND:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .sort(([left], [right]) => left.localeCompare(right))
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

function decimalEq(value: unknown, expected: number): boolean {
  return Math.abs(Number(value) - expected) < 0.000001;
}

async function login(): Promise<string> {
  const response = await fetch(`${BROKER_URL}/session`, {
    method: "POST",
    headers: { Origin: LOCAL_WEB_ORIGIN, "content-type": "application/json" },
    body: JSON.stringify({ role: "consumer" }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok && body.role === "consumer" && typeof body.access_token === "string",
    `CONSUMER_LOGIN_${response.status}`);
  activeToken = body.access_token;
  return activeToken;
}

async function api(token: string, path: string, init: RequestInit = {}): Promise<Json> {
  const request = async (bearer: string) => fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${bearer}`,
      ...(init.body == null ? {} : { "content-type": "application/json" }),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(180_000),
  });
  let response = await request(activeToken || token);
  if (response.status === 401) {
    await login();
    response = await request(activeToken);
  }
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
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error(`S27_16_ROADS_BACKEND:JOB_TIMEOUT:${jobId}`);
}

async function compile(
  token: string,
  catalogId: string,
  parameters: Json,
  sourceRequestText: string,
  runId: string,
  key: string,
): Promise<Json> {
  const accepted = await api(token, "jobs/compile", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `${CONTRACT}:${runId}:${key}:compile`,
      catalogId,
      parameters,
      sourceRequestText,
      primaryMeasureParameterId: "area_m2",
      currencyCode: "KGS",
      priceSnapshotIds: [],
    }),
  });
  const job = await waitJob(token, String(accepted.jobId));
  return api(token, `revisions/${job.resultRevisionId}`);
}

async function recalculate(
  token: string,
  parent: Json,
  parameters: Json,
  runId: string,
  key: string,
  rowOverrides: Json = parent.amendmentContract?.rowOverrides ?? {},
): Promise<Json> {
  const accepted = await api(token, "jobs/recalculate", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `${CONTRACT}:${runId}:${key}:recalculate`,
      catalogId: parent.catalogId,
      parentRevisionId: parent.revisionId,
      sourceRequestText: parent.sourceRequestText,
      primaryMeasureParameterId: parent.primaryMeasureParameterId,
      parameters,
      currencyCode: parent.currencyCode,
      priceSnapshotIds: parent.priceSnapshotIds ?? [],
      rowOverrides,
      customRows: parent.amendmentContract?.customRows ?? [],
    }),
  });
  const job = await waitJob(token, String(accepted.jobId));
  return api(token, `revisions/${job.resultRevisionId}`);
}

async function allRows(token: string, revisionId: string): Promise<Json[]> {
  const result: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await api(token, `revisions/${revisionId}/rows?${query}`);
    result.push(...(Array.isArray(page.rows) ? page.rows : []));
    cursor = String(page.nextCursor ?? "");
  } while (cursor);
  return result;
}

async function artifact(
  token: string,
  revisionId: string,
  kind: "pdf" | "procurement",
  runId: string,
  key: string,
): Promise<{ metadata: Json; bytes: Buffer }> {
  const request = await api(token, `revisions/${revisionId}/artifacts/${kind}`, {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `${CONTRACT}:${runId}:${key}:${revisionId}:${kind}`,
      ...(kind === "pdf" ? { documentProfile: "professional_v1" } : {}),
    }),
  });
  if (request.jobId) await waitJob(token, String(request.jobId));
  const query = kind === "pdf" ? "?documentProfile=professional_v1" : "";
  const metadata = await api(token, `revisions/${revisionId}/artifacts/${kind}${query}`);
  invariant(metadata.status === "ready" && typeof metadata.signedUrl === "string",
    `${key.toUpperCase()}_${kind.toUpperCase()}_NOT_READY`);
  const response = await fetch(metadata.signedUrl, {
    headers: { authorization: `Bearer ${activeToken || token}` },
    signal: AbortSignal.timeout(180_000),
  });
  invariant(response.ok, `${key.toUpperCase()}_${kind.toUpperCase()}_DOWNLOAD_${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  invariant(sha256(bytes) === metadata.sha256, `${key.toUpperCase()}_${kind.toUpperCase()}_SHA_MISMATCH`);
  return { metadata, bytes };
}

async function pdfText(bytes: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return pages.join("\n");
}

function byId(rows: readonly Json[]): Map<string, Json> {
  return new Map(rows.map((row) => [String(row.rowId), row]));
}

async function searchIndex(token: string, prompt: string, catalogId: string): Promise<number> {
  const search = await api(token,
    `search/catalog?query=${encodeURIComponent(prompt)}&pageSize=50&scope=WORKS`);
  const items = Array.isArray(search.items) ? search.items as Json[] : [];
  const index = items.findIndex((item) => item.catalogId === catalogId);
  invariant(index === 0 && items[index]?.estimateReady === true,
    `SEARCH_RED:${catalogId}:${index}:${items.slice(0, 5).map((item) => item.catalogId).join(",")}`);
  return index;
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const runId = randomUUID();
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.definitionReleaseId === RELEASE_ID && current.searchReleaseId === SEARCH_RELEASE_ID,
    "CURRENT_RELEASE_PAIR_RED");
  const token = await login();
  const runtime = await api(token, "runtime-manifest");
  invariant(runtime.compatibilityTuple?.definitionReleaseId === RELEASE_ID
    && runtime.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID,
  "RUNTIME_RELEASE_PAIR_RED");

  const installPrompt = "асфальтирование 5000 м²";
  const compactionPrompt = "уплотнение асфальтового покрытия 5000 м²";
  const installSearchIndex = await searchIndex(token, installPrompt, ASPHALT_INSTALL_KRER27_CATALOG_ID);
  const compactionSearchIndex = await searchIndex(token, compactionPrompt, ASPHALT_COMPACTION_PROFILE_CATALOG_ID);

  const install = await compile(token, ASPHALT_INSTALL_KRER27_CATALOG_ID,
    { area_m2: 5_000 }, installPrompt, runId, "install");
  const installRows = await allRows(token, install.revisionId);
  const installById = byId(installRows);
  invariant(install.releaseId === RELEASE_ID && install.searchReleaseId === SEARCH_RELEASE_ID,
    "INSTALL_RELEASE_IDENTITY_RED");
  invariant(installRows.length === 56 && (install.preliminaryNeeds ?? []).length === 0
    && installRows.every((row) => Number(row.quantity) > 0),
  `INSTALL_COMPOSITION_RED:${installRows.length}:${install.preliminaryNeeds?.length}`);
  invariant(decimalEq(installById.get("asphalt:material:hot-dense-fine-mix")?.quantity, 589)
    && decimalEq(installById.get("asphalt:material:road-bitumen")?.quantity, 0.5)
    && decimalEq(installById.get("asphalt:material:technical-kerosene")?.quantity, 0.0027)
    && decimalEq(installById.get("asphalt:material:hardwood-side-stop-bars")?.quantity, 0.65)
    && decimalEq(installById.get("asphalt:material:steel-towing-wire")?.quantity, 0.03065)
    && decimalEq(installById.get("asphalt:labor:road-workers")?.quantity, 282)
    && decimalEq(installById.get("asphalt:delivery:truck-machine-hours")?.quantity, 45),
  "INSTALL_AUTOMATIC_NORMS_RED");

  const compaction = await compile(token, ASPHALT_COMPACTION_PROFILE_CATALOG_ID,
    { area_m2: 5_000 }, compactionPrompt, runId, "compaction");
  const compactionRows = await allRows(token, compaction.revisionId);
  const compactionById = byId(compactionRows);
  invariant(compaction.releaseId === RELEASE_ID && compaction.searchReleaseId === SEARCH_RELEASE_ID,
    "COMPACTION_RELEASE_IDENTITY_RED");
  invariant(compactionRows.length === 49 && (compaction.preliminaryNeeds ?? []).length === 0
    && compactionRows.every((row) => Number(row.quantity) > 0),
  `COMPACTION_COMPOSITION_RED:${compactionRows.length}:${compaction.preliminaryNeeds?.length}`);
  invariant(decimalEq(compaction.parameters?.roller_speed_km_h, 4.8)
    && decimalEq(compaction.parameters?.breakdown_coverages, 4)
    && decimalEq(compaction.parameters?.intermediate_coverages, 2)
    && decimalEq(compaction.parameters?.finish_coverages, 2)
    && decimalEq(compactionById.get("rc09:asphalt_compaction_breakdown_roller")?.quantity, 3.472222222)
    && decimalEq(compactionById.get("rc09:asphalt_compaction_intermediate_roller")?.quantity, 1.479640152)
    && decimalEq(compactionById.get("rc09:asphalt_compaction_finish_roller")?.quantity, 1.736111111)
    && decimalEq(compactionById.get("rc09:asphalt_compaction_crew")?.quantity, 13.888888888)
    && decimalEq(compactionById.get("asphalt-compaction:quality:main-mat-density")?.quantity, 5),
  "COMPACTION_AUTOMATIC_NORMS_RED");
  invariant(!compactionRows.some((row) => /hot-dense-fine-mix|paver|truck-machine-hours/u.test(String(row.rowId))),
    "COMPACTION_ADJACENT_PAVING_SCOPE_RED");

  const edited = await recalculate(token, compaction, {
    ...compaction.parameters,
    area_m2: 6_000,
  }, runId, "compaction-area-edit");
  const editedRows = await allRows(token, edited.revisionId);
  const editedById = byId(editedRows);
  invariant(edited.parentRevisionId === compaction.revisionId && editedRows.length === 49
    && decimalEq(edited.parameters?.area_m2, 6_000)
    && decimalEq(editedById.get("rc09:asphalt_compaction_breakdown_roller")?.quantity, 4.166666667)
    && decimalEq(editedById.get("rc09:asphalt_compaction_crew")?.quantity, 16.666666668),
  "COMPACTION_EDIT_LINEAGE_OR_QUANTITY_RED");

  const priceRowId = "rc09:asphalt_compaction_breakdown_roller";
  const priced = await recalculate(token, edited, edited.parameters, runId, "compaction-roller-price", {
    ...(edited.amendmentContract?.rowOverrides ?? {}),
    [priceRowId]: {
      unitPrice: 5_000,
      provenance: { kind: "manual", reason: "S27.16 standalone asphalt compaction acceptance price" },
    },
  });
  const pricedRows = await allRows(token, priced.revisionId);
  const pricedRoller = byId(pricedRows).get(priceRowId);
  invariant(priced.parentRevisionId === edited.revisionId && pricedRows.length === 49
    && decimalEq(pricedRoller?.unitPrice, 5_000)
    && decimalEq(pricedRoller?.amount, 20_833.33),
  "COMPACTION_PRICE_APPLY_OR_ROW_LOSS_RED");

  const installProcurement = await artifact(token, install.revisionId, "procurement", runId, "install");
  const installProcurementJson = JSON.parse(installProcurement.bytes.toString("utf8")) as Json;
  const installProcurementRows = Array.isArray(installProcurementJson.rows) ? installProcurementJson.rows as Json[] : [];
  const installProcurementIds = new Set(installProcurementRows.map((row) => String(row.rowId)));
  invariant([
    "asphalt:material:hot-dense-fine-mix",
    "asphalt:material:road-bitumen",
    "asphalt:material:technical-kerosene",
    "asphalt:material:hardwood-side-stop-bars",
    "asphalt:material:steel-towing-wire",
  ].every((rowId) => installProcurementIds.has(rowId)), "INSTALL_PROCUREMENT_RED");

  const compactionProcurement = await artifact(token, priced.revisionId, "procurement", runId, "compaction");
  const compactionProcurementJson = JSON.parse(compactionProcurement.bytes.toString("utf8")) as Json;
  const compactionProcurementRows = Array.isArray(compactionProcurementJson.rows)
    ? compactionProcurementJson.rows as Json[] : [];
  const compactionProcurementIds = new Set(compactionProcurementRows.map((row) => String(row.rowId)));
  invariant([
    "rc09:asphalt_compaction_breakdown_roller",
    "rc09:asphalt_compaction_intermediate_roller",
    "rc09:asphalt_compaction_finish_roller",
    "asphalt-compaction:organization:work-zone-control",
    "asphalt-compaction:mobilization:breakdown-roller",
    "asphalt-compaction:mobilization:intermediate-roller",
    "asphalt-compaction:mobilization:finish-roller",
  ].every((rowId) => compactionProcurementIds.has(rowId)), "COMPACTION_PROCUREMENT_RED");

  const installPdf = await artifact(token, install.revisionId, "pdf", runId, "install");
  const compactionPdf = await artifact(token, compaction.revisionId, "pdf", runId, "compaction");
  for (const [key, pdf] of [["INSTALL", installPdf], ["COMPACTION", compactionPdf]] as const) {
    const text = await pdfText(pdf.bytes);
    invariant(pdf.bytes.subarray(0, 4).toString("ascii") === "%PDF"
      && pdf.metadata.metadata?.grandTotalStatus === "PARTIAL_NEEDS_PRICE"
      && text.includes("Цены не заполнены")
      && !text.includes("Оценено 0,00"),
    `${key}_PDF_UNKNOWN_PRICE_SEMANTICS_RED`);
  }

  const history = await api(token,
    `revisions?catalogId=${encodeURIComponent(ASPHALT_COMPACTION_PROFILE_CATALOG_ID)}&limit=20`);
  invariant((history.revisions as Json[]).some((revision) => revision.revisionId === priced.revisionId),
    "COMPACTION_HISTORY_RED");

  const unsigned = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    status: "GREEN_S27_16_ROADS_BACKEND",
    capturedAt: new Date().toISOString(),
    runId,
    definitionReleaseId: RELEASE_ID,
    searchReleaseId: SEARCH_RELEASE_ID,
    runtimeIdentity: runtime.compatibilityTuple,
    search: {
      install: { prompt: installPrompt, index: installSearchIndex },
      compaction: { prompt: compactionPrompt, index: compactionSearchIndex },
    },
    asphaltInstall: {
      revisionId: install.revisionId,
      areaM2: 5_000,
      rowCount: installRows.length,
      preliminaryNeedCount: install.preliminaryNeeds?.length ?? 0,
      hotMixT: installById.get("asphalt:material:hot-dense-fine-mix")?.quantity,
      roadBitumenT: installById.get("asphalt:material:road-bitumen")?.quantity,
      laborManH: installById.get("asphalt:labor:road-workers")?.quantity,
      deliveryTruckMachineH: installById.get("asphalt:delivery:truck-machine-hours")?.quantity,
      procurementRowCount: installProcurementRows.length,
      procurementSha256: installProcurement.metadata.sha256,
      pdfSha256: installPdf.metadata.sha256,
    },
    standaloneCompaction: {
      originalRevisionId: compaction.revisionId,
      editedRevisionId: edited.revisionId,
      pricedRevisionId: priced.revisionId,
      rowCount: compactionRows.length,
      preliminaryNeedCount: compaction.preliminaryNeeds?.length ?? 0,
      originalAreaM2: 5_000,
      editedAreaM2: 6_000,
      automaticProfile: {
        speedKmH: compaction.parameters?.roller_speed_km_h,
        breakdownCoverages: compaction.parameters?.breakdown_coverages,
        intermediateCoverages: compaction.parameters?.intermediate_coverages,
        finishCoverages: compaction.parameters?.finish_coverages,
      },
      originalQuantities: {
        breakdownRollerMachineH: compactionById.get("rc09:asphalt_compaction_breakdown_roller")?.quantity,
        intermediateRollerMachineH: compactionById.get("rc09:asphalt_compaction_intermediate_roller")?.quantity,
        finishRollerMachineH: compactionById.get("rc09:asphalt_compaction_finish_roller")?.quantity,
        crewManH: compactionById.get("rc09:asphalt_compaction_crew")?.quantity,
      },
      editedBreakdownRollerMachineH: editedById.get(priceRowId)?.quantity,
      manualPrice: { rowId: priceRowId, unitPrice: pricedRoller?.unitPrice, amount: pricedRoller?.amount },
      procurementRowCount: compactionProcurementRows.length,
      procurementSha256: compactionProcurement.metadata.sha256,
      pdfSha256: compactionPdf.metadata.sha256,
      historyContainsPricedRevision: true,
      adjacentPavingScopeExcluded: true,
    },
    pdfUnknownPricesAreNotZero: true,
    productionAccessed: false,
    activationPerformed: false,
    deployPerformed: false,
  };
  const receipt = { ...unsigned, sha256: sha256(JSON.stringify(stable(unsigned))) };
  const output = resolve(OUTPUT_ROOT, "acceptance.json");
  atomicJson(output, receipt);
  process.stdout.write(`${JSON.stringify({ ...receipt, output }, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
